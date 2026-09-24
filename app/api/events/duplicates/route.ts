import { possibleDuplicates } from '@/lib/events';
import { readJson } from '@/lib/errors';
import { protectedRoute } from '@/lib/http';
export async function POST(request: Request) {
  return protectedRoute(request, 'events:read', async () =>
    Response.json({ events: await possibleDuplicates(await readJson(request)) }),
  );
}
