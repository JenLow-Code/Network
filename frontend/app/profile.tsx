import {Text,TextInput} from '@/i18n/LocalizedText';
import React,{useEffect,useState} from 'react';
import {Image,Pressable,ScrollView,View,useWindowDimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Avatar,Nav,TopActions} from '@/components';
import {useApp} from '@/context';
import {useAuth} from '@/auth/AuthProvider';
import {useAppTheme} from '@/AppTheme';
type Talent={name:string;level:number;interests:string[]};
const initial:Talent[]=[
 {name:'Batterie',level:2,interests:['Tandem','Enseigner']},
 {name:'Chant',level:1,interests:['Tandem','Apprendre']},
 {name:'Piano',level:3,interests:['Tandem','Enseigner']}
];
const levels=[
 {name:'Grand débutant',color:'#287D58'},
 {name:'Quelques notions',color:'#2ECA65'},
 {name:'Intermédiaire',color:'#EAC000'},
 {name:'Avancé',color:'#F38A24'},
 {name:'Professionnel',color:'#CB245C'}
];
const interests=['Tandem','Enseigner','Apprendre'];
const iconFor=(name:string):keyof typeof Ionicons.glyphMap=>{
 const s=name.toLowerCase();
 return s.includes('batt')?'disc-outline':s.includes('chant')||s.includes('voix')?'mic-outline':s.includes('photo')?'camera-outline':s.includes('guit')?'musical-note-outline':'musical-notes-outline';
};
export default function Profile(){
 const app=useApp(),auth=useAuth(),theme=useAppTheme();
 const {width}=useWindowDimensions();
 const [edit,setEdit]=useState<'bio'|'city'|'church'|null>(null);
 const [draft,setDraft]=useState('');
 const [talents,setTalents]=useState<Talent[]>(initial);
 const [loaded,setLoaded]=useState(false);
 const [newTalent,setNewTalent]=useState('');
 const storage='jenlow.profile.talents.'+(app.email||'guest').toLowerCase();
 useEffect(()=>{let active=true;setLoaded(false);void AsyncStorage.getItem(storage).then(raw=>{if(!active)return;if(raw){try{const list=JSON.parse(raw);if(Array.isArray(list))setTalents(list)}catch{setTalents(initial)}}else setTalents(initial)}).finally(()=>{if(active)setLoaded(true)});return()=>{active=false}},[storage]);
 useEffect(()=>{if(loaded)void AsyncStorage.setItem(storage,JSON.stringify(talents)).catch(()=>{})},[storage,loaded,talents]);
 const start=(key:'bio'|'city'|'church')=>{setEdit(key);setDraft(app[key]||'')};
 const save=()=>{if(edit)app.edit({[edit]:draft});setEdit(null)};
 const field=(key:'bio'|'city'|'church',label:string)=> <View style={{marginTop:16,width:'100%'}}>
  <Text style={{fontSize:12,color:theme.muted,marginBottom:5}}>{label}</Text>
  <View style={{flexDirection:'row',alignItems:'center',gap:9}}>
   {edit===key?<TextInput value={draft} onChangeText={setDraft} multiline={key==='bio'} style={{flex:1,borderWidth:1,borderColor:theme.border,borderRadius:9,padding:10,color:theme.foreground,minHeight:key==='bio'?70:40}}/>:<Text style={{flex:1,color:theme.foreground,fontSize:14,lineHeight:21}}>{app[key]||'À compléter'}</Text>}
   <Pressable onPress={edit===key?save:()=>start(key)} style={{width:36,height:36,alignItems:'center',justifyContent:'center'}}><Ionicons name={edit===key?'checkmark':'pencil-outline'} size={19} color={theme.foreground}/></Pressable>
  </View>
 </View>;
 const updateTalent=(index:number,patch:Partial<Talent>)=>setTalents(items=>items.map((t,i)=>i===index?{...t,...patch}:t));
 const avatar=typeof auth.user?.user_metadata?.avatar_url==='string'?auth.user.user_metadata.avatar_url:undefined;
 const cardWidth=width>=750?'31%':'48%';
 return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}><ScrollView contentContainerStyle={{paddingHorizontal:18,paddingTop:12,paddingBottom:55,maxWidth:900,width:'100%',alignSelf:'center'}}>
  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{fontSize:29,fontWeight:'800',color:theme.foreground}}>Mon profil</Text><TopActions/></View>
  <View style={{alignItems:'center',marginTop:23}}>
   {avatar?<Image source={{uri:avatar}} style={{width:94,height:94,borderRadius:47,borderWidth:2,borderColor:theme.border}}/>:<Avatar size={94}/>}
   <Text style={{fontSize:22,fontWeight:'700',color:theme.foreground,marginTop:12}}>{app.name}</Text>
  </View>
  <View style={{backgroundColor:theme.surface,borderRadius:14,borderWidth:1,borderColor:theme.border,padding:15,marginTop:20}}>
   {field('bio','Ma description')}
   {field('city','Ma ville')}
   {field('church','Ma communauté')}
  </View>
  <Text style={{fontSize:19,fontWeight:'800',color:theme.foreground,marginTop:24,marginBottom:7}}>Mes talents</Text>
  <Text style={{fontSize:12,color:theme.muted,lineHeight:18}}>Choisis ton niveau et ce que tu souhaites partager. Les talents seront visibles dans Découvrir lorsque les profils seront publiés.</Text>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:16}}>
   {talents.map((t,index)=><View key={index} style={{width:cardWidth,borderWidth:1,borderColor:theme.border,borderRadius:14,padding:11,alignItems:'center',gap:9,backgroundColor:theme.surface}}>
    <Pressable onPress={()=>setTalents(list=>list.filter((_,i)=>index!==i))} accessibilityLabel={'Retirer '+t.name} style={{alignSelf:'flex-end'}}><Ionicons name="close-outline" size={18} color={theme.muted}/></Pressable>
    <View style={{width:74,height:74,borderRadius:37,backgroundColor:'#F32F60',alignItems:'center',justifyContent:'center'}}><Ionicons name={iconFor(t.name)} size={35} color="#191919"/></View>
    <Text numberOfLines={1} style={{fontSize:14,fontWeight:'700',color:theme.foreground}}>{t.name}</Text>
    <View style={{flexDirection:'row',gap:6}}>{levels.map((level,i)=><Pressable key={level.name} onPress={()=>updateTalent(index,{level:i})} accessibilityLabel={level.name} style={{width:13,height:13,borderRadius:7,backgroundColor:i<=t.level?level.color:theme.border,borderWidth:i===t.level?1:0,borderColor:'#777'}}/>)}</View>
    <Text style={{fontSize:10,color:theme.muted,textAlign:'center'}}>{levels[t.level]?.name||'À définir'}</Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:5,justifyContent:'center'}}>{interests.map(interest=><Pressable key={interest} onPress={()=>updateTalent(index,{interests:t.interests.includes(interest)?t.interests.filter(x=>x!==interest):[...t.interests,interest]})} style={{paddingHorizontal:7,paddingVertical:5,borderRadius:15,borderWidth:1,borderColor:t.interests.includes(interest)?'#CB245C':theme.border}}><Text style={{fontSize:9,color:theme.foreground}}>{interest}</Text></Pressable>)}</View>
   </View>)}
  </View>
  <View style={{flexDirection:'row',gap:8,marginTop:18}}>
   <TextInput value={newTalent} onChangeText={setNewTalent} placeholder="Ajouter un talent" style={{flex:1,borderWidth:1,borderColor:theme.border,borderRadius:9,padding:11,color:theme.foreground}}/>
   <Pressable onPress={()=>{if(newTalent.trim()){setTalents(x=>[...x,{name:newTalent.trim(),level:0,interests:[]}]);setNewTalent('')}}} style={{backgroundColor:'#222',borderRadius:9,paddingHorizontal:17,justifyContent:'center'}}><Ionicons name="add" size={23} color="#fff"/></Pressable>
  </View>
  <Pressable onPress={()=>router.push('/settings')} style={{marginTop:28,alignSelf:'center',padding:11}}><Text style={{color:theme.muted,fontSize:12}}>Paramètres du compte</Text></Pressable>
 </ScrollView><Nav/></SafeAreaView>;
}
