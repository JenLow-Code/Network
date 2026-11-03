/**
 * JenLow Network API — single Cloudflare Worker entrypoint.
 *
 * Serves the unchanged beta authentication contract (/v1/auth/*) and the application API
 * (/api/*) on the same D1 database with the same token issuer. The previous OAuth prototype
 * that lived in this file is preserved, unchanged, in middleware/legacy/oauth-prototype.ts.
 */
import type { Env } from './config/env';
import type { ExecutionContext, ScheduledController } from './platform/cf';
import { handle } from './app';
import { runScheduled } from './jobs/scheduled';

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return handle(request, env, ctx);
  },
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runScheduled(env).then(stats => console.log(JSON.stringify({ level: 'info', job: 'scheduled', ...stats }))));
  },
};
