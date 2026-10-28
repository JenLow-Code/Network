import React from 'react';
import {Image,View} from 'react-native';
import type {DreamPhase} from './discoveryData';
import {dreamPhaseImageUris} from '../assets/dreamPhaseImages';

/** User-supplied phase artwork. The same illustration appears in Discovery and detail views. */
export function DreamPhaseIcon({phase,size=26}:{phase:DreamPhase;size?:number}){
 return <View style={{width:size,height:size,alignItems:'center',justifyContent:'center'}}>
  <Image source={{uri:dreamPhaseImageUris[phase]}} style={{width:size,height:size}} resizeMode="contain" accessibilityLabel={phase}/>
 </View>;
}
