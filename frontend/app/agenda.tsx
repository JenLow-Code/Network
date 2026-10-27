import {Text} from '@/i18n/LocalizedText';
import React,{useMemo,useState} from 'react';
import {Pressable,ScrollView,Share,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {Nav,TopActions} from '@/components';
import {PrayerIcon} from '@/PrayerIcon';
import {useApp} from '@/context';
import {useLocale} from '@/locale';
import {publications} from '@/discoveryData';
import {AgendaEntry,DEMO_AGENDA} from '@/domain/agendaTypes';
import {publicationPath} from '@/PublicationGallery';
import {useDreams} from '@/domain/dreamRepository';
const isoDay=(d:Date)=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
export default function Agenda(){
 const {items:trackedDreams}=useDreams();
 const {language,tr}=useLocale();const {prayersForDate,togglePrayer}=useApp();
 // Future: show a weekly overview of scheduled service / volunteer duty, separately from personal events.
 const [day,setDay]=useState(new Date());const [calendarOpen,setCalendarOpen]=useState(false);const [events,setEvents]=useState<AgendaEntry[]>(DEMO_AGENDA);
 const dateKey=isoDay(day),locale={fr:'fr-FR',en:'en-US',de:'de-DE',pt:'pt-PT'}[language];
 // Until backend, current prayer saves are not date-scoped. Show them on today only.
 const today=isoDay(new Date())===dateKey;
 const savedPrayers=prayersForDate(dateKey);
 const prayers=publications.filter(p=>savedPrayers.includes(p.id));
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
  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{fontSize:30,fontWeight:'700',color:'#171717'}}>{tr('agendaTitle')}</Text><TopActions/></View>
  <Text style={{color:'#888',fontSize:12,marginTop:3}}>{tr('agendaSubtitle')}</Text>
  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:23,paddingVertical:12,borderTopWidth:1,borderBottomWidth:1,borderColor:'#eee'}}>
   <Pressable onPress={()=>shift(-1)} accessibilityLabel="Previous day" style={{padding:8}}><Ionicons name="chevron-back" size={23}/></Pressable>
   <Pressable onPress={()=>setCalendarOpen(x=>!x)} accessibilityLabel="Choisir une date" style={{flexDirection:'row',gap:7,alignItems:'center'}}><Ionicons name="calendar-outline" size={20} color="#D71D77"/><Text style={{fontWeight:'700',fontSize:13,textTransform:'capitalize'}}>{dateCaption}</Text><Ionicons name="chevron-down" size={14} color="#777"/></Pressable>
   <Pressable onPress={()=>shift(1)} accessibilityLabel="Next day" style={{padding:8}}><Ionicons name="chevron-forward" size={23}/></Pressable>
  </View>
  {calendarOpen?<View style={{padding:12,borderRadius:12,borderWidth:1,borderColor:'#eee',marginTop:8,backgroundColor:'#fff'}}>
   <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><Pressable onPress={()=>setDay(d=>new Date(d.getFullYear(),d.getMonth()-1,Math.min(d.getDate(),28)))}><Ionicons name="chevron-back" size={21} color="#777"/></Pressable><Text style={{fontWeight:'700'}}>{day.toLocaleDateString(locale,{month:'long',year:'numeric'})}</Text><Pressable onPress={()=>setDay(d=>new Date(d.getFullYear(),d.getMonth()+1,Math.min(d.getDate(),28)))}><Ionicons name="chevron-forward" size={21} color="#777"/></Pressable></View>
   <View style={{flexDirection:'row',flexWrap:'wrap'}}>{Array.from({length:new Date(day.getFullYear(),day.getMonth(),1).getDay()===0?6:new Date(day.getFullYear(),day.getMonth(),1).getDay()-1},(_,i)=><View key={'empty'+i} style={{width:'14.285%',height:38}}/>)}{Array.from({length:new Date(day.getFullYear(),day.getMonth()+1,0).getDate()},(_,i)=>i+1).map(n=><Pressable key={n} onPress={()=>{setDay(new Date(day.getFullYear(),day.getMonth(),n));setCalendarOpen(false)}} style={{width:'14.285%',height:38,alignItems:'center',justifyContent:'center',backgroundColor:n===day.getDate()?'#f3dce7':'transparent',borderRadius:6}}><Text style={{fontSize:12}}>{n}</Text>{(events.some(e=>('date' in e)&&e.date===isoDay(new Date(day.getFullYear(),day.getMonth(),n))&&e.status!=='declined')||trackedDreams.some(d=>d.goalDate===isoDay(new Date(day.getFullYear(),day.getMonth(),n))))?<View style={{width:3,height:3,borderRadius:2,backgroundColor:'#CB245C',marginTop:2}}/>:null}</Pressable>)}</View>
   </View>:null}
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