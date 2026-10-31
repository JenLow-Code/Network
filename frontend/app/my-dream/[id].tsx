import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Nav } from '@/components/navigation/Nav';
import { useAppTheme } from '@/theme/AppTheme';
import { useDreams } from '@/domain/dreamRepository';
import DreamExperience from '@/components/dream/DreamExperience';
export default function Workspace() {
 const { id } = useLocalSearchParams<{id:string}>();
 const { items } = useDreams();
 const theme = useAppTheme();
 const dream = items.find(d=>d.id===id);
 return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
  {dream ? <DreamExperience dream={dream}/> : <View style={{padding:20}}><Text style={{color:theme.foreground}}>Rêve introuvable.</Text></View>}
  <Nav/>
 </SafeAreaView>;
}
