import React, { useEffect } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Nav } from '@/components/navigation/Nav';
import { useAppTheme } from '@/theme/AppTheme';
import { useDreams } from '@/domain/dreamRepository';
import DreamHub from '@/components/dream/DreamHub';
import { isPublishedFlower } from '@/domain/dreamWorkspace';
import type { DreamPhase } from '@/domain/publication';

/** A rendering error must never trap the user on a blank screen. */
class DreamRenderBoundary extends React.Component<
 {children:React.ReactNode;dark:boolean},{failed:boolean}
>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(error:Error,info:React.ErrorInfo){
   console.error('[JenLow Dream Workspace] Screen rendering error',error,info.componentStack);
 }
 render(){
  if(this.state.failed)return <View
    style={{flex:1,justifyContent:'center',alignItems:'center',padding:24,gap:13,
      backgroundColor:this.props.dark?'#111317':'#FFFCF5'}}>
    <Text style={{fontSize:22,fontFamily:'serif',fontWeight:'600',
      color:this.props.dark?'#F3F3F3':'#171717',textAlign:'center'}}>Impossible d’ouvrir cette aspiration</Text>
    <Text style={{fontSize:13,color:this.props.dark?'#C2C6CC':'#626562',lineHeight:21,textAlign:'center'}}>
      Un problème d’affichage s’est produit. Ton aspiration et son contenu n’ont pas été supprimés.
    </Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Retour à mes aspirations"
      onPress={()=>router.replace('/my-space')}
      style={{marginTop:12,borderRadius:10,backgroundColor:this.props.dark?'#F7F4ED':'#242322',
        paddingHorizontal:22,paddingVertical:14}}>
      <Text style={{color:this.props.dark?'#242322':'#FFFFFF',fontSize:13,fontWeight:'700'}}>Retour à mes aspirations</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Recharger cette aspiration"
      onPress={()=>this.setState({failed:false})}
      style={{padding:11}}>
      <Text style={{fontSize:12,color:this.props.dark?'#C2C6CC':'#626562'}}>Réessayer</Text>
    </Pressable>
  </View>;
  return this.props.children;
 }
}
export default function Workspace() {
 const { id, compose, view } = useLocalSearchParams<{id:string;compose?:string;view?:string}>();
 const startPhase = ['Rêve','Initiation','Croissance','Témoignage'].includes(view||'')
   ? view as DreamPhase : undefined;
 const { items } = useDreams();
 const theme = useAppTheme();
 const dream = items.find(d=>d.id===id);
 const needsFlower = !!dream && dream.phase==='Témoignage' && !isPublishedFlower(dream) && (!startPhase || startPhase==='Témoignage');
 useEffect(()=>{
   if(needsFlower)router.replace({pathname:'/my-dream/flower/[id]',params:{id}});
 },[needsFlower,id]);
 if(needsFlower)return <SafeAreaView style={{flex:1,backgroundColor:theme.background,alignItems:'center',justifyContent:'center'}}><ActivityIndicator color={theme.accent}/><Nav/></SafeAreaView>;
 return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
  {dream?<DreamRenderBoundary key={dream.id} dark={theme.dark}>
    <DreamHub dream={dream} startInSemence={compose==='1'} startPhase={startPhase}/>
  </DreamRenderBoundary>:
   <View style={{flex:1,padding:20,gap:16}}>
    <Text style={{color:theme.foreground}}>Aspiration introuvable.</Text>
    <Pressable onPress={()=>router.replace('/my-space')} accessibilityRole="button">
      <Text style={{color:theme.foreground,fontWeight:'700'}}>Retour à mes aspirations</Text>
    </Pressable>
   </View>}
  <Nav/>
 </SafeAreaView>;
}
