import React, { useState } from 'react';
import { Image, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import type { DreamBlock, DreamEntry } from '@/domain/dreamWorkspace';

const BROWN='#A5713D';
const escapeHtml=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const isImage=(b:DreamBlock)=>['image','gallery'].includes(b.kind);
const imageSrc=(b:DreamBlock)=>{
 const value=(b.media?.[0]||b.content).trim();
 return /^(https:\/\/|http:\/\/|data:image\/(?:png|jpeg|webp|gif);base64,)/i.test(value)?value:'';
};
const label=(b:DreamBlock)=>b.kind==='quote'?b.title?.trim()||'Citation':
  b.kind==='bible-verse'?b.title||'Verset biblique':
  b.title?.trim()||({link:'Lien',document:'Document','publication-ref':'Publication'} as Record<string,string>)[b.kind]||'Inspiration';
const description=(b:DreamBlock)=>{
 if(isImage(b))return b.title||'';
 if(b.kind==='document'&&b.content.startsWith('data:'))return 'Document joint';
 return b.content;
};
const htmlFor=(dream:DreamEntry,blocks:DreamBlock[])=>{
 const parts=blocks.map(b=>{
   const heading='<h2>'+escapeHtml(label(b))+'</h2>';
   const src=imageSrc(b);
   if(isImage(b)&&src)return '<section>'+(b.title?heading:'')+
     '<img src="'+escapeHtml(src)+'" alt="'+escapeHtml(b.title||'Inspiration')+'"></section>';
   if(b.kind==='note'&&b.noteBlocks?.length){
   const note=b.noteBlocks.map(part=>{
     const body=escapeHtml(part.text||'').replace(/\n/g,'<br>');
     const style=(part.bold?'font-weight:bold;':'')+(part.italic?'font-style:italic;':'');
     if(part.type==='heading')return '<h3>'+body+'</h3>';
     if(part.type==='checklist')return '<p>'+ (part.checked?'☑ ':'☐ ')+
       '<span style="'+style+'">'+body+'</span></p>';
     if(part.type==='toggle')return '<details open><summary>'+
       escapeHtml(part.title||'Section')+'</summary><p>'+body+'</p></details>';
     if(part.type==='bullet')return '<p>• <span style="'+style+'">'+body+'</span></p>';
     if(part.type==='numbered')return '<p>— <span style="'+style+'">'+body+'</span></p>';
     return '<p style="'+style+'">'+body+'</p>';
   }).join('');
   return '<section>'+heading+note+'</section>';
 }
 const contents=description(b);
   return '<section>'+heading+'<p'+(b.kind==='quote'?' class="quote"':'')+'>'+
     escapeHtml(contents).replace(/\n/g,'<br>')+'</p></section>';
 }).join('');
 return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>'+
   escapeHtml(dream.title)+'</title><style>'+
   '@page{size:A4;margin:22mm}body{font:15px/1.65 Georgia,serif;color:#2b2724;max-width:760px;margin:0 auto;padding:28px}'+
   'header{border-bottom:2px solid #B88962;padding-bottom:14px;margin-bottom:25px}h1{font-size:29px;font-weight:400;line-height:1.2}'+
   'h2{font-size:15px;font-family:Arial,sans-serif}p{white-space:normal}.muted{color:#777;font:12px Arial,sans-serif}'+
   'section{margin:24px 0;page-break-inside:avoid}img{max-width:100%;max-height:460px;object-fit:contain}'+
   '.quote{font-size:19px;font-style:italic}'+
   '</style></head><body><header><span class="muted">JENLOW · SEMENCE</span><h1>'+
   escapeHtml(dream.title)+'</h1><p>'+escapeHtml(dream.summary||'')+'</p></header>'+parts+'</body></html>';
};
const textFor=(dream:DreamEntry,blocks:DreamBlock[])=>
  [dream.title,dream.summary,...blocks.flatMap(b=>[label(b),description(b)])]
  .filter(Boolean).join('\n\n');

export default function SemenceShare({dream,initialIds,onClose}:{
 dream:DreamEntry;initialIds?:string[]|null;onClose:()=>void;
}){
 const theme=useAppTheme();
 const blocks=(dream.blocks||[]).filter(b=>b.kind!=='todo');
 const [selected,setSelected]=useState<string[]>(()=>
   initialIds?.length?blocks.filter(b=>initialIds.includes(b.id)).map(b=>b.id):blocks.map(b=>b.id));
 const [notice,setNotice]=useState('');
 const picked=blocks.filter(b=>selected.includes(b.id));
 const setAll=(all:boolean)=>setSelected(all?blocks.map(b=>b.id):[]);
 const toggle=(id:string)=>setSelected(current=>current.includes(id)
   ?current.filter(x=>x!==id):[...current,id]);
 const exportHtml=()=>{
   if(!picked.length)return;
   if(Platform.OS!=='web'||typeof document==='undefined'){
     setNotice('L’export HTML est disponible depuis le site web JenLow.');
     return;
   }
   const content=htmlFor(dream,picked);
   const blob=new Blob([content],{type:'text/html;charset=utf-8'});
   const url=URL.createObjectURL(blob);
   const a=document.createElement('a');
   a.href=url;a.download=(dream.title||'Semence').replace(/[^a-z0-9à-ÿ _-]/gi,'').slice(0,70)+'.html';
   document.body.appendChild(a);a.click();a.remove();
   setNotice('Page HTML exportée avec les inspirations sélectionnées.');
 };
 const exportWord=()=>{
   if(!picked.length)return;
   if(Platform.OS!=='web'||typeof document==='undefined'){
     setNotice('L’export Word est pour le moment disponible sur le site web.');
     return;
   }
   const html=htmlFor(dream,picked);
   const blob=new Blob(['\ufeff',html],{type:'application/msword;charset=utf-8'});
   const url=URL.createObjectURL(blob);
   const a=document.createElement('a');
   a.href=url;
   a.download=(dream.title||'Semence').replace(/[^a-z0-9à-ÿ _-]/gi,'').slice(0,70)+'.doc';
   document.body.appendChild(a);a.click();a.remove();
   // Retain the Blob URL until after the click has been dispatched.
   setNotice('Document Word (.doc) généré. Son contenu correspond aux inspirations sélectionnées.');
 };
 const printPdf=()=>{
   if(!picked.length)return;
   if(Platform.OS!=='web'||typeof window==='undefined'){
     setNotice('Pour enregistrer un PDF, ouvre cette semence dans ton navigateur web.');
     return;
   }
   const child=window.open('','_blank');
   if(!child){setNotice('Autorise les nouvelles fenêtres pour enregistrer en PDF.');return;}
   child.document.open();
   child.document.write(htmlFor(dream,picked));
   child.document.close();
   child.focus();
   setNotice('Dans la nouvelle fenêtre : Imprimer → Enregistrer au format PDF.');
 };

 return <Modal visible transparent animationType="slide" onRequestClose={onClose}>
   <View style={{flex:1,justifyContent:'flex-end'}}>
     <Pressable accessibilityRole="button" accessibilityLabel="Fermer l’aperçu"
       onPress={onClose} style={{flex:1,backgroundColor:'rgba(0,0,0,.42)'}}/>
     <View style={{maxHeight:'91%',paddingTop:14,paddingHorizontal:18,
       paddingBottom:Platform.OS==='ios'?35:24,
       borderTopLeftRadius:23,borderTopRightRadius:23,
       backgroundColor:theme.background,gap:12}}>
       <View style={{width:36,height:4,backgroundColor:theme.border,
         borderRadius:2,alignSelf:'center'}}/>
       <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
         <Text style={{fontSize:23,fontFamily:'serif',color:theme.foreground,
           flex:1}}>Publier cette semence</Text>
         <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose}
           style={{padding:6}}>
           <Ionicons name="close" size={22} color={theme.foreground}/>
         </Pressable>
       </View>
       <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled"
         contentContainerStyle={{paddingBottom:12,gap:15}}>
         <Text style={{fontSize:12,color:theme.muted,lineHeight:19}}>
           Choisis exactement les inspirations à inclure. Tes carnets privés ne sont jamais partagés.
         </Text>
         <View style={{gap:4}}>
           <Text style={{fontSize:19,fontFamily:'serif',color:theme.foreground}}>
             {dream.title}
           </Text>
           {!!dream.summary&&<Text style={{fontSize:12,lineHeight:19,
             color:theme.muted}}>{dream.summary}</Text>}
         </View>
         <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
           <Text style={{fontSize:12,color:theme.muted}}>
             {picked.length} inspiration{picked.length===1?'':'s'} sélectionnée{picked.length===1?'':'s'}
           </Text>
           <Pressable accessibilityRole="button"
             onPress={()=>setAll(picked.length!==blocks.length)} style={{padding:7}}>
             <Text style={{fontSize:12,fontWeight:'700',color:BROWN}}>
               {picked.length===blocks.length?'Tout désélectionner':'Tout sélectionner'}
             </Text>
           </Pressable>
         </View>
         {!blocks.length?<Text style={{color:theme.muted,fontSize:13}}>
           Ajoute d’abord une inspiration pour la partager.
         </Text>:blocks.map(block=>{
           const checked=selected.includes(block.id);
           return <Pressable key={block.id} accessibilityRole="checkbox"
             accessibilityLabel={'Inclure '+label(block)}
             accessibilityState={{checked}} onPress={()=>toggle(block.id)}
             style={{flexDirection:'row',alignItems:'center',gap:12,
               padding:10,borderRadius:10,borderWidth:1,borderColor:theme.border}}>
             <Ionicons name={checked?'checkbox':'square-outline'}
               size={23} color={checked?BROWN:theme.muted}/>
             {isImage(block)&&imageSrc(block)?
               <Image source={{uri:imageSrc(block)}} style={{width:49,height:49,
                 borderRadius:7}} resizeMode="cover"/>:
               <Ionicons name={block.kind==='quote'?'chatbubble-outline':'document-outline'}
                 size={21} color={theme.muted}/>}
             <View style={{flex:1,gap:2}}>
               <Text numberOfLines={1} style={{fontSize:13,fontWeight:'700',
                 color:theme.foreground}}>{label(block)}</Text>
               <Text numberOfLines={2} style={{fontSize:11,color:theme.muted}}>
                 {description(block)}
               </Text>
             </View>
           </Pressable>;
         })}
         <View style={{borderTopWidth:1,borderColor:theme.border,paddingTop:16,gap:11}}>
           <Text style={{fontSize:14,fontWeight:'700',color:theme.foreground}}>
             Comment la partager ?
           </Text>
           <View style={{gap:6}}>
             <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
               <Ionicons name="globe-outline" color={theme.muted} size={17}/>
               <Text style={{fontSize:13,color:theme.foreground}}>Publiquement sur JenLow</Text>
             </View>
             <Text style={{fontSize:11,lineHeight:17,color:theme.muted,marginLeft:25}}>
               Publication publique à connecter au serveur JenLow. Aucun contenu n’est publié automatiquement.
             </Text>
           </View>
           <View style={{gap:6}}>
             <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
               <Ionicons name="people-outline" color={theme.muted} size={17}/>
               <Text style={{fontSize:13,color:theme.foreground}}>Uniquement à des amis JenLow</Text>
             </View>
             <Text style={{fontSize:11,lineHeight:17,color:theme.muted,marginLeft:25}}>
               La sélection privée de destinataires nécessitera un accès protégé. Elle n’est pas encore activée.
             </Text>
           </View>
           <Text style={{fontSize:13,fontWeight:'700',color:theme.foreground,
             marginTop:7}}>Partager à l’extérieur</Text>
           <Text style={{fontSize:11,color:theme.muted,lineHeight:18}}>
             Le fichier exporté peut être envoyé aux personnes de ton choix.
             Une fois transmis, JenLow ne peut pas en contrôler l’accès.
           </Text>
           <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
             <Pressable accessibilityRole="button" disabled={!picked.length}
               onPress={printPdf}
               style={{paddingVertical:11,paddingHorizontal:14,borderRadius:10,
                 borderWidth:1,borderColor:BROWN,opacity:picked.length?1:.4}}>
               <Text style={{fontSize:12,fontWeight:'700',color:BROWN}}>PDF</Text>
             </Pressable>
             <Pressable accessibilityRole="button" disabled={!picked.length}
               onPress={exportWord}
               style={{paddingVertical:11,paddingHorizontal:14,borderRadius:10,
                 borderWidth:1,borderColor:BROWN,opacity:picked.length?1:.4}}>
               <Text style={{fontSize:12,fontWeight:'700',color:BROWN}}>Word (.doc)</Text>
             </Pressable>
             <Pressable accessibilityRole="button" disabled={!picked.length}
               onPress={exportHtml}
               style={{paddingVertical:11,paddingHorizontal:14,borderRadius:10,
                 borderWidth:1,borderColor:BROWN,opacity:picked.length?1:.4}}>
               <Text style={{fontSize:12,fontWeight:'700',color:BROWN}}>HTML</Text>
             </Pressable>
           </View>
           {!!notice?<Text accessibilityRole="alert"
             style={{fontSize:12,lineHeight:19,color:theme.muted}}>{notice}</Text>:null}
         </View>
       </ScrollView>
     </View>
   </View>
 </Modal>;
}
