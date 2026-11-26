import type {Sql} from '../core/database';
import type {Viewer} from '../core/context';
import {notFound} from '../core/errors';
import {blockedBetween} from '../privacy/blocking';
import {canSee} from '../privacy/visibility';
import {dreamRole,loadVisibleDream} from '../authorization/access';
export {actionsFor,allows,viewerActions} from './publicationActions';
/** Conservative until specialized talent and music read policies are validated. */
export async function requireVisiblePublication(sql:Sql,viewer:Viewer|null,id:string):Promise<void>{
 const p=await sql.first<{author_id:string;visibility:string;type:string;dream_id:string|null;account_status:string;deleted_at:string|null;moderation_hidden_at:string|null}>("SELECT p.author_id,p.visibility,p.type,p.dream_id,p.deleted_at,p.moderation_hidden_at,u.account_status FROM publications p JOIN users u ON u.id=p.author_id WHERE p.id=?",id);
 if(!p||p.deleted_at||p.moderation_hidden_at||p.account_status!=='active')throw notFound();
 if(await blockedBetween(sql,viewer?.id,p.author_id))throw notFound();
 let owner=viewer?.id===p.author_id;
 if(p.type==='dream'){
   if(!p.dream_id)throw notFound();
   await loadVisibleDream(sql,p.dream_id,viewer);
   owner=owner||(await dreamRole(sql,p.dream_id,viewer?.id)).isOwner;
 }
 if(!canSee(p.visibility,!!viewer,owner))throw notFound();
 if(p.type!=='dream'&&p.type!=='bible'&&!owner)throw notFound();
}
