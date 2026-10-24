import React,{createContext,useCallback,useContext,useEffect,useMemo,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  login:(email:string)=>void;
  logout:()=>void;
  edit:(patch:Partial<ProfileChanges>)=>void;
  messages:Message[];
  send:(text:string)=>void;
  fireIds:string[];
  isOnFire:(id:string)=>boolean;
  toggleFire:(id:string)=>void;
  dreamInspirations:Record<string,string[]>;
  myDreamIds:string[];
  joinDream:(id:string)=>void;
  prayerIds:string[];
  togglePrayer:(id:string)=>void;
  isPraying:(id:string)=>boolean;
  addToDream:(dreamId:string,publicationId:string)=>void;
};
const Context=createContext<AppState|null>(null);
const FIRE_KEY=(email:string)=>'jenlow.network.fire.v1.'+email.toLowerCase();
const DREAM_KEY=(email:string)=>'jenlow.network.inspirations.v1.'+email.toLowerCase();

export function Provider({children}:{children:React.ReactNode}){
 const [rejectedContacts,setRejectedContacts]=useState<string[]>([]);
 const [email,setEmail]=useState('');
 const [name,setName]=useState('Gustav');
 const [bio,setBio]=useState('Passionné de musique et de louange.');
 const [city,setCity]=useState('Genève');
 const [church,setChurch]=useState('ADD Annemasse');
 const [messages,setMessages]=useState<Message[]>([{id:'1',text:'Oh?',fromMe:false},{id:'2',text:'Cool',fromMe:false},{id:'3',text:'How does it work?',fromMe:false},{id:'4',text:'Bienvenue sur JenLow Network !',fromMe:true}]);
 const [fireIds,setFireIds]=useState<string[]>([]);
 const [dreamInspirations,setDreamInspirations]=useState<Record<string,string[]>>({});
 const [myDreamIds,setMyDreamIds]=useState<string[]>([]);
 const [prayerIds,setPrayerIds]=useState<string[]>([]);
 const [readyFor,setReadyFor]=useState('');

 useEffect(()=>{
  let canceled=false;
  if(!email){setFireIds([]);setDreamInspirations({});setMyDreamIds([]);setPrayerIds([]);setReadyFor('');return;}
  setReadyFor('');
  Promise.all([AsyncStorage.getItem(FIRE_KEY(email)),AsyncStorage.getItem(DREAM_KEY(email)),AsyncStorage.getItem('jenlow.mine.'+email),AsyncStorage.getItem('jenlow.prayer.'+email)])
   .then(([fire,dreams,mine,prayers])=>{
    if(canceled)return;
    let ids:string[]=[];
    let links:Record<string,string[]>={};
    try{if(fire){const parsed=JSON.parse(fire);if(Array.isArray(parsed))ids=parsed.filter(x=>typeof x==='string');}}catch{}
    try{if(dreams){const parsed=JSON.parse(dreams);if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))links=parsed;}}catch{}
    setFireIds(ids);setDreamInspirations(links);try{setMyDreamIds(mine?JSON.parse(mine):[])}catch{setMyDreamIds([])}try{setPrayerIds(prayers?JSON.parse(prayers):[])}catch{setPrayerIds([])}setReadyFor(email);
   }).catch(()=>{if(!canceled){setReadyFor(email);}});
  return ()=>{canceled=true;};
 },[email]);

 useEffect(()=>{if(email&&readyFor===email){void AsyncStorage.setItem(FIRE_KEY(email),JSON.stringify(fireIds)).catch(()=>{});}},[fireIds,email,readyFor]);
 useEffect(()=>{if(email&&readyFor===email){void AsyncStorage.setItem(DREAM_KEY(email),JSON.stringify(dreamInspirations)).catch(()=>{});}},[dreamInspirations,email,readyFor]);

 useEffect(()=>{if(email&&readyFor===email)void AsyncStorage.setItem('jenlow.mine.'+email,JSON.stringify(myDreamIds)).catch(()=>{});},[email,readyFor,myDreamIds]);
 useEffect(()=>{if(email&&readyFor===email)void AsyncStorage.setItem('jenlow.prayer.'+email,JSON.stringify(prayerIds)).catch(()=>{});},[email,readyFor,prayerIds]);
 const togglePrayer=useCallback((id:string)=>setPrayerIds(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]),[]);
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
  signedIn:!!email,email,name,bio,city,church,login:setEmail,logout:()=>setEmail(''),
  edit:patch=>{
   if(patch.name!==undefined)setName(patch.name);
   if(patch.bio!==undefined)setBio(patch.bio);
   if(patch.city!==undefined)setCity(patch.city);
   if(patch.church!==undefined)setChurch(patch.church);
  },
  messages,send:text=>setMessages(prev=>[...prev,{id:String(Date.now()),text,fromMe:true}]),
  myDreamIds,joinDream,prayerIds,togglePrayer,isPraying:(id:string)=>prayerIds.includes(id),
  fireIds,isOnFire:(id:string)=>fireIds.includes(id),toggleFire,dreamInspirations,addToDream,
 }),[rejectedContacts,email,name,bio,city,church,messages,fireIds,dreamInspirations,toggleFire,addToDream,myDreamIds,prayerIds,joinDream,togglePrayer]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useApp(){const ctx=useContext(Context);if(!ctx)throw new Error('Provider required');return ctx;}
