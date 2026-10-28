import React from 'react';
import {Text,View} from 'react-native';

/**
 * Shared featured introduction for Dreams, Talents and Music.
 * The featured artwork or Play/Pause button sits on the left; its heading
 * (or musical waveform) is bottom-aligned alongside it.
 */
export function DetailIntro({title,artwork,children,rightContent,compact=false}:{
 title?:string;
 artwork:React.ReactNode;
 children?:React.ReactNode;
 rightContent?:React.ReactNode;
 /** Compact botanical artwork in Dream details, without changing Music or Talent layouts. */
 compact?:boolean;
}){
 return <View style={{paddingBottom:compact?5:8}}>
  <View style={{flexDirection:'row',alignItems:'flex-end',minHeight:compact?56:90,gap:compact?1:4}}>
   <View style={{width:compact?58:92,marginLeft:compact?-8:-15,alignItems:'center',justifyContent:'center',transform:compact?[{translateY:-8}]:[]}}>{artwork}</View>
   {rightContent?
    <View style={{flex:1,minWidth:0,justifyContent:'flex-end',paddingBottom:2}}>{rightContent}</View>:
    <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}
     style={{fontFamily:'Caveat_700Bold',fontSize:27,lineHeight:32,color:compact?'#CB245C':'#262626',flex:1,marginBottom:0}}>{title}</Text>}
  </View>
  {children?<View style={{paddingLeft:7,marginTop:compact?1:3}}>{children}</View>:null}
 </View>;
}
