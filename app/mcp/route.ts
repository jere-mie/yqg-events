import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createMcpServer } from '@/lib/mcp';
import { authenticate, authChallenge, checkOrigin } from '@/lib/security';
import { AppError, errorResponse } from '@/lib/errors';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    let auth;
    try {
      auth = await authenticate(request, 'events:read');
    } catch (error) {
      if (error instanceof AppError && error.status === 403)
        auth = await authenticate(request, 'events:write');
      else throw error;
    }
    const server = createMcpServer(auth.scope);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
      maxRequestBodySize: 100000,
    });
    await server.connect(transport);
    try {
      const response = await transport.handleRequest(request);
      response.headers.set('Cache-Control', 'no-store');
      return response;
    } finally {
      await server.close();
    }
  } catch (error) {
    const response = errorResponse(error);
    if (error instanceof AppError && error.status === 401)
      response.headers.set('WWW-Authenticate', authChallenge());
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }
}
export function GET() {
  return new Response(null, {
    status: 405,
    headers: { Allow: 'POST', 'Cache-Control': 'no-store' },
  });
}
export const DELETE = GET;
