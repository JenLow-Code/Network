import React from 'react';
import {Text,View} from 'react-native';

/**
 * Shared featured introduction for Dreams, Talents and Music.
 * The featured artwork or Play/Pause button sits on the left; its heading
 * (or musical waveform) is bottom-aligned alongside it.
 */
export function DetailIntro({title,artwork,children,rightContent}:{
 title?:string;
 artwork:React.ReactNode;
 children?:React.ReactNode;
 rightContent?:React.ReactNode;
}){
 return <View style={{paddingBottom:8}}>
  <View style={{flexDirection:'row',alignItems:'flex-end',minHeight:90,gap:4}}>
   <View style={{width:92,marginLeft:-15,alignItems:'center',justifyContent:'center'}}>{artwork}</View>
   {rightContent?
    <View style={{flex:1,minWidth:0,justifyContent:'flex-end',paddingBottom:2}}>{rightContent}</View>:
    <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}
     style={{fontFamily:'Caveat_700Bold',fontSize:27,lineHeight:32,color:'#262626',flex:1,marginBottom:0}}>{title}</Text>}
  </View>
  {children?<View style={{paddingLeft:7,marginTop:3}}>{children}</View>:null}
 </View>;
}
