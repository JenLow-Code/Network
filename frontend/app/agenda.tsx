import React,{useMemo,useState} from 'react';
import {Pressable,ScrollView,Share,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {Nav} from '@/components';
import {PrayerIcon} from '@/PrayerIcon';
import {useApp} from '@/context';
import {useLocale} from '@/locale';
import {publications} from '@/discoveryData';
import {AgendaEntry,DEMO_AGENDA} from '@/domain/agendaTypes';
import {publicationPath} from '@/PublicationGallery';
const isoDay=(d:Date)=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
export default function Agenda(){
 const {language,tr}=useLocale();const {prayerIds,togglePrayer}=useApp();
 const [day,setDay]=useState(new Date());const [events,setEvents]=useState<AgendaEntry[]>(DEMO_AGENDA);
 const dateKey=isoDay(day),locale={fr:'fr-FR',en:'en-US',de:'de-DE',pt:'pt-PT'}[language];
 // Until backend, current prayer saves are not date-scoped. Show them on today only.
 const today=isoDay(new Date())===dateKey;
 const prayers=today?publications.filter(p=>prayerIds.includes(p.id)):[];
 const dateCaption=day.toLocaleDateString(locale,{weekday:'long',day:'numeric',month:'long',year:'numeric'});
 const shift=(n:number)=>setDay(prev=>new Date(prev.getFullYear(),prev.getMonth(),prev.getDate()+n));
 const shownEvents=events.filter(e=>e.status!=='declined'&&today);
 function status(id:string,status:'confirmed'|'declined'){setEvents(xs=>xs.map(e=>e.id===id?{...e,status}:e))}
 async function exportEvent(e:AgendaEntry){
  if(e.status!=='confirmed')return;
  // Example event only: no real date exists in demo AgendaEntry, so never fabricate one.
  await Share.share({message:e.title+' · '+e.timeLabel+' · '+e.place+'\n'+tr('calendarDescription')});
 }
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}><ScrollView style={{flex:1}} contentContainerStyle={{paddingHorizontal:18,paddingTop:17,paddingBottom:42}}>
  <Text style={{fontFamily:'Caveat_700Bold',fontSize:36,color:'#171717'}}>{tr('agendaTitle')}</Text>
  <Text style={{color:'#888',fontSize:12,marginTop:3}}>{tr('agendaSubtitle')}</Text>
  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:23,paddingVertical:12,borderTopWidth:1,borderBottomWidth:1,borderColor:'#eee'}}>
   <Pressable onPress={()=>shift(-1)} accessibilityLabel="Previous day" style={{padding:8}}><Ionicons name="chevron-back" size={23}/></Pressable>
   <View style={{flexDirection:'row',gap:7,alignItems:'center'}}><Ionicons name="calendar-outline" size={20} color="#D71D77"/><Text style={{fontWeight:'700',fontSize:13,textTransform:'capitalize'}}>{dateCaption}</Text></View>
   <Pressable onPress={()=>shift(1)} accessibilityLabel="Next day" style={{padding:8}}><Ionicons name="chevron-forward" size={23}/></Pressable>
  </View>
  <Pressable onPress={()=>setDay(new Date())} style={{alignSelf:'center',padding:7}}><Text style={{fontSize:11,color:'#888'}}>{language==='fr'?"Aujourd'hui":language==='de'?'Heute':language==='pt'?'Hoje':'Today'}</Text></Pressable>
  <View style={{flexDirection:'row',alignItems:'center',gap:9,marginTop:14,marginBottom:10}}><PrayerIcon size={30}/><Text style={{fontSize:17,fontWeight:'700'}}>{tr('prayersToday')}</Text></View>
  {prayers.length===0?<Text style={{fontSize:12,color:'#888',paddingVertical:14}}>{tr('noPrayers')}</Text>:prayers.map(p=><View key={p.id} style={{flexDirection:'row',alignItems:'center',paddingVertical:11,borderBottomWidth:1,borderColor:'#f0f0f0',gap:11}}>
   <Pressable onPress={()=>router.push(publicationPath(p) as any)} style={{flex:1}}><Text style={{fontSize:13,fontWeight:'600'}}>{p.title}</Text><Text style={{fontSize:10,color:'#aaa',marginTop:3}}>{p.type==='bible'?'Bible':p.type==='dream'?'Dream':'Music'}</Text></Pressable>
   <Pressable onPress={()=>togglePrayer(p.id)} accessibilityLabel="Remove prayer"><Ionicons name="checkmark-circle" size={22} color="#64936f"/></Pressable>
  </View>)}
  <Text style={{fontSize:17,fontWeight:'700',marginTop:29,marginBottom:15}}>{tr('appointments')}</Text>
  {shownEvents.length===0?<Text style={{fontSize:12,color:'#888'}}>{tr('emptyAgenda')}</Text>:shownEvents.map(e=><View key={e.id} style={{borderWidth:1,borderColor:'#e9e9e9',padding:14,borderRadius:12,marginBottom:12}}>
   <Text style={{fontSize:14,fontWeight:'700'}}>{e.title}</Text><Text style={{fontSize:11,color:'#777',marginTop:6}}>{e.timeLabel} · {e.place} · {e.partner}</Text>
   <Text style={{fontSize:11,color:'#888',marginTop:6}}>{e.status==='pending'?tr('pending'):tr('confirmed')}</Text>
   {e.status==='pending'?<View style={{flexDirection:'row',gap:8,marginTop:12}}><Pressable onPress={()=>status(e.id,'declined')} style={{flex:1,alignItems:'center',padding:10,backgroundColor:'#eee',borderRadius:8}}><Text>{tr('decline')}</Text></Pressable><Pressable onPress={()=>status(e.id,'confirmed')} style={{flex:1,alignItems:'center',padding:10,backgroundColor:'#111',borderRadius:8}}><Text style={{color:'#fff'}}>{tr('accept')}</Text></Pressable></View>:<Pressable onPress={()=>void exportEvent(e)} style={{flexDirection:'row',alignItems:'center',gap:7,marginTop:13}}><Ionicons name="calendar-outline" size={17} color="#D71D77"/><Text style={{color:'#D71D77',fontSize:12}}>{tr('exportCalendar')}</Text></Pressable>}
  </View>)}
  <Text style={{color:'#aaa',fontSize:11,marginTop:20,lineHeight:17}}>Demo: prayer records and appointments are not yet synchronized to a calendar provider. When real event dates exist, native calendars can receive an event or subscribe to a private ICS feed. Google and Outlook OAuth sync requires separate consent.</Text>
 </ScrollView><Nav/></SafeAreaView>;
}