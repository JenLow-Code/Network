import React from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import { useAppTheme } from '@/theme/AppTheme';
import { workspaceCanvas } from '@/theme/workspaceLayout';
import { MusicLibrary } from '@/components/profile/ProfileMusic';
export default function MusicLibraryScreen(){
  const theme=useAppTheme();const {width}=useWindowDimensions();
  return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
    <ScrollView contentContainerStyle={{...workspaceCanvas(width),paddingTop:8,paddingBottom:110,gap:20}}>
      <PageHeader title="Mes morceaux"/><MusicLibrary/>
    </ScrollView><Nav/>
  </SafeAreaView>;
}
