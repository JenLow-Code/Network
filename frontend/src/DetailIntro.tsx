import React from 'react';
import {Text,View} from 'react-native';

/**
 * Shared featured introduction for Dreams and Talents.
 * Artwork stays on the left; the handwritten title sits beside its lower edge.
 * The content starts a little to the left of the title, at a comfortable reading width.
 */
export function DetailIntro({title,artwork,children}:{title:string;artwork:React.ReactNode;children:React.ReactNode}){
 return <View style={{paddingBottom:12}}>
  <View style={{flexDirection:'row',alignItems:'flex-end',minHeight:108,gap:7}}>
   <View style={{width:108,marginLeft:-12,alignItems:'center',justifyContent:'center'}}>{artwork}</View>
   <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}
    style={{fontFamily:'Caveat_700Bold',fontSize:27,lineHeight:32,color:'#262626',flex:1,marginBottom:10}}>{title}</Text>
  </View>
  <View style={{paddingLeft:28,marginTop:4}}>{children}</View>
 </View>;
}
