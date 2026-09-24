import { createHash, randomUUID } from 'node:crypto';
import { and, eq, ne, or, sql, desc, asc, count } from 'drizzle-orm';
import { db } from '@/db';
import { events } from '@/db/schema';
import { eventInput, eventObject, eventPatch, listInput, type ListInput } from './validation';
import { dateRange, localDate, effectiveEnd } from './dates';
import { AppError } from './errors';

export function canonicalSource(value: string) {
  const url = new URL(value);
  url.hash = '';
  for (const key of [...url.searchParams.keys()])
    if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
  url.searchParams.sort();
  return url.toString().replace(/\/$/, '');
}
function identities(value: {
  title: string;
  startDateTime: string;
  sourceUrl: string;
  city: string;
}) {
  const hash = (s: string) => createHash('sha256').update(s).digest('hex');
  const normalize = (s: string) =>
    s
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
  return {
    dedupeKey: hash(
      `${normalize(value.title)}|${localDate(value.startDateTime)}|${normalize(value.city)}`,
    ),
    sourceKey: hash(`${canonicalSource(value.sourceUrl)}|${value.startDateTime}`),
  };
}
export async function possibleDuplicates(input: unknown) {
  const value = eventInput.parse(input);
  const keys = identities(value);
  return db()
    .select()
    .from(events)
    .where(
      or(
        eq(events.dedupeKey, keys.dedupeKey),
        eq(events.sourceKey, keys.sourceKey),
        eq(events.sourceUrl, value.sourceUrl),
      ),
    )
    .limit(30);
}
export async function getEvent(id: string) {
  const [event] = await db().select().from(events).where(eq(events.id, id)).limit(1);
  if (!event) throw new AppError(404, 'Event not found');
  return event;
}
export async function getPublicEvent(slug: string) {
  const [event] = await db()
    .select()
    .from(events)
    .where(
      and(
        eq(events.slug, slug),
        or(eq(events.status, 'published'), eq(events.status, 'cancelled')),
      ),
    )
    .limit(1);
  return event;
}
export async function createEvent(input: unknown) {
  const value = eventInput.parse(input);
  const id = randomUUID();
  const now = new Date().toISOString();
  const slug = `${
    value.title
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 90) || 'event'
  }-${id.slice(0, 8)}`;
  try {
    const [event] = await db()
      .insert(events)
      .values({
        ...value,
        ...identities(value),
        effectiveEnd: effectiveEnd(value),
        id,
        slug,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return event;
  } catch (error) {
    if (isUnique(error))
      throw new AppError(
        409,
        'Possible duplicate event. Inspect and update the existing event.',
        await possibleDuplicates(value),
      );
    throw error;
  }
}
export async function updateEvent(id: string, input: unknown) {
  const patch = eventPatch.parse(input);
  const existing = await getEvent(id);
  const value = eventInput.parse({
    ...Object.fromEntries(
      Object.keys(eventObject.shape).map((k) => [k, existing[k as keyof typeof existing]]),
    ),
    ...patch,
  });
  try {
    const updatedAt = new Date(
      Math.max(Date.now(), Date.parse(existing.updatedAt) + 1),
    ).toISOString();
    const [event] = await db()
      .update(events)
      .set({ ...value, ...identities(value), effectiveEnd: effectiveEnd(value), updatedAt })
      .where(and(eq(events.id, id), eq(events.updatedAt, existing.updatedAt)))
      .returning();
    if (!event) throw new AppError(409, 'Event changed during this update. Re-fetch it and retry.');
    return event;
  } catch (error) {
    if (isUnique(error)) throw new AppError(409, 'Update conflicts with an existing event');
    throw error;
  }
}
function isUnique(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    /UNIQUE constraint failed/i.test(error.message) || (error.cause ? isUnique(error.cause) : false)
  );
}
export async function listEvents(input: ListInput = {}, privileged = false) {
  const value = listInput.parse(input);
  const filters = [];
  if (!privileged) filters.push(or(eq(events.status, 'published'), eq(events.status, 'cancelled')));
  else if (value.status && value.status !== 'all') filters.push(eq(events.status, value.status));
  else filters.push(ne(events.status, 'archived'));
  if (value.period !== 'all') {
    const { from, to } = dateRange(value.period);
    // Missing end: timed events remain visible until local midnight; all-day end is exclusive.
    filters.push(sql`${events.effectiveEnd} > ${from}`);
    if (to) filters.push(sql`${events.startDateTime} < ${to}`);
  }
  if (value.city) filters.push(eq(events.city, value.city));
  if (value.category)
    filters.push(
      sql`exists (select 1 from json_each(${events.categories}) where value = ${value.category})`,
    );
  if (value.free) filters.push(eq(events.isFree, true));
  if (value.family) filters.push(eq(events.isFamilyFriendly, true));
  if (value.q) {
    const term = `%${value.q.replace(/[!%_]/g, '!$&')}%`;
    filters.push(
      sql`(${events.title} || ' ' || coalesce(${events.description}, '') || ' ' || coalesce(${events.venueName}, '') || ' ' || ${events.city} || ' ' || ${events.tags}) like ${term} escape '!'`,
    );
  }
  const where = and(...filters);
  const [items, [total]] = await Promise.all([
    db()
      .select()
      .from(events)
      .where(where)
      .orderBy(
        value.sort === 'newest' ? desc(events.createdAt) : asc(events.startDateTime),
        asc(events.id),
      )
      .limit(value.limit)
      .offset(value.offset),
    db().select({ count: count() }).from(events).where(where),
  ]);
  return { events: items, total: total.count, limit: value.limit, offset: value.offset };
}
export async function facets() {
  const rows = await db()
    .select({ city: events.city, categories: events.categories, isDemo: events.isDemo })
    .from(events)
    .where(or(eq(events.status, 'published'), eq(events.status, 'cancelled')));
  return {
    cities: [...new Set(rows.map((e) => e.city))].sort(),
    categories: [...new Set(rows.flatMap((e) => e.categories))].sort(),
    demo: rows.some((e) => e.isDemo),
  };
}
