import React from 'react';
import {Pressable,ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {Avatar,Nav,TopActions} from '@/components';
import {useApp} from '@/context';
import {dreams,musics} from '@/discoveryData';

export default function MySpace(){
 const app=useApp();
 const sections=[
  {title:'Mes rêves',detail:'Créer et suivre mes rêves',icon:'leaf-outline' as const,path:'/my-dreams' as const},
  {title:'Mon profil',detail:'Présentation, talents et disponibilités',icon:'person-outline' as const,path:'/profile' as const},
  {title:'Mes musiques',detail:'Consulter mes publications · gérer dans Musique',icon:'musical-notes-outline' as const,path:'/music-hub' as const},
  {title:'Messages et notifications',detail:'Mes échanges et collaborations',icon:'chatbubbles-outline' as const,path:'/space' as const},
  {title:'Paramètres',detail:'Compte, langue et préférences',icon:'settings-outline' as const,path:'/settings' as const}
 ];
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}>
  <ScrollView style={{flex:1}} contentContainerStyle={{padding:18,paddingBottom:50}}>
   <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{fontSize:29,fontWeight:'700'}}>Mon espace</Text><TopActions/></View>
   <Pressable onPress={()=>router.push('/profile')} style={{flexDirection:'row',gap:14,alignItems:'center',borderWidth:1,borderColor:'#e8e8e8',borderRadius:16,padding:15,marginTop:18,marginBottom:19}}>
    <Avatar size={58}/><View style={{flex:1}}><Text style={{fontWeight:'700',fontSize:18}}>{app.name||'Mon profil'}</Text><Text style={{fontSize:12,color:'#777',marginTop:3}}>Voir mon profil public et mes talents</Text></View><Ionicons name="chevron-forward" size={19} color="#888"/>
   </Pressable>
   <View style={{gap:9}}>{sections.map(s=><Pressable key={s.title} onPress={()=>router.push(s.path)} style={{flexDirection:'row',alignItems:'center',gap:13,padding:14,borderWidth:1,borderColor:'#ececec',borderRadius:13}}>
    <View style={{width:39,height:39,borderRadius:20,backgroundColor:'#f5f5f5',alignItems:'center',justifyContent:'center'}}><Ionicons name={s.icon} size={21} color="#252525"/></View>
    <View style={{flex:1}}><Text style={{fontSize:14,fontWeight:'700'}}>{s.title}</Text><Text style={{fontSize:11,color:'#777',marginTop:3}}>{s.detail}</Text></View><Ionicons name="chevron-forward" size={18} color="#999"/>
   </Pressable>)}</View>
   <Text style={{color:'#999',fontSize:11,marginTop:20}}>Mes rêves restent dans leur espace de suivi. Mes morceaux restent gérés depuis Musique.</Text>
  </ScrollView><Nav/>
 </SafeAreaView>;
}
