import type { LocalEvent } from '@/db/schema';
import { appUrl } from './config';
import { localDate } from './dates';
export const xml = (s: string) =>
  s.replace(
    /[<>&"']/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
const icsEscape = (s: string) =>
  s
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r/g, '');
const stamp = (s: string) =>
  new Date(s)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
// RFC 5545 folds at 75 octets without splitting UTF-8 characters.
export function foldLine(line: string) {
  const chunks: string[] = [];
  let part = '',
    bytes = 0;
  for (const char of line) {
    const size = Buffer.byteLength(char);
    if (bytes + size > 75) {
      chunks.push(part);
      part = ' ';
      bytes = 1;
    }
    part += char;
    bytes += size;
  }
  chunks.push(part);
  return chunks.join('\r\n');
}
export function calendar(events: LocalEvent[]) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//YQG Events//Windsor Essex//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:YQG Events',
    'X-WR-TIMEZONE:America/Toronto',
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
  ];
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.id}@yqg-events`,
      `DTSTAMP:${stamp(e.updatedAt)}`,
      `LAST-MODIFIED:${stamp(e.updatedAt)}`,
      e.allDay
        ? `DTSTART;VALUE=DATE:${localDate(e.startDateTime).replace(/-/g, '')}`
        : `DTSTART:${stamp(e.startDateTime)}`,
    );
    if (e.allDay) lines.push(`DTEND;VALUE=DATE:${localDate(e.effectiveEnd).replace(/-/g, '')}`);
    else if (e.endDateTime) lines.push(`DTEND:${stamp(e.endDateTime)}`);
    lines.push(
      `SUMMARY:${icsEscape(`${e.isDemo ? '[DEMO] ' : ''}${e.title}`)}`,
      `DESCRIPTION:${icsEscape(`${e.description || ''}\nSource: ${e.sourceUrl}`)}`,
      `LOCATION:${icsEscape([e.venueName, e.address, e.city].filter(Boolean).join(', '))}`,
      `URL:${appUrl()}/events/${e.slug}`,
      `STATUS:${e.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
export function rss(events: LocalEvent[]) {
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>YQG Events — Windsor–Essex</title><link>${xml(appUrl())}</link><description>Local events and good plans around Windsor–Essex.</description><language>en-ca</language><atom:link href="${xml(appUrl())}/feed.xml" rel="self" type="application/rss+xml"/>${events.map((e) => `<item><title>${xml(`${e.isDemo ? '[DEMO] ' : ''}${e.status === 'cancelled' ? '[CANCELLED] ' : ''}${e.title}`)}</title><link>${xml(appUrl())}/events/${xml(e.slug)}</link><guid isPermaLink="false">${e.id}</guid><pubDate>${new Date(e.createdAt).toUTCString()}</pubDate><description>${xml(`${e.description || ''}\nStarts: ${e.startDateTime}\n${e.city}\nOriginal source: ${e.sourceUrl}`)}</description>${e.categories.map((c) => `<category>${xml(c)}</category>`).join('')}</item>`).join('')}</channel></rss>`;
}
