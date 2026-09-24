import { AppError, errorResponse } from './errors';
import { authenticate, authChallenge, checkOrigin } from './security';
export async function protectedRoute(
  request: Request,
  scope: 'events:read' | 'events:write',
  run: () => Promise<Response>,
) {
  try {
    checkOrigin(request);
    await authenticate(request, scope);
    const response = await run();
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    const response = errorResponse(error);
    response.headers.set('Cache-Control', 'no-store');
    if (error instanceof AppError && error.status === 401)
      response.headers.set('WWW-Authenticate', authChallenge());
    return response;
  }
}
