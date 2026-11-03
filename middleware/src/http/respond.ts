import { ApiError } from './errors';

const BASE_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

export function json(body: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...BASE_HEADERS, ...(headers || {}) } });
}

export const noContent = (): Response => new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });

/**
 * Standard error envelope for /api/* routes:
 * { "error": { "code", "message", "requestId", "details"? } }
 */
export function errorResponse(error: ApiError, requestId: string): Response {
  return json(
    {
      error: {
        code: error.code,
        message: error.message === error.code ? defaultMessage(error.status) : error.message,
        requestId,
        ...(error.details?.length ? { details: error.details } : {}),
      },
    },
    error.status,
    error.status === 429 ? { 'Retry-After': '900' } : undefined,
  );
}

/** The deployed beta auth Worker answers `{ "error": "code" }`; /v1/auth keeps that contract. */
export function legacyError(code: string, status = 400): Response {
  return json({ error: code }, status);
}

function defaultMessage(status: number): string {
  switch (status) {
    case 400: return 'The request is malformed.';
    case 401: return 'Authentication is required.';
    case 403: return 'This action is not permitted.';
    case 404: return 'Not found.';
    case 409: return 'The request conflicts with the current state.';
    case 422: return 'The request breaks a validation or business rule.';
    case 429: return 'Too many requests. Try again later.';
    case 503: return 'This capability is not configured on the server.';
    default: return 'Unexpected server error.';
  }
}
