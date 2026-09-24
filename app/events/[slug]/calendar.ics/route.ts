import { getPublicEvent } from '@/lib/events';
import { calendar } from '@/lib/feeds';
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const event = await getPublicEvent((await params).slug);
  if (!event) return new Response('Not found', { status: 404 });
  return new Response(calendar([event]), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${event.slug}.ics"`,
      'Cache-Control': 'no-cache',
    },
  });
}
