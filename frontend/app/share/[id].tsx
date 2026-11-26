import { Text } from '@/i18n/LocalizedText';
import React from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import { workspaceCanvas } from '@/theme/workspaceLayout';
import { useAppTheme } from '@/theme/AppTheme';
import { usePublication } from '@/lib/api/hooks';
export default function ShareInside() {
  const {width}=useWindowDimensions();
  const {id}=useLocalSearchParams<{id:string}>();
  const theme=useAppTheme();
  const remote=usePublication(id);
  const item=remote.state==='ready'&&remote.item?.id===id?remote.item:null;
  return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
    <View style={{flex:1,...workspaceCanvas(width),paddingTop:12,paddingBottom:45,gap:16}}>
      <PageHeader title="Partager dans JenLow"/>
      <Text style={{fontSize:13,color:theme.muted}}>{item?'Envoyer « '+item.title+' » à un contact':remote.state==='loading'?'Chargement…':'Publication indisponible.'}</Text>
      <Text accessibilityRole="alert" style={{fontSize:12,color:theme.muted}}>Le partage de publications dans la messagerie sera disponible lorsque le service serveur sera connecté.</Text>
      {remote.state==='error'?<Pressable onPress={()=>void remote.retry()}><Text style={{color:theme.foreground}}>Réessayer</Text></Pressable>:null}
      <Pressable onPress={()=>router.back()}><Text style={{color:theme.foreground}}>Retour</Text></Pressable>
    </View>
    <Nav/>
  </SafeAreaView>;
}
