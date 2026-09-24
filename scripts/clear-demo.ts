import './env';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { events } from '../db/schema';
const rows = await db().delete(events).where(eq(events.isDemo, true)).returning({ id: events.id });
console.log(`Removed ${rows.length} fictional demo listings. Real listings were preserved.`);
