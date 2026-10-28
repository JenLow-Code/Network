import React from 'react';
import {View} from 'react-native';

/** Five-stage talent scale: débutant, notions, intermédiaire, avancé, pro. */
const steps=['#236547','#65A96C','#D8B942','#D88C45','#CB245C'] as const;
export function TalentLevelDots({level}:{level:string}){
 const value=level.toLocaleLowerCase();
 const selected=value.includes('pro')?4:value.includes('avanc')||value.includes('confirm')?3:value.includes('interm')?2:value.includes('notion')?1:0;
 return <View accessibilityLabel={'Niveau : '+level} style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,paddingVertical:4}}>
  {steps.map((color,index)=><View key={color} style={{width:index===selected?12:9,height:index===selected?12:9,borderRadius:8,backgroundColor:color,borderWidth:index===selected?1.5:0,borderColor:'#272727',opacity:index===selected?1:0.76}}/>)}
 </View>;
}
