import React from 'react';
import {Alert,Pressable,Share,StyleSheet,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {DreamPublication} from './discoveryData';
import {useApp} from './context';
import {colors as c} from './theme';
export function DreamStageAction({dream}:{dream:DreamPublication}){
 const app=useApp(),joined=app.myDreamIds.includes(dream.id),praying=app.isPraying(dream.id);
 if(dream.phase==='Rêve')return <Pressable style={s.action} onPress={()=>{app.joinDream(dream.id);Alert.alert('Un rêve partagé','Ce rêve est dans ta liste. La notification aux autres membres sera disponible après connexion du backend.')}}><Ionicons name={joined?'checkmark-circle':'people-outline'} size={19} color="#444"/><Text style={s.text}>{joined?'Tu partages ce rêve · compteur partagé à venir':'Moi aussi, je rêve de ça'}</Text></Pressable>;
 if(dream.phase==='Initiation')return <Pressable style={s.action} onPress={()=>router.push('/chat/teacher')}><Ionicons name="hand-left-outline" size={19} color="#444"/><Text style={s.text}>Aider ce projet avec mes talents</Text></Pressable>;
 if(dream.phase==='Croissance')return <Pressable style={s.action} onPress={()=>app.togglePrayer(dream.id)}><Ionicons name={praying?'checkmark-circle':'heart-outline'} size={19} color="#444"/><Text style={s.text}>{praying?'Dans mes prières du jour':'Prier pour ce rêve'}</Text></Pressable>;
 return <View style={{gap:7}}><Pressable style={s.action} onPress={()=>app.togglePrayer(dream.id)}><Ionicons name="heart-outline" size={19}/><Text style={s.text}>{praying?'Dans mes prières · Remercier':'Remercier dans la prière'}</Text></Pressable><Pressable style={s.action} onPress={()=>{void Share.share({message:dream.title+' — JenLow Network'})}}><Ionicons name="share-outline" size={19}/><Text style={s.text}>Partager ce témoignage</Text></Pressable></View>;
}
const s=StyleSheet.create({action:{borderWidth:1,borderColor:'#e9e9e9',paddingHorizontal:13,paddingVertical:12,borderRadius:10,flexDirection:'row',alignItems:'center',gap:10,backgroundColor:'#fff'},text:{fontSize:12,color:'#333'}});
