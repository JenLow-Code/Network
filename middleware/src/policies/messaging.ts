import type {Sql} from '../core/database';
import type {Viewer} from '../core/context';
import {notFound} from '../core/errors';
import {blockedBetween} from '../privacy/blocking';
export async function requireConversationMember(sql:Sql,viewer:Viewer,id:string):Promise<void>{
 const c=await sql.first<{type:string;dream_id:string|null}>("SELECT c.type,c.dream_id FROM conversations c JOIN conversation_members m ON m.conversation_id=c.id AND m.user_id=? AND m.left_at IS NULL WHERE c.id=?",viewer.id,id);
 if(!c)throw notFound();
 if(c.type==='direct'){
   const other=await sql.first<{user_id:string}>("SELECT user_id FROM conversation_members WHERE conversation_id=? AND user_id<>? AND left_at IS NULL",id,viewer.id);
   if(!other||await blockedBetween(sql,viewer.id,other.user_id))throw notFound();
 }
 if(c.dream_id&&c.type==='dream'&&!await sql.exists("SELECT 1 FROM dreams WHERE id=? AND deleted_at IS NULL",c.dream_id))throw notFound();
}
