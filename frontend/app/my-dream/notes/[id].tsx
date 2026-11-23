import React from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useAppTheme } from '@/theme/AppTheme';
import { workspaceLayout } from '@/theme/workspaceLayout';
import { useDreams } from '@/domain/dreamRepository';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Nav } from '@/components/navigation/Nav';
import SemenceNotes from '@/components/dream/SemenceNotes';

/** A focused notebook page shared by the three active dream stages. */
export default function PrivateDreamNotebook(){
  const {id,view}=useLocalSearchParams<{id:string;view?:string}>();
  const theme=useAppTheme();
  const {width}=useWindowDimensions();
  const ws=workspaceLayout(width);
  const {items}=useDreams();
  const dream=items.find(item=>item.id===id);
  const today=new Date().toISOString().slice(0,10);
  const frozen=!!dream?.paused&&!!dream?.pauseUntil&&dream.pauseUntil>=today;
  const editable=!!dream&&dream.phase!=='Témoignage'&&!frozen&&dream.viewerRole!=='participant';
  return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
      contentContainerStyle={{paddingLeft:ws.contentGutter,paddingRight:ws.gutter,paddingTop:12,
        paddingBottom:115,maxWidth:ws.maxWidth,width:'100%',alignSelf:'center',flexGrow:1}}>
      <PageHeader title="Notes personnelles" onBack={()=>router.replace({pathname:'/my-dream/[id]',
        params:{id,view:view||dream?.phase||'Rêve'}})}/>
      <View style={{marginTop:18}}>
        {dream?<SemenceNotes dream={dream} editable={editable}/>:
        <Text style={{fontSize:14,color:theme.muted}}>Rêve introuvable.</Text>}
      </View>
      {!editable&&dream?<Text style={{color:theme.muted,fontSize:11,marginTop:16}}>
        {frozen?'Rêve en pause · lecture seule':'Étape passée · lecture seule'}
      </Text>:null}
    </ScrollView>
    <Nav/>
  </SafeAreaView>;
}
