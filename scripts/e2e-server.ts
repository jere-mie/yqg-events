import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { scryptSync } from 'node:crypto';
const dir = mkdtempSync(path.join(tmpdir(), 'yqg-e2e-'));
process.env.TURSO_DATABASE_URL = `file:${path.join(dir, 'events.db').replace(/\\/g, '/')}`;
process.env.APP_URL = 'http://localhost:3100';
process.env.EVENT_INGEST_API_KEY = 'e2e-only-key-never-for-production-12345';
process.env.OAUTH_SIGNING_SECRET = 'e2e-only-signing-secret-never-for-production';
process.env.OWNER_PASSWORD_HASH = `test-salt:${scryptSync('e2e-owner-password', 'test-salt', 64).toString('hex')}`;
process.env.OAUTH_REDIRECT_URIS = 'http://localhost:3100/test-callback';
process.env.NEXT_DIST_DIR = '.next-e2e';
await import('./migrate');
await import('./seed');
const child = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'dev', '--port', '3100'],
  { stdio: 'inherit', env: process.env },
);
process.on('SIGTERM', () => child.kill('SIGTERM'));
process.on('SIGINT', () => child.kill('SIGINT'));
child.on('exit', (code) => process.exit(code || 0));
