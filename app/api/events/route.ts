import { createEvent, listEvents } from '@/lib/events';
import { readJson } from '@/lib/errors';
import { protectedRoute } from '@/lib/http';
import { listInput } from '@/lib/validation';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  return protectedRoute(request, 'events:read', async () => {
    const values: Record<string, unknown> = Object.fromEntries(new URL(request.url).searchParams);
    for (const name of ['limit', 'offset']) if (name in values) values[name] = Number(values[name]);
    for (const name of ['free', 'family'])
      if (name in values) values[name] = values[name] === 'true';
    return Response.json(await listEvents(listInput.parse(values), true));
  });
}
export async function POST(request: Request) {
  return protectedRoute(request, 'events:write', async () =>
    Response.json(await createEvent(await readJson(request)), { status: 201 }),
  );
}
