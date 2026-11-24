import type {Sql} from '../core/database';
import type {Viewer} from '../core/context';
import {notFound} from '../core/errors';
import {blockedBetween} from '../privacy/blocking';
import {mutuallyConnected} from '../privacy/consent';
import {dreamRole} from '../authorization/access';
export async function requireVisibleEvent(sql:Sql,viewer:Viewer|null,id:string):Promise<void>{
 const e=await sql.first<{creator_id:string;visibility:string;account_status:string}>("SELECT e.creator_id,e.visibility,u.account_status FROM agenda_events e JOIN users u ON u.id=e.creator_id WHERE e.id=?",id);
 if(!e||e.account_status!=='active'||await blockedBetween(sql,viewer?.id,e.creator_id))throw notFound();
 if(viewer?.id===e.creator_id||e.visibility==='public')return;
 if(!viewer||!await sql.exists("SELECT 1 FROM agenda_invites WHERE event_id=? AND user_id=? AND status<>'cancelled'",id,viewer.id))throw notFound();
}
export async function mayInvite(sql:Sql,viewer:Viewer,inviteeId:string,dreamId:string|null):Promise<boolean>{
 if(await blockedBetween(sql,viewer.id,inviteeId))return false;
 if(!await sql.exists("SELECT 1 FROM users WHERE id=? AND account_status='active'",inviteeId))return false;
 if(await mutuallyConnected(sql,viewer.id,inviteeId))return true;
 if(!dreamId)return false;
 const a=await dreamRole(sql,dreamId,viewer.id),b=await dreamRole(sql,dreamId,inviteeId);
 return (a.isOwner||a.isCollaborator)&&(b.isOwner||b.isCollaborator);
}
