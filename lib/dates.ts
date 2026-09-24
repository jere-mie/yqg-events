import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { addDays } from 'date-fns';
import { TIME_ZONE } from './config';
export const localDate = (value: string | Date) => formatInTimeZone(value, TIME_ZONE, 'yyyy-MM-dd');
export const displayDate = (value: string, pattern = 'EEE, MMM d') =>
  formatInTimeZone(value, TIME_ZONE, pattern);
export function dateRange(period: string, now = new Date()) {
  const day = localDate(now);
  const calendar = new Date(`${day}T12:00:00Z`);
  const weekday = calendar.getUTCDay();
  const midnight = (offset: number) =>
    fromZonedTime(
      `${formatInTimeZone(addDays(calendar, offset), 'UTC', 'yyyy-MM-dd')}T00:00:00`,
      TIME_ZONE,
    ).toISOString();
  if (period === 'today') return { from: midnight(0), to: midnight(1) };
  if (period === 'week')
    return { from: midnight(0), to: midnight(weekday === 0 ? 1 : 8 - weekday) };
  if (period === 'weekend') {
    const start = weekday === 0 ? -2 : weekday === 6 ? -1 : 5 - weekday;
    return { from: midnight(start), to: midnight(start + 3) };
  }
  return { from: now.toISOString(), to: undefined };
}
export function effectiveEnd(value: { startDateTime: string; endDateTime?: string | null }) {
  return value.endDateTime || dateRange('today', new Date(value.startDateTime)).to!;
}
