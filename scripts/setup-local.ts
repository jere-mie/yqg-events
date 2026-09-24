import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes, scryptSync } from 'node:crypto';
if (existsSync('.env.local')) {
  console.log('.env.local already exists; preserving your settings.');
  process.exit(0);
}
const secret = () => randomBytes(32).toString('base64url');
const password = secret(),
  salt = randomBytes(16).toString('hex');
const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
writeFileSync(
  '.env.local',
  `TURSO_DATABASE_URL=file:local.db\nAPP_URL=http://localhost:3000\nEVENT_INGEST_API_KEY=${secret()}\nOAUTH_SIGNING_SECRET=${secret()}\nOWNER_PASSWORD_HASH=${passwordHash}\nOAUTH_REDIRECT_URIS=https://chatgpt.com/connector_platform_oauth_redirect\n# LOCAL PREVIEW ONLY: remove this convenience comment before copying settings elsewhere.\n# Local owner password: ${password}\n`,
  { mode: 0o600 },
);
console.log(
  'Created .env.local with unique local credentials. The owner password is in its final comment. Do not commit this file.',
);
