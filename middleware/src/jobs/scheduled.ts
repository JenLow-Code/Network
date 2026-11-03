import type { Env } from '../config/env';
import { Sql, newId } from '../lib/util';
import { notifyStmt } from '../services/notifications';

/** Minutes since midnight in a timezone. */
function localMinutes(timeZone: string, date: Date): number {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
    const h = Number(parts.find(p => p.type === 'hour')?.value ?? 0), m = Number(parts.find(p => p.type === 'minute')?.value ?? 0);
    return h * 60 + m;
  } catch {
    return 12 * 60;
  }
}

export function inQuietHours(start: string | null, end: string | null, timeZone: string, date: Date): boolean {
  if (!start || !end) return false;
  const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  const now = localMinutes(timeZone, date), a = toMin(start), b = toMin(end);
  return a <= b ? now >= a && now < b : now >= a || now < b;
}

/**
 * Cron (wrangler.toml: every 15 minutes, within the free plan's cron allowance):
 *  - deliver due prayer reminders as in-app notifications, honouring opt-in and quiet hours;
 *  - deliver scheduled notifications that came due;
 *  - expire abandoned uploads and their R2 objects;
 *  - purge old rate-limit windows and idempotency keys.
 */
export async function runScheduled(env: Env, now = new Date()): Promise<Record<string, number>> {
  const sql = new Sql(env.DB);
  const stats: Record<string, number> = { prayerReminders: 0, deferredForQuietHours: 0, scheduledDelivered: 0, uploadsExpired: 0 };
  const nowIso = now.toISOString().replace(/\.\d{3}Z$/, 'Z');

  const due = await sql.all<{ user_id: string; publication_id: string; scheduled_for: string; title: string; enabled: number; timezone: string | null; qs: string | null; qe: string | null }>(
    `SELECT s.user_id,s.publication_id,s.scheduled_for,p.title,coalesce(up.prayer_reminders_enabled,0) AS enabled,up.timezone,up.quiet_hours_start AS qs,up.quiet_hours_end AS qe
     FROM prayer_saves s JOIN publications p ON p.id=s.publication_id JOIN users u ON u.id=s.user_id AND u.account_status='active'
     LEFT JOIN user_preferences up ON up.user_id=s.user_id
     WHERE s.reminder_status='scheduled' AND s.scheduled_for<=? LIMIT 500`,
    nowIso,
  );
  const stmts = [];
  for (const d of due) {
    if (!d.enabled) {
      stmts.push(sql.stmt("UPDATE prayer_saves SET reminder_status='cancelled' WHERE user_id=? AND publication_id=? AND scheduled_for=?", d.user_id, d.publication_id, d.scheduled_for));
      continue;
    }
    if (inQuietHours(d.qs, d.qe, d.timezone || 'Europe/Paris', now)) {
      stats.deferredForQuietHours++;
      continue;
    }
    stmts.push(
      notifyStmt(sql, { userId: d.user_id, type: 'prayer.reminder', category: 'prayer', entityType: 'publication', entityId: d.publication_id, params: { subject: d.title }, deepLink: `/publication/${d.publication_id}`, dedupeKey: `prayer:${d.publication_id}:${d.scheduled_for}` }),
      sql.stmt("UPDATE prayer_saves SET reminder_status='sent' WHERE user_id=? AND publication_id=? AND scheduled_for=?", d.user_id, d.publication_id, d.scheduled_for),
    );
    stats.prayerReminders++;
  }
  if (stmts.length) await sql.batch(stmts);

  stats.scheduledDelivered = await sql.run(
    "UPDATE notifications SET status='sent',delivered_at=CURRENT_TIMESTAMP WHERE status='queued' AND scheduled_at IS NOT NULL AND scheduled_at<=?",
    nowIso,
  );

  const expired = await sql.all<{ id: string; r2_key: string | null }>(
    "SELECT id,r2_key FROM media_assets WHERE storage_status='pending' AND upload_expires_at IS NOT NULL AND upload_expires_at<? LIMIT 200",
    nowIso,
  );
  for (const m of expired) {
    if (m.r2_key && env.MEDIA) await env.MEDIA.delete(m.r2_key);
    await sql.run("UPDATE media_assets SET storage_status='removed',deleted_at=CURRENT_TIMESTAMP WHERE id=? AND storage_status='pending'", m.id);
    stats.uploadsExpired++;
  }

  await sql.run('DELETE FROM auth_rate_limits WHERE expires_at<?', Math.floor(now.getTime() / 1000));
  await sql.run("DELETE FROM idempotency_keys WHERE created_at<datetime('now','-2 days')");
  await sql.run(
    "INSERT INTO audit_log(id,actor_id,operation,entity_type,entity_id,metadata_json) VALUES(?,NULL,'scheduled_run','system','cron',?)",
    newId(), JSON.stringify(stats),
  );
  return stats;
}
