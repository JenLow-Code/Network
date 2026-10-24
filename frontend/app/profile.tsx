import React,{useState} from 'react';
import {Pressable,ScrollView,Text,TextInput,View,StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {useAudioPlayer,useAudioPlayerStatus} from 'expo-audio';
import {Nav,Avatar} from '@/components';
import {useApp} from '@/context';
import {colors as c} from '@/theme';
import {ContactSheet} from '@/ContactSheet';
const audios=[require('../assets/audio/pierre-01-douceur.wav'),require('../assets/audio/pierre-02-esperance.wav'),require('../assets/audio/pierre-03-lumiere.wav')];
const levels=[{name:'Absolute beginner',color:'#14693f'},{name:'Curious beginner',color:'#3dbb69'},{name:'Intermediate',color:'#f3c53f'},{name:'Used to',color:'#e65a57'},{name:'Professional',color:'#cc145a'}];
function Editable({value,onSave,align='center',multiline=false}:{value:string,onSave:(v:string)=>void,align?:'center'|'left',multiline?:boolean}){
 const [editing,setEditing]=useState(false);const [draft,setDraft]=useState(value);
 return <View style={{width:'100%',alignItems:align==='center'?'center':'stretch'}}>
 <View style={{flexDirection:'row',alignItems:'center',justifyContent:align==='center'?'center':'flex-start',gap:5,width:'100%'}}>
 {editing?<View style={{flex:1,flexDirection:'row',borderBottomWidth:1,borderColor:'#b8b8b8',alignItems:'center'}}><TextInput autoFocus selectTextOnFocus multiline={multiline} value={draft} onChangeText={setDraft} style={{flex:1,fontSize:13,color:'#111',paddingVertical:3,textAlign:align}}/><Pressable accessibilityLabel="Save" onPress={()=>{onSave(draft);setEditing(false)}} style={{padding:5}}><Ionicons name="checkmark" size={15} color="#999"/></Pressable></View>:<><Text style={{fontSize:align==='center'?14:13,textAlign:align,flexShrink:1,color:'#333',fontStyle:multiline?'italic':'normal'}}>{value}</Text><Pressable accessibilityLabel="Edit" onPress={()=>{setDraft(value);setEditing(true)}}><Ionicons name="pencil-outline" size={12} color={c.pink}/></Pressable></>}
 </View></View>
}
function Stone({index}:{index:number}) {
 const player=useAudioPlayer(audios[index]);const status=useAudioPlayerStatus(player);
 const playing=status.playing;
 return <Pressable onPress={()=>{if(playing)player.pause();else{if(status.didJustFinish)player.seekTo(0);player.play();}}} accessibilityLabel={playing?'Pause recording':'Play recording'} style={{height:53,width:48,borderWidth:1,borderColor:'#dedede',borderRadius:8,alignItems:'center',justifyContent:'center',marginRight:5}}>
 <Ionicons name={playing?'pause-circle':'play-circle'} size={26} color={playing?c.pink:'#bbb'}/>
 </Pressable>;
}
function TalentCard({title,index,level}:{title:string,index:number,level:number}){return <View style={{width:160,height:132,borderWidth:1,borderColor:'#ddd',borderRadius:9,alignItems:'center',padding:7,marginRight:10}}>
 <Text style={{fontFamily:'Caveat_700Bold',fontSize:16}}>{title}</Text>
 <View style={{backgroundColor:c.pink,borderRadius:28,width:58,height:58,alignItems:'center',justifyContent:'center'}}><Ionicons name={index===0?'musical-notes':index===1?'mic':'musical-note'} size={28} color="#111"/></View>
 <View style={{flexDirection:'row',gap:6,marginTop:8}}>{levels.map((l,i)=><View key={i} style={{width:7,height:7,borderRadius:4,backgroundColor:i===level?l.color:'#e9e9e9'}}/>)}</View>
 <Text style={{fontSize:11,color:'#666',marginTop:5}}>Tandem | Professeur</Text>
 </View>}
export default function Profile(){
 const app=useApp();
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}>
 <View style={{flex:1}}>
 <ScrollView contentContainerStyle={{paddingTop:24,paddingBottom:165,alignItems:'center'}} showsVerticalScrollIndicator={false}>
 <Avatar size={166}/>
 <View style={{flexDirection:'row',alignItems:'center',marginTop:7}}><Editable value={app.name} onSave={v=>app.edit({name:v})}/></View>

 <View style={{width:'84%',marginTop:12,marginBottom:21}}><Editable multiline align="left" value={app.bio} onSave={v=>app.edit({bio:v})}/></View>
 <Text style={s.label}>Lieu</Text><View style={{width:175}}><Editable value={app.city} onSave={v=>app.edit({city:v})}/></View>
 <Text style={[s.label,{marginTop:14}]}>Eglise</Text><View style={{width:185}}><Editable value={app.church} onSave={v=>app.edit({church:v})}/></View>
 <View style={{width:'100%',marginTop:28,flexDirection:'row',justifyContent:'space-around'}}><Text style={s.title}>Mes talents</Text><Text style={s.title}>Mes rêves</Text></View>
 <View style={{width:'100%',flexDirection:'row',marginTop:6,gap:10,paddingHorizontal:24}}>
 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flex:1}} contentContainerStyle={{paddingRight:3}}><TalentCard title="Batterie" index={0} level={2}/><TalentCard title="Chant" index={1} level={1}/><TalentCard title="Piano" index={2} level={3}/></ScrollView>
 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flex:1}} contentContainerStyle={{paddingRight:3}}>{['Rêve floral','Un autre rêve'].map((name,i)=><Pressable key={i} style={{width:155,height:132,borderWidth:1,borderColor:'#ddd',borderRadius:8,alignItems:'center',justifyContent:'center',marginRight:9}}><View style={{width:125,height:97,borderRadius:7,backgroundColor:i?'#f9e6ee':'#e9f1e3',alignItems:'center',justifyContent:'center'}}><Ionicons name="flower-outline" size={54} color={i?'#d71d77':'#6caa6b'}/></View><Text style={{fontSize:11,marginTop:4}}>{name}</Text></Pressable>)}</ScrollView>
 </View>
 <Text style={[s.title,{marginTop:18,marginBottom:7}]}>Mes pierres</Text>
 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{maxHeight:57,maxWidth:240}} contentContainerStyle={{paddingHorizontal:6}}>{[0,1,2].map(i=><Stone key={i} index={i}/>)}</ScrollView>
 <Pressable onPress={()=>{app.logout();router.replace('/login')}} style={{marginTop:26}}><Text style={{fontSize:12,color:'#888'}}>Se déconnecter</Text></Pressable>
 </ScrollView>
 <ContactSheet/>
 </View><Nav/>
 </SafeAreaView>
}
const s=StyleSheet.create({label:{fontWeight:'700',fontSize:14,color:'#101010'},title:{fontSize:15,fontWeight:'700',color:'#111'}});
