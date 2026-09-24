import './env';
import { fromZonedTime } from 'date-fns-tz';
import { eq } from 'drizzle-orm';
import { createEvent } from '../lib/events';
import { db } from '../db';
import { events } from '../db/schema';
import { localDate } from '../lib/dates';
if (!(process.env.TURSO_DATABASE_URL || 'file:local.db').startsWith('file:') || process.env.VERCEL)
  throw new Error('Demo seeding is restricted to local file databases.');
const existing = await db().select().from(events).where(eq(events.isDemo, true)).limit(1);
if (existing.length) {
  console.log('Demo events already exist. Use db:clear-demo before reseeding.');
  process.exit(0);
}
const today = new Date(`${localDate(new Date())}T12:00:00Z`);
const dates = (days: number, time: string) => {
  const date = new Date(today);
  date.setUTCDate(date.getUTCDate() + days);
  return fromZonedTime(
    `${date.toISOString().slice(0, 10)}T${time}:00`,
    'America/Toronto',
  ).toISOString();
};
const samples = [
  {
    title: 'A morning at the farmers’ market',
    category: 'Markets',
    city: 'Windsor',
    venue: 'Neighbourhood market',
    description:
      'Slow mornings, seasonal finds, and a coffee for the walk. A little taste of everything local.',
    free: true,
    family: true,
    day: 0,
    time: '09:00',
    end: '23:00',
    tag: 'Shop local',
  },
  {
    title: 'Golden hour by the river',
    category: 'Outdoors',
    city: 'Amherstburg',
    venue: 'Riverside park',
    description:
      'Take the scenic route. An easy evening stroll, a riverside view, and nowhere else to be.',
    free: true,
    family: true,
    day: 1,
    time: '17:30',
    end: '20:00',
    tag: 'Outdoors',
  },
  {
    title: 'An evening of live jazz',
    category: 'Live Music',
    city: 'Windsor',
    venue: 'The neighbourhood listening room',
    description:
      'Settle in for warm sounds and good company. An intimate evening with local musicians.',
    free: false,
    family: false,
    day: 2,
    time: '19:00',
    end: '22:00',
    tag: 'Live music',
  },
  {
    title: 'Made here: a makers’ afternoon',
    category: 'Arts & Culture',
    city: 'Kingsville',
    venue: 'Community studio',
    description:
      'Meet the makers, browse the tables, and bring home a little inspiration from the county.',
    free: true,
    family: true,
    day: 3,
    time: '11:00',
    end: '17:00',
    tag: 'Local makers',
  },
  {
    title: 'A taste of the county',
    category: 'Food & Drink',
    city: 'Essex',
    venue: 'The garden courtyard',
    description:
      'An afternoon around the table, celebrating seasonal ingredients and the people who grow them.',
    free: false,
    family: null,
    day: 4,
    time: '12:00',
    end: '16:00',
    tag: 'Seasonal flavours',
  },
  {
    title: 'The little autumn gathering',
    category: 'Festivals',
    city: 'Tecumseh',
    venue: 'Neighbourhood green',
    description:
      'Sweater-weather fun, a few lawn games, and a reason to spend a little more time outside.',
    free: true,
    family: true,
    day: 5,
    time: '10:00',
    end: '18:00',
    tag: 'Community',
  },
];
for (const [index, sample] of samples.entries()) {
  const event = await createEvent({
    title: sample.title,
    description: sample.description,
    contentMarkdown: `## A little something to look forward to\n\n${sample.description}\n\n**This is a fictional sample listing.** It demonstrates how a verified local event will appear. No real event, date, price or venue is being advertised.\n\n### Before you go\n\nReal listings link to an organizer’s page so you can confirm the latest details.`,
    city: sample.city,
    venueName: sample.venue,
    categories: [sample.category],
    tags: [sample.tag],
    isFree: sample.free,
    isFamilyFriendly: sample.family,
    startDateTime: dates(sample.day + 1, sample.time),
    endDateTime: dates(sample.day + 1, sample.end),
    sourceUrl: `https://example.com/yqg-demo/${index + 1}`,
    sourceName: 'Fictional demo source',
    status: 'published',
  });
  await db().update(events).set({ isDemo: true }).where(eq(events.id, event.id));
}
console.log('Added 6 clearly labelled fictional demo listings.');
