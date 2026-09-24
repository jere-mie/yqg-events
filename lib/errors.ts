import { ZodError } from 'zod';
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}
export function errorResponse(error: unknown) {
  if (error instanceof ZodError)
    return Response.json({ error: 'Invalid input', details: error.flatten() }, { status: 400 });
  if (error instanceof AppError)
    return Response.json(
      { error: error.message, details: error.details },
      { status: error.status },
    );
  console.error('Request failed:', error instanceof Error ? error.message : 'Unknown error');
  return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
}
export async function readJson(request: Request) {
  const body = await readBody(request);
  try {
    return JSON.parse(body);
  } catch {
    throw new AppError(400, 'Expected valid JSON');
  }
}
export async function readBody(request: Request, maxBytes = 100000) {
  if (Number(request.headers.get('content-length')) > maxBytes)
    throw new AppError(413, 'Request is too large');
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBytes) {
      await reader.cancel();
      throw new AppError(413, 'Request is too large');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}
