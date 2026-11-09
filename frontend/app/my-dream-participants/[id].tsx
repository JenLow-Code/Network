import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import { useDreams } from '@/domain/dreamRepository';
import { api } from '@/lib/api/client';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Nav } from '@/components/navigation/Nav';

type Participant={displayName?:string;display_name?:string;handle?:string;name?:string};
type ParticipantsResponse={sameDreamCount?:number;sameDream?:Participant[]};
export default function DreamParticipants(){
 const {id,tab}=useLocalSearchParams<{id:string;tab?:string}>();
 const theme=useAppTheme();
 const {items}=useDreams();
 const dream=items.find(d=>d.id===id);
 const [active,setActive]=useState<'coowners'|'participants'>(
   tab==='coowners'?'coowners':'participants');
 const [remote,setRemote]=useState<ParticipantsResponse|null>(null);
 const [loading,setLoading]=useState(false);
 useEffect(()=>{
  if(!dream?.serverDreamId)return;
  let live=true;
  setLoading(true);
  void api<ParticipantsResponse>(
    '/api/dreams/'+encodeURIComponent(dream.serverDreamId)+'/participants',
    {auth:'required'},
  ).then(value=>{if(live)setRemote(value);})
   .catch(()=>{if(live)setRemote(null);})
   .finally(()=>{if(live)setLoading(false);});
  return ()=>{live=false;};
 },[dream?.serverDreamId]);
 if(!dream)return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
   <PageHeader/><Text style={{color:theme.muted,padding:20}}>Rêve introuvable.</Text>
   <Nav/>
 </SafeAreaView>;
 const owners=(dream.coOwners||[]).filter(o=>o.accepted&&o.name?.trim());
 const collaborators=(dream.resources||[]).filter(r=>r.category==='person'&&r.confirmed);
 const fromServer=remote?.sameDream||[];
 const entries=active==='coowners'?owners.map(o=>({key:o.userId,name:o.name,subtitle:'Co-propriétaire'})):
   [...collaborators.map(r=>({key:r.id,name:r.title,subtitle:'Talent confirmé'})),
    ...fromServer.map((r,i)=>({key:'server-'+i,name:r.displayName||r.display_name||r.name||r.handle||'Participant',subtitle:'A rejoint ce rêve'}))];
 return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
   <ScrollView contentContainerStyle={{paddingHorizontal:19,paddingTop:10,
     paddingBottom:115,maxWidth:780,width:'100%',alignSelf:'center',gap:17}}>
     <PageHeader/>
     <Text style={{fontSize:28,fontFamily:'serif',color:theme.foreground,marginTop:14}}>
       Personnes du rêve
     </Text>
     <Text style={{fontSize:13,color:theme.muted,lineHeight:20}}>{dream.title}</Text>
     <View style={{flexDirection:'row',borderBottomWidth:1,borderColor:theme.border}}>
       {([{key:'coowners',label:'Co-propriétaires'},
         {key:'participants',label:'Participants'}] as const).map(item=>
         <Pressable key={item.key} onPress={()=>setActive(item.key)} accessibilityRole="tab"
           accessibilityState={{selected:active===item.key}}
           style={{flex:1,padding:14,alignItems:'center',
             borderBottomWidth:active===item.key?2:0,
             borderBottomColor:active===item.key?'#B88962':'transparent'}}>
           <Text style={{fontSize:13,fontWeight:active===item.key?'700':'500',
             color:active===item.key?theme.foreground:theme.muted}}>{item.label}</Text>
         </Pressable>)}
     </View>
     {entries.length?entries.map(person=><View key={person.key}
       style={{flexDirection:'row',alignItems:'center',gap:13,
         minHeight:63,borderBottomWidth:1,borderColor:theme.border}}>
       <View style={{width:38,height:38,borderRadius:19,
         backgroundColor:theme.surface,alignItems:'center',justifyContent:'center'}}>
         <Ionicons name="person-outline" size={18} color={theme.muted}/>
       </View>
       <View style={{flex:1,gap:3}}>
         <Text style={{fontSize:14,color:theme.foreground,fontWeight:'600'}}>{person.name}</Text>
         <Text style={{fontSize:11,color:theme.muted}}>{person.subtitle}</Text>
       </View>
     </View>):
     <View style={{alignItems:'center',paddingVertical:30,gap:8}}>
       {loading?<ActivityIndicator color={theme.muted}/>:
         <Ionicons name="people-outline" size={26} color={theme.muted}/>}
       <Text style={{fontSize:13,lineHeight:20,color:theme.muted,textAlign:'center'}}>
         {active==='coowners'?'Aucun autre co-propriétaire confirmé.':
           loading?'Chargement des participants…':'Aucun participant confirmé à afficher.'}
       </Text>
     </View>}
     {active==='participants'?<Text style={{fontSize:11,color:theme.muted,lineHeight:18}}>
       Seules les personnes confirmées sont affichées. Les participants du serveur sont accessibles lorsque ton compte possède l’autorisation nécessaire.
     </Text>:null}
   </ScrollView>
   <Nav/>
 </SafeAreaView>;
}
