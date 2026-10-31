import React, { useRef, useState } from 'react';
import { Alert, Image, Linking, Modal, PanResponder, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDreams } from '@/domain/dreamRepository';
import { router } from 'expo-router';
import type { DreamBlock, DreamBlockKind, DreamEntry } from '@/domain/dreamWorkspace';
import { useAppTheme } from '@/theme/AppTheme';
import { HANDWRITING_FAMILY } from '@/theme/handwriting';
import { pickDreamImage } from '@/lib/pickDreamImage';
import { pickFlowerMedia } from '@/lib/pickFlowerMedia';

const PINK = '#D71D77';
const groups: { title: string; kinds: { kind: DreamBlockKind; title: string; icon: keyof typeof Ionicons.glyphMap }[] }[] = [
 {title:'Écrire',kinds:[{kind:'text',title:'Paragraphe',icon:'text-outline'},{kind:'heading1',title:'Grand titre',icon:'text'},{kind:'heading2',title:'Sous-titre',icon:'text'},{kind:'heading3',title:'Petit titre',icon:'text'},{kind:'quote',title:'Citation',icon:'chatbox-outline'},{kind:'callout',title:'Encadré',icon:'sparkles-outline'},{kind:'toggle',title:'Déplier',icon:'chevron-down'},{kind:'bullet',title:'Liste',icon:'list'},{kind:'numbered',title:'Liste numérotée',icon:'list-outline'},{kind:'todo',title:'Cases à cocher',icon:'checkbox-outline'}]},
 {title:'Composer',kinds:[{kind:'columns',title:'Deux colonnes',icon:'grid-outline'},{kind:'divider',title:'Séparateur',icon:'remove-outline'},{kind:'spacer',title:'Espace',icon:'resize-outline'},{kind:'date',title:'Date',icon:'calendar-outline'},{kind:'table',title:'Tableau simple',icon:'apps-outline'},{kind:'toc',title:'Sommaire',icon:'list-circle-outline'},{kind:'collection',title:'Collection',icon:'albums-outline'}]},
 {title:'Images & médias',kinds:[{kind:'image',title:'Photo',icon:'image-outline'},{kind:'gallery',title:'Galerie',icon:'images-outline'},{kind:'music',title:'Musique',icon:'musical-notes-outline'},{kind:'audio',title:'Audio',icon:'mic-outline'},{kind:'video',title:'Vidéo',icon:'videocam-outline'},{kind:'document',title:'Fichier',icon:'document-attach-outline'},{kind:'pdf',title:'PDF',icon:'document-text-outline'}]},
 {title:'Intégrer',kinds:[{kind:'link',title:'Lien',icon:'link-outline'},{kind:'bookmark',title:'Favori web',icon:'bookmark-outline'},{kind:'embed',title:'Intégration',icon:'globe-outline'},{kind:'code',title:'Code',icon:'code-slash-outline'},{kind:'equation',title:'Formule',icon:'calculator-outline'}]},
];
const palettes: Record<DreamBlock['tone'],string>={neutral:'#F0EDE8',pink:'#FCE4EE',sage:'#E4EDE2',sand:'#F3E6CE',lavender:'#EBE3F5',blue:'#E0EBF5',peach:'#F8E5DA',charcoal:'#292B30',clear:'transparent'};
const newId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const mediaKinds:DreamBlockKind[]=['image','gallery','music','audio','video','document','pdf'];
const isUrl=(s:string)=>/^(https?:\/\/|data:|blob:|file:)/i.test(s);
function linkOpen(s:string){if(isUrl(s))void Linking.openURL(s).catch(()=>{});}
function BlockView({block,edit,onTap}:{block:DreamBlock;edit:boolean;onTap:()=>void}){
 const [expanded,setExpanded]=useState(false);const [checked,setChecked]=useState(!!block.checked);
 const tone=palettes[block.tone]||palettes.neutral;
 const ink=block.ink==='white'||block.tone==='charcoal'?'#FFFFFF':block.ink==='pink'?PINK:block.ink==='green'?'#3C7951':block.ink==='muted'?'#7F7977':'#282526';
 const font=block.font==='handwritten'?HANDWRITING_FAMILY:block.font==='serif'?'serif':block.font==='mono'?'monospace':undefined;
 const textSize=block.kind==='heading1'?32:block.kind==='heading2'?24:block.kind==='heading3'?19:block.kind==='quote'?23:block.size==='featured'?20:15;
 const width='100%';
 const words=block.content.split('\n').filter(Boolean);
 const containsMedia=mediaKinds.includes(block.kind);
 const urls=(block.media?.length?block.media:block.content.split('\n')).filter(s=>isUrl(s.trim()));
 const actionable=edit||['toggle','accordion','todo'].includes(block.kind);
 const open=()=>{if(edit)onTap();else if(block.kind==='toggle'||block.kind==='accordion')setExpanded(!expanded);else if(block.kind==='todo')setChecked(!checked);else if(['link','bookmark','embed','audio','music','video','pdf','document'].includes(block.kind))linkOpen(block.content);};
 return <View style={{width,marginBottom:0}}>
  <Pressable onPress={open} disabled={!actionable&&!['link','bookmark','embed','audio','music','video','pdf','document'].includes(block.kind)} accessibilityRole={actionable?'button':undefined} accessibilityLabel={edit?'Modifier '+(block.title||block.content.slice(0,20)):undefined}
   style={{backgroundColor:tone, borderWidth:block.frame==='outline'?1:0,borderColor:'#C6BEB8',borderRadius:block.frame==='none'?0:12,overflow:'hidden',padding:containsMedia?0:block.kind==='divider'?7:block.kind==='spacer'?4:16,minHeight:block.height|| (block.kind==='spacer'?35:block.kind==='divider'?23:block.size==='featured'?180:block.size==='small'?88:45),justifyContent:'center'}}>
    {block.kind==='divider'?<View style={{height:1,backgroundColor:ink,opacity:.22}}/>:block.kind==='spacer'?null:
     block.kind==='image'||block.kind==='gallery'?<View style={{flexDirection:'row',flexWrap:'wrap',gap:3}}>{urls.map((url,i)=><Image key={i} source={{uri:url}} style={{width:block.kind==='gallery'?'48%':'100%',height:block.kind==='gallery'?115:block.size==='featured'?260:176}} resizeMode="cover"/>)}</View>:
     <View style={{gap:5,padding:containsMedia?15:0}}>
      {block.kind==='callout'?<Ionicons name={(block.icon||'sparkles-outline') as any} size={22} color={ink}/>:null}
      {block.title?<Text style={{fontWeight:'700',fontSize:13,color:ink,opacity:.9}}>{block.title}</Text>:null}
      {(block.kind==='toggle'||block.kind==='accordion')?<View style={{flexDirection:'row',alignItems:'center',gap:8}}><Ionicons name={expanded?'chevron-down':'chevron-forward'} color={ink} size={18}/><Text style={{color:ink,flex:1,fontSize:15,fontWeight:'600'}}>{block.title||'Ouvrir'}</Text></View>:null}
      {block.kind==='toggle'||block.kind==='accordion'?expanded?<Text style={{color:ink,fontSize:14,lineHeight:23}}>{block.content}</Text>:null:
       block.kind==='todo'?<View style={{flexDirection:'row',gap:10,alignItems:'center'}}><Ionicons name={checked?'checkbox':'square-outline'} size={20} color={ink}/><Text style={{color:ink,fontSize:15,textDecorationLine:checked?'line-through':'none',flex:1}}>{block.content}</Text></View>:
       block.kind==='bullet'||block.kind==='numbered'?words.map((w,i)=><Text key={i} style={{color:ink,fontSize:14,lineHeight:22}}>{block.kind==='bullet'?'• ':String(i+1)+'. '}{w}</Text>):
       block.kind==='columns'?<View style={{flexDirection:'row',gap:8}}>{(block.content.split('\n|\n').length>1?block.content.split('\n|\n'):block.content.split('|')).slice(0,2).map((v,i)=><View key={i} style={{flex:1}}><Text style={{color:ink,fontSize:14,lineHeight:21}}>{v.trim()}</Text></View>)}</View>:
       block.kind==='table'?<View style={{gap:2}}>{words.slice(0,14).map((row,i)=><View key={i} style={{flexDirection:'row',gap:2}}>{row.split('|').slice(0,5).map((cell,j)=><View key={j} style={{flex:1,borderBottomWidth:.5,borderColor:ink,padding:6}}><Text style={{fontSize:12,color:ink,fontWeight:i===0?'700':'400'}}>{cell.trim()}</Text></View>)}</View>)}</View>:
       block.kind==='toc'?<Text style={{color:ink,fontSize:13,lineHeight:23}}>{block.content||'Sommaire du rêve'}</Text>:
       block.kind==='code'?<Text style={{color:ink,fontFamily:'monospace',fontSize:12,lineHeight:20}}>{block.content}</Text>:
       block.kind==='music'||block.kind==='audio'||block.kind==='video'||block.kind==='pdf'||block.kind==='document'||block.kind==='embed'||block.kind==='bookmark'||block.kind==='link'?
       <View style={{flexDirection:'row',gap:10,alignItems:'center'}}><Ionicons name={block.kind==='music'?'musical-notes':block.kind==='video'?'videocam-outline':block.kind==='audio'?'mic-outline':block.kind==='pdf'?'document-text-outline':'link-outline'} color={ink} size={24}/><View style={{flex:1}}><Text numberOfLines={2} style={{color:ink,fontSize:14,fontWeight:'600'}}>{block.title||block.content||'Ouvrir le contenu'}</Text>{block.title?<Text numberOfLines={1} style={{fontSize:11,color:ink,opacity:.65}}>{block.content}</Text>:null}</View><Ionicons name="open-outline" size={17} color={ink}/></View>:
       <Text style={{color:ink,fontFamily:font,fontSize:textSize,lineHeight:textSize*1.33,textAlign:block.align||'left',fontWeight:typeof font==='undefined'&&block.kind.startsWith('heading')?'700':'400',fontStyle:block.kind==='quote'?'italic':'normal'}}>{block.kind==='quote'?'“'+block.content+'”':block.content}</Text>}
      {block.caption?<Text style={{fontSize:11,color:ink,opacity:.6,marginTop:7}}>{block.caption}</Text>:null}
     </View>}
  </Pressable>
  {edit?<Pressable onPress={onTap} style={{alignSelf:'flex-end',paddingHorizontal:11,paddingVertical:5}} accessibilityLabel="Modifier ce bloc"><Ionicons name="options-outline" size={17} color="#8A8281"/></Pressable>:null}
 </View>;
}
function CanvasTile({block,index,editable,theme,onEdit,onMove,onResize,onStart,onFinish,onHover,dragging,highlight}:{block:DreamBlock;index:number;editable:boolean;theme:{foreground:string;muted:string;border:string;surface:string};onEdit:()=>void;onMove:(from:number,to:number)=>void;onResize:(id:string,span:1|2,height:number)=>void;onStart:(index:number)=>void;onFinish:()=>void;onHover:(index:number)=>void;dragging:boolean;highlight:boolean}) {
 const [shift,setShift]=useState({x:0,y:0});
 const [preview,setPreview]=useState<{span:1|2;height:number}|null>(null);
 const callbacks=useRef({index,onStart,onFinish,onHover,onMove,onResize,blockId:block.id});
 callbacks.current={index,onStart,onFinish,onHover,onMove,onResize,blockId:block.id};
 const startSize=useRef({span:2 as 1|2,height:110});
 const size=useRef({span:block.span||(block.size==='small'?1:2),height:block.height||0});
 size.current={span:block.span||(block.size==='small'?1:2),height:block.height||0};
 const drag=useRef(PanResponder.create({
  onStartShouldSetPanResponder:()=>true,
  onMoveShouldSetPanResponder:()=>true,
  onPanResponderGrant:()=>{setShift({x:0,y:0});callbacks.current.onStart(callbacks.current.index);},
  onPanResponderMove:(_,g)=>{setShift({x:g.dx,y:g.dy});const to=Math.max(0,callbacks.current.index+Math.round(g.dy/110)*2+Math.round(g.dx/145));callbacks.current.onHover(to);},
  onPanResponderRelease:(_,g)=>{const target=Math.max(0,callbacks.current.index+Math.round(g.dy/110)*2+Math.round(g.dx/145));callbacks.current.onMove(callbacks.current.index,target);setShift({x:0,y:0});callbacks.current.onFinish();},
  onPanResponderTerminate:()=>{setShift({x:0,y:0});callbacks.current.onFinish();},
 })).current;
 const resize=useRef(PanResponder.create({
  onStartShouldSetPanResponder:()=>true,
  onMoveShouldSetPanResponder:()=>true,
  onPanResponderGrant:()=>{startSize.current={span:size.current.span as 1|2,height:size.current.height||110};},
  onPanResponderMove:(_,g)=>{const span:1|2=g.dx>28?2:g.dx< -28?1:startSize.current.span;const height=Math.max(55,Math.min(540,startSize.current.height+Math.round(g.dy/28)*28));setPreview({span,height});},
  onPanResponderRelease:(_,g)=>{const span:1|2=g.dx>28?2:g.dx< -28?1:startSize.current.span;const height=Math.max(55,Math.min(540,startSize.current.height+Math.round(g.dy/28)*28));callbacks.current.onResize(callbacks.current.blockId,span,height);setPreview(null);},
  onPanResponderTerminate:()=>setPreview(null),
 })).current;
 return <View style={{width:(preview?.span||(block.span||(block.size==='small'?1:2)))===1?'48.5%':'100%',paddingBottom:12,opacity:dragging?.84:1,transform:dragging?[{translateX:shift.x},{translateY:shift.y}]:undefined,zIndex:dragging?12:0}}>
  <View style={{borderWidth:highlight?2:0,borderColor:'#D71D77',borderRadius:12}}>
   <View style={preview?{minHeight:preview.height}:undefined}><BlockView block={{...block,height:preview?.height||block.height}} edit={false} onTap={onEdit}/></View>
  </View>
  {editable?<View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:4,paddingHorizontal:5}}>
    <View {...drag.panHandlers} style={{paddingVertical:8,paddingHorizontal:12,backgroundColor:theme.surface,borderRadius:8,borderWidth:1,borderColor:theme.border}}><Ionicons name="reorder-three-outline" size={19} color={theme.foreground}/></View>
    <Pressable onPress={onEdit} style={{padding:8}}><Ionicons name="options-outline" size={18} color={theme.muted}/></Pressable>
    <View {...resize.panHandlers} style={{paddingVertical:8,paddingHorizontal:12,backgroundColor:theme.surface,borderRadius:8,borderWidth:1,borderColor:theme.border}}><Ionicons name="resize-outline" size={19} color="#D71D77"/></View>
  </View>:null}
 </View>;
}
export default function SemenceStudio({dream,onBack}:{dream:DreamEntry;onBack:()=>void}){
 const theme=useAppTheme(); const {patch,advance}=useDreams();const editable=dream.phase==='Rêve';
 const blocks=dream.blocks||[];
 const [edit,setEdit]=useState(editable);const [library,setLibrary]=useState(false);const [query,setQuery]=useState('');
 const [draft,setDraft]=useState<DreamBlock|null>(null);const [insertAt,setInsertAt]=useState<number|null>(null);
 const [confirm,setConfirm]=useState(false);
 const [dragIndex,setDragIndex]=useState<number|null>(null);const [hoverIndex,setHoverIndex]=useState<number|null>(null);
 const base=(kind:DreamBlockKind):DreamBlock=>({id:newId(),kind,title:'',content:'',size:'wide',tone:'clear',font:'sans',align:'left',frame:'none'});
 const change=(field:Partial<DreamBlock>)=>setDraft(prev=>prev?{...prev,...field}:prev);
 const save=()=>{if(!draft)return;const updated=[...blocks];const i=updated.findIndex(x=>x.id===draft.id);if(i>=0)updated[i]=draft;else updated.splice(insertAt===null?updated.length:insertAt,0,draft);patch(dream.id,{blocks:updated});setDraft(null);setLibrary(false);setInsertAt(null);};
 const reorder=(from:number,to:number)=>{if(from===to)return;const a=[...blocks];if(from<0||from>=a.length)return;const [item]=a.splice(from,1);a.splice(Math.min(Math.max(0,to),a.length),0,item);patch(dream.id,{blocks:a});};
 const resizeBlock=(id:string,span:1|2,height:number)=>{patch(dream.id,{blocks:blocks.map(b=>b.id===id?{...b,span,height,size:span===1?'small':height>=190?'featured':'wide'}:b)});};
 const move=(id:string,step:number)=>{const a=[...blocks],i=a.findIndex(b=>b.id===id),j=i+step;if(i<0||j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];patch(dream.id,{blocks:a});};
 const alert=(message:string)=>Platform.OS==='web'?window.alert(message):Alert.alert('Semence',message);
 const chooseMedia=()=>{if(!draft)return;pickFlowerMedia(items=>{if(!items.length)return;change({content:items[0].uri,media:[...(draft.media||[]),...items.map(x=>x.uri)]});},alert);};
 const chooser=(index:number|null)=>{setInsertAt(index);setQuery('');setLibrary(true);};
 return <ScrollView style={{flex:1,backgroundColor:theme.background}} contentContainerStyle={{padding:18,paddingBottom:90,maxWidth:720,width:'100%',alignSelf:'center'}}>
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
   <Pressable onPress={draft?()=>setDraft(null):onBack} style={{padding:8}} accessibilityLabel="Retour"><Ionicons name="chevron-back" size={24} color={theme.foreground}/></Pressable>
   <Text style={{fontSize:11,fontWeight:'700',letterSpacing:2,color:'#B88962'}}>SEMENCE</Text>
   {editable?<Pressable onPress={()=>{setEdit(!edit);setLibrary(false);setDraft(null);}} style={{padding:10}}><Text style={{color:PINK,fontWeight:'700'}}>{edit?'Terminer':'Composer'}</Text></Pressable>:<Ionicons name="lock-closed-outline" color={theme.muted} size={19}/>}
  </View>
  <Text style={{fontFamily:'serif',fontSize:34,lineHeight:42,color:theme.foreground,marginBottom:12}}>{dream.title}</Text>
  {!edit || !editable ? <Text style={{fontSize:14,color:theme.muted,lineHeight:22,marginBottom:14}}>{dream.summary}</Text> : null}
  <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:22}}>
   <Text style={{fontSize:11,color:theme.muted}}>Ton espace d'inspiration</Text>
   <Pressable disabled={!editable} onPress={()=>patch(dream.id,{visibility:dream.visibility==='public'?'private':'public'})} style={{flexDirection:'row',alignItems:'center',gap:6}}><Ionicons name={dream.visibility==='public'?'globe-outline':'lock-closed-outline'} size={15} color={PINK}/><Text style={{color:PINK,fontSize:12}}>{dream.visibility==='public'?'Public':'Privé'}</Text></Pressable>
  </View>
  {edit && !draft && !library?<TextInput multiline value={dream.summary} onChangeText={v=>patch(dream.id,{summary:v})} placeholder="Quelle est ton intention ?" style={{borderBottomWidth:1,borderColor:theme.border,color:theme.foreground,fontSize:16,minHeight:65,marginBottom:16}}/>:null}
  {!editable ? <View style={{padding:15,borderRadius:12,backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,marginBottom:16,gap:9}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:8}}><Ionicons name="lock-closed-outline" size={17} color={theme.muted}/><Text style={{color:theme.foreground,fontSize:13,fontWeight:'700'}}>Semence conservée en lecture seule</Text></View>
    <Text style={{color:theme.muted,fontSize:13,lineHeight:20}}>Ce rêve est maintenant en {dream.phase==='Initiation'?'Germination':dream.phase==='Croissance'?'Croissance':'Floraison'}. Ses premières inspirations restent consultables, mais elles ne peuvent plus être modifiées.</Text>
    <Pressable onPress={()=>router.push('/my-dream/new')} accessibilityRole="button" style={{paddingVertical:11,alignItems:'center',borderRadius:9,borderWidth:1,borderColor:theme.border}}><Text style={{color:PINK,fontWeight:'700',fontSize:12}}>Créer une nouvelle Semence</Text></Pressable>
   </View>:null}
  {blocks.length===0&&!edit&&editable?<Pressable onPress={()=>{setEdit(true);chooser(null);}} style={{minHeight:200,justifyContent:'center',alignItems:'center',borderWidth:1,borderStyle:'dashed',borderColor:theme.border,borderRadius:14}}><Ionicons name="add" color={theme.muted} size={24}/><Text style={{fontSize:13,color:theme.muted,marginTop:10}}>Un espace pour toutes tes inspirations.</Text></Pressable>:null}
  {edit&&!draft&&!library?<Pressable onPress={()=>chooser(0)} style={{paddingVertical:14,alignItems:'center'}}><Ionicons name="add-circle-outline" size={22} color={PINK}/></Pressable>:null}
  <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',alignItems:'flex-start'}}>
   {blocks.map((b,i)=><CanvasTile key={b.id} block={b} index={i} editable={edit&&!library&&!draft} theme={theme} onEdit={()=>{setDraft({...b});setLibrary(false);}} onMove={reorder} onResize={resizeBlock} onStart={setDragIndex} onFinish={()=>{setDragIndex(null);setHoverIndex(null);}} onHover={setHoverIndex} dragging={dragIndex===i} highlight={hoverIndex===i&&dragIndex!==i}/>)}
  </View>
  {dragIndex!==null?<Text style={{fontSize:11,color:PINK,marginBottom:10}}>Déplace le bloc avec la poignée de gauche, relâche pour l'insérer.</Text>:null}
  {edit&&!draft&&!library?<Pressable onPress={()=>chooser(null)} style={{paddingVertical:14,alignItems:'center',borderTopWidth:1,borderColor:theme.border}}><Text style={{color:PINK,fontWeight:'700'}}>＋ Ajouter un bloc</Text></Pressable>:null}
  <Modal visible={library || !!draft} animationType="slide" transparent={false} onRequestClose={()=>{setDraft(null);setLibrary(false);}}>
   <View style={{flex:1,backgroundColor:theme.background,paddingTop:Platform.OS==='web'?12:42}}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:18,paddingBottom:90,maxWidth:720,width:'100%',alignSelf:'center'}}>
     <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
      <Text style={{fontSize:11,letterSpacing:2,fontWeight:'700',color:'#B88962'}}>SEMENCE · COMPOSER</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Fermer l'éditeur" onPress={()=>{setDraft(null);setLibrary(false);}} style={{padding:9}}>
       <Ionicons name="close" size={23} color={theme.foreground}/>
      </Pressable>
     </View>
  {edit&&library&&!draft?<View style={{padding:14,backgroundColor:theme.surface,borderRadius:14,borderWidth:1,borderColor:theme.border}}>
   <Text style={{fontSize:18,color:theme.foreground,fontWeight:'700',marginBottom:13}}>Ajouter à mon rêve</Text>
   <TextInput value={query} onChangeText={setQuery} placeholder="Rechercher un bloc…" style={{padding:12,backgroundColor:theme.dark?'#34363B':'#F5F1EB',borderRadius:10,color:theme.foreground,marginBottom:12}}/>
   {groups.map(g=>{const kinds=g.kinds.filter(x=>x.title.toLowerCase().includes(query.toLowerCase())||x.kind.includes(query.toLowerCase()));return kinds.length?<View key={g.title} style={{marginBottom:14}}><Text style={{fontWeight:'700',fontSize:11,color:theme.muted,marginBottom:7,letterSpacing:1}}>{g.title.toUpperCase()}</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{kinds.map(x=><Pressable key={x.kind} onPress={()=>{setDraft(base(x.kind));setLibrary(false);}} style={{width:'47.8%',padding:12,borderRadius:9,backgroundColor:theme.dark?'#28292D':'#F5F1EB',flexDirection:'row',alignItems:'center',gap:9}}><Ionicons name={x.icon} size={18} color={theme.foreground}/><Text style={{fontSize:12,color:theme.foreground,flex:1}}>{x.title}</Text></Pressable>)}</View></View>:null})}
   <Pressable onPress={()=>setLibrary(false)}><Text style={{color:theme.muted,textAlign:'center',padding:13}}>Annuler</Text></Pressable>
  </View>:null}
  {draft?<View style={{backgroundColor:theme.surface,padding:15,borderRadius:14,borderWidth:1,borderColor:theme.border,gap:12}}>
   <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{fontWeight:'700',fontSize:18,color:theme.foreground}}>Personnaliser le bloc</Text><Pressable onPress={()=>setDraft(null)}><Ionicons name="close" color={theme.muted} size={22}/></Pressable></View>
   <ScrollView horizontal showsHorizontalScrollIndicator={false}>{groups.flatMap(g=>g.kinds).map(x=><Pressable key={x.kind} onPress={()=>change({kind:x.kind})} style={{padding:9,borderRadius:8,backgroundColor:draft.kind===x.kind?PINK:(theme.dark?'#303137':'#F0ECE8'),marginRight:5}}><Text style={{fontSize:11,color:draft.kind===x.kind?'#fff':theme.foreground}}>{x.title}</Text></Pressable>)}</ScrollView>
   <TextInput value={draft.title||''} onChangeText={title=>change({title})} placeholder="Titre / légende (facultatif)" style={{backgroundColor:theme.dark?'#303137':'#F5F1EB',color:theme.foreground,padding:12,borderRadius:8}}/>
   {!['divider','spacer'].includes(draft.kind)?<TextInput value={draft.content} multiline onChangeText={content=>change({content})} placeholder={mediaKinds.includes(draft.kind)?'Colle un lien ou importe un média…':draft.kind==='table'?'Une ligne par rangée, colonnes séparées par |':draft.kind==='columns'?'Colonne gauche | colonne droite':'Écris librement…'} style={{backgroundColor:theme.dark?'#303137':'#F5F1EB',color:theme.foreground,padding:12,borderRadius:8,minHeight:95,textAlignVertical:'top'}}/>:null}
   {mediaKinds.includes(draft.kind)?<Pressable onPress={chooseMedia} style={{borderWidth:1,borderStyle:'dashed',borderColor:theme.border,padding:13,borderRadius:10,alignItems:'center'}}><Text style={{color:theme.foreground}}>＋ Importer une photo / un média</Text></Pressable>:null}
   {draft.kind==='image'?<Pressable onPress={()=>pickDreamImage(content=>change({content}),alert)} style={{padding:10}}><Text style={{color:PINK}}>Choisir une photo</Text></Pressable>:null}
   <Text style={{color:theme.muted,fontSize:11,fontWeight:'700'}}>PROPORTIONS</Text>
   <View style={{flexDirection:'row',gap:7}}>{(['small','wide','featured'] as const).map(size=><Pressable key={size} onPress={()=>change({size})} style={{padding:9,backgroundColor:draft.size===size?PINK:(theme.dark?'#303137':'#F1EDE8'),borderRadius:8}}><Text style={{color:draft.size===size?'#fff':theme.foreground,fontSize:12}}>{size==='small'?'Petit':size==='wide'?'Large':'Vedette'}</Text></Pressable>)}</View>
   <Text style={{color:theme.muted,fontSize:11,fontWeight:'700'}}>TYPOGRAPHIE</Text>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{(['sans','serif','handwritten','mono'] as const).map(font=><Pressable key={font} onPress={()=>change({font})} style={{padding:9,borderRadius:8,backgroundColor:draft.font===font?PINK:(theme.dark?'#303137':'#F1EDE8')}}><Text style={{color:draft.font===font?'#fff':theme.foreground,fontSize:12}}>{font==='sans'?'Simple':font==='serif'?'Éditorial':font==='handwritten'?'Manuscrit':'Mono'}</Text></Pressable>)}</View>
   <View style={{flexDirection:'row',gap:9}}>{(['left','center','right'] as const).map(align=><Pressable key={align} onPress={()=>change({align})} style={{padding:10,backgroundColor:draft.align===align?PINK:(theme.dark?'#303137':'#F1EDE8'),borderRadius:8}}><Ionicons name={align==='left'?'reorder-three-outline':align==='center'?'reorder-two-outline':'reorder-four-outline'} size={20} color={draft.align===align?'white':theme.foreground}/></Pressable>)}</View>
   <Text style={{color:theme.muted,fontSize:11,fontWeight:'700'}}>FOND</Text>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{(Object.keys(palettes) as DreamBlock['tone'][]).map(tone=><Pressable key={tone} accessibilityLabel={tone} onPress={()=>change({tone})} style={{width:31,height:31,backgroundColor:palettes[tone],borderWidth:draft.tone===tone?2:1,borderColor:draft.tone===tone?PINK:'#D5D2CD',borderRadius:8}}/>)}</View>
   <Text style={{color:theme.muted,fontSize:11,fontWeight:'700'}}>TEXTE & ENCADREMENT</Text>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{(['default','pink','green','muted','white'] as const).map(ink=><Pressable key={ink} onPress={()=>change({ink})} style={{backgroundColor:draft.ink===ink?PINK:(theme.dark?'#303137':'#F1EDE8'),padding:8,borderRadius:8}}><Text style={{color:draft.ink===ink?'#fff':theme.foreground,fontSize:12}}>{ink}</Text></Pressable>)}</View>
   <View style={{flexDirection:'row',gap:7}}>{(['none','soft','outline'] as const).map(frame=><Pressable key={frame} onPress={()=>change({frame})} style={{backgroundColor:draft.frame===frame?PINK:(theme.dark?'#303137':'#F1EDE8'),padding:9,borderRadius:8}}><Text style={{fontSize:12,color:draft.frame===frame?'#fff':theme.foreground}}>{frame==='none'?'Libre':frame==='soft'?'Doux':'Contour'}</Text></Pressable>)}</View>
   <TextInput value={draft.caption||''} onChangeText={caption=>change({caption})} placeholder="Petite légende (facultatif)" style={{padding:11,backgroundColor:theme.dark?'#303137':'#F5F1EB',color:theme.foreground,borderRadius:8}}/>
   <Text style={{color:theme.muted,fontSize:11}}>Aperçu</Text><BlockView block={draft} edit={false} onTap={()=>{}}/>
   <Pressable onPress={save} style={{backgroundColor:PINK,padding:14,alignItems:'center',borderRadius:10}}><Text style={{color:'white',fontWeight:'700'}}>Enregistrer</Text></Pressable>
   {blocks.some(b=>b.id===draft.id)?<Pressable onPress={()=>{patch(dream.id,{blocks:blocks.filter(b=>b.id!==draft.id)});setDraft(null);}} style={{padding:10,alignItems:'center'}}><Text style={{color:'#BB4C60'}}>Supprimer le bloc</Text></Pressable>:null}
  </View>:null}
    </ScrollView>
   </View>
  </Modal>
  {editable&&!edit&&!library&&!draft?<Pressable onPress={()=>setConfirm(true)} style={{marginTop:35,padding:14,borderWidth:1,borderColor:theme.border,borderRadius:11,alignItems:'center'}}><Text style={{color:theme.foreground,fontWeight:'600'}}>Faire germer mon rêve</Text></Pressable>:null}
  {confirm?<View style={{backgroundColor:theme.surface,padding:17,marginTop:12,borderRadius:12,borderWidth:1,borderColor:theme.border}}><Text style={{fontWeight:'700',fontSize:17,color:theme.foreground}}>Prêt à faire germer ce rêve ?</Text><Text style={{color:theme.muted,marginTop:8,lineHeight:20}}>Ton rêve deviendra public. Tu retrouveras toute cette composition dans son histoire, sans perdre tes inspirations.</Text><Pressable onPress={()=>{patch(dream.id,{visibility:'public'});advance(dream.id);setConfirm(false);onBack();}} style={{backgroundColor:PINK,padding:14,borderRadius:9,marginTop:15}}><Text style={{color:'#fff',textAlign:'center',fontWeight:'700'}}>Confirmer</Text></Pressable><Pressable onPress={()=>setConfirm(false)} style={{padding:13}}><Text style={{color:theme.muted,textAlign:'center'}}>Pas encore</Text></Pressable></View>:null}
  <Text style={{color:theme.muted,fontSize:10,marginTop:28,lineHeight:17}}>Les inspirations sont enregistrées localement sur cet appareil. L'import de fichiers est disponible sur le web ; les fichiers volumineux et l'import natif nécessitent encore le service média.</Text>
 </ScrollView>;
}
