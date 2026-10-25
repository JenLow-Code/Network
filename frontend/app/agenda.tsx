import React,{useState} from 'react';
import {Pressable,ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {Nav} from '@/components';
import {PrayerIcon} from '@/PrayerIcon';
import {useApp} from '@/context';
import {publications} from '@/discoveryData';
import {AgendaEntry,DEMO_AGENDA} from '@/domain/agendaTypes';
import {colors as colors} from '@/theme';
export default function Agenda(){
 const {prayerIds}=useApp();
 const [events,setEvents]=useState<AgendaEntry[]>(DEMO_AGENDA);
 const prayers=publications.filter(p=>prayerIds.includes(p.id));
 function setStatus(id:string,status:'confirmed'|'declined'){setEvents(list=>list.map(e=>e.id===id?{...e,status}:e))}
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}>
  <ScrollView style={{flex:1}} contentContainerStyle={{padding:18,paddingBottom:55}}>
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
    <Text style={{fontFamily:'Caveat_700Bold',fontSize:36,color:'#111'}}>Mon agenda</Text>
    <Pressable onPress={()=>router.push('/prayers')} accessibilityLabel="View daily prayers"><PrayerIcon size={29}/></Pressable>
   </View>
   <Text style={{fontSize:12,color:'#777',marginBottom:22}}>La prière et les rendez-vous au même endroit.</Text>
   <Pressable onPress={()=>router.push('/prayers')} style={{borderRadius:12,backgroundColor:'#f6f0f3',padding:15,marginBottom:25}}>
    <Text style={{fontSize:15,fontWeight:'700',color:'#222'}}>Mes prières du jour</Text>
    <Text style={{fontSize:12,color:'#777',marginTop:5}}>{prayers.length?prayers.map(p=>p.title).slice(0,3).join(' · '):'Aucun sujet pour aujourd’hui. Ajouter une prière depuis Discover.'}</Text>
    <Text style={{color:colors.pink,fontSize:12,marginTop:11}}>Ouvrir mes prières →</Text>
   </Pressable>
   <Text style={{fontSize:18,fontWeight:'700',marginBottom:12}}>Rendez-vous</Text>
   {events.filter(e=>e.status!=='declined').map(e=><View key={e.id} style={{borderWidth:1,borderColor:'#ececec',borderRadius:12,padding:15,marginBottom:12}}>
    <View style={{flexDirection:'row',gap:8,alignItems:'center'}}><Ionicons name="calendar-outline" size={23} color={colors.pink}/><View style={{flex:1}}><Text style={{fontSize:15,fontWeight:'700'}}>{e.title}</Text><Text style={{fontSize:11,color:'#777',marginTop:3}}>{e.dateLabel} · {e.timeLabel} · {e.place}</Text></View></View>
    <Text style={{fontSize:11,color:'#888',marginTop:9}}>Avec {e.partner} · {e.status==='pending'?'En attente de confirmation':'Confirmé'}</Text>
    {e.status==='pending'?<View style={{flexDirection:'row',gap:9,marginTop:14}}>
     <Pressable onPress={()=>setStatus(e.id,'declined')} style={{padding:10,borderRadius:7,backgroundColor:'#eee',flex:1,alignItems:'center'}}><Text>Refuser</Text></Pressable>
     <Pressable onPress={()=>setStatus(e.id,'confirmed')} style={{padding:10,borderRadius:7,backgroundColor:'#111',flex:1,alignItems:'center'}}><Text style={{color:'#fff'}}>Confirmer</Text></Pressable>
    </View>:null}
   </View>)}
   <Text style={{color:'#999',fontSize:11,marginTop:15}}>Agenda de démonstration : les confirmations ne sont pas encore synchronisées avec My Space ou un calendrier externe. L'intégration éventuelle avec Planning Center nécessitera une connexion autorisée.</Text>
  </ScrollView><Nav/>
 </SafeAreaView>;
}
