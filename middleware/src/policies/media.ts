import type {Sql} from '../core/database';
import type {Viewer} from '../core/context';
import {notFound} from '../core/errors';
/** Owner-only. Shared media will require reauthorization of the parent resource. */
export async function requireOwnedReadyMedia(sql:Sql,viewer:Viewer,id:string,kinds?:readonly string[]):Promise<void>{
 const m=await sql.first<{owner_id:string;storage_status:string;media_type:string}>("SELECT owner_id,storage_status,media_type FROM media_assets WHERE id=? AND deleted_at IS NULL",id);
 if(!m||m.owner_id!==viewer.id||m.storage_status!=='ready'||(kinds&&!kinds.includes(m.media_type)))throw notFound();
}
