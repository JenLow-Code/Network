import type {Sql} from '../core/database';
import type {Viewer} from '../core/context';
import {notFound} from '../core/errors';
import {blockedBetween} from '../privacy/blocking';
import {canSee} from '../privacy/visibility';
export async function requireVisibleProfile(sql:Sql,viewer:Viewer|null,userId:string):Promise<void>{
 const p=await sql.first<{id:string;account_status:string;profile_visibility:string|null}>("SELECT u.id,u.account_status,p.profile_visibility FROM users u LEFT JOIN user_preferences p ON p.user_id=u.id WHERE u.id=?",userId);
 if(!p||p.account_status!=='active')throw notFound();
 if(viewer?.id===p.id)return;
 if(!canSee(p.profile_visibility,!!viewer,false)||await blockedBetween(sql,viewer?.id,p.id))throw notFound();
}
