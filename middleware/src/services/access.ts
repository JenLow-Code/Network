import type { Sql } from '../lib/util';
import type { Viewer } from '../http/context';
import type { D1PreparedStatement } from '../platform/cf';
import { forbidden, notFound } from '../http/errors';
import { newId } from '../lib/util';

export type Visibility = 'private' | 'members' | 'public';

/** True when either member blocked the other. Blocks hide content and stop interactions both ways. */
export async function blockedBetween(sql: Sql, a: string | null | undefined, b: string | null | undefined): Promise<boolean> {
  if (!a || !b || a === b) return false;
  return sql.exists('SELECT 1 FROM user_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?) LIMIT 1', a, b, b, a);
}

export async function assertNotBlocked(sql: Sql, a: string, b: string): Promise<void> {
  if (await blockedBetween(sql, a, b)) throw notFound();
}

/** SQL fragment excluding rows authored by members in a block relationship with `?` (bind viewer id twice). */
export const NOT_BLOCKED_SQL = (authorColumn: string) =>
  `NOT EXISTS(SELECT 1 FROM user_blocks b WHERE (b.blocker_id=? AND b.blocked_id=${authorColumn}) OR (b.blocker_id=${authorColumn} AND b.blocked_id=?))`;

export function visibleTo(visibility: string, viewer: Viewer | null, isOwner: boolean): boolean {
  if (isOwner) return true;
  if (visibility === 'public') return true;
  if (visibility === 'members') return !!viewer;
  return false;
}

/** Authors whose content may appear publicly: active members, plus the fictional demo profiles. */
export const AUTHOR_VISIBLE_SQL = (alias: string) => `(${alias}.account_status='active' OR ${alias}.is_demo=1)`;

export type DreamRole = {
  isOwner: boolean; // accepted owner (creator or accepted co-owner)
  isCreator: boolean;
  isCollaborator: boolean; // accepted collaborator
  ownerCount: number;
};

export async function dreamRole(sql: Sql, dreamId: string, userId: string | null | undefined): Promise<DreamRole> {
  if (!userId) return { isOwner: false, isCreator: false, isCollaborator: false, ownerCount: 0 };
  const row = await sql.first<{ is_owner: number; is_creator: number; is_collab: number; owners: number }>(
    `SELECT
      EXISTS(SELECT 1 FROM dream_owners WHERE dream_id=?1 AND user_id=?2 AND status='accepted') AS is_owner,
      EXISTS(SELECT 1 FROM dreams WHERE id=?1 AND created_by=?2) AS is_creator,
      EXISTS(SELECT 1 FROM dream_collaborators WHERE dream_id=?1 AND user_id=?2 AND status='accepted') AS is_collab,
      (SELECT count(*) FROM dream_owners WHERE dream_id=?1 AND status='accepted') AS owners`,
    dreamId, userId,
  );
  return { isOwner: !!row?.is_owner, isCreator: !!row?.is_creator, isCollaborator: !!row?.is_collab, ownerCount: row?.owners ?? 0 };
}

export type DreamRow = {
  id: string; title: string; summary: string; phase: string; visibility: Visibility; created_by: string;
  created_at: string; updated_at: string; started_at: string | null; growing_at: string | null; completed_at: string | null;
  testimony_text: string | null; testimony_primary_asset_id: string | null; motivation: string | null; goal_date: string | null;
  paused: number; category: string | null; cover_media_id: string | null; cover_asset_key: string | null; version: number;
  deleted_at: string | null; moderation_hidden_at: string | null; author_status: string; author_is_demo: number;
};

/**
 * Load a Dream the viewer may see, or 404. Owners see their private drafts; everyone else
 * sees public (or members-only when signed in) Dreams by visible authors, never deleted,
 * moderated or block-related ones. The response never reveals that a hidden Dream exists.
 */
export async function loadVisibleDream(sql: Sql, dreamId: string, viewer: Viewer | null): Promise<{ dream: DreamRow; role: DreamRole }> {
  const dream = await sql.first<DreamRow>(
    `SELECT d.*, u.account_status AS author_status, u.is_demo AS author_is_demo
     FROM dreams d JOIN users u ON u.id=d.created_by WHERE d.id=?`,
    dreamId,
  );
  if (!dream || dream.deleted_at) throw notFound();
  const role = await dreamRole(sql, dreamId, viewer?.id);
  if (role.isOwner) return { dream, role };
  if (dream.moderation_hidden_at) throw notFound();
  if (!(dream.author_status === 'active' || dream.author_is_demo === 1)) throw notFound();
  if (!visibleTo(dream.visibility, viewer, false) && !role.isCollaborator) throw notFound();
  if (viewer && (await blockedBetween(sql, viewer.id, dream.created_by))) throw notFound();
  return { dream, role };
}

export async function requireDreamOwner(sql: Sql, dreamId: string, viewer: Viewer): Promise<{ dream: DreamRow; role: DreamRole }> {
  const loaded = await loadVisibleDream(sql, dreamId, viewer);
  if (!loaded.role.isOwner) throw forbidden('owner_only');
  return loaded;
}

export async function userByHandle(sql: Sql, handle: string): Promise<{ id: string; handle: string; display_name: string; account_status: string; is_demo: number } | null> {
  return sql.first('SELECT id,handle,display_name,account_status,is_demo FROM users WHERE handle=? COLLATE NOCASE', handle);
}

/** Resolve another active member by handle for an interaction; blocked or inactive → 404. */
export async function activeMemberByHandle(sql: Sql, handle: string, viewer: Viewer): Promise<{ id: string; handle: string; display_name: string }> {
  const user = await userByHandle(sql, handle);
  if (!user || user.account_status !== 'active' || user.id === viewer.id) throw notFound('member_not_found');
  await assertNotBlocked(sql, viewer.id, user.id);
  return user;
}

export function auditStmt(sql: Sql, actorId: string | null, operation: string, entityType: string, entityId: string, requestId: string, metadata?: Record<string, unknown>): D1PreparedStatement {
  return sql.stmt(
    'INSERT INTO audit_log(id,actor_id,operation,entity_type,entity_id,metadata_json,request_id) VALUES(?,?,?,?,?,?,?)',
    newId(), actorId, operation, entityType, entityId, metadata ? JSON.stringify(metadata) : null, requestId,
  );
}

export async function areContacts(sql: Sql, a: string, b: string): Promise<boolean> {
  return sql.exists('SELECT 1 FROM contacts WHERE user_id=? AND contact_user_id=?', a, b);
}

/** Accepted, reciprocal My Circle relationship (both directed rows plus an accepted request). */
export async function inCircle(sql: Sql, a: string, b: string): Promise<boolean> {
  const row = await sql.first<{ n: number }>(
    `SELECT count(*) AS n FROM circle_members cm JOIN circle_requests cr ON cr.id=cm.circle_request_id
     WHERE cr.status='accepted' AND ((cm.user_id=?1 AND cm.member_user_id=?2) OR (cm.user_id=?2 AND cm.member_user_id=?1))`,
    a, b,
  );
  return (row?.n ?? 0) >= 2;
}
