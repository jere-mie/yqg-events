import { listEvents } from '@/lib/events';
import { rss } from '@/lib/feeds';
export const dynamic = 'force-dynamic';
export async function GET() {
  const { events } = await listEvents({ limit: 100, sort: 'newest' });
  return new Response(rss(events), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
