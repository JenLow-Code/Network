import React from 'react';
import {Text,View} from 'react-native';

/**
 * Shared featured introduction for Dreams and Talents.
 * Artwork stays on the left; the handwritten title sits beside its lower edge.
 * The content starts a little to the left of the title, at a comfortable reading width.
 */
export function DetailIntro({title,artwork,children}:{title:string;artwork:React.ReactNode;children:React.ReactNode}){
 return <View style={{paddingBottom:8}}>
  <View style={{flexDirection:'row',alignItems:'flex-end',minHeight:90,gap:4}}>
   <View style={{width:92,marginLeft:-15,alignItems:'center',justifyContent:'center'}}>{artwork}</View>
   <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}
    style={{fontFamily:'Caveat_700Bold',fontSize:27,lineHeight:32,color:'#262626',flex:1,marginBottom:0}}>{title}</Text>
  </View>
  <View style={{paddingLeft:7,marginTop:3}}>{children}</View>
 </View>;
}
