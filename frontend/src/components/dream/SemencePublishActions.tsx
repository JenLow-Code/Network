import { Platform } from 'react-native';
import { api, ApiRequestError } from '@/lib/api/client';
import type { DreamBlock, DreamEntry } from '@/domain/dreamWorkspace';

export type Visibility='public'|'friends';
export type PublishedSemence={
 id:string;title:string;summary:string;visibility:Visibility;
 coverUrl:string|null;createdAt:string;previewImages?:string[];
 author:{handle:string;displayName:string};
 blocks?:DreamBlock[];
};
/** Downsample local data images *in the user's browser* before sending an explicitly selected share. */
async function shrinkImage(uri:string):Promise<string>{
 if(!uri.startsWith('data:image/'))return uri;
 if(uri.length<90000)return uri;
 if(Platform.OS!=='web'||typeof document==='undefined')
   throw new Error('Image locale trop volumineuse sur cet appareil. Utilise une image plus légère.');
 const img=document.createElement('img');
 const ready=new Promise<void>((resolve,reject)=>{
   img.onload=()=>resolve();img.onerror=()=>reject(new Error('Image illisible'));
 });
 img.src=uri;await ready;
 const canvas=document.createElement('canvas');
 const ratio=Math.min(1,640/Math.max(img.naturalWidth,img.naturalHeight));
 canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));
 canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));
 const ctx=canvas.getContext('2d');
 if(!ctx)throw new Error('Conversion de l’image indisponible');
 ctx.drawImage(img,0,0,canvas.width,canvas.height);
 for(const quality of [.70,.52,.38,.27]){
   const next=canvas.toDataURL('image/jpeg',quality);
   if(next.length<100000)return next;
 }
 throw new Error('Cette image est encore trop volumineuse pour la publication.');
}
async function publicBlock(b:DreamBlock):Promise<DreamBlock>{
 const prepared={...b,media:b.media?[...b.media]:[]};
 if(b.kind==='image'||b.kind==='gallery'){
   const src=b.media?.[0]||b.content;
   const image=await shrinkImage(src);
   if(!/^https:\/\/|^data:image\//i.test(image))
     throw new Error('Impossible de publier une image locale non téléversée.');
   prepared.content=image;prepared.media=[image];
 }
 // Documents uploaded only on this device stay there; exported publication includes
 // their filename, never silently uploads the binary or someone's personal file.
 if((b.kind==='document'||b.kind==='pdf')&&
   (b.content.startsWith('data:')||b.content.startsWith('file:'))){
   prepared.content='';
   prepared.media=[];
 }
 return prepared;
}

/** Performs the write only after the user has reviewed the profile preview and confirmed it. */
export async function publishSemenceSnapshot(
 dream:DreamEntry,picked:DreamBlock[],visibility:Visibility,
):Promise<PublishedSemence>{
 if(!picked.length)throw new Error('Choisis au moins une inspiration.');
 const blocks=await Promise.all(picked.map(publicBlock));
 const coverUrl=dream.image?await shrinkImage(dream.image).catch(()=>''):'';
 const response=await api<{item:PublishedSemence}>('/api/semence-shares',{
   method:'POST',auth:'required',body:{
     title:dream.title,summary:dream.summary,sourceLocalId:dream.id,
     coverUrl,visibility,blocks,
   },
 });
 return response.item;
}
export function explainSemencePublishError(e:unknown):string{
 const code=e instanceof ApiRequestError?e.code:'';
 if(code==='not_authenticated')return 'Connecte-toi avec ton compte JenLow pour publier.';
 if(code==='network_unreachable'||e instanceof ApiRequestError&&e.status===404)
   return 'Le service de publication JenLow n’est pas encore disponible sur ce serveur.';
 if(code==='snapshot_too_large'||code==='image_requires_public_media')
   return 'Certaines images sont trop volumineuses pour être publiées. Réduis-les puis réessaie.';
 return e instanceof Error?e.message:'La publication a échoué. Rien n’a été publié.';
}
