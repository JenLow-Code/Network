import React from 'react';
import { Image, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import { useMemberProfile, usePublication } from '@/lib/api/hooks';
import type { Publication } from '@/domain/publication';

function TalentCounts({handle}: {handle:string}) {
  const {profile,posts,state}=useMemberProfile(handle);
  if(state!=='ready'||!profile)return null;
  // Public feed is paged: do not present its first page as a lifetime total.
  const dreams=posts.filter(p=>p.type==='dream').length;
  const songs=posts.filter(p=>p.type==='music').length;
  const talents=profile.talents.length;
  return <Text numberOfLines={2} style={{fontSize:10,color:'#EDE8E4',lineHeight:15}}>
    {dreams} rêves · {songs} chants · {talents} talents visibles
  </Text>;
}

/** A grounded preview sourced from the same publication data as Discovery. */
export default function SemencePublicationCover({
  publicationId,fallbackTitle,large=false,
}:{
  publicationId:string;fallbackTitle?:string;large?:boolean;
}){
 const theme=useAppTheme();
 const {item,state}=usePublication(publicationId.trim()||undefined);
 const talent=item?.type==='talent';
 const artwork=talent?item.avatar:
   item?.type==='music'?(item.coverArt||item.image):item?.image;
 const title=item?.type==='talent'?item.author:item?.title||fallbackTitle||'Publication';
 const category=item?.type==='dream'?'RÊVE':item?.type==='music'?'MUSIQUE':
   item?.type==='bible'?'BIBLE':talent?'TALENT':'PUBLICATION';
 const profileName=talent?(item?.author||fallbackTitle||''):'';
 const initials=profileName.split(/\s+/).slice(0,2).map(s=>s[0]||'').join('').toUpperCase();
 const height=large?268:192;
 return <View style={{height,width:'100%',borderRadius:12,overflow:'hidden',
   backgroundColor:theme.dark?'#343336':'#80756E',justifyContent:'flex-end'}}>
   {!!artwork?<Image source={{uri:artwork}} resizeMode="cover"
     style={{position:'absolute',height:'100%',width:'100%'}}/>:
     <View style={{position:'absolute',top:0,left:0,right:0,bottom:0,
       alignItems:'center',justifyContent:'center'}}>
       {talent?<Text style={{fontSize:large?59:45,color:'#F5F1E9',
         fontFamily:'serif'}}>{initials||'○'}</Text>:
         <Ionicons name={item?.type==='music'?'musical-note-outline':
           item?.type==='bible'?'book-outline':'images-outline'}
           size={large?42:31} color="#E6D9CD"/>}
     </View>}
   <Svg pointerEvents="none" style={{position:'absolute',left:0,right:0,top:0,bottom:0}}
     width="100%" height="100%">
     <Defs><LinearGradient id="semencePublicationFade" x1="0%" y1="0%" x2="0%" y2="100%">
       <Stop offset="0%" stopColor="#0C0A0C" stopOpacity="0"/>
       <Stop offset="42%" stopColor="#0C0A0C" stopOpacity="0.28"/>
       <Stop offset="100%" stopColor="#0C0A0C" stopOpacity="0.86"/>
     </LinearGradient></Defs>
     <Rect width="100%" height="100%" fill="url(#semencePublicationFade)"/>
   </Svg>
   <View style={{padding:large?17:13,gap:5}}>
     <Text style={{fontSize:10,letterSpacing:.9,fontWeight:'700',
       color:'#F4EDE7'}}>{category}</Text>
     <Text numberOfLines={large?4:2}
       style={{fontSize:large?21:16,lineHeight:large?28:21,fontWeight:'700',
         color:'#FFFFFF'}}>{title}</Text>
     {talent&&item?.type==='talent'?<>
       {!!item.skill?<Text numberOfLines={1}
         style={{fontSize:11,color:'#F0E9E3'}}>{item.skill}</Text>:null}
       {!!item.authorHandle?<TalentCounts handle={item.authorHandle}/>:null}
     </>:null}
     {!item&&state==='error'?<Text style={{fontSize:10,color:'#F0E9E3'}}>
       Publication indisponible · référence conservée
     </Text>:null}
   </View>
 </View>;
}
