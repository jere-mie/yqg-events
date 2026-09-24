import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createHash } from 'node:crypto';
const apiHeaders = { Authorization: 'Bearer e2e-only-key-never-for-production-12345' };
test('browse, filter, search, detail and feeds on desktop', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /A little more local/ })).toBeVisible();
  await expect(page.locator('.event-card')).toHaveCount(6);
  await page.screenshot({
    path: 'test-results/desktop-home.png',
    fullPage: true,
    caret: 'initial',
  });
  await page.getByLabel('Town or city').selectOption('Kingsville');
  await page.getByRole('button', { name: 'Find events' }).click();
  await expect(page.locator('.event-card')).toHaveCount(1);
  await page.getByRole('link', { name: 'Made here: a makers’ afternoon' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Made here: a makers’ afternoon',
  );
  await expect(page.getByText('Fictional demo listing', { exact: false })).toBeVisible();
  await page.screenshot({
    path: 'test-results/desktop-detail.png',
    fullPage: true,
    caret: 'initial',
  });
  expect((await request.get(page.url() + '/calendar.ics')).headers()['content-type']).toContain(
    'text/calendar',
  );
  await page.goto('/?q=not-a-real-search-term');
  await expect(page.getByRole('heading', { name: 'No plans found. Yet.' })).toBeVisible();
  await page.getByRole('link', { name: 'Clear filters' }).click();
  await expect(page.locator('.event-card')).toHaveCount(6);
  expect((await request.get('/feed.xml')).headers()['content-type']).toContain(
    'application/rss+xml',
  );
  expect(await (await request.get('/calendar.ics')).text()).toContain('BEGIN:VCALENDAR');
  expect(await (await request.get('/sitemap.xml')).text()).not.toContain('/events/');
});
test('mobile layout and accessibility', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.event-card')).toHaveCount(6);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, failure: n.failureSummary })),
    })),
  ).toEqual([]);
  await page.screenshot({ path: 'test-results/mobile-home.png', fullPage: true, caret: 'initial' });
  await page.locator('.event-card h3 a').first().click();
  await expect(page.getByRole('link', { name: 'View original listing' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({
    path: 'test-results/mobile-detail.png',
    fullPage: true,
    caret: 'initial',
  });
});
test('HTTP API privacy, safe Markdown, and archive', async ({ page, request }) => {
  expect((await request.post('/api/events', { data: {} })).status()).toBe(401);
  const created = await request.post('/api/events', {
    headers: apiHeaders,
    data: {
      title: 'Security test event',
      city: 'Windsor',
      startDateTime: '2099-01-01T18:00:00-05:00',
      sourceUrl: 'https://example.com/security-test',
      contentMarkdown:
        '<script>window.PWNED=true</script>\n\n[Bad](javascript:alert(1))\n\n## Safe heading',
    },
  });
  expect(created.status()).toBe(201);
  const event = await created.json();
  // Next.js may send 200 before notFound() during streaming; test privacy, not transport timing.
  await page.goto(`/events/${event.slug}`);
  await expect(page.getByRole('heading', { name: 'That plan isn’t here.' })).toBeVisible();
  await expect(page.getByText('Security test event', { exact: true })).toHaveCount(0);
  await request.patch(`/api/events/${event.id}`, {
    headers: apiHeaders,
    data: { status: 'published' },
  });
  await page.goto(`/events/${event.slug}`);
  await expect(page.getByRole('heading', { name: 'Safe heading' })).toBeVisible();
  expect(await page.evaluate(() => 'PWNED' in window)).toBe(false);
  expect(await page.locator('.markdown a').getAttribute('href')).not.toContain('javascript:');
  await request.delete(`/api/events/${event.id}`, { headers: apiHeaders });
  await page.goto(`/events/${event.slug}`);
  await expect(page.getByRole('heading', { name: 'That plan isn’t here.' })).toBeVisible();
  await expect(page.getByText('Security test event', { exact: true })).toHaveCount(0);
});
test('browser owner consent → OAuth token → MCP write and update', async ({ page, request }) => {
  const redirect = 'http://localhost:3100/test-callback';
  const registration = await request.post('/oauth/register', {
    data: { client_name: 'Browser test client', redirect_uris: [redirect] },
  });
  expect(registration.status()).toBe(201);
  const client = await registration.json();
  const verifier = 'a'.repeat(43);
  const resource = 'http://localhost:3100/mcp';
  const authParams = new URLSearchParams({
    client_id: client.client_id,
    redirect_uri: redirect,
    response_type: 'code',
    code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method: 'S256',
    resource,
    state: 'test-state',
    scope: 'events:read events:write',
  });
  await page.route('**/test-callback?**', (route) =>
    route.fulfill({ body: 'Connected', contentType: 'text/plain' }),
  );
  await page.goto(`/oauth/authorize?${authParams}`);
  await expect(page.getByRole('heading', { name: 'Connect your local guide.' })).toBeVisible();
  await page.getByLabel('Owner password').fill('e2e-owner-password');
  await page.getByRole('button', { name: 'Allow connection' }).click();
  await page.waitForURL('**/test-callback?**');
  const code = new URL(page.url()).searchParams.get('code')!;
  const exchange = await request.post('/oauth/token', {
    form: {
      grant_type: 'authorization_code',
      client_id: client.client_id,
      code,
      redirect_uri: redirect,
      code_verifier: verifier,
      resource,
    },
  });
  expect(exchange.status()).toBe(200);
  const token = await exchange.json();
  const call = async (name: string, args: unknown) => {
    const response = await request.post('/mcp', {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        Accept: 'application/json, text/event-stream',
      },
      data: { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name, arguments: args } },
    });
    expect(response.status()).toBe(200);
    return response.json();
  };
  const created = await call('create_event', {
    title: 'OAuth workflow test',
    city: 'Windsor',
    startDateTime: '2099-02-01T18:00:00-05:00',
    sourceUrl: 'https://example.com/oauth-workflow',
  });
  expect(created.result.isError).not.toBe(true);
  const event = created.result.structuredContent.result;
  const updated = await call('update_event', { id: event.id, changes: { status: 'published' } });
  expect(updated.result.structuredContent.result.status).toBe('published');
  await page.goto(`/events/${event.slug}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('OAuth workflow test');
  await call('archive_event', { id: event.id });
});
