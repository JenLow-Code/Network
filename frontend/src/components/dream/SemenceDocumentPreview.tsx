import React, { useEffect, useState } from 'react';
import { Image, Linking, Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import type { DreamBlock } from '@/domain/dreamWorkspace';

type Format='pdf'|'text'|'image'|'word'|'other';
function detect(block:DreamBlock):Format{
 const src=block.content.trim();
 const name=(block.title||'').toLowerCase();
 if(/^data:application\/pdf/i.test(src)||/\.pdf($|[?#])/i.test(name)||/\.pdf($|[?#])/i.test(src))return 'pdf';
 if(/^data:text\/plain/i.test(src)||/\.(txt|md|csv)($|[?#])/i.test(name)||/\.(txt|md|csv)($|[?#])/i.test(src))return 'text';
 if(/^data:image\//i.test(src)||/\.(png|jpg|jpeg|webp)($|[?#])/i.test(name))return 'image';
 if(/\.(doc|docx|odt|rtf)($|[?#])/i.test(name))return 'word';
 return 'other';
}
export const documentKind=detect;
export const documentLabel=(block:DreamBlock)=>(
 block.title?.trim()||'Document joint'
);
export function SemenceDocumentPreview({block}: {block:DreamBlock}){
 const theme=useAppTheme();
 const [previewUrl,setPreviewUrl]=useState('');
 const [textPreview,setTextPreview]=useState('');
 const [failed,setFailed]=useState(false);
 const format=detect(block);
 const content=block.content;
 useEffect(()=>{
  let live=true;
  let objectUrl='';
  setTextPreview('');setFailed(false);
  if(Platform.OS!=='web')return;
  if(format==='text'&&content.startsWith('data:')){
   void fetch(content).then(response=>response.text()).then(text=>{
     if(live)setTextPreview(text.slice(0,24000));
   }).catch(()=>{if(live)setFailed(true);});
  }
  if(format==='pdf'&&content.startsWith('data:')){
   void fetch(content).then(response=>response.blob()).then(blob=>{
     if(!live)return;
     objectUrl=URL.createObjectURL(blob);
     setPreviewUrl(objectUrl);
   }).catch(()=>{if(live)setFailed(true);});
  }else if(format==='pdf'&&/^https:\/\//i.test(content)){
   setPreviewUrl(content);
  }else{
   setPreviewUrl('');
  }
  return ()=>{live=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[block.id,content,format]);
 const open=()=>{
   if(Platform.OS==='web'&&typeof document!=='undefined'){
     if(content.startsWith('data:')){
       const a=document.createElement('a');a.href=content;
       a.download=block.title||'document';
       document.body.appendChild(a);a.click();a.remove();
       return;
     }
   }
   if(/^https?:\/\//.test(content)){
     void Linking.openURL(content).catch(()=>setFailed(true));
     return;
   }
   setFailed(true);
 };
 return <View style={{gap:12}}>
   <View style={{flexDirection:'row',alignItems:'center',gap:12,
     padding:13,borderWidth:1,borderColor:theme.border,borderRadius:12}}>
     <Ionicons name={format==='pdf'?'document-text-outline':
       format==='word'?'document-outline':'reader-outline'}
       size={28} color="#A5713D"/>
     <View style={{flex:1,gap:3}}>
       <Text numberOfLines={3} style={{fontWeight:'700',fontSize:14,
         color:theme.foreground}}>{documentLabel(block)}</Text>
       <Text style={{fontSize:11,color:theme.muted}}>
         {format==='pdf'?'PDF':format==='word'?'Word / document':
           format==='text'?'Texte':'Fichier joint'}
       </Text>
     </View>
   </View>
   {format==='pdf'&&Platform.OS==='web'&&previewUrl?
     <View style={{height:370,borderRadius:11,overflow:'hidden',
       borderWidth:1,borderColor:theme.border}}>
       {React.createElement('iframe' as any,{
         src:previewUrl,title:'Aperçu de '+documentLabel(block),
         style:{width:'100%',height:'100%',border:0,background:'#FFFFFF'},
       })}
     </View>:null}
   {format==='image'&&/^(https?:|data:image\/)/i.test(content)?
     <Image source={{uri:content}} resizeMode="contain"
       style={{height:270,width:'100%'}}/>:null}
   {format==='text'&&!!textPreview?<Text selectable
     style={{fontSize:13,lineHeight:21,color:theme.foreground,
       borderWidth:1,borderColor:theme.border,borderRadius:11,
       padding:13,maxHeight:350}}>{textPreview}</Text>:null}
   {(format==='word'||format==='other'||Platform.OS!=='web')?
     <Text style={{color:theme.muted,fontSize:12,lineHeight:18}}>
       {format==='word'?'Les documents Word s’ouvrent dans une application compatible.':
        'L’aperçu intégré de ce format n’est pas disponible ici.'}
     </Text>:null}
   {failed?<Text accessibilityRole="alert" style={{fontSize:12,color:'#B04E5A'}}>
     Aperçu indisponible. Tu peux essayer d’ouvrir le fichier.
   </Text>:null}
   <Pressable accessibilityRole="button" onPress={open}
     style={{borderWidth:1,borderColor:'#A5713D',padding:12,borderRadius:10,
       flexDirection:'row',justifyContent:'center',alignItems:'center',gap:8}}>
     <Ionicons name="open-outline" size={17} color="#A5713D"/>
     <Text style={{fontSize:13,fontWeight:'700',color:'#A5713D'}}>
       {content.startsWith('data:')?'Télécharger le document':'Ouvrir le document'}
     </Text>
   </Pressable>
 </View>;
}
