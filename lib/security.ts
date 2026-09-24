import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { and, eq, gt, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { oauthTokens, rateLimits } from '@/db/schema';
import { appUrl, resourceUrl } from './config';
import { AppError } from './errors';
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const randomSecret = () => randomBytes(32).toString('base64url');
export function equalSecret(a: string, b: string) {
  return timingSafeEqual(Buffer.from(hash(a)), Buffer.from(hash(b)));
}
export function passwordHash(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function validPassword(password: string) {
  const [salt, digest] = (process.env.OWNER_PASSWORD_HASH || '').split(':');
  return (
    !!salt &&
    !!digest &&
    password.length <= 256 &&
    equalSecret(scryptSync(password, salt, 64).toString('hex'), digest)
  );
}
export async function rateLimit(key: string, max: number, seconds: number) {
  const now = Math.floor(Date.now() / 1000);
  await db().delete(rateLimits).where(lt(rateLimits.resetAt, now));
  const [row] = await db()
    .insert(rateLimits)
    .values({ key, count: 1, resetAt: now + seconds })
    .onConflictDoUpdate({ target: rateLimits.key, set: { count: sql`${rateLimits.count} + 1` } })
    .returning();
  if (row.count > max) throw new AppError(429, 'Too many requests. Try again later.');
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== appUrl()) throw new AppError(403, 'Origin not allowed');
}
export async function authenticate(request: Request, scope: 'events:read' | 'events:write') {
  const token = request.headers.get('authorization')?.match(/^Bearer ([^\s]+)$/i)?.[1];
  if (!token) throw new AppError(401, 'Authentication required');
  const key = process.env.EVENT_INGEST_API_KEY;
  if (key && key.length >= 32 && equalSecret(token, key))
    return { scope: 'events:read events:write', clientId: 'api-key' };
  const [row] = await db()
    .select()
    .from(oauthTokens)
    .where(
      and(
        eq(oauthTokens.hash, hash(token)),
        eq(oauthTokens.kind, 'access'),
        eq(oauthTokens.consumed, false),
        gt(oauthTokens.expiresAt, Math.floor(Date.now() / 1000)),
      ),
    )
    .limit(1);
  if (!row || row.resource !== resourceUrl()) throw new AppError(401, 'Invalid or expired token');
  if (!row.scope.split(' ').includes(scope)) throw new AppError(403, 'Insufficient scope');
  return row;
}
export function authChallenge() {
  return `Bearer resource_metadata="${appUrl()}/.well-known/oauth-protected-resource", scope="events:read events:write"`;
}
