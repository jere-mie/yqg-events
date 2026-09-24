import { getEvent, updateEvent } from '@/lib/events';
import { readJson } from '@/lib/errors';
import { protectedRoute } from '@/lib/http';
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  return protectedRoute(request, 'events:read', async () =>
    Response.json(await getEvent((await context.params).id)),
  );
}
export async function PATCH(request: Request, context: Context) {
  return protectedRoute(request, 'events:write', async () =>
    Response.json(await updateEvent((await context.params).id, await readJson(request))),
  );
}
export const PUT = PATCH;
export async function DELETE(request: Request, context: Context) {
  return protectedRoute(request, 'events:write', async () =>
    Response.json(await updateEvent((await context.params).id, { status: 'archived' })),
  );
}
