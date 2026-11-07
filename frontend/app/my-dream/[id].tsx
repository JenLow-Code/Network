import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Nav } from '@/components/navigation/Nav';
import { useAppTheme } from '@/theme/AppTheme';
import { useDreams } from '@/domain/dreamRepository';
import DreamHub from '@/components/dream/DreamHub';
import type { DreamPhase } from '@/domain/publication';
export default function Workspace() {
 const { id, compose, view } = useLocalSearchParams<{id:string;compose?:string;view?:string}>();
 const startPhase = ['Rêve','Initiation','Croissance','Témoignage'].includes(view||'') ? view as DreamPhase : undefined;
 const { items } = useDreams();
 const theme = useAppTheme();
 const dream = items.find(d=>d.id===id);
 return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
  {dream ? <DreamHub dream={dream} startInSemence={compose === '1'} startPhase={startPhase}/> : <View style={{padding:20}}><Text style={{color:theme.foreground}}>Rêve introuvable.</Text></View>}
  <Nav/>
 </SafeAreaView>;
}
