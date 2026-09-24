import type { MetadataRoute } from 'next';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { events } from '@/db/schema';
import { appUrl } from '@/lib/config';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rows = await db()
    .select({ slug: events.slug, updatedAt: events.updatedAt })
    .from(events)
    .where(and(eq(events.status, 'published'), eq(events.isDemo, false)))
    .limit(45000);
  return [
    { url: appUrl(), changeFrequency: 'daily' },
    { url: `${appUrl()}/about` },
    { url: `${appUrl()}/subscribe` },
    ...rows.map((e) => ({ url: `${appUrl()}/events/${e.slug}`, lastModified: e.updatedAt })),
  ];
}
