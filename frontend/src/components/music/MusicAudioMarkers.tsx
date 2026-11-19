import React,{useEffect,useState} from 'react';
import {Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {musicStampMs} from '@/domain/musicEditing';
import {newMusicId} from '@/domain/musicWorkspace';
import type {MusicAudioMarker,MusicProjectFile,MusicSection} from '@/domain/musicWorkspace';
const pink='#CB245C';
function parse(value:string):number|null{
 const s=value.trim().replace(',','.');if(!/^\d+(?::[0-5]?\d)?(?:\.\d{1,3})?$/.test(s))return null;
 const p=s.split(':');const n=p.length===2?60*Number(p[0])+Number(p[1]):Number(s);
 return Number.isFinite(n)&&n>=0?n:null;
}
type Props={markers:MusicAudioMarker[];duration:number;cursor:number;
 onChange:(markers:MusicAudioMarker[])=>void;onSeek?:(seconds:number)=>void;disabled?:boolean;
 editRequest?:{id:string;nonce:number}|null;
 rangeRequest?:{start:number;end:number;nonce:number}|null;
 selectedRange?:{start:number;end:number}|null;
  sourceFiles?:MusicProjectFile[];sections?:MusicSection[]};
/** Point and interval notes, stored locally on their original recording. */
export function MusicAudioMarkers({markers,duration,cursor,onChange,onSeek,
 disabled=false,editRequest,rangeRequest,selectedRange,sourceFiles=[],sections=[]}:Props){
 const theme=useAppTheme();
 const [open,setOpen]=useState(false),[editing,setEditing]=useState('');
 const [interval,setIntervalMode]=useState(false),[from,setFrom]=useState(''),[to,setTo]=useState('');
 const [note,setNote]=useState(''),[error,setError]=useState('');
 const [linkedFileId,setLinkedFileId]=useState('');
 const [linkedSectionId,setLinkedSectionId]=useState('');
 const [linkedReferenceId,setLinkedReferenceId]=useState('');
 const [linksOpen,setLinksOpen]=useState(false);
 const [picking,setPicking]=useState<{field:'from'|'to';cursor:number}|null>(null);
 useEffect(()=>{
   if(!open||!picking||Math.abs(cursor-picking.cursor)<.0005)return;
   if(picking.field==='from')setFrom(musicStampMs(cursor));
   else setTo(musicStampMs(cursor));
   setPicking(null);
 },[cursor,open,picking]);
 const begin=(m?:MusicAudioMarker)=>{
   const range=!m?selectedRange:null;
   setEditing(m?.id||'');
   setIntervalMode(m?.endSeconds!==undefined||!!range);
   setPicking(null);
   setFrom(musicStampMs(m?.startSeconds??range?.start??cursor));
   setTo(m?.endSeconds===undefined?
     (range?musicStampMs(range.end):''):musicStampMs(m.endSeconds));
   setNote(m?.note||'');setLinkedFileId(m?.linkedFileId||'');
   setLinkedSectionId(m?.linkedSectionId||'');
   setLinkedReferenceId(m?.linkedLyricReferenceId||'');setLinksOpen(false);
   setError('');setOpen(true);
 };
 useEffect(()=>{
   if(!editRequest)return;
   const target=markers.find(m=>m.id===editRequest.id);
   if(target)begin(target);
 },[editRequest?.nonce]);
 useEffect(()=>{
   if(!rangeRequest)return;
   setEditing('');
   setIntervalMode(true);
   setFrom(musicStampMs(Math.min(rangeRequest.start,rangeRequest.end)));
   setTo(musicStampMs(Math.max(rangeRequest.start,rangeRequest.end)));
   setNote('');setLinkedFileId('');setLinkedSectionId('');
   setLinkedReferenceId('');setLinksOpen(false);
   setError('');setPicking(null);setOpen(true);
 },[rangeRequest?.nonce]);
 const save=()=>{
   const a=parse(from),b=interval?parse(to):null;
   if(a===null||a>duration+.01||(interval&&(b===null||b<=a||b>duration+.01))){
     setError('Début ou fin invalide.');return;
   }
   if(!note.trim()){setError('Écris une note.');return;}
   const marker:MusicAudioMarker={id:editing||newMusicId(),startSeconds:Math.round(a*1000)/1000,
     ...(interval?{endSeconds:Math.round((b as number)*1000)/1000}:{}),
     note:note.trim(),linkedFileId:linkedFileId||undefined,
     linkedSectionId:linkedSectionId||undefined,
     linkedLyricReferenceId:linkedReferenceId||undefined};
   onChange([...markers.filter(m=>m.id!==marker.id),marker].sort((x,y)=>x.startSeconds-y.startSeconds));
   setOpen(false);setError('');setPicking(null);
 };
 const input={borderWidth:1,borderColor:theme.border,borderRadius:9,
   backgroundColor:theme.background,color:theme.foreground,paddingHorizontal:11,
   paddingVertical:7,fontSize:12} as const;
 return <View style={{gap:open?7:0}}>
   {!open?<Pressable disabled={disabled} onPress={()=>begin()}
     accessibilityRole="button" accessibilityLabel="Ajouter un repère"
     style={{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',
       paddingVertical:7,paddingHorizontal:3,gap:7,opacity:disabled?.45:1}}>
     <Ionicons name="flag-outline" size={18} color={pink}/>
     <Text style={{color:pink,fontSize:12,fontWeight:'700'}}>Ajouter un repère</Text>
     {selectedRange?<Text style={{color:theme.muted,fontSize:10}}>
       {musicStampMs(selectedRange.start)} – {musicStampMs(selectedRange.end)}
     </Text>:null}
   </Pressable>:null}
   {open?<View style={{padding:11,borderWidth:1,borderColor:theme.border,
     borderRadius:11,backgroundColor:theme.surface,gap:8}}>
     <View style={{flexDirection:'row',justifyContent:'space-between',
       alignItems:'center'}}>
       <Text style={{fontSize:12,fontWeight:'700',color:theme.foreground}}>
         {editing?'Modifier le repère':'Ajouter un repère'}
       </Text>
       <Pressable onPress={()=>{setOpen(false);setError('');setPicking(null);}}
         accessibilityRole="button" accessibilityLabel="Fermer l’éditeur de repère"
         style={{padding:4}}>
         <Ionicons name="close-outline" size={19} color={theme.muted}/>
       </Pressable>
     </View>
     <View style={{flexDirection:'row',gap:10}}>
       <Pressable onPress={()=>setIntervalMode(false)} style={{padding:8,borderBottomWidth:!interval?2:0,borderColor:pink}}>
         <Text style={{color:!interval?pink:theme.muted,fontSize:12}}>Moment</Text>
       </Pressable>
       <Pressable onPress={()=>{setIntervalMode(true);if(!to)setTo(musicStampMs(Math.min(duration,(parse(from)||0)+2)));}}
         style={{padding:8,borderBottomWidth:interval?2:0,borderColor:pink}}>
         <Text style={{color:interval?pink:theme.muted,fontSize:12}}>Intervalle</Text>
       </Pressable>
     </View>
     <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
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
     <TextInput multiline value={note} onChangeText={setNote} style={{...input,minHeight:43,textAlignVertical:'top'}}
       placeholder="Note…" placeholderTextColor={theme.muted}/>
     {(sourceFiles.length||sections.length)?<View style={{gap:6}}>
       <Pressable onPress={()=>setLinksOpen(!linksOpen)} accessibilityRole="button"
         accessibilityState={{expanded:linksOpen}}
         style={{minHeight:37,flexDirection:'row',alignItems:'center',gap:7}}>
         <Ionicons name="link-outline" size={17} color={pink}/>
         <Text style={{flex:1,fontSize:12,color:linkedFileId||linkedSectionId?
           theme.foreground:pink,fontWeight:'600'}}>
           {linkedReferenceId?sourceFiles.flatMap(file=>(file.lyricReferences||[]))
              .find(ref=>ref.id===linkedReferenceId)?.text.slice(0,65)||'Extrait lié':
            linkedFileId?sourceFiles.find(f=>f.id===linkedFileId)?.title||'Capture liée':
            linkedSectionId?sections.find(section=>section.id===linkedSectionId)?.title||'Partie liée':
            'Lier à une capture ou à une partie'}
         </Text>
         <Ionicons name={linksOpen?'chevron-up':'chevron-down'} size={16} color={pink}/>
       </Pressable>
       {linksOpen?<ScrollView nestedScrollEnabled style={{maxHeight:230}}
         contentContainerStyle={{gap:5}}>
         <Pressable onPress={()=>{setLinkedFileId('');setLinkedSectionId('');
           setLinkedReferenceId('');}}
           style={{paddingVertical:8}}>
           <Text style={{fontSize:12,color:theme.muted}}>Aucun lien</Text>
         </Pressable>
         {sourceFiles.map(file=><Pressable key={file.id}
           onPress={()=>{setLinkedFileId(file.id);setLinkedSectionId('');
             setLinkedReferenceId('');}}
           accessibilityRole="button" style={{paddingVertical:7,
             flexDirection:'row',alignItems:'center',gap:8}}>
           <Ionicons name={linkedFileId===file.id?'radio-button-on':'radio-button-off'}
             size={17} color={pink}/>
           <Text numberOfLines={1} style={{fontSize:12,color:theme.foreground,flex:1}}>
             {file.title}
           </Text>
         </Pressable>)}
         {sourceFiles.flatMap(file=>(file.lyricReferences||[])
           .map(ref=>({file,ref}))).map(({file,ref})=><Pressable
           key={ref.id} onPress={()=>{
             setLinkedFileId(file.id);setLinkedSectionId(ref.sectionId);
             setLinkedReferenceId(ref.id);
           }} accessibilityRole="button"
           style={{paddingVertical:7,flexDirection:'row',alignItems:'center',gap:8}}>
           <Ionicons name={linkedReferenceId===ref.id?
             'radio-button-on':'radio-button-off'} color={pink} size={17}/>
           <View style={{flex:1,gap:3}}>
             <Text style={{fontSize:11,color:theme.muted}}>{file.title} · extrait</Text>
             <Text numberOfLines={2} style={{fontSize:12,color:theme.foreground}}>
               {ref.text}
             </Text>
           </View>
         </Pressable>)}
         {sections.map(section=><Pressable key={section.id}
           onPress={()=>{setLinkedSectionId(section.id);setLinkedFileId('');
             setLinkedReferenceId('');}}
           accessibilityRole="button" style={{paddingVertical:7,
             flexDirection:'row',alignItems:'center',gap:8}}>
           <Ionicons name={linkedSectionId===section.id?'radio-button-on':'radio-button-off'}
             size={17} color={pink}/>
           <Text numberOfLines={1} style={{fontSize:12,color:theme.foreground,flex:1}}>
             Partie · {section.title}
           </Text>
         </Pressable>)}
       </ScrollView>:null}
     </View>:null}
     {error?<Text style={{color:'#B34D61',fontSize:12}}>{error}</Text>:null}
     <View style={{flexDirection:'row',gap:13,justifyContent:'flex-end'}}>
       <Pressable onPress={()=>setOpen(false)} style={{padding:8}}>
         <Text style={{color:theme.muted,fontSize:12}}>Annuler</Text>
       </Pressable>
       <Pressable onPress={save} style={{backgroundColor:pink,borderRadius:9,padding:11,paddingHorizontal:17}}>
         <Text style={{color:'#fff',fontSize:12,fontWeight:'700'}}>Enregistrer</Text>
       </Pressable>
     </View>
   </View>:null}
 </View>;
}
