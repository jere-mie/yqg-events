export const TIME_ZONE = 'America/Toronto';
export function appUrl() {
  const value = process.env.APP_URL || 'http://localhost:3000';
  const url = new URL(value);
  if (process.env.VERCEL && url.protocol !== 'https:')
    throw new Error('APP_URL must be your canonical HTTPS origin.');
  return url.origin;
}
export const resourceUrl = () => `${appUrl()}/mcp`;
