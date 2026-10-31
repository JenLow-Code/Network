import React, { useMemo, useRef, useState } from 'react';
import { Image, PanResponder, Pressable, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { DreamEntry, DreamResource } from '@/domain/dreamWorkspace';
import type { DreamPhase } from '@/domain/publication';
import { PHASE_LABELS } from '@/domain/publication';
import { useAppTheme } from '@/theme/AppTheme';
import DreamExperience from './DreamExperience';

type Direction = 'top' | 'left' | 'bottom' | 'right';
const stages: { phase: DreamPhase; position: Direction; color: string }[] = [
  { phase: 'Rêve', position: 'top', color: '#B8B2A9' },
  { phase: 'Initiation', position: 'left', color: '#B5C85E' },
  { phase: 'Croissance', position: 'bottom', color: '#417D5A' },
  { phase: 'Témoignage', position: 'right', color: '#D71D77' },
];
const order: DreamPhase[] = ['Rêve', 'Initiation', 'Croissance', 'Témoignage'];
const directions: Record<Direction, { name: string; arrow: string }> = {
  top: { name: 'Semence', arrow: '↓' },
  left: { name: 'Germination', arrow: '←' },
  bottom: { name: 'Croissance', arrow: '↑' },
  right: { name: 'Floraison', arrow: '→' },
};
function EdgeLight({ position, color }: { position: Direction; color: string }) {
 const horizontal = position === 'left' || position === 'right';
 const id = 'wash-' + position;
 return <Svg pointerEvents="none" style={{ position:'absolute', left:0,top:0,right:0,bottom:0 }} width="100%" height="100%">
   <Defs><LinearGradient id={id} x1={horizontal ? (position==='left'?'0%':'100%'):'0%'} y1={horizontal?'0%':(position==='top'?'0%':'100%')} x2={horizontal?(position==='left'?'100%':'0%'):'0%'} y2={horizontal?'0%':(position==='top'?'100%':'0%')}>
   <Stop offset="0%" stopColor={color} stopOpacity={position==='right'?.28:.23}/><Stop offset={horizontal?'28%':'34%'} stopColor={color} stopOpacity={.065}/><Stop offset="75%" stopColor={color} stopOpacity={0}/></LinearGradient></Defs>
   <Rect width="100%" height="100%" fill={'url(#'+id+')'}/>
 </Svg>;
}
function shortDate(date?:string) { if(!date)return null; const d=new Date(date+'T12:00:00');return Number.isFinite(d.getTime())?d.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'}):date; }
export default function DreamHub({ dream }: { dream: DreamEntry }) {
 const theme=useAppTheme();
 const { width }=useWindowDimensions();
 const [open,setOpen]=useState<DreamPhase|null>(null);
 const phaseIndex=order.indexOf(dream.phase);
 const openRef=useRef(open);openRef.current=open;
 const phaseRef=useRef(dream.phase);phaseRef.current=dream.phase;
 const canOpen=(p:DreamPhase)=>order.indexOf(p)<=order.indexOf(phaseRef.current) && !(p==='Témoignage' && phaseRef.current==='Témoignage');
 const go=(p:DreamPhase)=>{if(canOpen(p))setOpen(p);};
 const responder=useMemo(()=>PanResponder.create({
   onMoveShouldSetPanResponder:(_,g)=>!openRef.current && (Math.abs(g.dx)>22||Math.abs(g.dy)>22),
   onPanResponderRelease:(_,g)=>{
     if(openRef.current)return;
     const horizontal=Math.abs(g.dx)>Math.abs(g.dy)*1.25;
     const vertical=Math.abs(g.dy)>Math.abs(g.dx)*1.25;
     const phase=horizontal?(g.dx< -68?'Initiation':g.dx>68?'Témoignage':null):vertical?(g.dy>68?'Rêve':g.dy< -68?'Croissance':null):null;
     if(phase && order.indexOf(phase)<=order.indexOf(phaseRef.current) && !(phase==='Témoignage'&&phaseRef.current==='Témoignage'))setOpen(phase);
   },
 }),[]);
 const resources: DreamResource[]=dream.resources || (dream.needs||[]).map((title,i)=>({id:'old'+i,title,confirmed:(dream.resolvedNeeds||[]).includes(title),category:'practical'}));
 const missing=resources.filter(r=>!r.confirmed).length;
 const flower=dream.phase==='Témoignage';
 const photo=dream.resultImage || dream.testimony?.mediaItems?.find(m=>m.kind==='photo')?.uri;
 if(open)return <DreamExperience dream={dream} viewPhase={open} onBack={()=>setOpen(null)}/>;
 return <View style={{flex:1,backgroundColor:theme.background,overflow:'hidden'}} {...responder.panHandlers}>
  {stages.map(s=><EdgeLight key={s.position} position={s.position} color={s.color}/>)}
  <View style={{position:'absolute',left:13,top:8,zIndex:3}}>
   <Pressable accessibilityRole="button" accessibilityLabel="Retour à mes rêves" onPress={()=>router.replace('/my-space')} style={{padding:10}}><Ionicons name="arrow-back" size={23} color={theme.foreground}/></Pressable>
  </View>
  {stages.filter(s=>s.phase!=='Témoignage'||!flower).map(s=>{
   const disabled=!canOpen(s.phase);
   const position=s.position;
   const style:any=position==='top'?{top:8,left:82,right:82,alignItems:'center'}:position==='bottom'?{bottom:18,left:82,right:82,alignItems:'center'}:position==='left'?{left:1,top:'44%',alignItems:'flex-start'}:{right:1,top:'44%',alignItems:'flex-end'};
   return <Pressable key={s.phase} disabled={disabled} onPress={()=>go(s.phase)} accessibilityRole="button" accessibilityLabel={'Ouvrir '+PHASE_LABELS[s.phase]} style={{position:'absolute',zIndex:3,padding:12,...style}}>
    <Text style={{fontSize:9,fontWeight:'700',letterSpacing:1.1,color:disabled?theme.muted:s.color,opacity:disabled?.5:.9}}>{directions[position].name.toUpperCase()}</Text>
   </Pressable>;
  })}
  <View style={{flex:1,justifyContent:'center',paddingHorizontal:Math.min(38,Math.max(23,width*.07)),paddingTop:56,paddingBottom:54}}>
   {flower && photo ? <Image source={{uri:photo}} resizeMode="cover" style={{position:'absolute',left:0,right:0,top:0,bottom:0,width:'100%',height:'100%',opacity:theme.dark?.30:.18}}/>:null}
   <View style={{alignSelf:'center',width:'100%',maxWidth:510}}>
    <Text style={{fontSize:11,letterSpacing:2,color:flower?'#D71D77':theme.muted,fontWeight:'700',marginBottom:21}}>{flower?'FLORAISON':'MON RÊVE'}</Text>
    <Text style={{fontSize:width<390?34:43,lineHeight:width<390?41:51,fontFamily:'serif',letterSpacing:-1.3,color:theme.foreground,marginBottom:18}}>{dream.title}</Text>
    <Text style={{fontSize:15,lineHeight:24,color:theme.muted,maxWidth:410}}>{flower?dream.testimony?.comment||dream.summary:dream.summary}</Text>
    {(dream.coOwners||[]).filter(x=>x.accepted && x.name.trim()).length>0 ? <Text style={{fontSize:12,marginTop:17,color:theme.foreground}}>Avec {(dream.coOwners||[]).filter(x=>x.accepted&&x.name.trim()).map(x=>x.name).join(' · ')}</Text>:null}
    {dream.phase==='Rêve' && dream.encouragementCount!==undefined ? <Text style={{marginTop:18,fontSize:12,color:theme.muted}}>♡ {dream.encouragementCount} encouragement{dream.encouragementCount>1?'s':''}</Text>:null}
    {phaseIndex>=1 && <View style={{marginTop:28,gap:15}}>
     {dream.goalDate ? <View style={{flexDirection:'row',alignItems:'center',gap:9}}><Ionicons name="calendar-outline" size={17} color={theme.muted}/><Text style={{color:theme.foreground,fontSize:13}}>{shortDate(dream.goalDate)}</Text></View>:null}
     {resources.length>0 && <View style={{gap:8}}>
      <View style={{flexDirection:'row',gap:5,flexWrap:'wrap'}}>{resources.slice(0,10).map(r=><View key={r.id} accessibilityLabel={r.title+(r.confirmed?' confirmé':' à trouver')} style={{width:30,height:27,borderRadius:6,backgroundColor:r.confirmed?'#A0B65A':theme.dark?'#383A3A':'#E5E3DF',alignItems:'center',justifyContent:'center'}}>{r.confirmed?<Ionicons name="checkmark" size={14} color="#fff"/>:null}</View>)}{resources.length>10?<Text style={{alignSelf:'center',color:theme.muted,fontSize:11}}>+{resources.length-10}</Text>:null}</View>
      <Text style={{color:theme.muted,fontSize:12}}>{missing===0?'Toutes les ressources réunies':missing===1?'1 ressource à trouver':missing+' ressources à trouver'}</Text>
     </View>}
    </View>}
    {phaseIndex>=2 && dream.chat ? <Pressable onPress={()=>router.push({pathname:'/chat/[id]',params:{id:'dream-'+dream.id}})} style={{marginTop:25,alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:10,paddingVertical:10}}>
     <Ionicons name="chatbubbles-outline" size={21} color={theme.foreground}/><Text style={{fontWeight:'600',color:theme.foreground,fontSize:13}}>Conversation</Text>
    </Pressable>:null}
    {flower ? <View style={{height:3,width:86,backgroundColor:'#D71D77',marginTop:30,borderRadius:4}}/>:null}
   </View>
  </View>
 </View>;
}
