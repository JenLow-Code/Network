import React from 'react';
import {Pressable,ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {Avatar,Nav,TopActions} from '@/components';
import {useApp} from '@/context';
import {DREAM_PHASES,PHASE_COLORS,PHASE_LABELS} from '@/discoveryData';
import {useDreams} from '@/domain/dreamRepository';

function DreamsOverview(){const {items}=useDreams();return <View style={{flexDirection:'row',flexWrap:'wrap',gap:9}}>{DREAM_PHASES.map(phase=><Pressable key={phase} onPress={()=>router.push({pathname:'/my-dreams/[phase]',params:{phase}})} style={{width:'48%',borderRadius:13,padding:15,minHeight:113,justifyContent:'space-between',backgroundColor:PHASE_COLORS[phase].background}}><Text style={{fontWeight:'700',color:PHASE_COLORS[phase].foreground}}>{PHASE_LABELS[phase]}</Text><Text style={{fontSize:12,color:'#444'}}>{items.filter(d=>d.phase===phase).length} rêve(s)</Text></Pressable>)}</View>}
export default function MySpace(){
 const app=useApp();
 const sections=[
  {title:'Mon profil',detail:'Mes informations et talents',icon:'person-outline' as const,path:'/profile' as const},
  {title:'Ma liste de prières',detail:'Consulter et gérer les sujets, sans les lier aux dates',icon:'heart-outline' as const,path:'/prayers' as const},
  {title:'Messages et notifications',detail:'Mes échanges',icon:'chatbubbles-outline' as const,path:'/space' as const},
  {title:'Paramètres',detail:'Compte et préférences',icon:'settings-outline' as const,path:'/settings' as const}
 ];
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}>
  <ScrollView style={{flex:1}} contentContainerStyle={{padding:18,paddingBottom:50}}>
   <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{fontSize:29,fontWeight:'700'}}>Mon espace</Text><TopActions/></View>
   <View style={{marginTop:14,marginBottom:20,paddingBottom:18,borderBottomWidth:1,borderColor:'#eee'}}>
    <Text style={{fontSize:18,fontWeight:'700',marginBottom:12}}>Mes rêves</Text>
    <View style={{position:'relative'}}><DreamsOverview/><Pressable accessibilityLabel="Créer un rêve" onPress={()=>router.push('/my-dream/new')} style={{position:'absolute',left:'50%',top:'50%',width:54,height:54,marginLeft:-27,marginTop:-27,borderRadius:27,backgroundColor:'#fff',borderWidth:1,borderColor:'#eee',alignItems:'center',justifyContent:'center',elevation:3,zIndex:4}}><Ionicons name="add" size={31} color="#CB245C"/></Pressable></View>
   </View>
   <View style={{gap:9}}>{sections.map(s=><Pressable key={s.title} onPress={()=>router.push(s.path)} style={{flexDirection:'row',alignItems:'center',gap:13,padding:14,borderWidth:1,borderColor:'#ececec',borderRadius:13}}>
    <View style={{width:39,height:39,borderRadius:20,backgroundColor:'#f5f5f5',alignItems:'center',justifyContent:'center'}}><Ionicons name={s.icon} size={21} color="#252525"/></View>
    <View style={{flex:1}}><Text style={{fontSize:14,fontWeight:'700'}}>{s.title}</Text><Text style={{fontSize:11,color:'#777',marginTop:3}}>{s.detail}</Text></View><Ionicons name="chevron-forward" size={18} color="#999"/>
   </Pressable>)}</View>
  </ScrollView><Nav/>
 </SafeAreaView>;
}
