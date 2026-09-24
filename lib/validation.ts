import { z } from 'zod';
import { formatInTimeZone } from 'date-fns-tz';
import { TIME_ZONE } from './config';
export const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine((v) => /^https?:\/\//i.test(v), 'Use an HTTP or HTTPS URL');
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
const dateTime = z
  .string()
  .datetime({ offset: true })
  .transform((v) => new Date(v).toISOString());
export const eventFields = {
  title: z.string().trim().min(3).max(180),
  description: optionalText(600),
  contentMarkdown: optionalText(20000),
  startDateTime: dateTime,
  endDateTime: dateTime.nullable().optional(),
  allDay: z.boolean().default(false),
  venueName: optionalText(180),
  address: optionalText(300),
  city: z.string().trim().min(1).max(100),
  region: z.string().trim().max(100).default('Windsor-Essex'),
  postalCode: optionalText(20),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  categories: z.array(z.string().trim().min(1).max(50)).max(10).default([]),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  isFree: z.boolean().nullable().optional(),
  isFamilyFriendly: z.boolean().nullable().optional(),
  sourceUrl: httpUrl,
  sourceName: optionalText(150),
  eventUrl: httpUrl.nullable().optional(),
  imageUrl: httpUrl.nullable().optional(),
  status: z.enum(['draft', 'published', 'cancelled', 'archived']).default('draft'),
  lastVerifiedAt: dateTime.nullable().optional(),
};
export const eventObject = z.object(eventFields).strict();
export const eventInput = eventObject
  .refine((v) => !v.endDateTime || v.endDateTime > v.startDateTime, {
    message: 'End must be after start',
    path: ['endDateTime'],
  })
  .refine(
    (v) =>
      !v.allDay ||
      [v.startDateTime, v.endDateTime]
        .filter(Boolean)
        .every((d) => formatInTimeZone(d!, TIME_ZONE, 'HH:mm:ss.SSS') === '00:00:00.000'),
    {
      message: 'All-day dates must be Toronto local midnight; end is exclusive',
      path: ['startDateTime'],
    },
  );
// Explicitly remove create defaults: an omitted patch field must stay untouched.
export const eventPatch = eventObject
  .extend({
    allDay: eventFields.allDay.removeDefault(),
    region: eventFields.region.removeDefault(),
    categories: eventFields.categories.removeDefault(),
    tags: eventFields.tags.removeDefault(),
    status: eventFields.status.removeDefault(),
  })
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'At least one field is required');
export type EventInput = z.input<typeof eventInput>;
export const listInput = z
  .object({
    q: z.string().max(150).optional(),
    city: z.string().max(100).optional(),
    category: z.string().max(50).optional(),
    period: z.enum(['upcoming', 'today', 'week', 'weekend', 'all']).default('upcoming'),
    free: z.boolean().optional(),
    family: z.boolean().optional(),
    status: z.enum(['draft', 'published', 'cancelled', 'archived', 'all']).optional(),
    limit: z.number().int().min(1).max(100).default(24),
    offset: z.number().int().min(0).max(100000).default(0),
    sort: z.enum(['date', 'newest']).default('date'),
  })
  .strict();
export type ListInput = z.input<typeof listInput>;
