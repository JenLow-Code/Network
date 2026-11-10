import React, { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppTheme } from '@/theme/AppTheme';
import { api, ApiRequestError } from '@/lib/api/client';
import type { DreamBlock, DreamEntry } from '@/domain/dreamWorkspace';

type Visibility='public'|'friends';
export type PublishedSemence={
 id:string;title:string;summary:string;visibility:Visibility;
 coverUrl:string|null;createdAt:string;
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
export default function SemencePublishActions({dream,picked}:{
 dream:DreamEntry;picked:DreamBlock[];
}){
 const theme=useAppTheme();
 const [busy,setBusy]=useState(false);
 const [result,setResult]=useState<PublishedSemence|null>(null);
 const [notice,setNotice]=useState('');
 const publish=async(visibility:Visibility)=>{
   if(busy||!picked.length)return;
   setBusy(true);setNotice('');setResult(null);
   try{
     const blocks=await Promise.all(picked.map(publicBlock));
     const coverUrl=dream.image?await shrinkImage(dream.image).catch(()=>''):'';
     const response=await api<{item:PublishedSemence}>('/api/semence-shares',{
       method:'POST',auth:'required',body:{
         title:dream.title,summary:dream.summary,sourceLocalId:dream.id,
         coverUrl,visibility,blocks,
       },
     });
     setResult(response.item);
     setNotice(visibility==='public'
       ?'Ta Semence est publiée sur ton profil, sans apparaître dans Discovery.'
       :'Ta Semence est visible uniquement par tes contacts et membres du Circle acceptés.');
   }catch(e){
     const code=e instanceof ApiRequestError?e.code:'';
     setNotice(code==='not_authenticated'
       ?'Connecte-toi avec ton compte JenLow pour publier.'
       :code==='network_unreachable'||e instanceof ApiRequestError&&e.status===404
       ?'Le service de publication JenLow n’est pas encore disponible sur ce serveur.'
       :code==='snapshot_too_large'||code==='image_requires_public_media'
       ?'Certaines images sont trop volumineuses pour être publiées. Réduis-les puis réessaie.'
       :e instanceof Error?e.message:'La publication a échoué. Rien n’a été publié.');
   }finally{setBusy(false);}
 };
 const action=(visibility:Visibility,name:string,
   icon:keyof typeof Ionicons.glyphMap)=>
   <Pressable accessibilityRole="button"
     accessibilityLabel={name}
     disabled={busy||!picked.length}
     onPress={()=>void publish(visibility)}
     style={{borderWidth:1,borderColor:theme.border,borderRadius:11,
       paddingHorizontal:13,paddingVertical:14,flexDirection:'row',
       alignItems:'center',gap:11,
       opacity:busy||!picked.length?.50:1}}>
     <Ionicons name={icon} size={20} color="#A5713D"/>
     <Text style={{fontSize:13,fontWeight:'600',color:theme.foreground,flex:1}}>
       {busy?'Publication en cours…':name}
     </Text>
     <Ionicons name="chevron-forward" size={16} color={theme.muted}/>
   </Pressable>;
 return <View style={{gap:10}}>
   {action('public','Publier sur mon profil','globe-outline')}
   {action('friends','Partager avec mes amis JenLow','people-outline')}
   {!!result?<Pressable accessibilityRole="button"
     onPress={()=>router.push({pathname:'/semence-share/[id]',params:{id:result.id}})}
     style={{borderWidth:1,borderColor:'#A5713D',borderRadius:10,
       padding:12,alignItems:'center',flexDirection:'row',gap:9}}>
     <Ionicons name="eye-outline" size={18} color="#A5713D"/>
     <Text style={{fontSize:12,fontWeight:'700',color:'#A5713D',flex:1}}>
       Voir la publication
     </Text>
     <Ionicons name="chevron-forward" color="#A5713D" size={16}/>
   </Pressable>:null}
   {!!notice?<Text accessibilityRole="alert"
     style={{fontSize:12,color:theme.muted,lineHeight:19}}>{notice}</Text>:null}
   <Text style={{fontSize:11,lineHeight:17,color:theme.muted}}>
     Seules les inspirations cochées sont envoyées. Les carnets personnels restent privés.
     Les documents importés localement ne sont pas joints aux publications en ligne.
   </Text>
 </View>;
}
