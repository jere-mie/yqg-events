import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';
let database: ReturnType<typeof drizzle<typeof schema>> | undefined;
export function db() {
  if (!database) {
    const url = process.env.TURSO_DATABASE_URL || (process.env.VERCEL ? '' : 'file:local.db');
    if (!url || (process.env.VERCEL && url.startsWith('file:')))
      throw new Error('Configure a remote TURSO_DATABASE_URL on Vercel.');
    database = drizzle(createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN }), { schema });
  }
  return database;
}
