import { cookies } from 'next/headers';
import {
  authorizeInput,
  consentToken,
  readConsent,
  registerClient,
  issueCode,
  exchangeToken,
  revokeToken,
} from '@/lib/oauth';
import { randomSecret, rateLimit, validPassword } from '@/lib/security';
import { AppError, readBody, readJson } from '@/lib/errors';
import { appUrl } from '@/lib/config';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ action: string }> };
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
const headers = { 'Cache-Control': 'no-store', Pragma: 'no-cache' };
function failure(error: unknown) {
  const status = error instanceof AppError ? error.status : 400;
  return Response.json(
    {
      error: status === 429 ? 'temporarily_unavailable' : 'invalid_request',
      error_description:
        error instanceof AppError ? error.message : 'Invalid or expired authorization request',
    },
    { status, headers },
  );
}
export async function GET(request: Request, context: Context) {
  try {
    if ((await context.params).action !== 'authorize') return new Response(null, { status: 404 });
    const value = await authorizeInput(Object.fromEntries(new URL(request.url).searchParams));
    const nonce = randomSecret();
    const token = await consentToken(value, nonce);
    (await cookies()).set('yqg_consent', nonce, {
      httpOnly: true,
      secure: appUrl().startsWith('https:'),
      sameSite: 'lax',
      maxAge: 600,
      path: '/oauth',
    });
    return new Response(
      `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connect YQG Events</title><style>body{font:16px system-ui;background:#f4f3eb;color:#1e342b;display:grid;place-items:center;min-height:90vh;margin:24px}main{max-width:420px;background:white;padding:40px;border-radius:20px;border:1px solid #ddd}h1{font-size:32px;letter-spacing:-1px}p{line-height:1.7}label{display:block;font-weight:600;margin-top:24px}input,button{box-sizing:border-box;width:100%;padding:14px;border:1px solid #ccc;border-radius:8px;margin:10px 0;font:inherit}button{background:#214c3b;color:white;cursor:pointer}.small{font-size:13px;color:#5d6b61}a{color:inherit}</style><main><b>YQG / EVENTS</b><h1>Connect your local guide.</h1><p><strong>${escape(value.clientName)}</strong> is requesting access to ${value.scope.includes('events:write') ? 'read and manage' : 'read'} your events.</p><p class="small">${value.scope.includes('events:write') ? 'This allows creating, editing, publishing, cancelling, and archiving listings. Only the site owner can approve this connection.' : 'This allows reading listings, including drafts. Only the site owner can approve this connection.'}</p><form action="/oauth/authorize" method="post"><input type="hidden" name="consent" value="${escape(token)}"><label for="password">Owner password</label><input id="password" name="password" type="password" required maxlength="256" autocomplete="current-password"><button type="submit">Allow connection →</button></form><a href="/">Cancel and return to events</a></main></html>`,
      {
        headers: {
          ...headers,
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Security-Policy':
            "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
          'Referrer-Policy': 'no-referrer',
        },
      },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    const { action } = await context.params;
    if (action === 'register') {
      await rateLimit('oauth-registration', 30, 3600);
      return Response.json(await registerClient(await readJson(request)), { status: 201, headers });
    }
    const form = new URLSearchParams(await readBody(request, 16000));
    if (action === 'authorize') {
      await rateLimit('owner-login', 20, 900);
      const jar = await cookies();
      const value = await readConsent(
        form.get('consent') || '',
        jar.get('yqg_consent')?.value || '',
      );
      if (!validPassword(form.get('password') || ''))
        throw new AppError(401, 'Incorrect owner password. Go back to try again.');
      const redirect = await issueCode(value);
      jar.delete({ name: 'yqg_consent', path: '/oauth' });
      return new Response(null, { status: 303, headers: { ...headers, Location: redirect } });
    }
    if (action === 'token') {
      await rateLimit('oauth-token', 300, 60);
      return Response.json(await exchangeToken(form), { headers });
    }
    if (action === 'revoke') {
      await rateLimit('oauth-revoke', 100, 60);
      await revokeToken(form.get('token') || '', form.get('client_id') || '');
      return Response.json({}, { headers });
    }
    return new Response(null, { status: 404 });
  } catch (error) {
    return failure(error);
  }
}
