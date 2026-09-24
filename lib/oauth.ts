import { createHash } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { and, eq, gt, lt } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { oauthClients, oauthCodes, oauthTokens } from '@/db/schema';
import { appUrl, resourceUrl } from './config';
import { AppError } from './errors';
import { hash, randomSecret } from './security';
const now = () => Math.floor(Date.now() / 1000);
function signingKey() {
  const secret = process.env.OAUTH_SIGNING_SECRET;
  if (!secret || secret.length < 32 || !process.env.OWNER_PASSWORD_HASH)
    throw new AppError(503, 'Owner connection is not configured');
  return new TextEncoder().encode(secret);
}
export const allowedRedirects = () =>
  (process.env.OAUTH_REDIRECT_URIS || 'https://chatgpt.com/connector_platform_oauth_redirect')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
export async function registerClient(input: unknown) {
  signingKey();
  const value = z
    .object({
      client_name: z.string().max(120).default('ChatGPT'),
      redirect_uris: z.array(z.string().url()).min(1).max(5),
      token_endpoint_auth_method: z.literal('none').default('none'),
      grant_types: z.array(z.enum(['authorization_code', 'refresh_token'])).optional(),
      response_types: z.array(z.literal('code')).optional(),
    })
    .parse(input);
  if (value.redirect_uris.some((uri) => !allowedRedirects().includes(uri)))
    throw new AppError(400, 'Redirect URI is not on the owner-configured allowlist');
  const id = randomSecret();
  await db()
    .insert(oauthClients)
    .values({ id, name: value.client_name, redirectUris: value.redirect_uris, createdAt: now() });
  return {
    client_id: id,
    client_name: value.client_name,
    redirect_uris: value.redirect_uris,
    token_endpoint_auth_method: 'none',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
  };
}
const authorization = z.object({
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  response_type: z.literal('code'),
  code_challenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  code_challenge_method: z.literal('S256'),
  resource: z.string(),
  scope: z.string().default('events:read events:write'),
  state: z.string().max(2048).optional(),
});
export async function authorizeInput(input: unknown) {
  signingKey();
  const value = authorization.parse(input);
  const [client] = await db()
    .select()
    .from(oauthClients)
    .where(eq(oauthClients.id, value.client_id))
    .limit(1);
  if (
    !client ||
    !client.redirectUris.includes(value.redirect_uri) ||
    !allowedRedirects().includes(value.redirect_uri)
  )
    throw new AppError(400, 'Invalid client or redirect URI');
  if (value.resource !== resourceUrl()) throw new AppError(400, 'Invalid resource');
  const scopes = value.scope.split(' ').filter(Boolean);
  if (!scopes.length || scopes.some((s) => !['events:read', 'events:write'].includes(s)))
    throw new AppError(400, 'Invalid scope');
  return { ...value, scope: [...new Set(scopes)].join(' '), clientName: client.name };
}
export async function consentToken(
  input: Awaited<ReturnType<typeof authorizeInput>>,
  nonce: string,
) {
  return new SignJWT({ ...input, nonce })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(appUrl())
    .setAudience('owner-consent')
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(signingKey());
}
export async function readConsent(token: string, nonce: string) {
  const { payload } = await jwtVerify(token, signingKey(), {
    issuer: appUrl(),
    audience: 'owner-consent',
    algorithms: ['HS256'],
  });
  if (!nonce || payload.nonce !== nonce)
    throw new AppError(403, 'Consent session expired. Start the connection again.');
  return authorizeInput(payload);
}
export async function issueCode(value: Awaited<ReturnType<typeof authorizeInput>>) {
  await db().delete(oauthCodes).where(lt(oauthCodes.expiresAt, now()));
  const code = randomSecret();
  await db()
    .insert(oauthCodes)
    .values({
      hash: hash(code),
      clientId: value.client_id,
      redirectUri: value.redirect_uri,
      challenge: value.code_challenge,
      resource: value.resource,
      scope: value.scope,
      expiresAt: now() + 120,
    });
  const redirect = new URL(value.redirect_uri);
  redirect.searchParams.set('code', code);
  redirect.searchParams.set('iss', appUrl());
  if (value.state) redirect.searchParams.set('state', value.state);
  return redirect.toString();
}
export async function exchangeToken(form: URLSearchParams) {
  signingKey();
  const clientId = form.get('client_id') || '';
  const resource = form.get('resource');
  if (resource !== resourceUrl()) throw new AppError(400, 'Invalid resource');
  const access = randomSecret(),
    refresh = randomSecret();
  const grant = form.get('grant_type');
  if (grant !== 'authorization_code' && grant !== 'refresh_token')
    throw new AppError(400, 'Unsupported grant type');
  if (grant === 'refresh_token') {
    const [prior] = await db()
      .select()
      .from(oauthTokens)
      .where(
        and(
          eq(oauthTokens.hash, hash(form.get('refresh_token') || '')),
          eq(oauthTokens.clientId, clientId),
        ),
      )
      .limit(1);
    if (prior?.consumed) {
      await db().delete(oauthTokens).where(eq(oauthTokens.family, prior.family));
      throw new AppError(400, 'Refresh token reused; reconnect the app');
    }
  }
  const scope = await db().transaction(async (tx) => {
    let scope: string;
    let family = randomSecret();
    if (grant === 'authorization_code') {
      const [code] = await tx
        .select()
        .from(oauthCodes)
        .where(
          and(eq(oauthCodes.hash, hash(form.get('code') || '')), gt(oauthCodes.expiresAt, now())),
        )
        .limit(1);
      const verifier = form.get('code_verifier') || '';
      const challenge = createHash('sha256').update(verifier).digest('base64url');
      if (
        !code ||
        code.clientId !== clientId ||
        code.redirectUri !== form.get('redirect_uri') ||
        code.resource !== resource ||
        !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier) ||
        code.challenge !== challenge
      )
        throw new AppError(400, 'Invalid authorization grant');
      const removed = await tx.delete(oauthCodes).where(eq(oauthCodes.hash, code.hash)).returning();
      if (!removed.length) throw new AppError(400, 'Authorization code already used');
      scope = code.scope;
    } else {
      const [token] = await tx
        .update(oauthTokens)
        .set({ consumed: true })
        .where(
          and(
            eq(oauthTokens.hash, hash(form.get('refresh_token') || '')),
            eq(oauthTokens.clientId, clientId),
            eq(oauthTokens.kind, 'refresh'),
            eq(oauthTokens.resource, resource),
            eq(oauthTokens.consumed, false),
            gt(oauthTokens.expiresAt, now()),
          ),
        )
        .returning();
      if (!token) throw new AppError(400, 'Invalid refresh grant');
      scope = token.scope;
      family = token.family;
      if (form.get('scope') && form.get('scope') !== scope)
        throw new AppError(400, 'Scope changes require a new authorization');
    }
    await tx.insert(oauthTokens).values([
      {
        hash: hash(access),
        clientId,
        kind: 'access',
        family,
        scope,
        resource,
        expiresAt: now() + 3600,
      },
      {
        hash: hash(refresh),
        clientId,
        kind: 'refresh',
        family,
        scope,
        resource,
        expiresAt: now() + 30 * 86400,
      },
    ]);
    return scope;
  });
  await db().delete(oauthTokens).where(lt(oauthTokens.expiresAt, now()));
  return {
    access_token: access,
    refresh_token: refresh,
    token_type: 'Bearer',
    expires_in: 3600,
    scope,
  };
}
export async function revokeToken(token: string, clientId: string) {
  const [row] = await db()
    .select()
    .from(oauthTokens)
    .where(and(eq(oauthTokens.hash, hash(token)), eq(oauthTokens.clientId, clientId)))
    .limit(1);
  if (row) await db().delete(oauthTokens).where(eq(oauthTokens.family, row.family));
}
