import type { Router } from '../http/router';
import type { Ctx, Viewer } from '../http/context';
import { V } from '../http/validate';
import { notFound, unprocessable, forbidden } from '../http/errors';
import { iso, newId } from '../lib/util';
import { areContacts, blockedBetween, inCircle, userByHandle } from '../services/access';
import { enforceLimit, LIMITS } from '../http/rateLimit';

type ShareRow={
 id:string;author_id:string;title:string;summary:string;cover_url:string|null;
 visibility:'public'|'friends';blocks_json:string;created_at:string;
 handle:string;display_name:string;profile_visibility:string|null;account_status:string;
};
const SELECT='SELECT s.*,u.handle,u.display_name,u.account_status,p.profile_visibility FROM semence_shares s JOIN users u ON u.id=s.author_id LEFT JOIN user_preferences p ON p.user_id=s.author_id';
const KINDS=new Set(['image','gallery','quote','poem','note','link','bookmark','embed','bible-verse','publication-ref','document','pdf','audio','music','video']);
const NOTE_KINDS=new Set(['text','heading','bullet','numbered','checklist','toggle','quote']);
const SIZES=new Set(['1x1','2x1','1x2','2x2']);
const COLORS=new Set(['default','pink','blue','green','sand']);
function str(value:unknown,max:number):string{
 return typeof value==='string'?value.trim().slice(0,max):'';
}
function media(value:unknown):string{
 if(typeof value!=='string')return '';
 const url=value.trim();
 if(url.length<2048&&/^https:\/\/\S+$/i.test(url))return url;
 if(url.length<=110000&&/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(url))return url;
 return '';
}
function block(raw:unknown,index:number){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw unprocessable('invalid_inspiration');
 const b=raw as Record<string,unknown>;
 const kind=String(b.kind||'');
 if(!KINDS.has(kind))throw unprocessable('unsupported_inspiration');
 let content=str(b.content,12000);
 const savedMedia=Array.isArray(b.media)?b.media.map(media).filter(Boolean).slice(0,2):[];
 if(kind==='image'||kind==='gallery'){
   const url=media(savedMedia[0]||content);
   if(!url)throw unprocessable('image_requires_public_media',
     'Image trop volumineuse ou inaccessible pour une publication. Choisis un fichier plus léger.');
   content=url;savedMedia.splice(0,savedMedia.length,url);
 }
 if(kind==='document'||kind==='pdf'){
   if(!/^https:\/\//i.test(content))content='';
   savedMedia.splice(0,savedMedia.length);
 }
 if(['link','bookmark','embed'].includes(kind)&&!/^https:\/\//i.test(content))
   throw unprocessable('invalid_link');
 if(kind==='publication-ref'&&!/^[A-Za-z0-9_-]{1,80}$/.test(content))
   throw unprocessable('invalid_publication_reference');
 let noteBlocks:Record<string,unknown>[]|undefined;
 if(kind==='note'){
   const parts=Array.isArray(b.noteBlocks)?b.noteBlocks:[];
   if(parts.length>120)throw unprocessable('too_many_note_blocks');
   noteBlocks=parts.flatMap((value:any,i:number)=>{
     if(!value||typeof value!=='object'||!NOTE_KINDS.has(String(value.type)))return [];
     return [{
       id:str(value.id,80)||'note-'+i,type:String(value.type),
       text:str(value.text,4000),title:str(value.title,140),
       checked:value.checked===true,collapsed:value.collapsed===true,
       bold:value.bold===true,italic:value.italic===true,
       color:COLORS.has(String(value.color))?value.color:'default',
       checkShape:value.checkShape==='circle'?'circle':'square',
     }];
   });
   content=noteBlocks.map(p=>String(p.text)).join('\n').slice(0,12000);
 }
 return {
   id:str(b.id,80)||'block-'+index,kind,content,title:str(b.title,160),
   tileSize:SIZES.has(String(b.tileSize))?b.tileSize:'1x1',
   media:savedMedia,icon:str(b.icon,60),caption:str(b.caption,140),
   ...(noteBlocks?{noteBlocks}:{}),
 };
}
function view(row:ShareRow,details=false){
 return {
  id:row.id,title:row.title,summary:row.summary,coverUrl:row.cover_url,
  visibility:row.visibility,createdAt:iso(row.created_at),
  author:{handle:row.handle,displayName:row.display_name},
  ...(details?{blocks:JSON.parse(row.blocks_json)}:{}),
 };
}
async function allowed(ctx:Ctx,row:ShareRow,viewer:Viewer|null):Promise<boolean>{
 if(viewer?.id===row.author_id)return true;
 if(row.account_status!=='active')return false;
 if(row.profile_visibility==='private'||(row.profile_visibility==='members'&&!viewer))return false;
 if(viewer&&await blockedBetween(ctx.sql,viewer.id,row.author_id))return false;
 if(row.visibility==='public')return true;
 if(!viewer)return false;
 return ((await areContacts(ctx.sql,viewer.id,row.author_id))&&
   (await areContacts(ctx.sql,row.author_id,viewer.id)))||
   await inCircle(ctx.sql,viewer.id,row.author_id);
}
export function registerSemenceShares(r:Router):void{
 r.add('POST','/api/semence-shares',{tag:'Semence',summary:'Publish selected Semence inspirations to profile or friends',auth:'required',status:201},async ctx=>{
   const viewer=await ctx.user();
   await enforceLimit(ctx.sql,'write',viewer.id,LIMITS.write);
   const body=await ctx.body();
   const v=new V(body);
   const title=v.str('title',{required:true,min:1,max:120});
   const summary=v.str('summary',{max:1500})||'';
   const visibility=v.oneOf('visibility',['public','friends'] as const,{required:true});
   const sourceLocalId=v.str('sourceLocalId',{required:true,max:120});
   const selected=v.array('blocks',x=>x,{required:true,max:40});
   v.done();
   if(!selected?.length)throw unprocessable('no_inspirations_selected');
   const blocks=selected.map(block);
   const json=JSON.stringify(blocks);
   if(json.length>180000)throw unprocessable('snapshot_too_large',
     'Sélection trop volumineuse. Réduis le nombre ou la taille des images.');
   const coverUrl=media(body.coverUrl)||null;
   const id=newId();
   await ctx.sql.run('INSERT INTO semence_shares(id,author_id,source_local_id,title,summary,cover_url,visibility,blocks_json) VALUES(?,?,?,?,?,?,?,?)',
     id,viewer.id,sourceLocalId!,title!,summary,coverUrl,visibility!,json);
   const saved=await ctx.sql.first<ShareRow>(SELECT+' WHERE s.id=?',id);
   return {item:view(saved!,true)};
 });
 r.add('GET','/api/semence-shares/:id',{tag:'Semence',summary:'Read a published Semence with visibility checks',auth:'optional'},async ctx=>{
   const row=await ctx.sql.first<ShareRow>(SELECT+' WHERE s.id=? AND s.deleted_at IS NULL',ctx.param('id'));
   if(!row||!(await allowed(ctx,row,await ctx.viewer())))throw notFound();
   return {item:view(row,true)};
 });
 r.add('GET','/api/me/semence-shares',{tag:'Semence',summary:'List my published Semence snapshots',auth:'required'},async ctx=>{
   const viewer=await ctx.user();
   const rows=await ctx.sql.all<ShareRow>(SELECT+' WHERE s.author_id=? AND s.deleted_at IS NULL ORDER BY s.created_at DESC LIMIT 80',viewer.id);
   return {items:rows.map(row=>view(row))};
 });
 r.add('GET','/api/users/:handle/semence-shares',{tag:'Semence',summary:'Profile Semence publications visible to a viewer',auth:'optional'},async ctx=>{
   const author=await userByHandle(ctx.sql,ctx.param('handle'));
   if(!author)throw notFound();
   const viewer=await ctx.viewer();
   if(author.account_status!=='active'&&viewer?.id!==author.id)throw notFound();
   const rows=await ctx.sql.all<ShareRow>(SELECT+' WHERE s.author_id=? AND s.deleted_at IS NULL ORDER BY s.created_at DESC LIMIT 80',author.id);
   const items=[];
   for(const row of rows)if(await allowed(ctx,row,viewer))items.push(view(row));
   return {items};
 });
 r.add('DELETE','/api/semence-shares/:id',{tag:'Semence',summary:'Unpublish my Semence snapshot',auth:'required'},async ctx=>{
   const viewer=await ctx.user();
   const row=await ctx.sql.first<{author_id:string}>('SELECT author_id FROM semence_shares WHERE id=? AND deleted_at IS NULL',ctx.param('id'));
   if(!row)throw notFound();
   if(row.author_id!==viewer.id)throw forbidden('owner_only');
   await ctx.sql.run('UPDATE semence_shares SET deleted_at=CURRENT_TIMESTAMP WHERE id=?',ctx.param('id'));
   return {deleted:true};
 });
}
