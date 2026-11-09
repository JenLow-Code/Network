import React, { useState } from 'react';
import { Image, Linking, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppTheme } from '@/theme/AppTheme';
import { usePublication } from '@/lib/api/hooks';
import { publicationPath } from '@/components/publication/PublicationGallery';
import type { DreamBlock } from '@/domain/dreamWorkspace';

const brown='#B88962';
const isImage=(b:DreamBlock)=>['image','gallery'].includes(b.kind)
  && /^(https?:|data:image\/|file:|blob:)/i.test((b.media?.[0]||b.content).trim());
const kindName=(b:DreamBlock):string=>
  b.kind==='quote'?'Citation':b.kind==='bible-verse'?'Verset biblique':
  b.kind==='publication-ref'?'Publication':
  b.kind==='image'?'Photo':b.kind==='document'?'Document':'Inspiration';

export default function SemenceInspirationDetail({block,initialMenu,editable,onClose,onEdit,onDelete,onShare}:{
 block:DreamBlock;initialMenu:boolean;editable:boolean;
 onClose:()=>void;onEdit:()=>void;onDelete:()=>void;onShare:()=>void;
}){
 const theme=useAppTheme();
 const [menuOpen,setMenuOpen]=useState(initialMenu);
 const [error,setError]=useState('');
 const publication=usePublication(block.kind==='publication-ref'?block.content.trim():undefined);
 const openSource=()=>{
  if(block.kind==='publication-ref'){
    if(publication.item?.id===block.content.trim()){
      onClose();router.push(publicationPath(publication.item) as any);
    }else setError('Cette publication est introuvable ou indisponible.');
    return;
  }
  const target=block.content.startsWith('data:')&&block.media?.[0]?block.media[0]:block.content;
  if(/^https?:\/\//i.test(target)){
    void Linking.openURL(target).catch(()=>setError('Impossible d’ouvrir ce lien.'));
    return;
  }
  if(target.startsWith('data:')&&Platform.OS==='web'&&typeof document!=='undefined'){
    const a=document.createElement('a');a.href=target;a.download=block.title||'document';
    document.body.appendChild(a);a.click();a.remove();
    return;
  }
  setError('Cette référence ne peut pas être ouverte directement sur cet appareil.');
 };
 const hasSource=['document','pdf','link','bookmark','embed','video','audio','music','publication-ref'].includes(block.kind);
 return <Modal visible transparent animationType="slide" onRequestClose={onClose}>
   <View style={{flex:1,justifyContent:'flex-end'}}>
     <Pressable accessibilityRole="button" accessibilityLabel="Fermer le détail"
       onPress={onClose} style={{flex:1,backgroundColor:'rgba(0,0,0,.4)'}}/>
     <View style={{maxHeight:'88%',padding:19,paddingBottom:Platform.OS==='ios'?35:25,
       borderTopLeftRadius:22,borderTopRightRadius:22,
       backgroundColor:theme.background,gap:14}}>
       <View style={{flexDirection:'row',alignItems:'center',gap:9}}>
         <Text numberOfLines={2} style={{fontSize:23,fontFamily:'serif',
           color:theme.foreground,flex:1}}>
           {block.title||kindName(block)}
         </Text>
         <Pressable accessibilityRole="button" accessibilityLabel="Options de cette inspiration"
           accessibilityState={{expanded:menuOpen}}
           onPress={()=>setMenuOpen(v=>!v)} style={{padding:8}}>
           <Ionicons name="ellipsis-horizontal" size={20} color={theme.muted}/>
         </Pressable>
         <Pressable accessibilityRole="button" accessibilityLabel="Fermer"
           onPress={onClose} style={{padding:8}}>
           <Ionicons name="close" size={20} color={theme.foreground}/>
         </Pressable>
       </View>
       {menuOpen?<View style={{borderRadius:11,backgroundColor:theme.surface,
         borderWidth:1,borderColor:theme.border,paddingVertical:4}}>
         {editable?<Pressable accessibilityRole="button"
           onPress={onEdit}
           style={{flexDirection:'row',alignItems:'center',gap:12,padding:13}}>
           <Ionicons name="pencil-outline" size={19} color={theme.foreground}/>
           <Text style={{fontSize:14,color:theme.foreground}}>Modifier</Text>
         </Pressable>:null}
         <Pressable accessibilityRole="button" onPress={onShare}
           style={{flexDirection:'row',alignItems:'center',gap:12,padding:13}}>
           <Ionicons name="share-outline" size={19} color={theme.foreground}/>
           <Text style={{fontSize:14,color:theme.foreground}}>Partager</Text>
         </Pressable>
         {editable?<Pressable accessibilityRole="button" onPress={onDelete}
           style={{flexDirection:'row',alignItems:'center',gap:12,padding:13}}>
           <Ionicons name="trash-outline" size={19} color="#AA4B58"/>
           <Text style={{fontSize:14,color:'#AA4B58'}}>Supprimer</Text>
         </Pressable>:null}
       </View>:null}
       <ScrollView keyboardShouldPersistTaps="handled"
         contentContainerStyle={{paddingBottom:12,gap:15}}>
         {isImage(block)?<>
           <Image source={{uri:block.media?.[0]||block.content}}
             resizeMode="contain" style={{height:310,width:'100%'}}/>
           {block.title?<Text style={{fontSize:13,color:theme.muted}}>{block.title}</Text>:null}
         </>:block.kind==='quote'?<>
           <Text style={{fontSize:22,lineHeight:34,fontFamily:'serif',
             fontStyle:'italic',color:theme.foreground}}>{'“'+block.content+'”'}</Text>
           {!!block.title?<Text style={{fontSize:13,color:theme.muted}}>
             — {block.title}
           </Text>:null}
         </>:<>
           <Text style={{fontSize:16,lineHeight:26,color:theme.foreground,
             fontFamily:block.kind==='bible-verse'?'serif':undefined}}>
             {block.kind==='document'&&block.content.startsWith('data:')
               ?'Document joint':block.content}
           </Text>
           {block.kind==='bible-verse'?<Text style={{fontSize:11,color:theme.muted}}>
             Louis Segond 1910
           </Text>:null}
         </>}
         {hasSource?<Pressable onPress={openSource} accessibilityRole="button"
           style={{alignItems:'center',borderRadius:10,borderWidth:1,
             borderColor:brown,padding:12}}>
           <Text style={{fontSize:13,fontWeight:'700',color:brown}}>
             Ouvrir la référence
           </Text>
         </Pressable>:null}
         {!!error?<Text accessibilityRole="alert"
           style={{fontSize:12,color:'#B04E5A'}}>{error}</Text>:null}
       </ScrollView>
     </View>
   </View>
 </Modal>;
}
