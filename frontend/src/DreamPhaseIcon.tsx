import React from 'react';
import {View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import type {DreamPhase} from './discoveryData';
import {PHASE_COLORS} from './discoveryData';
import {SeedIcon} from './SeedIcon';
export function DreamPhaseIcon({phase,size=26}:{phase:DreamPhase;size?:number}){
 if(phase==='Rêve')return <View style={{width:Math.max(9,size*.45),height:Math.max(9,size*.45),borderRadius:size,backgroundColor:PHASE_COLORS.Rêve.foreground}}/>;
 if(phase==='Initiation')return <SeedIcon size={size}/>;
 return <Ionicons name={phase==='Croissance'?'leaf-outline':'flower-outline'} size={size} color={PHASE_COLORS[phase].foreground}/>;
}
