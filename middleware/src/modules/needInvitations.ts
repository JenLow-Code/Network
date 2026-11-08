import type { Router } from '../http/router';
import type { Ctx } from '../http/context';
import type { D1PreparedStatement } from '../platform/cf';
import { V } from '../http/validate';
import { conflict, forbidden, mapSqlError, notFound, unprocessable } from '../http/errors';
import { enforceLimit, LIMITS } from '../http/rateLimit';
import { newId, iso } from '../lib/util';
import { activeMemberByHandle, auditStmt, blockedBetween, requireDreamOwner } from '../services/access';
import { notifyStmt } from '../services/notifications';
import { toApiPhase } from '../domain/phases';

type Invitation = {
  id: string; dream_id: string; need_id: string;
  invited_by: string; invited_user_id: string;
  status: 'pending'|'accepted'|'declined'|'removed';
  offer_id: string|null;
  label: string; title: string; category: string;
  invited_at?: string; created_at: string;
};
const inviteSql = `SELECT i.*,n.label,n.category,d.title
  FROM dream_need_invitations i
  JOIN dream_needs n ON n.id=i.need_id
  JOIN dreams d ON d.id=i.dream_id AND d.deleted_at IS NULL
  WHERE i.id=?`;

async function load(ctx: Ctx, id: string): Promise<Invitation> {
  const invitation = await ctx.sql.first<Invitation>(inviteSql,id);
  if (!invitation) throw notFound('invitation_not_found');
  return invitation;
}
function unjoinIfNoRoles(ctx: Ctx, dreamId: string, userId: string): D1PreparedStatement[] {
  return [
    ctx.sql.stmt(
      `UPDATE dream_collaborators SET status='removed'
       WHERE dream_id=?1 AND user_id=?2 AND status='accepted'
       AND NOT EXISTS(SELECT 1 FROM dream_help_offers
         WHERE dream_id=?1 AND offered_by=?2 AND status='accepted')`,
      dreamId,userId,
    ),
    ctx.sql.stmt(
      `UPDATE conversation_members SET left_at=CURRENT_TIMESTAMP
       WHERE user_id=?2 AND left_at IS NULL
       AND conversation_id=(SELECT id FROM conversations WHERE dream_id=?1 AND type='dream')
       AND NOT EXISTS(SELECT 1 FROM dream_owners WHERE dream_id=?1 AND user_id=?2 AND status='accepted')
       AND NOT EXISTS(SELECT 1 FROM dream_collaborators WHERE dream_id=?1 AND user_id=?2 AND status='accepted')`,
      dreamId,userId,
    ),
  ];
}

/** Each invitation names exactly one member and one talent need.
 * Only the invitee's explicit consent can fill the need. */
export function registerNeedInvitations(r: Router): void {
  r.add('POST','/api/needs/:id/invitations',
    {tag:'Needs',summary:'Invite a named member to fill a talent need (pending consent)',auth:'required',status:201},
    async ctx=>{
      const viewer=await ctx.user();
      await enforceLimit(ctx.sql,'social',viewer.id,LIMITS.social);
      const need=await ctx.sql.first<{id:string;dream_id:string;label:string;category:string;slots_total:number;slots_filled:number}>(
        'SELECT id,dream_id,label,category,slots_total,slots_filled FROM dream_needs WHERE id=?',ctx.param('id'));
      if(!need) throw notFound();
      const {dream}=await requireDreamOwner(ctx.sql,need.dream_id,viewer);
      if(need.category!=='person') throw unprocessable('not_a_talent_need');
      if(!['germination','croissance'].includes(toApiPhase(dream.phase))) throw unprocessable('action_not_allowed_for_phase');
      if(need.slots_filled>=need.slots_total) throw conflict('need_full');
      const v=new V(await ctx.body());
      const handle=v.str('handle',{required:true,max:40});
      const message=v.str('message',{max:1000});
      v.done();
      const recipient=await activeMemberByHandle(ctx.sql,handle!,viewer);
      const existing=await ctx.sql.first<{id:string;status:string}>(
        'SELECT id,status FROM dream_need_invitations WHERE need_id=? AND invited_user_id=?',need.id,recipient.id);
      if(existing && ['pending','accepted'].includes(existing.status)) throw conflict('invitation_already_active');
      const invitationId=existing?.id??newId();
      try{
        await ctx.sql.batch([
          existing
            ? ctx.sql.stmt(
              `UPDATE dream_need_invitations
               SET status='pending',invited_by=?,message=?,created_at=CURRENT_TIMESTAMP,
                 responded_at=NULL,removed_at=NULL,offer_id=NULL WHERE id=?`,
              viewer.id,message??null,invitationId)
            : ctx.sql.stmt(
              `INSERT INTO dream_need_invitations
               (id,dream_id,need_id,invited_by,invited_user_id,message,status)
               VALUES(?,?,?,?,?,?,'pending')`,
              invitationId,need.dream_id,need.id,viewer.id,recipient.id,message??null),
          notifyStmt(ctx.sql,{
            userId:recipient.id,type:'dream.talent_invitation.received',category:'collaboration',
            actorId:viewer.id,entityType:'need_invitation',entityId:invitationId,
            params:{actor:viewer.displayName,dream:dream.title,need:need.label},
            deepLink:'/talent-invitations',
            dedupeKey:'talent-invite:'+invitationId+':'+Date.now(),
          }),
          auditStmt(ctx.sql,viewer.id,'talent_invitation_created','dream_need_invitation',invitationId,ctx.requestId),
        ]);
      }catch(e){mapSqlError(e);}
      return {invitation:{id:invitationId,needId:need.id,dreamId:need.dream_id,status:'pending',
        recipient:{handle:recipient.handle,displayName:recipient.display_name}}};
    });

  r.add('GET','/api/dreams/:id/need-invitations',
    {tag:'Needs',summary:'List outgoing talent invitations for a Dream (owners)',auth:'required'},
    async ctx=>{
      await requireDreamOwner(ctx.sql,ctx.param('id'),await ctx.user());
      const rows=await ctx.sql.all<Invitation&{handle:string;display_name:string}>(
        `SELECT i.*,n.label,n.category,d.title,u.handle,u.display_name
         FROM dream_need_invitations i
         JOIN dream_needs n ON n.id=i.need_id
         JOIN dreams d ON d.id=i.dream_id
         JOIN users u ON u.id=i.invited_user_id
         WHERE i.dream_id=? ORDER BY i.created_at DESC`,ctx.param('id'));
      return {items:rows.map(i=>({
        id:i.id,needId:i.need_id,need:i.label,status:i.status,
        recipient:{handle:i.handle,displayName:i.display_name},createdAt:iso(i.created_at),
      }))};
    });

  r.add('GET','/api/me/need-invitations',
    {tag:'Needs',summary:'Invitations to fill someone else’s talent need',auth:'required'},
    async ctx=>{
      const viewer=await ctx.user();
      const rows=await ctx.sql.all<Invitation&{handle:string;display_name:string;message:string|null}>(
        `SELECT i.*,n.label,n.category,d.title,u.handle,u.display_name
         FROM dream_need_invitations i
         JOIN dream_needs n ON n.id=i.need_id
         JOIN dreams d ON d.id=i.dream_id AND d.deleted_at IS NULL
         JOIN users u ON u.id=i.invited_by
         WHERE i.invited_user_id=? AND i.status IN ('pending','accepted')
         ORDER BY i.created_at DESC LIMIT 100`,viewer.id);
      return {items:rows.map(i=>({
        id:i.id,need:i.label,needId:i.need_id,dreamId:i.dream_id,
        dreamTitle:i.title,status:i.status,message:i.message,
        from:{handle:i.handle,displayName:i.display_name},
        createdAt:iso(i.created_at),
      }))};
    });

  r.add('POST','/api/need-invitations/:id/respond',
    {tag:'Needs',summary:'Recipient accepts or declines invitation; acceptance atomically fills one slot',auth:'required'},
    async ctx=>{
      const viewer=await ctx.user();
      const inv=await load(ctx,ctx.param('id'));
      if(inv.invited_user_id!==viewer.id) throw notFound();
      if(inv.status!=='pending') throw conflict('invitation_not_pending');
      const v=new V(await ctx.body());
      const accept=v.bool('accept',{required:true});v.done();
      const dream=await ctx.sql.first<{phase:string;deleted_at:string|null}>(
        'SELECT phase,deleted_at FROM dreams WHERE id=?',inv.dream_id);
      if(!dream||dream.deleted_at||toApiPhase(dream.phase)==='floraison')throw conflict('dream_not_open');
      if(accept && await blockedBetween(ctx.sql,inv.invited_by,viewer.id))throw notFound();
      const offer=accept?await ctx.sql.first<{id:string;status:string}>(
        'SELECT id,status FROM dream_help_offers WHERE need_id=? AND offered_by=?',
        inv.need_id,viewer.id):null;
      if(accept && offer?.status==='accepted')throw conflict('existing_accepted_offer');
      const offerId=offer?.id??newId();
      const stmts:D1PreparedStatement[]=[];
      if(accept){
        stmts.push(
          offer
            ? ctx.sql.stmt(
              `UPDATE dream_help_offers SET status='pending',responded_at=NULL,responded_by=NULL
               WHERE id=? AND status IN ('declined','withdrawn','pending')`,offerId)
            : ctx.sql.stmt(
              `INSERT INTO dream_help_offers
               (id,need_id,dream_id,offered_by,status)
               VALUES(?,?,?,?,'pending')`,offerId,inv.need_id,inv.dream_id,viewer.id),
          ctx.sql.stmt(
            `UPDATE dream_help_offers SET status='accepted',responded_at=CURRENT_TIMESTAMP,responded_by=?
             WHERE id=? AND status='pending'`,inv.invited_by,offerId),
          ctx.sql.stmt(
            `INSERT INTO dream_collaborators(dream_id,user_id,status,role_title,invited_by,accepted_at)
             VALUES(?,?,'accepted',?,?,CURRENT_TIMESTAMP)
             ON CONFLICT(dream_id,user_id) DO UPDATE SET status='accepted',accepted_at=CURRENT_TIMESTAMP`,
            inv.dream_id,viewer.id,inv.label,inv.invited_by),
          ctx.sql.stmt(
            `INSERT OR IGNORE INTO conversation_members(conversation_id,user_id,role)
             SELECT id,?,'member' FROM conversations WHERE dream_id=? AND type='dream'`,
            viewer.id,inv.dream_id),
          ctx.sql.stmt(
            `UPDATE conversation_members SET left_at=NULL WHERE user_id=?
             AND conversation_id=(SELECT id FROM conversations WHERE dream_id=? AND type='dream')`,
            viewer.id,inv.dream_id),
        );
      }
      stmts.push(
        ctx.sql.stmt(
          `UPDATE dream_need_invitations SET status=?,responded_at=CURRENT_TIMESTAMP,offer_id=?
           WHERE id=? AND status='pending'`,
          accept?'accepted':'declined',accept?offerId:null,inv.id),
        notifyStmt(ctx.sql,{
          userId:inv.invited_by,type:accept?'dream.talent_invitation.accepted':'dream.talent_invitation.declined',
          category:'collaboration',actorId:viewer.id,entityType:'dream',entityId:inv.dream_id,
          params:{actor:viewer.displayName,need:inv.label,dream:inv.title},
          deepLink:'/my-space',dedupeKey:'talent-inv-response:'+inv.id+':'+Date.now(),
        }),
        auditStmt(ctx.sql,viewer.id,accept?'talent_invitation_accepted':'talent_invitation_declined',
          'dream_need_invitation',inv.id,ctx.requestId),
      );
      try{await ctx.sql.batch(stmts);}catch(e){
        if(String(e).includes('slots_filled')||String(e).includes('CHECK constraint failed')){
          throw conflict('need_full','The talent slot is already filled.');
        }
        mapSqlError(e);
      }
      return {invitation:{id:inv.id,status:accept?'accepted':'declined'},need:{id:inv.need_id,filled:!!accept}};
    });

  r.add('DELETE','/api/need-invitations/:id',
    {tag:'Needs',summary:'Owner removes invitation or accepted helper; member is notified',auth:'required'},
    async ctx=>{
      const viewer=await ctx.user();
      const inv=await load(ctx,ctx.param('id'));
      await requireDreamOwner(ctx.sql,inv.dream_id,viewer);
      if(!['pending','accepted'].includes(inv.status))throw conflict('invitation_not_active');
      const stmts:D1PreparedStatement[]=[];
      if(inv.status==='accepted' && inv.offer_id){
        stmts.push(
          ctx.sql.stmt(
            `UPDATE dream_help_offers SET status='declined',responded_at=CURRENT_TIMESTAMP,
             responded_by=? WHERE id=? AND status='accepted'`,viewer.id,inv.offer_id),
          ...unjoinIfNoRoles(ctx,inv.dream_id,inv.invited_user_id),
        );
      }
      stmts.push(
        ctx.sql.stmt(
          `UPDATE dream_need_invitations SET status='removed',removed_at=CURRENT_TIMESTAMP
           WHERE id=? AND status IN ('pending','accepted')`,inv.id),
        notifyStmt(ctx.sql,{
          userId:inv.invited_user_id,type:'dream.talent_invitation.removed',
          category:'collaboration',actorId:viewer.id,entityType:'dream',entityId:inv.dream_id,
          params:{dream:inv.title,need:inv.label},deepLink:'/talent-invitations',
          dedupeKey:'talent-inv-removed:'+inv.id+':'+Date.now(),
        }),
        auditStmt(ctx.sql,viewer.id,'talent_invitation_removed','dream_need_invitation',inv.id,ctx.requestId),
      );
      try{await ctx.sql.batch(stmts);}catch(e){mapSqlError(e);}
      return {removed:true,needId:inv.need_id};
    });
}
