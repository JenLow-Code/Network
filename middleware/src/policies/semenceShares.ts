import type {Sql} from '../core/database';
import type {Viewer} from '../core/context';
import {notFound} from '../core/errors';
import {blockedBetween} from '../privacy/blocking';
import {mutuallyConnected} from '../privacy/consent';
import {canSee} from '../privacy/visibility';
export async function requireVisibleSemenceShare(sql:Sql,viewer:Viewer|null,id:string):Promise<void>{
 const r=await sql.first<{author_id:string;visibility:string;account_status:string;profile_visibility:string|null}>("SELECT s.author_id,s.visibility,u.account_status,p.profile_visibility FROM semence_shares s JOIN users u ON u.id=s.author_id LEFT JOIN user_preferences p ON p.user_id=s.author_id WHERE s.id=?",id);
 if(!r||r.account_status!=='active'||await blockedBetween(sql,viewer?.id,r.author_id))throw notFound();
 if(viewer?.id===r.author_id)return;
 if(!canSee(r.profile_visibility,!!viewer,false))throw notFound();
 if(r.visibility==='public')return;
 if(r.visibility!=='friends'||!viewer||!await mutuallyConnected(sql,viewer.id,r.author_id))throw notFound();
}
