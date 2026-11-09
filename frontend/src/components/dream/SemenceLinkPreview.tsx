import React, { useState } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import type { DreamBlock } from '@/domain/dreamWorkspace';

export const safeLink=(url:string)=>/^https?:\/\/\S+$/i.test(url.trim());
export const linkHost=(url:string)=>{
 try{return new URL(url.trim()).hostname.replace(/^www\./,'');}
 catch{return url.trim();}
};
export default function SemenceLinkPreview({block}: {block:DreamBlock}){
 const theme=useAppTheme();
 const url=block.content.trim();
 const [failed,setFailed]=useState(false);
 const open=()=>{
  if(!safeLink(url))return;
  void Linking.openURL(url).catch(()=>setFailed(true));
 };
 return <View style={{gap:13}}>
   <View style={{padding:16,borderRadius:12,
     backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,gap:8}}>
     <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
       <Ionicons name="globe-outline" color="#A5713D" size={20}/>
       <Text style={{fontSize:12,color:theme.muted}}>{linkHost(url)}</Text>
     </View>
     {!!block.title?<Text style={{fontSize:18,fontWeight:'700',
       color:theme.foreground}}>{block.title}</Text>:null}
     <Text selectable style={{fontSize:13,lineHeight:20,color:'#A5713D'}}>
       {url}
     </Text>
   </View>
   {Platform.OS==='web'&&safeLink(url)?<>
     <View style={{borderRadius:11,overflow:'hidden',
       borderWidth:1,borderColor:theme.border,height:260}}>
       {React.createElement('iframe' as any,{
         src:url,title:'Aperçu du lien '+linkHost(url),
         loading:'lazy',referrerPolicy:'no-referrer',
         sandbox:'allow-forms allow-scripts',
         style:{width:'100%',height:'100%',border:0,background:'#FFF'},
       })}
     </View>
     <Text style={{fontSize:11,lineHeight:17,color:theme.muted}}>
       Aperçu intégré si le site l’autorise. Certains sites bloquent l’affichage dans JenLow.
     </Text>
   </>:null}
   {Platform.OS!=='web'?<Text style={{fontSize:12,color:theme.muted}}>
     L’aperçu intégré du site est disponible sur le web. Le lien reste accessible ci-dessous.
   </Text>:null}
   <Pressable accessibilityRole="link" accessibilityLabel={'Ouvrir '+url}
     disabled={!safeLink(url)} onPress={open}
     style={{alignItems:'center',justifyContent:'center',flexDirection:'row',
       gap:8,borderRadius:10,borderWidth:1,borderColor:'#A5713D',
       paddingVertical:12,paddingHorizontal:14}}>
     <Ionicons name="open-outline" size={16} color="#A5713D"/>
     <Text style={{fontSize:13,color:'#A5713D',fontWeight:'700'}}>
       Ouvrir dans le navigateur
     </Text>
   </Pressable>
   {failed?<Text accessibilityRole="alert" style={{fontSize:12,color:'#AF5461'}}>
     Impossible d’ouvrir ce lien.
   </Text>:null}
 </View>;
}
