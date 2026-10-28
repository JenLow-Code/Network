import React from 'react';
import {Pressable,Share,StyleSheet,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {DreamPublication} from '@/domain/publication';
import {useApp} from '@/context/AppContext';
import {PrayerIcon} from '@/icons/PrayerIcon';
import {colors as c} from '@/theme/colors';

/** Phase-driven public interaction. Local demo state is not a public counter. */
export function DreamStageAction({dream}:{dream:DreamPublication}){
 const app=useApp();
 const encouraged=app.encouragementIds.includes(dream.id),joined=app.myDreamIds.includes(dream.id),praying=app.isPraying(dream.id);
 const pill=(name:string,icon:keyof typeof Ionicons.glyphMap,action:()=>void,active=false)=>
 <Pressable key={name} onPress={action} style={[s.pill,active&&{borderColor:'#e5cad6',backgroundColor:'#f9f1f5'}]}><Ionicons name={icon} size={17} color={active?c.pink:'#444'}/><Text numberOfLines={1} style={s.label}>{name}</Text></Pressable>;
 if(dream.phase==='Rêve')return <View style={s.row}>
  {pill(joined?'Moi aussi ✓':'Moi aussi','people-outline',()=>app.joinDream(dream.id),joined)}
  {pill(encouraged?'Encouragé ✓':"Je t'encourage",'sparkles-outline',()=>app.encourage(dream.id),encouraged)}
 </View>;
 if(dream.phase==='Initiation')return <View style={s.row}>
  {pill('Offrir mon aide','hand-left-outline',()=>router.push('/chat/teacher'))}
  {pill('Mon cercle','people-circle-outline',()=>router.push({pathname:'/introduce/[id]',params:{id:dream.id}}))}
 </View>;
 if(dream.phase==='Croissance')return <Pressable style={s.pill} onPress={()=>app.togglePrayer(dream.id)}><PrayerIcon size={23}/><Text style={s.label}>{praying?'Dans mes prières':'Prier pour ce rêve'}</Text></Pressable>;
 return <View style={s.row}>
  <Pressable style={s.pill} onPress={()=>app.togglePrayer(dream.id)}><PrayerIcon size={23}/><Text style={s.label}>{praying?'Remerciement enregistré':'Remercier'}</Text></Pressable>
  {pill('Partager','share-outline',()=>{void Share.share({message:dream.title+' — JenLow Network'});})}
 </View>;
}
const s=StyleSheet.create({row:{flexDirection:'row',gap:8,marginTop:10},pill:{flex:1,minWidth:0,minHeight:39,borderWidth:1,borderColor:'#e9e9e9',borderRadius:21,paddingHorizontal:9,paddingVertical:8,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6},label:{fontSize:11,fontWeight:'500',color:'#333'}});
