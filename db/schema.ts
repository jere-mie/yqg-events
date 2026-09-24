import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const events = sqliteTable(
  'events',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    contentMarkdown: text('content_markdown'),
    startDateTime: text('start_datetime').notNull(),
    endDateTime: text('end_datetime'),
    effectiveEnd: text('effective_end').notNull(),
    allDay: integer('all_day', { mode: 'boolean' }).notNull().default(false),
    venueName: text('venue_name'),
    address: text('address'),
    city: text('city').notNull(),
    region: text('region').notNull().default('Windsor-Essex'),
    postalCode: text('postal_code'),
    latitude: real('latitude'),
    longitude: real('longitude'),
    categories: text('categories', { mode: 'json' }).$type<string[]>().notNull(),
    tags: text('tags', { mode: 'json' }).$type<string[]>().notNull(),
    isFree: integer('is_free', { mode: 'boolean' }),
    isFamilyFriendly: integer('is_family_friendly', { mode: 'boolean' }),
    sourceUrl: text('source_url').notNull(),
    sourceName: text('source_name'),
    eventUrl: text('event_url'),
    imageUrl: text('image_url'),
    status: text('status', { enum: ['draft', 'published', 'cancelled', 'archived'] })
      .notNull()
      .default('draft'),
    isDemo: integer('is_demo', { mode: 'boolean' }).notNull().default(false),
    dedupeKey: text('dedupe_key').notNull(),
    sourceKey: text('source_key').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    lastVerifiedAt: text('last_verified_at'),
  },
  (t) => [
    uniqueIndex('event_slug').on(t.slug),
    uniqueIndex('event_identity').on(t.dedupeKey),
    uniqueIndex('event_source_occurrence').on(t.sourceKey),
    index('event_status_date').on(t.status, t.startDateTime),
  ],
);

export const oauthClients = sqliteTable('oauth_clients', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  redirectUris: text('redirect_uris', { mode: 'json' }).$type<string[]>().notNull(),
  createdAt: integer('created_at').notNull(),
});
export const oauthCodes = sqliteTable('oauth_codes', {
  hash: text('hash').primaryKey(),
  clientId: text('client_id').notNull(),
  redirectUri: text('redirect_uri').notNull(),
  challenge: text('challenge').notNull(),
  resource: text('resource').notNull(),
  scope: text('scope').notNull(),
  expiresAt: integer('expires_at').notNull(),
});
export const oauthTokens = sqliteTable(
  'oauth_tokens',
  {
    hash: text('hash').primaryKey(),
    clientId: text('client_id').notNull(),
    kind: text('kind', { enum: ['access', 'refresh'] }).notNull(),
    family: text('family').notNull(),
    scope: text('scope').notNull(),
    resource: text('resource').notNull(),
    expiresAt: integer('expires_at').notNull(),
    consumed: integer('consumed', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [index('token_family').on(t.family)],
);
export const rateLimits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  resetAt: integer('reset_at').notNull(),
});
export type LocalEvent = typeof events.$inferSelect;
