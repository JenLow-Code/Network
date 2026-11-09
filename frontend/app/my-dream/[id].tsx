import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Nav } from '@/components/navigation/Nav';
import { useAppTheme } from '@/theme/AppTheme';
import { useDreams } from '@/domain/dreamRepository';
import DreamHub from '@/components/dream/DreamHub';
import type { DreamPhase } from '@/domain/publication';

/** A rendering error must never trap the user on a blank screen. */
class DreamRenderBoundary extends React.Component<
 {children:React.ReactNode},{failed:boolean}
>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(error:Error,info:React.ErrorInfo){
   console.error('[JenLow Dream Workspace] Screen rendering error',error,info.componentStack);
 }
 render(){
  if(this.state.failed)return <View
    style={{flex:1,justifyContent:'center',alignItems:'center',padding:24,gap:13,
      backgroundColor:'#FAF8F4'}}>
    <Text style={{fontSize:22,fontFamily:'serif',fontWeight:'600',
      color:'#282725',textAlign:'center'}}>Impossible d’ouvrir ce rêve</Text>
    <Text style={{fontSize:13,color:'#686863',lineHeight:21,textAlign:'center'}}>
      Un problème d’affichage s’est produit. Ton rêve et son contenu n’ont pas été supprimés.
    </Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Retour à mes rêves"
      onPress={()=>router.replace('/my-space')}
      style={{marginTop:12,borderRadius:10,backgroundColor:'#282725',
        paddingHorizontal:22,paddingVertical:14}}>
      <Text style={{color:'#FFFFFF',fontSize:13,fontWeight:'700'}}>Retour à mes rêves</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Recharger ce rêve"
      onPress={()=>this.setState({failed:false})}
      style={{padding:11}}>
      <Text style={{fontSize:12,color:'#686863'}}>Réessayer</Text>
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
 return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
  {dream?<DreamRenderBoundary key={dream.id}>
    <DreamHub dream={dream} startInSemence={compose==='1'} startPhase={startPhase}/>
  </DreamRenderBoundary>:
   <View style={{flex:1,padding:20,gap:16}}>
    <Text style={{color:theme.foreground}}>Rêve introuvable.</Text>
    <Pressable onPress={()=>router.replace('/my-space')} accessibilityRole="button">
      <Text style={{color:theme.foreground,fontWeight:'700'}}>Retour à mes rêves</Text>
    </Pressable>
   </View>}
  <Nav/>
 </SafeAreaView>;
}
