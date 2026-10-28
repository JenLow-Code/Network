import {Text} from '@/i18n/LocalizedText';
import React from 'react';
import {Image,Pressable,ScrollView,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {Nav} from '@/components/navigation/Nav';import {TopActions} from '@/components/navigation/TopActions';
import {musics} from '@/mocks/publications';
import {useLocale} from '@/i18n/locale';
export default function MusicHub(){const {t}=useLocale();return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}><ScrollView style={{flex:1}} contentContainerStyle={{padding:18,paddingBottom:40}}>
 <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8}}><Text style={{fontSize:30,fontWeight:'700'}}>{t('music')}</Text><TopActions/></View><Text style={{color:'#777',fontSize:12,marginBottom:20}}>Écouter, partager et proposer une collaboration.</Text>
 <Pressable onPress={()=>router.push('/publish/music')} style={{backgroundColor:'#111',padding:14,borderRadius:9,flexDirection:'row',alignItems:'center',gap:9,marginBottom:24}}><Ionicons name="add-circle-outline" color="#fff" size={23}/><Text style={{color:'#fff'}}>Partager une musique avec les crédits</Text></Pressable>
 <Text style={{fontSize:16,fontWeight:'700',marginBottom:12}}>Musiques et collaborations</Text>
 {musics.map(m=><Pressable key={m.id} onPress={()=>router.push({pathname:'/music/[id]',params:{id:m.id}})} style={{flexDirection:'row',paddingVertical:10,gap:11,alignItems:'center',borderBottomWidth:1,borderColor:'#eee'}}><Image source={{uri:m.image}} style={{width:78,height:74,borderRadius:9}}/><View style={{flex:1}}><Text style={{fontWeight:'700'}}>{m.title}</Text><Text style={{fontSize:11,color:'#999',marginTop:5}}>{m.author} · Proposition d’adaptation disponible</Text></View><Ionicons name="chevron-forward" size={18} color="#888"/></Pressable>)}
 <Text style={{color:'#999',fontSize:10,marginTop:20}}>Aucun téléchargement public de chansons. Les adaptations seront gérées via des propositions créditées.</Text>
 </ScrollView><Nav/></SafeAreaView>}
