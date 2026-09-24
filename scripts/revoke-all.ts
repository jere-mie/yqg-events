import './env';
import { db } from '../db';
import { oauthCodes, oauthTokens } from '../db/schema';
await db().transaction(async (tx) => {
  await tx.delete(oauthTokens);
  await tx.delete(oauthCodes);
});
console.log(
  'Revoked all OAuth connections and pending authorization codes. The ingestion API key is unchanged.',
);
