/**
 * JenLow beta authentication (Cloudflare Worker, /v1/auth/*). The same Worker serves the app
 * API under /api, so one token identifies the member everywhere.
 */
export const API_BASE = (
  process.env.EXPO_PUBLIC_API_URL || 'https://jenlow-network-auth.jenlow-production.workers.dev'
).replace(/\/$/, '');

export type AuthReply = {
  user: { id: string; email: string; displayName: string; handle?: string };
  session: { accessToken: string; refreshToken: string; expiresIn: number; tokenType: string };
};

export async function authCall(route: string, data: Record<string, unknown>): Promise<AuthReply> {
  let response: Response;
  try {
    response = await fetch(API_BASE + route, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {
    throw new Error('request_failed');
  }
  const result = await response.json().catch(() => ({ error: 'invalid_server_response' }));
  if (!response.ok) throw new Error(result.error || 'authentication_failed');
  return result as AuthReply;
}

export const authenticateEmail = (email: string, password: string) =>
  authCall('/v1/auth/email/login', { email, password });

export const registerEmail = (
  displayName: string,
  email: string,
  password: string,
  inviteCode: string,
) => authCall('/v1/auth/email/register', { displayName, email, password, inviteCode });

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  await fetch(API_BASE + '/v1/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  }).catch(() => undefined);
}
