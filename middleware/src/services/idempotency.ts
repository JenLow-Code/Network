import type { Ctx, Viewer } from '../http/context';
import { json } from '../http/respond';

/**
 * Replays the stored response when a client retries a high-impact write with the same
 * Idempotency-Key (phase transitions, publishing, accepting offers). Keys expire after 48 h
 * (cleanup in the scheduled job). Business operations are also idempotent at the SQL level.
 */
export async function idempotent(ctx: Ctx, viewer: Viewer, route: string, run: () => Promise<{ status: number; body: unknown }>): Promise<Response> {
  const key = ctx.idempotencyKey();
  if (key) {
    const prior = await ctx.sql.first<{ response_status: number; response_body: string }>(
      'SELECT response_status,response_body FROM idempotency_keys WHERE user_id=? AND idem_key=? AND route=?',
      viewer.id, key, route,
    );
    if (prior) return json(JSON.parse(prior.response_body), prior.response_status, { 'Idempotent-Replay': 'true' });
  }
  const result = await run();
  if (key && result.status < 500) {
    await ctx.sql.run(
      'INSERT OR IGNORE INTO idempotency_keys(user_id,idem_key,route,response_status,response_body) VALUES(?,?,?,?,?)',
      viewer.id, key, route, result.status, JSON.stringify(result.body),
    );
  }
  return json(result.body, result.status);
}
