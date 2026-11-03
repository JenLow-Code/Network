import type { Router } from '../http/router';
import { V } from '../http/validate';
import { conflict, notFound, unprocessable } from '../http/errors';
import { enforceLimit, LIMITS } from '../http/rateLimit';
import { iso, newId } from '../lib/util';
import { auditStmt } from '../services/access';
import { notifyStmt } from '../services/notifications';

const TARGETS = ['user', 'dream', 'publication', 'message', 'music'] as const;
const REASONS = ['spam', 'harassment', 'hate', 'violence', 'sexual', 'self_harm', 'copyright', 'privacy', 'impersonation', 'other'] as const;

/**
 * Reports are open to every member; review is restricted to moderators (user_roles, granted by
 * operators in SQL). Hiding keeps evidence; removal soft-deletes. Talent showcases are
 * publications, reported with targetType `publication`.
 */
export function registerModeration(r: Router): void {
  r.add('POST', '/api/reports', { tag: 'Safety', summary: 'Report a member, Dream, publication, message or track', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    await enforceLimit(ctx.sql, 'report', viewer.id, LIMITS.report);
    const v = new V(await ctx.body());
    const targetType = v.oneOf('targetType', TARGETS, { required: true });
    const targetId = v.id('targetId', { required: true });
    const reasonCode = v.oneOf('reasonCode', REASONS, { required: true });
    const description = v.str('description', { max: 2000 });
    v.done();
    if (await ctx.sql.exists("SELECT 1 FROM reports WHERE reporter_id=? AND target_type=? AND target_id=? AND status IN ('open','reviewing')", viewer.id, targetType!, targetId!)) throw conflict('already_reported');
    const id = newId();
    await ctx.sql.batch([
      ctx.sql.stmt('INSERT INTO reports(id,reporter_id,target_type,target_id,reason_code,description) VALUES(?,?,?,?,?,?)', id, viewer.id, targetType!, targetId!, reasonCode!, description ?? null),
      auditStmt(ctx.sql, viewer.id, 'report_created', targetType!, targetId!, ctx.requestId, { reason: reasonCode }),
    ]);
    return { report: { id, status: 'open' } };
  });

  r.add('GET', '/api/admin/reports', { tag: 'Moderation', summary: 'Reports queue (moderators)', auth: 'moderator' }, async ctx => {
    await ctx.moderator();
    const status = ctx.query('status') || 'open';
    const rows = await ctx.sql.all<{ id: string; reporter_id: string; target_type: string; target_id: string; reason_code: string; description: string | null; status: string; created_at: string }>(
      'SELECT * FROM reports WHERE status=? ORDER BY created_at LIMIT 200', status,
    );
    return { items: rows.map(x => ({ id: x.id, target: { type: x.target_type, id: x.target_id }, reason: x.reason_code, description: x.description, status: x.status, createdAt: iso(x.created_at) })) };
  });

  r.add('POST', '/api/admin/reports/:id/resolve', { tag: 'Moderation', summary: 'Resolve a report with an action (hide, remove, restore, warn, suspend, unsuspend, dismiss)', auth: 'moderator' }, async ctx => {
    const mod = await ctx.moderator();
    const report = await ctx.sql.first<{ id: string; target_type: string; target_id: string; status: string }>('SELECT * FROM reports WHERE id=?', ctx.param('id'));
    if (!report) throw notFound();
    if (report.status === 'resolved' || report.status === 'dismissed') throw conflict('report_closed');
    const v = new V(await ctx.body());
    const action = v.oneOf('action', ['hide', 'remove', 'restore', 'warn', 'suspend', 'unsuspend', 'dismiss'] as const, { required: true });
    const explanation = v.str('explanation', { max: 2000 });
    v.done();
    const t = report.target_type, id = report.target_id;
    const stmts = [];
    const pubLike = t === 'publication' || t === 'music';
    if (action === 'hide' || action === 'restore') {
      const val = action === 'hide' ? 'CURRENT_TIMESTAMP' : 'NULL';
      if (pubLike) stmts.push(ctx.sql.stmt(`UPDATE publications SET moderation_hidden_at=${val} WHERE id=?`, id));
      else if (t === 'dream') stmts.push(ctx.sql.stmt(`UPDATE dreams SET moderation_hidden_at=${val} WHERE id=?`, id), ctx.sql.stmt(`UPDATE publications SET moderation_hidden_at=${val} WHERE dream_id=? AND type='dream'`, id));
      else if (t === 'message') stmts.push(ctx.sql.stmt(`UPDATE messages SET moderation_hidden_at=${val} WHERE id=?`, id));
      else throw unprocessable('action_not_applicable');
    } else if (action === 'remove') {
      if (pubLike) stmts.push(ctx.sql.stmt('UPDATE publications SET deleted_at=CURRENT_TIMESTAMP WHERE id=?', id));
      else if (t === 'dream') stmts.push(ctx.sql.stmt('UPDATE dreams SET deleted_at=CURRENT_TIMESTAMP WHERE id=?', id));
      else if (t === 'message') stmts.push(ctx.sql.stmt('UPDATE messages SET deleted_at=CURRENT_TIMESTAMP,body=NULL WHERE id=?', id));
      else throw unprocessable('action_not_applicable');
    } else if (action === 'suspend' || action === 'unsuspend') {
      if (t !== 'user') throw unprocessable('action_not_applicable');
      stmts.push(ctx.sql.stmt(`UPDATE users SET account_status=? WHERE id=? AND account_status IN ('active','suspended')`, action === 'suspend' ? 'suspended' : 'active', id));
      if (action === 'suspend') stmts.push(ctx.sql.stmt('UPDATE auth_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE user_id=? AND revoked_at IS NULL', id));
    }
    stmts.push(
      ctx.sql.stmt('INSERT INTO moderation_actions(id,report_id,moderator_id,target_type,target_id,action,explanation) VALUES(?,?,?,?,?,?,?)', newId(), report.id, mod.id, t, id, action === 'dismiss' ? 'restore' : action!, explanation ?? null),
      ctx.sql.stmt('UPDATE reports SET status=?,resolved_at=CURRENT_TIMESTAMP,handled_by=? WHERE id=?', action === 'dismiss' ? 'dismissed' : 'resolved', mod.id, report.id),
      auditStmt(ctx.sql, mod.id, 'moderation_' + action, t, id, ctx.requestId, { report: report.id }),
    );
    if (action === 'warn' && t === 'user') stmts.push(notifyStmt(ctx.sql, { userId: id, type: 'moderation.action', category: 'safety', entityType: 'report', entityId: report.id }));
    await ctx.sql.batch(stmts);
    return { report: { id: report.id, status: action === 'dismiss' ? 'dismissed' : 'resolved', action } };
  });
}
