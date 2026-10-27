import React,{createContext,useCallback,useContext,useEffect,useMemo,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth} from './auth/AuthProvider';

type Message={id:string;text:string;fromMe:boolean};
type ProfileChanges={name:string;bio:string;city:string;church:string};
type AppState={
  rejectedContacts:string[];
  rejectContact:(name:string)=>void;
  signedIn:boolean;
  email:string;
  name:string;
  bio:string;
  city:string;
  church:string;
  login:(email:string,displayName?:string)=>void;
  logout:()=>void;
  edit:(patch:Partial<ProfileChanges>)=>void;
  messages:Message[];
  send:(text:string)=>void;
  fireIds:string[];
  isOnFire:(id:string)=>boolean;
  toggleFire:(id:string)=>void;
  dreamInspirations:Record<string,string[]>;
  encouragementIds:string[];
  encourage:(id:string)=>void;
  musicProposalIds:string[];
  proposeMusic:(id:string)=>void;
  myDreamIds:string[];
  joinDream:(id:string)=>void;
  prayerIds:string[];
  prayerByDate:Record<string,string[]>;
  prayerRepetitions:Record<string,'once'|'daily'|'weekly'>;
  setPrayerRepetition:(id:string,repeat:'once'|'daily'|'weekly')=>void;
  prayersForDate:(date:string)=>string[];
  togglePrayer:(id:string)=>void;
  isPraying:(id:string)=>boolean;
  addToDream:(dreamId:string,publicationId:string)=>void;
};
const Context=createContext<AppState|null>(null);
const todayKey=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const FIRE_KEY=(email:string)=>'jenlow.network.fire.v1.'+email.toLowerCase();
const DREAM_KEY=(email:string)=>'jenlow.network.inspirations.v1.'+email.toLowerCase();

export function Provider({children}:{children:React.ReactNode}){
 const {user,signOut}=useAuth();
 const [rejectedContacts,setRejectedContacts]=useState<string[]>([]);
 const [email,setEmail]=useState('');
 useEffect(()=>{setEmail(user?.email||'');if(user?.user_metadata?.display_name)setName(user.user_metadata.display_name)},[user?.id]);
 const [name,setName]=useState('Gustav');
 const [bio,setBio]=useState('Passionné de musique et de louange.');
 const [city,setCity]=useState('Genève');
 const [church,setChurch]=useState('ADD Annemasse');
 const [messages,setMessages]=useState<Message[]>([{id:'1',text:'Oh?',fromMe:false},{id:'2',text:'Cool',fromMe:false},{id:'3',text:'How does it work?',fromMe:false},{id:'4',text:'Bienvenue sur JenLow Network !',fromMe:true}]);
 const [fireIds,setFireIds]=useState<string[]>([]);
 const [dreamInspirations,setDreamInspirations]=useState<Record<string,string[]>>({});
 const [myDreamIds,setMyDreamIds]=useState<string[]>([]);
 const [encouragementIds,setEncouragementIds]=useState<string[]>([]);
 const [musicProposalIds,setMusicProposalIds]=useState<string[]>([]);
 const [prayerByDate,setPrayerByDate]=useState<Record<string,string[]>>({});
 const prayerIds=Array.from(new Set(Object.values(prayerByDate).flat()));
 const [prayerRepetitions,setPrayerRepetitions]=useState<Record<string,'once'|'daily'|'weekly'>>({});
 const [readyFor,setReadyFor]=useState('');

 useEffect(()=>{
  let canceled=false;
  if(!email){setFireIds([]);setDreamInspirations({});setEncouragementIds([]);setMusicProposalIds([]);setMyDreamIds([]);setPrayerByDate({});setPrayerRepetitions({});setReadyFor('');return;}
  setReadyFor('');
  Promise.all([AsyncStorage.getItem(FIRE_KEY(email)),AsyncStorage.getItem(DREAM_KEY(email)),AsyncStorage.getItem('jenlow.mine.'+email),AsyncStorage.getItem('jenlow.prayer.'+email),AsyncStorage.getItem('jenlow.encouragement.'+email),AsyncStorage.getItem('jenlow.proposals.'+email),AsyncStorage.getItem('jenlow.prayer.repeats.'+email)])
   .then(([fire,dreams,mine,prayers,encouragement,proposals,repeats])=>{
    if(canceled)return;
    let ids:string[]=[];
    let links:Record<string,string[]>={};
    try{if(fire){const parsed=JSON.parse(fire);if(Array.isArray(parsed))ids=parsed.filter(x=>typeof x==='string');}}catch{}
    try{if(dreams){const parsed=JSON.parse(dreams);if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))links=parsed;}}catch{}
    setFireIds(ids);setDreamInspirations(links);try{setMyDreamIds(mine?JSON.parse(mine):[])}catch{setMyDreamIds([])}try{const parsed=prayers?JSON.parse(prayers):{};setPrayerByDate(Array.isArray(parsed)?{[todayKey()]:parsed}:parsed&&typeof parsed==='object'?parsed:{})}catch{setPrayerByDate({})}try{setEncouragementIds(encouragement?JSON.parse(encouragement):[])}catch{setEncouragementIds([])}
    try{setMusicProposalIds(proposals?JSON.parse(proposals):[])}catch{setMusicProposalIds([])}
    try{const parsed=repeats?JSON.parse(repeats):{};setPrayerRepetitions(parsed&&typeof parsed==='object'?parsed:{})}catch{setPrayerRepetitions({})}
    setReadyFor(email);
   }).catch(()=>{if(!canceled){setReadyFor(email);}});
  return ()=>{canceled=true;};
 },[email]);

 useEffect(()=>{if(email&&readyFor===email){void AsyncStorage.setItem(FIRE_KEY(email),JSON.stringify(fireIds)).catch(()=>{});}},[fireIds,email,readyFor]);
 useEffect(()=>{if(email&&readyFor===email){void AsyncStorage.setItem(DREAM_KEY(email),JSON.stringify(dreamInspirations)).catch(()=>{});}},[dreamInspirations,email,readyFor]);

 useEffect(()=>{if(email&&readyFor===email)void AsyncStorage.setItem('jenlow.mine.'+email,JSON.stringify(myDreamIds)).catch(()=>{});},[email,readyFor,myDreamIds]);
 useEffect(()=>{if(email&&readyFor===email)void AsyncStorage.setItem('jenlow.prayer.'+email,JSON.stringify(prayerByDate)).catch(()=>{});},[email,readyFor,prayerByDate]);
 useEffect(()=>{if(email&&readyFor===email)void AsyncStorage.setItem('jenlow.encouragement.'+email,JSON.stringify(encouragementIds)).catch(()=>{});},[email,readyFor,encouragementIds]);
 useEffect(()=>{if(email&&readyFor===email)void AsyncStorage.setItem('jenlow.proposals.'+email,JSON.stringify(musicProposalIds)).catch(()=>{});},[email,readyFor,musicProposalIds]);
 useEffect(()=>{if(email&&readyFor===email)void AsyncStorage.setItem('jenlow.prayer.repeats.'+email,JSON.stringify(prayerRepetitions)).catch(()=>{})},[email,readyFor,prayerRepetitions]);
 const setPrayerRepetition=useCallback((id:string,repeat:'once'|'daily'|'weekly')=>setPrayerRepetitions(p=>({...p,[id]:repeat})),[]);
 const encourage=useCallback((id:string)=>setEncouragementIds(p=>p.includes(id)?p:[...p,id]),[]);
 const proposeMusic=useCallback((id:string)=>setMusicProposalIds(p=>p.includes(id)?p:[...p,id]),[]);
 const togglePrayer=useCallback((id:string)=>setPrayerByDate(prev=>{const exists=Object.values(prev).some(ids=>ids.includes(id));if(exists)return Object.fromEntries(Object.entries(prev).map(([day,ids])=>[day,ids.filter(x=>x!==id)]));const key=todayKey();return {...prev,[key]:[...(prev[key]||[]),id]}}),[]);
 const joinDream=useCallback((id:string)=>setMyDreamIds(prev=>prev.includes(id)?prev:[...prev,id]),[]);
 const toggleFire=useCallback((id:string)=>setFireIds(ids=>ids.includes(id)?ids.filter(x=>x!==id):[...ids,id]),[]);
 const addToDream=useCallback((dreamId:string,publicationId:string)=>{
  setDreamInspirations(current=>{
   const previous=current[dreamId]||[];
   return {...current,[dreamId]:previous.includes(publicationId)?previous:[...previous,publicationId]};
  });
 },[]);

 const value=useMemo<AppState>(()=>({
  rejectedContacts,
  rejectContact:(person)=>setRejectedContacts(prev=>prev.includes(person)?prev:[...prev,person]),
  signedIn:!!user,email,name,bio,city,church,login:(userEmail,displayName)=>{setEmail(userEmail);if(displayName)setName(displayName);},logout:()=>{void signOut().catch(()=>{});setEmail('')},
  edit:patch=>{
   if(patch.name!==undefined)setName(patch.name);
   if(patch.bio!==undefined)setBio(patch.bio);
   if(patch.city!==undefined)setCity(patch.city);
   if(patch.church!==undefined)setChurch(patch.church);
  },
  messages,send:text=>setMessages(prev=>[...prev,{id:String(Date.now()),text,fromMe:true}]),
  encouragementIds,encourage,musicProposalIds,proposeMusic,
  myDreamIds,joinDream,prayerIds,prayerByDate,prayerRepetitions,setPrayerRepetition,prayersForDate:(date:string)=>{const matching=new Set<string>();Object.entries(prayerByDate).forEach(([start,ids])=>ids.forEach(id=>{const mode=prayerRepetitions[id]||'daily';const days=Math.round((new Date(date+'T12:00:00').getTime()-new Date(start+'T12:00:00').getTime())/86400000);if(days>=0&&(mode==='daily'||mode==='weekly'&&days%7===0||mode==='once'&&days===0))matching.add(id)}));return Array.from(matching)},togglePrayer,isPraying:(id:string)=>prayerIds.includes(id),
  fireIds,isOnFire:(id:string)=>fireIds.includes(id),toggleFire,dreamInspirations,addToDream,
 }),[user?.id,signOut,rejectedContacts,email,name,bio,city,church,messages,fireIds,dreamInspirations,toggleFire,addToDream,myDreamIds,prayerByDate,prayerIds,joinDream,togglePrayer,encouragementIds,musicProposalIds,encourage,proposeMusic,prayerRepetitions,setPrayerRepetition]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useApp(){const ctx=useContext(Context);if(!ctx)throw new Error('Provider required');return ctx;}
