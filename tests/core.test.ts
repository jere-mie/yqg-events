import { beforeAll, afterAll, describe, test, expect } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { createHash } from 'node:crypto';
import {
  createEvent,
  updateEvent,
  listEvents,
  getPublicEvent,
  possibleDuplicates,
  canonicalSource,
} from '../lib/events';
import { eventInput, eventPatch } from '../lib/validation';
import { dateRange } from '../lib/dates';
import { calendar, foldLine, rss } from '../lib/feeds';
import {
  registerClient,
  authorizeInput,
  issueCode,
  exchangeToken,
  consentToken,
  readConsent,
  revokeToken,
} from '../lib/oauth';
import { authenticate, hash, passwordHash, validPassword, rateLimit } from '../lib/security';
import { POST as createRoute } from '../app/api/events/route';
import { POST as mcpRoute } from '../app/mcp/route';
import { db } from '../db';
import { oauthTokens, oauthCodes } from '../db/schema';
import { eq } from 'drizzle-orm';
const dir = mkdtempSync(path.join(tmpdir(), 'yqg-test-'));
const base = {
  title: 'A real sourced event',
  city: 'Windsor',
  startDateTime: '2099-06-01T18:00:00-04:00',
  sourceUrl: 'https://example.org/event',
};
beforeAll(async () => {
  process.env.TURSO_DATABASE_URL = `file:${path.join(dir, 'test.db').replace(/\\/g, '/')}`;
  process.env.APP_URL = 'http://localhost:3000';
  process.env.EVENT_INGEST_API_KEY = 'test-api-key-with-at-least-32-characters';
  process.env.OAUTH_SIGNING_SECRET = 'test-signing-secret-with-at-least-32-characters';
  process.env.OWNER_PASSWORD_HASH = passwordHash('a strong test password');
  process.env.OAUTH_REDIRECT_URIS = 'https://chatgpt.com/connector_platform_oauth_redirect';
  const client = createClient({ url: process.env.TURSO_DATABASE_URL });
  await migrate(drizzle(client), { migrationsFolder: './drizzle' });
  client.close();
});
afterAll(() => {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    /* Windows may keep the SQLite handle until worker exit. */
  }
});
describe('ingestion and public visibility', () => {
  test('validates dates, URLs, unknown fields and all-day boundaries', () => {
    expect(eventInput.safeParse({ ...base, sourceUrl: 'javascript:alert(1)' }).success).toBe(false);
    expect(eventInput.safeParse({ ...base, startDateTime: '2026-09-26T18:00:00' }).success).toBe(
      false,
    );
    expect(eventInput.safeParse({ ...base, endDateTime: '2000-01-01T00:00:00Z' }).success).toBe(
      false,
    );
    expect(eventInput.safeParse({ ...base, isDemo: true }).success).toBe(false);
    expect(eventInput.safeParse({ ...base, allDay: true }).success).toBe(false);
    expect(eventPatch.parse({ description: 'New summary' })).toEqual({
      description: 'New summary',
    });
    expect(eventPatch.safeParse({}).success).toBe(false);
  });
  test('drafts stay private, publishing works, patches preserve unsupplied fields, archive hides', async () => {
    const event = await createEvent({ ...base, categories: ['Music'], isFree: true });
    expect(await getPublicEvent(event.slug)).toBeUndefined();
    expect((await listEvents({ period: 'all' })).events.some((e) => e.id === event.id)).toBe(false);
    const published = await updateEvent(event.id, { status: 'published', description: 'Hello' });
    expect(published.categories).toEqual(['Music']);
    expect(published.isFree).toBe(true);
    expect((await getPublicEvent(event.slug))?.id).toBe(event.id);
    await updateEvent(event.id, { description: null });
    expect((await getPublicEvent(event.slug))?.description).toBeNull();
    await updateEvent(event.id, { status: 'cancelled' });
    expect((await getPublicEvent(event.slug))?.status).toBe('cancelled');
    await updateEvent(event.id, { status: 'archived' });
    expect(await getPublicEvent(event.slug)).toBeUndefined();
  });
  test('duplicate protection is atomic and repeated source occurrences are supported', async () => {
    const input = {
      ...base,
      title: 'Concurrent event',
      sourceUrl: 'https://example.org/series',
      startDateTime: '2099-07-01T12:00:00-04:00',
    };
    const results = await Promise.allSettled([createEvent(input), createEvent(input)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(
      (results.find((r) => r.status === 'rejected') as PromiseRejectedResult).reason.status,
    ).toBe(409);
    expect((await possibleDuplicates(input)).length).toBeGreaterThan(0);
    await expect(
      createEvent({ ...input, startDateTime: '2099-07-02T12:00:00-04:00' }),
    ).resolves.toBeTruthy();
    await expect(
      createEvent({
        ...input,
        title: 'Concurrent   Event!',
        sourceUrl: 'https://another.example.org/',
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(canonicalSource('https://example.org/a?utm_campaign=x&b=2#here')).toBe(
      'https://example.org/a?b=2',
    );
  });
  test('filters JSON categories, literal search, boolean flags and pagination', async () => {
    await createEvent({
      ...base,
      title: '100% free special',
      sourceUrl: 'https://example.org/filter',
      city: 'Kingsville',
      categories: ['Markets'],
      isFree: true,
      status: 'published',
    });
    const result = await listEvents({
      city: 'Kingsville',
      category: 'Markets',
      q: '100%',
      free: true,
      limit: 1,
    });
    expect(result.total).toBe(1);
    expect(result.events[0].city).toBe('Kingsville');
    expect((await listEvents({ q: '100_', limit: 1 })).total).toBe(0);
    expect((await listEvents({ city: 'Kingsville', offset: 1 })).events).toHaveLength(0);
  });
  test('API fails closed and rejects malformed or oversized input', async () => {
    expect(
      (
        await createRoute(
          new Request('http://localhost:3000/api/events', { method: 'POST', body: '{}' }),
        )
      ).status,
    ).toBe(401);
    const headers = {
      authorization: `Bearer ${process.env.EVENT_INGEST_API_KEY}`,
      'Content-Type': 'application/json',
    };
    expect(
      (
        await createRoute(
          new Request('http://localhost:3000/api/events', {
            method: 'POST',
            headers,
            body: '{bad',
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await createRoute(
          new Request('http://localhost:3000/api/events', {
            method: 'POST',
            headers,
            body: 'x'.repeat(100001),
          }),
        )
      ).status,
    ).toBe(413);
    expect(
      (
        await createRoute(
          new Request('http://localhost:3000/api/events', {
            method: 'POST',
            headers: { ...headers, origin: 'https://evil.example' },
            body: '{}',
          }),
        )
      ).status,
    ).toBe(403);
  });
});
describe('Toronto date windows and feeds', () => {
  test('spring and fall DST boundaries are 23 and 25 hours', () => {
    for (const [date, hours] of [
      ['2026-03-08T12:00:00Z', 23],
      ['2026-11-01T12:00:00Z', 25],
    ] as const) {
      const range = dateRange('today', new Date(date));
      expect((Date.parse(range.to!) - Date.parse(range.from)) / 3600000).toBe(hours);
    }
    expect(dateRange('weekend', new Date('2026-09-27T15:00:00Z'))).toEqual({
      from: '2026-09-25T04:00:00.000Z',
      to: '2026-09-28T04:00:00.000Z',
    });
  });
  test('all-day events get exclusive calendar end, XML escaping and UTF-8 folding', async () => {
    const event = await createEvent({
      ...base,
      title: 'Arts & <crafts>',
      sourceUrl: 'https://example.org/calendar?a=1&b=2',
      startDateTime: '2099-06-03T00:00:00-04:00',
      allDay: true,
    });
    const ics = calendar([event]);
    expect(ics).toContain('DTSTART;VALUE=DATE:20990603');
    expect(ics).toContain('DTEND;VALUE=DATE:20990604');
    expect(rss([event])).toContain('Arts &amp; &lt;crafts&gt;');
    const text = 'SUMMARY:' + 'é😀'.repeat(80);
    const folded = foldLine(text);
    expect(folded.split('\r\n').every((l) => Buffer.byteLength(l) <= 75)).toBe(true);
    expect(folded.replace(/\r\n /g, '')).toBe(text);
  });
});
describe('single-owner OAuth', () => {
  async function flow(scope = 'events:read events:write') {
    const redirect = 'https://chatgpt.com/connector_platform_oauth_redirect';
    const client = await registerClient({ redirect_uris: [redirect] });
    const verifier = 'v'.repeat(43);
    const resource = 'http://localhost:3000/mcp';
    const value = await authorizeInput({
      client_id: client.client_id,
      redirect_uri: redirect,
      response_type: 'code',
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
      resource,
      scope,
      state: 'test-state',
    });
    const redirectUrl = new URL(await issueCode(value));
    expect(redirectUrl.searchParams.get('state')).toBe('test-state');
    expect(redirectUrl.searchParams.get('iss')).toBe('http://localhost:3000');
    const form = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: client.client_id,
      code: redirectUrl.searchParams.get('code')!,
      redirect_uri: redirect,
      code_verifier: verifier,
      resource,
    });
    return { form, client, value, resource };
  }
  test('rejects unapproved redirects and verifies owner passwords and consent nonce', async () => {
    await expect(
      registerClient({ redirect_uris: ['https://evil.example/callback'] }),
    ).rejects.toMatchObject({ status: 400 });
    expect(validPassword('wrong')).toBe(false);
    expect(validPassword('a strong test password')).toBe(true);
    const { value } = await flow();
    const token = await consentToken(value, 'nonce');
    await expect(readConsent(token, 'wrong')).rejects.toMatchObject({ status: 403 });
    expect((await readConsent(token, 'nonce')).client_id).toBe(value.client_id);
  });
  test('PKCE, resource binding, single-use code, scope and refresh rotation', async () => {
    const { form, client, resource } = await flow('events:read');
    const wrong = new URLSearchParams(form);
    wrong.set('code_verifier', 'a'.repeat(43));
    await expect(exchangeToken(wrong)).rejects.toMatchObject({ status: 400 });
    wrong.set('resource', 'https://evil.example/mcp');
    await expect(exchangeToken(wrong)).rejects.toMatchObject({ status: 400 });
    const tokens = await exchangeToken(form);
    await expect(exchangeToken(form)).rejects.toMatchObject({ status: 400 });
    const request = new Request(resource, {
      headers: { authorization: `Bearer ${tokens.access_token}` },
    });
    expect((await authenticate(request, 'events:read')).scope).toBe('events:read');
    await expect(authenticate(request, 'events:write')).rejects.toMatchObject({ status: 403 });
    const refreshForm = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
      client_id: client.client_id,
      resource,
    });
    const rotated = await exchangeToken(refreshForm);
    expect(hash(rotated.refresh_token)).not.toBe(hash(tokens.refresh_token));
    await expect(exchangeToken(refreshForm)).rejects.toMatchObject({ status: 400 });
    await expect(
      authenticate(
        new Request(resource, { headers: { authorization: `Bearer ${rotated.access_token}` } }),
        'events:read',
      ),
    ).rejects.toMatchObject({ status: 401 });
  });
  test('revocation invalidates the whole connection and rate limits persist', async () => {
    const { form, client, resource } = await flow();
    const tokens = await exchangeToken(form);
    await revokeToken(tokens.refresh_token, client.client_id);
    await expect(
      authenticate(
        new Request(resource, { headers: { authorization: `Bearer ${tokens.access_token}` } }),
        'events:read',
      ),
    ).rejects.toMatchObject({ status: 401 });
    await rateLimit('test-limit', 1, 60);
    await expect(rateLimit('test-limit', 1, 60)).rejects.toMatchObject({ status: 429 });
  });
  test('expired codes and tokens and mismatched clients are rejected', async () => {
    const one = await flow();
    const two = await flow();
    const badClient = new URLSearchParams(one.form);
    badClient.set('client_id', two.client.client_id);
    await expect(exchangeToken(badClient)).rejects.toMatchObject({ status: 400 });
    await db()
      .update(oauthCodes)
      .set({ expiresAt: 1 })
      .where(eq(oauthCodes.hash, hash(two.form.get('code')!)));
    await expect(exchangeToken(two.form)).rejects.toMatchObject({ status: 400 });
    const tokens = await exchangeToken(one.form);
    await db()
      .update(oauthTokens)
      .set({ expiresAt: 1 })
      .where(eq(oauthTokens.hash, hash(tokens.access_token)));
    await expect(
      authenticate(
        new Request(one.resource, { headers: { authorization: `Bearer ${tokens.access_token}` } }),
        'events:read',
      ),
    ).rejects.toMatchObject({ status: 401 });
  });
  test('read-only OAuth token cannot invoke an MCP write', async () => {
    const { form, resource } = await flow('events:read');
    const tokens = await exchangeToken(form);
    const response = await mcpRoute(
      new Request(resource, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'archive_event', arguments: { id: 'anything' } },
        }),
      }),
    );
    expect((await response.json()).result.isError).toBe(true);
  });
});
describe('MCP wire protocol', () => {
  const request = (method: string, params: unknown = {}) =>
    new Request('http://localhost:3000/mcp', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${process.env.EVENT_INGEST_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
  test('advertises tools, calls writes, and returns structured validation errors', async () => {
    const init = await mcpRoute(
      request('initialize', {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'test', version: '1' },
      }),
    );
    expect(init.status).toBe(200);
    const list = await (await mcpRoute(request('tools/list'))).json();
    expect(list.result.tools.map((t: { name: string }) => t.name)).toContain('create_event');
    const created = await (
      await mcpRoute(
        request('tools/call', {
          name: 'create_event',
          arguments: { ...base, title: 'MCP created event', sourceUrl: 'https://example.org/mcp' },
        }),
      )
    ).json();
    expect(created.result.isError).not.toBe(true);
    expect(created.result.structuredContent.result.status).toBe('draft');
    const bad = await (
      await mcpRoute(
        request('tools/call', {
          name: 'create_event',
          arguments: { ...base, title: 'MCP invalid end', endDateTime: '2000-01-01T00:00:00Z' },
        }),
      )
    ).json();
    expect(bad.result.isError).toBe(true);
  });
});
