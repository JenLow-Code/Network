import React from 'react';
import {ScrollView,Text,Pressable,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {verseText} from '@/discoveryData';
import {colors as c} from '@/theme';
export default function Bible(){return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}><ScrollView contentContainerStyle={{padding:24}}>
 <Pressable onPress={()=>router.back()}><Ionicons name="chevron-back" size={26}/></Pressable>
 <Text style={{fontSize:26,fontWeight:'700',marginTop:16,textAlign:'center'}}>Psaume 150</Text>
 <Text style={{fontSize:12,textAlign:'center',color:'#999',marginTop:5}}>Lecture biblique · Démonstration</Text>
 <View style={{marginTop:28,gap:12}}>
 {['Louez l’Éternel ! Louez Dieu dans son sanctuaire ! Louez-le dans l’étendue, où éclate sa puissance !','Louez-le pour ses hauts faits ! Louez-le selon l’immensité de sa grandeur !','Louez-le au son de la trompette ! Louez-le avec le luth et la harpe !','Louez-le avec le tambourin et avec des danses ! Louez-le avec les instruments à cordes et le chalumeau !','Louez-le avec les cymbales sonores ! Louez-le avec les cymbales retentissantes !',verseText].map((v,i)=><View key={i} style={{flexDirection:'row',gap:10,padding:10,backgroundColor:i===5?'#ffe8f2':'#fff'}}><Text style={{color:i===5?c.pink:'#999',fontSize:12}}>{i+1}</Text><Text style={{color:i===5?c.pink:'#222',fontSize:16,lineHeight:25,flex:1}}>{v}</Text></View>)}
 </View><Text style={{color:'#999',marginTop:24,fontSize:11}}>Le lecteur complet, les versions et les références croisées seront connectés ultérieurement.</Text></ScrollView></SafeAreaView>}