import React from 'react';
import {Pressable,ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router,useLocalSearchParams} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {Avatar,Nav,TopActions} from '@/components';
import {people} from '@/people';
import {PublicationGallery} from '@/PublicationGallery';
export default function PublicPerson(){
 const {name}=useLocalSearchParams<{name:string}>();
 const person=people.find(p=>p.name===name);
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}><ScrollView style={{flex:1}} contentContainerStyle={{padding:18,paddingBottom:48}}>
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Pressable onPress={()=>router.back()}><Ionicons name="chevron-back" size={26}/></Pressable><TopActions/></View>
  {!person?<Text style={{padding:20}}>Profil introuvable</Text>:<>
   <View style={{alignItems:'center',marginVertical:20,gap:8}}><Avatar size={70}/><Text style={{fontSize:23,fontWeight:'700'}}>{person.name}</Text><Text style={{fontSize:12,color:'#777'}}>Profil public de démonstration</Text></View>
   <Text style={{fontSize:16,fontWeight:'700',marginBottom:10}}>Talents et intérêts</Text>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:7,marginBottom:22}}>{(person.talents.length?person.talents:['À découvrir']).map(t=><View key={t} style={{padding:10,borderRadius:18,backgroundColor:'#F4F4F4'}}><Text style={{fontSize:12}}>{t}</Text></View>)}</View>
   <Text style={{fontSize:16,fontWeight:'700',marginBottom:12}}>Publications</Text><PublicationGallery items={person.posts}/>
  </>}
 </ScrollView><Nav/></SafeAreaView>;
}
