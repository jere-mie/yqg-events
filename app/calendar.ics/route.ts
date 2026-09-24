import { listEvents } from '@/lib/events';
import { calendar } from '@/lib/feeds';
export const dynamic = 'force-dynamic';
export async function GET() {
  const { events } = await listEvents({ limit: 100 });
  return new Response(calendar(events), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="yqg-events.ics"',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
