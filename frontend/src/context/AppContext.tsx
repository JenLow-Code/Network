import React,{createContext,useContext,useEffect,useState} from 'react';
import {Alert,Platform} from 'react-native';
import {useAuth} from './AuthProvider';
import {api} from '@/lib/api/client';
import {toPublications,type ApiFeedItem} from '@/lib/api/adapters';
import type {Publication} from '@/domain/publication';

type Message = { id: string; text: string; fromMe: boolean };
export type FireFolder = { id: string; name: string; publicationIds: string[]; verseIds?: string[] };
export type FireBibleVerse = {
  id: string; reference: string; edition: string; text: string; addedAt: string;
};
type ProfileChanges = { name: string; bio: string; city: string; church: string };
type AppState = {
  rejectedContacts: string[];
  rejectContact: (name: string) => void;
  signedIn: boolean;
  email: string;
  name: string;
  bio: string;
  city: string;
  church: string;
  login: (email: string, displayName?: string) => void;
  logout: () => void;
  edit: (patch: Partial<ProfileChanges>) => Promise<boolean>;
  profileError:string|null;
  firePublications:Publication[];
  prayerPublications:Publication[];
  fireError:string|null;
  prayerError:string|null;
  messages: Message[];
  send: (text: string) => void;
  fireIds: string[];
  fireFolders: FireFolder[];
  fireBibleVerses: FireBibleVerse[];
  saveBibleVerseToFire: (verse: FireBibleVerse, folderId?: string) => void;
  removeBibleVerseFromFire: (verseId: string) => void;
  toggleFireFolderVerse: (folderId: string, verseId: string) => void;
  createFireFolder: (name: string) => void;
  renameFireFolder: (folderId: string, name: string) => void;
  deleteFireFolder: (folderId: string) => void;
  toggleFireFolderItem: (folderId: string, publicationId: string) => void;
  isOnFire: (id: string) => boolean;
  toggleFire: (id: string) => void;
  dreamInspirations: Record<string, string[]>;
  encouragementIds: string[];
  encourage: (id: string) => void;
  musicProposalIds: string[];
  proposeMusic: (id: string) => void;
  myDreamIds: string[];
  joinDream: (id: string) => void;
  prayerIds: string[];
  prayerByDate: Record<string, string[]>;
  prayerRepetitions: Record<string, 'once' | 'daily' | 'weekly'>;
  setPrayerRepetition: (id: string, repeat: 'once' | 'daily' | 'weekly') => void;
  prayersForDate: (date: string) => string[];
  togglePrayer: (id: string) => void;
  isPraying: (id: string) => boolean;
  addToDream: (dreamId: string, publicationId: string) => void;
};
const Context = createContext<AppState | null>(null);

type Repeat='once'|'daily'|'weekly';
type ProfileResponse={user:{email:string;displayName:string;bio?:string|null;city?:string|null;church?:string|null}};
type PrayerRecord={repeat:Repeat;startDate:string|null;item:ApiFeedItem};
const unavailable=()=>{
  const message='Cette action nécessite un service serveur qui n’est pas encore disponible.';
  if(Platform.OS==='web'&&typeof window!=='undefined')window.alert(message);
  else Alert.alert('Service indisponible',message);
};
const failure=(message:string)=>{
  if(Platform.OS==='web'&&typeof window!=='undefined')window.alert(message);
  else Alert.alert('Action non enregistrée',message);
};
const encode=encodeURIComponent;
export function Provider({children}:{children:React.ReactNode}){
  const {user}=useAuth();
  return <AccountProvider key={user?.id||'signed-out'}>{children}</AccountProvider>;
}
function AccountProvider({children}:{children:React.ReactNode}){
  const {user,signOut}=useAuth();
  const email=user?.email||'';
  const [profile,setProfile]=useState<ProfileResponse['user']|null>(null);
  const [profileError,setProfileError]=useState<string|null>(null);
  const [firePublications,setFirePublications]=useState<Publication[]>([]);
  const [fireFolders,setFireFolders]=useState<FireFolder[]>([]);
  const [fireError,setFireError]=useState<string|null>(null);
  const [prayers,setPrayers]=useState<PrayerRecord[]>([]);
  const [prayerError,setPrayerError]=useState<string|null>(null);
  const [fireReady,setFireReady]=useState(false);
  const [prayersReady,setPrayersReady]=useState(false);
  const [busy,setBusy]=useState(false);
  const loadFire=async()=>{
    const items:ApiFeedItem[]=[];
    let cursor:string|null=null;
    do{
      const page:{items:ApiFeedItem[];nextCursor:string|null}=await api('/api/me/fire?limit=50'+(cursor?'&cursor='+encode(cursor):''),{auth:'required'});
      items.push(...page.items);cursor=page.nextCursor;
    }while(cursor);
    const folders=await api<{items:FireFolder[]}>('/api/me/fire/folders',{auth:'required'});
    setFirePublications(toPublications(items));setFireFolders(folders.items);setFireReady(true);setFireError(null);
  };
  const loadPrayers=async()=>{
    const response=await api<{items:PrayerRecord[]}>('/api/me/prayers',{auth:'required'});
    const visible=new Set(toPublications(response.items.map(p=>p.item)).map(p=>p.id));
    setPrayers(response.items.filter(p=>visible.has(p.item.id)));setPrayersReady(true);setPrayerError(null);
  };
  useEffect(()=>{
    if(!email)return;
    void api<ProfileResponse>('/api/me',{auth:'required'}).then(result=>{
      if(result.user.email.toLowerCase()!==email.toLowerCase())throw Error('identity_mismatch');
      setProfile(result.user);
    }).catch(()=>setProfileError('Profil serveur indisponible.'));
    void loadFire().catch(()=>setFireError('Liste Fire indisponible.'));
    void loadPrayers().catch(()=>setPrayerError('Liste de prière indisponible.'));
  },[email]);
  const fireIds=firePublications.map(p=>p.id);
  const prayerPublications=toPublications(prayers.map(p=>p.item));
  const prayerIds=prayerPublications.map(p=>p.id);
  const prayerRepetitions=Object.fromEntries(prayers.map(p=>[p.item.id,p.repeat]));
  const prayerByDate:Record<string,string[]>={};
  for(const p of prayers){if(p.startDate)(prayerByDate[p.startDate]??=[]).push(p.item.id);}
  const mutate=async(domain:'fire'|'prayer',path:string,method:'POST'|'PATCH'|'DELETE',body?:object)=>{
    if(busy||!(domain==='fire'?fireReady:prayersReady)){unavailable();return;}
    setBusy(true);
    try{await api(path,{auth:'required',method,...(body?{body}:{})});await (domain==='fire'?loadFire():loadPrayers());}
    catch{if(domain==='fire'){setFireError('Synchronisation Fire indisponible.');setFireReady(false);}else{setPrayerError('Synchronisation des prières indisponible.');setPrayersReady(false);}failure('La confirmation du serveur n’a pas pu être obtenue.');}
    finally{setBusy(false);}
  };
  const folderPath=(id:string)=>'/api/me/fire/folders/'+encode(id);
  const publicationPath=(id:string)=>'/api/publications/'+encode(id);
  const value:AppState={
    signedIn:!!user,email,name:profile?.displayName||(typeof user?.user_metadata?.display_name==='string'?user.user_metadata.display_name:''),bio:profile?.bio||'',city:profile?.city||'',church:profile?.church||'',profileError,
    login:unavailable,logout:()=>{void signOut();},
    edit:async patch=>{
      try{
        const {name,...fields}=patch;
        const response=await api<ProfileResponse>('/api/me',{auth:'required',method:'PATCH',body:{...fields,...(name!==undefined?{displayName:name}:{})}});
        if(response.user.email.toLowerCase()!==email.toLowerCase())throw Error('identity_mismatch');
        setProfile(response.user);setProfileError(null);return true;
      }catch{setProfileError('Modification du profil non confirmée.');failure('Le profil n’a pas pu être enregistré.');return false;}
    },
    rejectedContacts:[],rejectContact:unavailable,messages:[],send:unavailable,
    fireIds,fireFolders,firePublications,fireError,fireBibleVerses:[],
    saveBibleVerseToFire:unavailable,removeBibleVerseFromFire:unavailable,toggleFireFolderVerse:unavailable,
    createFireFolder:name=>{void mutate('fire','/api/me/fire/folders','POST',{name});},
    renameFireFolder:(id,name)=>{void mutate('fire',folderPath(id),'PATCH',{name});},
    deleteFireFolder:id=>{void mutate('fire',folderPath(id),'DELETE');},
    toggleFireFolderItem:(id,pubId)=>{void mutate('fire',folderPath(id)+'/items/'+encode(pubId),fireFolders.find(f=>f.id===id)?.publicationIds.includes(pubId)?'DELETE':'POST');},
    isOnFire:id=>fireIds.includes(id),
    toggleFire:id=>{void mutate('fire',publicationPath(id)+'/fire',fireIds.includes(id)?'DELETE':'POST');},
    dreamInspirations:{},addToDream:unavailable,encouragementIds:[],encourage:unavailable,musicProposalIds:[],proposeMusic:unavailable,myDreamIds:[],joinDream:unavailable,
    prayerIds,prayerByDate,prayerRepetitions,prayerPublications,prayerError,
    setPrayerRepetition:(id,repeat)=>{const startDate=prayers.find(p=>p.item.id===id)?.startDate;void mutate('prayer',publicationPath(id)+'/prayer','POST',{repeat,...(startDate?{startDate}:{})});},
    prayersForDate:date=>prayers.filter(p=>{
      if(!p.startDate)return false;
      const days=Math.round((Date.parse(date+'T12:00:00Z')-Date.parse(p.startDate+'T12:00:00Z'))/86400000);
      return days>=0&&(p.repeat==='daily'||p.repeat==='weekly'&&days%7===0||p.repeat==='once'&&days===0);
    }).map(p=>p.item.id),
    togglePrayer:id=>{void mutate('prayer',publicationPath(id)+'/prayer',prayerIds.includes(id)?'DELETE':'POST');},
    isPraying:id=>prayerIds.includes(id),
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useApp() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('Provider required');
  return ctx;
}
