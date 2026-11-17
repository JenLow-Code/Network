import React,{useEffect,useState} from 'react';
import {Pressable,Text,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {musicStampMs} from '@/domain/musicEditing';
import {newMusicId} from '@/domain/musicWorkspace';
import type {MusicAudioMarker} from '@/domain/musicWorkspace';
const pink='#CB245C';
function parse(value:string):number|null{
 const s=value.trim().replace(',','.');if(!/^\d+(?::[0-5]?\d)?(?:\.\d{1,3})?$/.test(s))return null;
 const p=s.split(':');const n=p.length===2?60*Number(p[0])+Number(p[1]):Number(s);
 return Number.isFinite(n)&&n>=0?n:null;
}
type Props={markers:MusicAudioMarker[];duration:number;cursor:number;
 onChange:(markers:MusicAudioMarker[])=>void;onSeek?:(seconds:number)=>void;disabled?:boolean};
/** Point and interval notes, stored locally on their original recording. */
export function MusicAudioMarkers({markers,duration,cursor,onChange,onSeek,disabled=false}:Props){
 const theme=useAppTheme();
 const [open,setOpen]=useState(false),[editing,setEditing]=useState('');
 const [interval,setIntervalMode]=useState(false),[from,setFrom]=useState(''),[to,setTo]=useState('');
 const [note,setNote]=useState(''),[error,setError]=useState('');
 const [picking,setPicking]=useState<{field:'from'|'to';cursor:number}|null>(null);
 useEffect(()=>{
   if(!open||!picking||Math.abs(cursor-picking.cursor)<.0005)return;
   if(picking.field==='from')setFrom(musicStampMs(cursor));
   else setTo(musicStampMs(cursor));
   setPicking(null);
 },[cursor,open,picking]);
 const begin=(m?:MusicAudioMarker)=>{
   setEditing(m?.id||'');setIntervalMode(m?.endSeconds!==undefined);
   setPicking(null);
   setFrom(musicStampMs(m?.startSeconds??cursor));
   setTo(m?.endSeconds===undefined?'':musicStampMs(m.endSeconds));
   setNote(m?.note||'');setError('');setOpen(true);
 };
 const save=()=>{
   const a=parse(from),b=interval?parse(to):null;
   if(a===null||a>duration+.01||(interval&&(b===null||b<=a||b>duration+.01))){
     setError('Début ou fin invalide.');return;
   }
   if(!note.trim()){setError('Écris une note.');return;}
   const marker:MusicAudioMarker={id:editing||newMusicId(),startSeconds:Math.round(a*1000)/1000,
     ...(interval?{endSeconds:Math.round((b as number)*1000)/1000}:{}),note:note.trim()};
   onChange([...markers.filter(m=>m.id!==marker.id),marker].sort((x,y)=>x.startSeconds-y.startSeconds));
   setOpen(false);setError('');setPicking(null);
 };
 const input={borderWidth:1,borderColor:theme.border,borderRadius:9,
   backgroundColor:theme.background,color:theme.foreground,paddingHorizontal:11,
   paddingVertical:10,fontSize:13} as const;
 return <View style={{gap:10}}>
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
     <Text style={{fontSize:13,fontWeight:'600',color:theme.foreground}}>Repères
       {markers.length?' ('+markers.length+')':''}
     </Text>
     <Pressable disabled={disabled} onPress={()=>begin()} accessibilityRole="button"
       style={{flexDirection:'row',gap:6,alignItems:'center',padding:9,opacity:disabled?0.4:1}}>
       <Ionicons name="add" size={17} color={pink}/>
       <Text style={{fontSize:12,fontWeight:'600',color:pink}}>Ajouter une note</Text>
     </Pressable>
   </View>
   {markers.map(m=><View key={m.id} style={{flexDirection:'row',alignItems:'center',gap:9,
     paddingVertical:9,borderTopWidth:1,borderColor:theme.border}}>
     <Pressable onPress={()=>{onSeek?.(m.startSeconds);begin(m);}}
       accessibilityRole="button" disabled={disabled} style={{flex:1,gap:3}}>
       <Text style={{fontSize:11,fontWeight:'700',color:pink}}>
         {musicStampMs(m.startSeconds)}{m.endSeconds!==undefined?' – '+musicStampMs(m.endSeconds):''}
       </Text>
       <Text numberOfLines={2} style={{fontSize:12,color:theme.foreground}}>{m.note}</Text>
     </Pressable>
     <Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel="Supprimer la note"
       onPress={()=>onChange(markers.filter(x=>x.id!==m.id))} style={{padding:8}}>
       <Ionicons name="close-outline" size={17} color={theme.muted}/>
     </Pressable>
   </View>)}
   {open?<View style={{padding:13,borderWidth:1,borderColor:theme.border,
     borderRadius:13,backgroundColor:theme.surface,gap:11}}>

     <View style={{flexDirection:'row',gap:12}}>
       <Pressable onPress={()=>setIntervalMode(false)} style={{padding:8,borderBottomWidth:!interval?2:0,borderColor:pink}}>
         <Text style={{color:!interval?pink:theme.muted,fontSize:12}}>Moment</Text>
       </Pressable>
       <Pressable onPress={()=>{setIntervalMode(true);if(!to)setTo(musicStampMs(Math.min(duration,(parse(from)||0)+2)));}}
         style={{padding:8,borderBottomWidth:interval?2:0,borderColor:pink}}>
         <Text style={{color:interval?pink:theme.muted,fontSize:12}}>Intervalle</Text>
       </Pressable>
     </View>
     <View style={{flexDirection:'row',gap:9,flexWrap:'wrap'}}>
       <View style={{flex:1,minWidth:110,gap:4}}>
         <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
           <Text style={{color:theme.muted,fontSize:11}}>Début (mm:ss.mmm)</Text>
           <Pressable onPress={()=>setPicking({field:'from',cursor})}
             accessibilityLabel="Définir le début sur la forme d’onde" style={{padding:5}}>
             <Ionicons name="locate-outline" size={16} color={pink}/>
           </Pressable>
         </View>
         <TextInput keyboardType="numbers-and-punctuation" value={from} onChangeText={setFrom}
           accessibilityLabel="Début de l'annotation" style={input}/>
       </View>
       {interval?<View style={{flex:1,minWidth:110,gap:4}}>
         <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
           <Text style={{color:theme.muted,fontSize:11}}>Fin (mm:ss.mmm)</Text>
           <Pressable onPress={()=>setPicking({field:'to',cursor})}
             accessibilityLabel="Définir la fin sur la forme d’onde" style={{padding:5}}>
             <Ionicons name="locate-outline" size={16} color={pink}/>
           </Pressable>
         </View>
         <TextInput keyboardType="numbers-and-punctuation" value={to} onChangeText={setTo}
           accessibilityLabel="Fin de l'annotation" style={input}/>
       </View>:null}
     </View>
     {picking?<Text style={{fontSize:11,color:pink}}>
       Touche la forme d’onde pour définir {picking.field==='from'?'le début':'la fin'}.
     </Text>:null}
     <TextInput multiline value={note} onChangeText={setNote} style={{...input,minHeight:56,textAlignVertical:'top'}}
       placeholder="Note…" placeholderTextColor={theme.muted}/>
     {error?<Text style={{color:'#B34D61',fontSize:12}}>{error}</Text>:null}
     <View style={{flexDirection:'row',gap:13,justifyContent:'flex-end'}}>
       <Pressable onPress={()=>setOpen(false)} style={{padding:11}}>
         <Text style={{color:theme.muted,fontSize:12}}>Annuler</Text>
       </Pressable>
       <Pressable onPress={save} style={{backgroundColor:pink,borderRadius:9,padding:11,paddingHorizontal:17}}>
         <Text style={{color:'#fff',fontSize:12,fontWeight:'700'}}>Enregistrer</Text>
       </Pressable>
     </View>
   </View>:null}
 </View>;
}
