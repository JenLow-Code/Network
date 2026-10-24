import React,{useState} from 'react';
import {Alert,Pressable,ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {Avatar,Nav,Pill} from '@/components';
import {ContactSheet} from '@/ContactSheet';
import {colors as c} from '@/theme';
import {useApp} from '@/context';

type Kind='All'|'Chats'|'Collabs'|'Lessons';
type Activity={id:number,kind:Kind,name:string,detail:string,age:string,status:'online'|'busy'|'offline'};
const initial:Activity[]=[
{id:1,kind:'Collabs',name:'starryskies23',detail:'Requested a collab',age:'1d',status:'busy'},
{id:2,kind:'Chats',name:'nebulanomad',detail:'Liked your song',age:'1d',status:'online'},
{id:3,kind:'Lessons',name:'system',detail:'Tandem with nebulanomad\nTomorrow at 13:00, JenLow Studio',age:'2d',status:'online'},
{id:4,kind:'Chats',name:'lunavoyager',detail:'Reposted your song',age:'3d',status:'online'},
{id:5,kind:'Chats',name:'shadowlynx',detail:"Replied\nI'm going in September, what about you?",age:'4d',status:'offline'},
{id:6,kind:'Chats',name:'nebulanomad',detail:'Shared something with you',age:'5d',status:'online'}
];
const presence={online:'#24c967',busy:'#ef5c79',offline:'#c8c8c8'};
export default function Space(){
 const {rejectContact}=useApp();
 const [tab,setTab]=useState<Kind>('All');const [activities,setActivities]=useState(initial);
 const [decisions,setDecisions]=useState<Record<number,string>>({});
 function answer(id:number,yes:boolean){if(!yes){const activity=activities.find(a=>a.id===id);if(activity)rejectContact(activity.name);}setDecisions(p=>({...p,[id]:yes?'Accepted':'Declined'}));Alert.alert(yes?'Invitation accepted':'Invitation declined','Demo only — not yet saved to the server.');}
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}>
 <View style={{flex:1}}>
 <ScrollView contentContainerStyle={{paddingTop:15,paddingBottom:148}}>
 <Text style={{fontFamily:'Caveat_700Bold',fontSize:34,marginHorizontal:21,marginBottom:15,color:'#101010'}}>Your space</Text>
 <View style={{flexDirection:'row',gap:6,marginHorizontal:15,marginBottom:20}}>
 {(['All','Chats','Collabs','Lessons'] as Kind[]).map(t=><Pill key={t} text={t} active={tab===t} onPress={()=>setTab(t)}/>)}</View>
 {activities.filter(x=>tab==='All'||x.kind===tab).map(item=>
 <Pressable key={item.id} onPress={()=>item.kind==='Lessons'?router.push('/agenda'):item.kind!=='Collabs'&&router.push('/chat/helena')} style={{paddingHorizontal:14,paddingVertical:10,flexDirection:'row',alignItems:'center',gap:10,minHeight:65}}>
 <View style={{width:5,height:5,borderRadius:4,backgroundColor:presence[item.status]}}/>
 {item.name==='system'?<View style={{width:39,height:39,borderRadius:20,backgroundColor:c.pink,alignItems:'center',justifyContent:'center'}}><Ionicons name="notifications-outline" size={22}/></View>:<Avatar size={39}/>}
 <View style={{flex:1}}><Text style={{fontWeight:'700',fontSize:12}}>{item.name} <Text style={{color:'#999',fontWeight:'400'}}>{item.age}</Text></Text><Text style={{fontSize:11,color:'#888',marginTop:4}}>{item.detail}</Text></View>
 {item.kind==='Collabs'?decisions[item.id]?<Text style={{fontSize:10,color:'#888'}}>{decisions[item.id]}</Text>:<View style={{flexDirection:'row',gap:4}}><Pressable onPress={()=>answer(item.id,false)} style={{paddingVertical:7,paddingHorizontal:9,backgroundColor:'#f9dce3',borderRadius:6}}><Text style={{fontWeight:'700',fontSize:11,color:'#fff'}}>NO</Text></Pressable><Pressable onPress={()=>answer(item.id,true)} style={{paddingVertical:7,paddingHorizontal:9,backgroundColor:'#27c865',borderRadius:6}}><Text style={{fontWeight:'700',fontSize:11,color:'#fff'}}>YES</Text></Pressable></View>:<Ionicons name="image-outline" size={30} color="#aaa"/>}
 </Pressable>)}
 </ScrollView>
 <ContactSheet/>
 </View>
 <Nav/>
 </SafeAreaView>
}
