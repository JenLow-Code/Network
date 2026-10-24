import React,{useState} from 'react';
import {Pressable,ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router,useLocalSearchParams} from 'expo-router';
import {Nav} from '@/components';
import {findPublication} from '@/discoveryData';
export default function ShareInside(){
 const {id}=useLocalSearchParams<{id:string}>();
 const item=findPublication(id||''); const [chosen,setChosen]=useState('');
 const contacts=['Elynn Lee','Helena Hills','nebulanomad','Sarah'];
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}><View style={{flex:1,padding:19}}>
 <Pressable onPress={()=>router.back()}><Ionicons name="chevron-back" size={26}/></Pressable>
 <Text style={{fontFamily:'Caveat_700Bold',fontSize:33,marginTop:15}}>Partager dans JenLow</Text>
 <Text style={{fontSize:13,color:'#888',marginBottom:20}}>Envoyer « {item?.title||'Publication'} » à un contact</Text>
 <ScrollView>{contacts.map(name=><Pressable key={name} onPress={()=>setChosen(name)} style={{padding:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderColor:'#eee'}}><Text>{name}</Text><Ionicons name={chosen===name?'radio-button-on':'radio-button-off'} color={chosen===name?'#D71D77':'#aaa'} size={22}/></Pressable>)}</ScrollView>
 <Pressable disabled={!chosen} onPress={()=>router.push({pathname:'/chat/[id]',params:{id:'share',recipient:chosen,sharedId:id||''}})} style={{padding:15,borderRadius:9,backgroundColor:chosen?'#111':'#ccc',alignItems:'center'}}><Text style={{color:'#fff'}}>Préparer le message</Text></Pressable>
 <Text style={{color:'#888',fontSize:11,marginTop:12,textAlign:'center'}}>Envoi réel disponible après connexion du backend.</Text>
 </View><Nav/></SafeAreaView>;
}