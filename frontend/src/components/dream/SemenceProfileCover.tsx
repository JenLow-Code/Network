import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useAppTheme } from '@/theme/AppTheme';
import { api } from '@/lib/api/client';

type Profile={handle:string;displayName:string;avatarUrl?:string|null};
/** Entire portrait becomes the visual cover; a profile is not a publication. */
export default function SemenceProfileCover({handle,name,avatar,height=165}:{
 handle:string;name?:string;avatar?:string;height?:number;
}){
 const theme=useAppTheme();
 const [member,setMember]=useState<Profile|null>(null);
 useEffect(()=>{
   const clean=handle.replace(/^@/,'').trim();
   if(!clean||!/^[a-zA-Z0-9_.-]+$/.test(clean))return;
   let live=true;
   void api<{profile:Profile}>('/api/users/'+encodeURIComponent(clean),{auth:'optional'})
     .then(result=>{if(live)setMember(result.profile);})
     .catch(()=>{if(live)setMember(null);});
   return ()=>{live=false;};
 },[handle]);
 const portrait=member?.avatarUrl||avatar||'';
 const title=member?.displayName||name||handle.replace(/^@/,'');
 const label=handle.replace(/^@/,'');
 const hasPortrait=!!portrait;
 const fade='profile-cover-'+React.useId().replace(/[^A-Za-z0-9]/g,'');
 return <View style={{height,backgroundColor:theme.dark?'#373238':'#E8DED3',
   width:'100%',overflow:'hidden',justifyContent:'flex-end'}}>
   {hasPortrait?<Image source={{uri:portrait}}
     resizeMode="cover" style={{position:'absolute',width:'100%',height:'100%'}}/>:
     <View style={{position:'absolute',top:0,right:0,left:0,bottom:0,
       alignItems:'center',justifyContent:'center'}}>
       <Ionicons name="person-circle-outline" size={Math.min(80,height*0.46)}
         color={theme.dark?'#B6AB9D':'#A38D77'}/>
     </View>}
   {hasPortrait?<Svg pointerEvents="none" width="100%" height="100%"
     style={{position:'absolute',top:0,left:0,right:0,bottom:0}}>
     <Defs><LinearGradient id={fade} x1="0%" y1="0%" x2="0%" y2="100%">
       <Stop offset="0%" stopColor="#151117" stopOpacity="0.0"/>
       <Stop offset="45%" stopColor="#151117" stopOpacity="0.12"/>
       <Stop offset="100%" stopColor="#151117" stopOpacity="0.87"/>
     </LinearGradient></Defs>
     <Rect width="100%" height="100%" fill={'url(#'+fade+')'}/>
   </Svg>:null}
   <View style={{position:'absolute',top:9,left:9,
     backgroundColor:'rgba(250,247,242,.93)',borderRadius:6,
     paddingHorizontal:7,paddingVertical:5,flexDirection:'row',alignItems:'center',gap:5}}>
     <Ionicons name="person-outline" size={12} color="#A5713D"/>
     <Text style={{fontSize:9,color:'#A5713D',
       letterSpacing:0.6,fontWeight:'700'}}>PROFIL</Text>
   </View>
   <View style={{padding:11,gap:2}}>
     <Text numberOfLines={2} style={{fontSize:14,lineHeight:19,fontWeight:'700',
       color:hasPortrait?'#FFFFFF':theme.foreground}}>{title}</Text>
     {!!label?<Text numberOfLines={1} style={{fontSize:10,
       color:hasPortrait?'#F5E9DE':theme.muted}}>@{label}</Text>:null}
   </View>
 </View>;
}
