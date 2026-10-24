import React,{useState} from 'react';
import {Image,Pressable,ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {Nav,Pill} from '@/components';
import {useApp} from '@/context';
import {dreams,DREAM_PHASES,PHASE_COLORS,DreamPhase} from '@/discoveryData';
import {DreamStageAction} from '@/DreamStageAction';
export default function MyDreams(){
 const [tab,setTab]=useState<DreamPhase>('Rêve');
 const app=useApp();
 const shown=dreams.filter(d=>d.phase===tab);
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}>
 <ScrollView style={{flex:1}} contentContainerStyle={{padding:17,paddingBottom:60}}>
  <Text style={{fontFamily:'Caveat_700Bold',fontSize:36,color:'#181818',marginBottom:10}}>Mes rêves</Text>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:7,paddingBottom:15}}>{DREAM_PHASES.map(s=><Pill key={s} text={s} active={tab===s} onPress={()=>setTab(s)}/>)}</ScrollView>
  <Text style={{fontSize:12,color:'#777',marginBottom:15}}>{tab==='Rêve'?'Un rêve qui nous rapproche.':tab==='Initiation'?'C’est le moment de trouver des personnes et de commencer.':tab==='Croissance'?'Le rêve grandit. On peut l’accompagner dans la prière.':'Les fruits du rêve deviennent un témoignage.'}</Text>
  {shown.map(d=><View key={d.id} style={{borderWidth:1,borderColor:'#ededed',borderRadius:12,marginBottom:14,overflow:'hidden'}}>
   <Pressable onPress={()=>router.push({pathname:'/dream/[id]',params:{id:d.id}})} style={{flexDirection:'row',alignItems:'center',gap:12,padding:10}}>
    <Image source={{uri:d.image}} style={{width:95,height:92,borderRadius:9}}/>
    <View style={{flex:1,gap:7}}><Text style={{fontWeight:'700',fontSize:14}}>{d.title}</Text><Text style={{fontSize:10,color:PHASE_COLORS[d.phase].foreground}}>{d.phase.toUpperCase()}</Text><Text style={{fontSize:11,color:'#888'}}>{d.author}</Text></View>
    <Ionicons name="chevron-forward" color="#aaa" size={18}/>
   </Pressable>
   <View style={{paddingHorizontal:11,paddingBottom:12}}><DreamStageAction dream={d}/></View>
  </View>)}
  <Text style={{fontSize:10,color:'#aaa',marginTop:10}}>Prototype : les rêves montrés sont des exemples. Les participations et prières sont enregistrées localement. Les vrais compteurs et notifications nécessitent le backend.</Text>
  <Pressable onPress={()=>router.push('/prayers')} style={{marginTop:21,flexDirection:'row',gap:9,alignItems:'center'}}><Ionicons name="heart-outline" size={19}/><Text style={{fontSize:13}}>Mes prières du jour ({app.prayerIds.length})</Text><Ionicons name="chevron-forward" size={17}/></Pressable>
 </ScrollView><Nav/></SafeAreaView>;
}