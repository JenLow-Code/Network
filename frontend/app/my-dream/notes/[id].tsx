import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useAppTheme } from '@/theme/AppTheme';
import { useDreams } from '@/domain/dreamRepository';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Nav } from '@/components/navigation/Nav';
import SemenceNotes from '@/components/dream/SemenceNotes';

/** One private notebook across phases, instead of switching to a plain text editor. */
export default function PrivateDreamNotebook(){
  const {id}=useLocalSearchParams<{id:string}>();
  const theme=useAppTheme();
  const {items}=useDreams();
  const dream=items.find(item=>item.id===id);
  const today=new Date().toISOString().slice(0,10);
  const frozen=!!dream?.paused&&!!dream?.pauseUntil&&dream.pauseUntil>=today;
  const editable=!!dream&&dream.phase!=='Témoignage'&&!frozen;
  return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
    <ScrollView keyboardShouldPersistTaps="handled"
      contentContainerStyle={{paddingHorizontal:19,paddingTop:10,
        paddingBottom:115,maxWidth:780,width:'100%',alignSelf:'center',flexGrow:1}}>
      <PageHeader/>
      <View style={{marginTop:24,marginBottom:17}}>
        <Text style={{fontSize:12,color:theme.muted}}>
          Mon rêve · ${dream?.privateNotesTitle?.trim()||'Mes notes personnelles'}
        </Text>
      </View>
      {dream?<SemenceNotes dream={dream} editable={editable}/>:
        <Text style={{fontSize:14,color:theme.muted}}>Rêve introuvable.</Text>}
      {!editable&&dream?<Text style={{color:theme.muted,fontSize:11,marginTop:16}}>
        {frozen?'Rêve en pause · lecture seule':'Étape passée · lecture seule'}
      </Text>:null}
    </ScrollView>
    <Nav/>
  </SafeAreaView>;
}
