import React from 'react';
import { Image, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import { useMemberProfile, usePublication } from '@/lib/api/hooks';

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
 publicationId,fallbackTitle,fallbackImage,fallbackType,large=false,tileHeight,
}:{
 publicationId:string;fallbackTitle?:string;fallbackImage?:string;
 fallbackType?:string;large?:boolean;tileHeight?:number;
}){
 const theme=useAppTheme();
 const gradientId='semencePublicationFade'+React.useId().replace(/[^A-Za-z0-9]/g,'');
 const {item,state}=usePublication(publicationId.trim()||undefined);
 const talent=item?.type==='talent'||fallbackType==='talent';
 const remoteArtwork=talent?item?.avatar:
   item?.type==='music'?(item.coverArt||item.image):item?.image;
 const artwork=remoteArtwork||fallbackImage||'';
 const hasArt=!!artwork;
 const title=item?.type==='talent'?item.author:
   item?.title||fallbackTitle||'Publication';
 const category=item?.type==='dream'?'RÊVE':item?.type==='music'?'MUSIQUE':
   item?.type==='bible'?'BIBLE':talent?'TALENT':
   fallbackType==='music'?'MUSIQUE':fallbackType==='dream'?'RÊVE':
   fallbackType==='bible'?'BIBLE':'PUBLICATION';
 const profileName=talent?(item?.author||fallbackTitle||''):'';
 const initials=profileName.split(/\s+/).slice(0,2)
   .map(part=>part[0]||'').join('').toUpperCase();
 const height=tileHeight??(large?268:168);
 return <View style={{height,width:'100%',overflow:'hidden',
   backgroundColor:hasArt?theme.dark?'#343336':'#696460':
      theme.dark?'#2A2B2D':'#F5F1ED',
   justifyContent:'flex-end'}}>
   {hasArt?<Image source={{uri:artwork}} resizeMode="cover"
     style={{position:'absolute',height:'100%',width:'100%'}}/>:null}
   {hasArt?<Svg pointerEvents="none"
     style={{position:'absolute',left:0,right:0,top:0,bottom:0}}
     width="100%" height="100%">
     <Defs><LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
       <Stop offset="0%" stopColor="#0C0A0C" stopOpacity="0"/>
       <Stop offset="43%" stopColor="#0C0A0C" stopOpacity="0.24"/>
       <Stop offset="100%" stopColor="#0C0A0C" stopOpacity="0.86"/>
     </LinearGradient></Defs>
     <Rect width="100%" height="100%" fill={"url(#"+gradientId+")"}/>
   </Svg>:null}
   {!hasArt?<View style={{position:'absolute',left:12,top:13,
     flexDirection:'row',alignItems:'center',gap:7}}>
     <Ionicons name={talent?'person-outline':'albums-outline'}
       size={15} color="#A5713D"/>
     <Text style={{fontSize:9,letterSpacing:.6,fontWeight:'700',
       color:'#A5713D'}}>{category}</Text>
   </View>:null}
   {!hasArt&&talent?<View style={{position:'absolute',top:48,left:12,
     width:42,height:42,borderRadius:21,
     backgroundColor:theme.dark?'#414044':'#E8DFD6',
     alignItems:'center',justifyContent:'center'}}>
     <Text style={{fontSize:18,fontFamily:'serif',
       color:theme.foreground}}>{initials||'•'}</Text>
   </View>:null}
   <View style={{padding:large?17:12,gap:5}}>
     {hasArt?<Text style={{fontSize:9,letterSpacing:.7,fontWeight:'700',
       color:'#F4EDE7'}}>{category}</Text>:null}
     <Text numberOfLines={large?4:2}
       style={{fontSize:large?20:14,lineHeight:large?27:19,
         fontWeight:'600',
         color:hasArt?'#FFFFFF':theme.foreground}}>{title}</Text>
     {talent&&item?.type==='talent'?<>
       {!!item.skill?<Text numberOfLines={1}
         style={{fontSize:11,color:hasArt?'#EFE8E2':theme.muted}}>
         {item.skill}
       </Text>:null}
       {!!item.authorHandle?<TalentCounts handle={item.authorHandle}/>:null}
     </>:null}
     {!item&&state==='error'&&!hasArt?<Text numberOfLines={1}
       style={{fontSize:10,color:theme.muted}}>
       Référence conservée
     </Text>:null}
   </View>
 </View>;
}
