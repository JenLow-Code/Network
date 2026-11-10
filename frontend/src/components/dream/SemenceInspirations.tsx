import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Image, Linking, Modal, PanResponder, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppTheme } from '@/theme/AppTheme';
import { useDreams } from '@/domain/dreamRepository';
import { pickDreamImage } from '@/lib/pickDreamImage';
import { pickFlowerMedia } from '@/lib/pickFlowerMedia';
import { usePublication } from '@/lib/api/hooks';
import PublicationSearchPicker from './PublicationSearchPicker';
import SemenceInspirationDetail from './SemenceInspirationDetail';
import SemencePublicationCover from './SemencePublicationCover';
import SemenceProfileCover from './SemenceProfileCover';
import SemenceProfilePicker from './SemenceProfilePicker';
import { documentKind, documentLabel } from './SemenceDocumentPreview';
import { linkHost } from './SemenceLinkPreview';
import { layoutInspirations, isTallTile, isWideTile, reorderInspiration, tileSizeOf, type TileSize } from '@/domain/inspirationLayout';
import RichInspirationNote from './RichInspirationNote';
import BiblePassagePicker from '@/components/bible/BiblePassagePicker';
import { bibleReference } from '@/domain/bibleLibrary';
import { publicationPath } from '@/components/publication/PublicationGallery';
import type { DreamBlock, DreamBlockKind, DreamEntry } from '@/domain/dreamWorkspace';

const freshId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const isRemote=(url:string)=>/^https?:\/\/[^ ]+/i.test(url.trim());
const hasImage=(block:DreamBlock)=>['image','gallery'].includes(block.kind) &&
  /^(https?:|data:image\/|file:|blob:)/i.test((block.media?.[0]||block.content).trim());
const palette='#B88962';
type Option={kind:DreamBlockKind;label:string;sub:string;icon:keyof typeof Ionicons.glyphMap};
const options:Option[]=[
  {kind:'image',label:'Photo',sub:'Une image qui t’inspire',icon:'image-outline'},
  {kind:'quote',label:'Citation',sub:'Une phrase, une parole',icon:'chatbubble-ellipses-outline'},
  {kind:'poem',label:'Poème / texte court',sub:'Un poème ou un texte original à lire ici',icon:'book-outline'},
  {kind:'note',label:'Note',sub:'Une note avec listes, cases à cocher et sections',icon:'create-outline'},
  {kind:'bible-verse',label:'Verset biblique',sub:'Référence et passage',icon:'book-outline'},
  {kind:'publication-ref',label:'Publication',sub:'Une publication partagée sur JenLow',icon:'albums-outline'},
  {kind:'profile-ref',label:'Profil',sub:'Une personne JenLow qui t’inspire',icon:'person-outline'},
  {kind:'document',label:'Document',sub:'PDF, texte, fichier de référence',icon:'document-attach-outline'},
  {kind:'link',label:'Lien',sub:'Article ou site inspirant',icon:'link-outline'},
  {kind:'video',label:'Vidéo / audio',sub:'Une référence à écouter ou regarder',icon:'play-circle-outline'},
];
function typeLabel(kind:DreamBlockKind) {
  return options.find(item=>item.kind===kind)?.label||(
    kind==='pdf'?'Document':kind==='audio'||kind==='music'?'Audio':'Inspiration');
}
function typeIcon(kind:DreamBlockKind):keyof typeof Ionicons.glyphMap{
  if(kind==='pdf'||kind==='document')return 'document-text-outline';
  if(kind==='poem')return 'book-outline';
  if(kind==='note')return 'create-outline';
  if(kind==='publication-ref')return 'albums-outline';
  if(kind==='profile-ref')return 'person-outline';
  if(kind==='bible-verse')return 'book-outline';
  if(kind==='video')return 'videocam-outline';
  if(kind==='audio'||kind==='music')return 'musical-notes-outline';
  if(kind==='quote')return 'chatbubble-outline';
  if(kind==='link'||kind==='bookmark'||kind==='embed')return 'link-outline';
  if(kind==='image'||kind==='gallery')return 'image-outline';
  return 'sparkles-outline';
}
/** A shared compact card rhythm: same height and typography across reference types. */
export function InspirationTile({block,onPress,onLongPress}:{
 block:DreamBlock;onPress:()=>void;onLongPress:()=>void;
}) {
 const theme=useAppTheme();
 const image=hasImage(block);
 const document=block.kind==='document'||block.kind==='pdf';
 const publication=block.kind==='publication-ref';
 const profile=block.kind==='profile-ref';
 const verse=block.kind==='bible-verse';
 const link=['link','bookmark','embed'].includes(block.kind);
 const quote=block.kind==='quote';
 const poem=block.kind==='poem';
 const note=block.kind==='note';
 const wide=isWideTile(block);
 const tall=isTallTile(block);
 const surface=theme.dark?'#2A2B2D':'#F5F1ED';
 const fullLabel=verse?block.title||'Verset biblique':
   quote?block.title||'Citation':block.title||typeLabel(block.kind);
 const label=(verse?block.title||'VERSET BIBLIQUE':
   quote?block.title?.trim()||'CITATION':
   poem?block.title?.trim()||'POÈME':
   note?block.title?.trim()||'NOTE':typeLabel(block.kind)).toUpperCase();
 const noteSummary=(block.noteBlocks||[]).map(b=>b.type==='checklist'
   ?(b.checked?'☑ ':'☐ ')+b.text:b.title?b.title+' '+b.text:b.text).join('\n');
 const contentLimit=tall?15:wide?7:9;
 const imageHeight=tall?(wide?305:294):wide?190:157;
 return <Pressable accessibilityRole="button"
   accessibilityLabel={'Ouvrir '+typeLabel(block.kind)+': '+fullLabel}
   accessibilityHint="Appui long ou clic droit pour modifier, supprimer ou partager"
   onPress={onPress} onLongPress={onLongPress} delayLongPress={460}
   {...(Platform.OS==='web'?{onContextMenu:(event:any)=>{
     event.preventDefault();onLongPress();
   }} as any:{})}
   style={{width:'100%',borderRadius:12,overflow:'hidden',
     backgroundColor:surface,minHeight:tall?300:110}}>
   {profile?<SemenceProfileCover handle={block.content} name={block.title}
     avatar={block.media?.[0]} height={tall?305:wide?190:165}/>:
    publication?<SemencePublicationCover publicationId={block.content}
     fallbackTitle={block.title} fallbackImage={block.media?.[0]}
     fallbackType={block.icon?.replace(/^publication-/,'')}
     tileHeight={tall?wide?315:305:wide?190:165}/>:
    image?<View>
      <Image source={{uri:block.media?.[0]||block.content}}
        style={{width:'100%',height:imageHeight}} resizeMode="cover"/>
      {!!block.title?<Text numberOfLines={2} style={{paddingHorizontal:11,
        paddingVertical:9,fontSize:12,fontWeight:'600',
        color:theme.foreground}}>{block.title}</Text>:null}
    </View>:document?<View style={{
      paddingHorizontal:wide?15:12,paddingVertical:14,
      flexDirection:wide?'row':'column',alignItems:wide?'center':'flex-start',
      gap:11,minHeight:tall?300:wide?126:165}}>
      <View style={{width:wide?54:49,height:wide?64:59,
        borderRadius:9,backgroundColor:theme.dark?'#38383A':'#EDE3D9',
        justifyContent:'center',alignItems:'center',gap:3}}>
        <Ionicons name="document-text-outline" size={23} color="#A5713D"/>
        <Text style={{fontSize:9,color:'#A5713D',fontWeight:'700'}}>
          {documentKind(block).toUpperCase()}
        </Text>
      </View>
      <View style={{flex:wide?1:undefined,alignSelf:'stretch',gap:6}}>
        <Text style={{fontSize:9,letterSpacing:.7,fontWeight:'700',
          color:'#A5713D'}}>DOCUMENT</Text>
        <Text numberOfLines={tall?8:wide?3:5}
          style={{fontSize:wide?14:12,lineHeight:wide?20:18,
            fontWeight:'600',color:theme.foreground}}>
          {documentLabel(block)}
        </Text>
      </View>
    </View>:
    <View style={{padding:12,gap:8,minHeight:tall?300:120}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
        <Ionicons name={typeIcon(block.kind)} size={14} color="#A5713D"/>
        <Text numberOfLines={1} style={{
          fontSize:9,letterSpacing:.6,fontWeight:'700',
          color:'#A5713D',flex:1}}>
          {label}
        </Text>
      </View>
      {link?<View style={{gap:6}}>
        {!!block.title?<Text numberOfLines={2}
          style={{fontSize:13,lineHeight:18,fontWeight:'600',
            color:theme.foreground}}>{block.title}</Text>:null}
        <Text numberOfLines={wide?3:2} ellipsizeMode="middle"
          style={{fontSize:11,lineHeight:17,color:'#A5713D',
            textDecorationLine:'underline'}}>{block.content}</Text>
      </View>:
      <Text numberOfLines={contentLimit}
        style={{fontFamily:quote||poem||verse?'serif':undefined,
          fontSize:quote?15:poem?13:verse?13:13,
          lineHeight:quote?22:19,fontStyle:quote?'italic':'normal',
          color:verse?'#C02772':theme.foreground}}>
        {quote?'“'+block.content+'”':note?noteSummary:block.content}
      </Text>}
    </View>}
 </Pressable>;
}


type MeasurableTile={measureInWindow:(fn:(x:number,y:number,width:number,height:number)=>void)=>void};

/** Separate handles keep tap-to-preview and long-press-to-edit intact.
 * PanResponder provides true touch dragging on mobile; on a simple tap,
 * arrows offer keyboard/screen-reader-friendly reordering.
 */
function SortableInspirationCard({block,editable,onOpen,onMenu,onResize,onMeasure,
 registerRef,onStartDrag,onFinishDrag,onDrop,onStep}:{
 block:DreamBlock;editable:boolean;onOpen:()=>void;onMenu:()=>void;
 onResize:(size:TileSize)=>void;onMeasure:(id:string,height:number)=>void;
 registerRef:(id:string,view:MeasurableTile|null)=>void;
 onStartDrag:(id:string)=>void;onFinishDrag:()=>void;
 onDrop:(id:string,x:number,y:number)=>void;
 onStep:(id:string,direction:-1|1)=>void;
}){
 const theme=useAppTheme();
 const [sizeOpen,setSizeOpen]=useState(false);
 const [moveOpen,setMoveOpen]=useState(false);
 const [moving,setMoving]=useState(false);
 const moved=useRef(false);
 const offset=useRef(new Animated.ValueXY({x:0,y:0})).current;
 const callbacks=useRef({onStartDrag,onFinishDrag,onDrop});
 callbacks.current={onStartDrag,onFinishDrag,onDrop};
 const responder=useMemo(()=>PanResponder.create({
   onStartShouldSetPanResponder:()=>true,
   onMoveShouldSetPanResponder:()=>true,
   onPanResponderTerminationRequest:()=>false,
   onPanResponderGrant:()=>{
     moved.current=false;
     callbacks.current.onStartDrag(block.id);
   },
   onPanResponderMove:(_,gesture)=>{
     if(Math.abs(gesture.dx)+Math.abs(gesture.dy)>8){
       if(!moved.current){moved.current=true;setMoving(true);}
       offset.setValue({x:gesture.dx,y:gesture.dy});
     }
   },
   onPanResponderRelease:(_,gesture)=>{
     const actuallyMoved=moved.current;
     offset.setValue({x:0,y:0});setMoving(false);
     callbacks.current.onFinishDrag();
     if(actuallyMoved)callbacks.current.onDrop(block.id,gesture.moveX,gesture.moveY);
     else setMoveOpen(open=>!open);
     moved.current=false;
   },
   onPanResponderTerminate:()=>{
     offset.setValue({x:0,y:0});setMoving(false);moved.current=false;
     callbacks.current.onFinishDrag();
   },
 }),[block.id,offset]);
 const resizeChoices:{size:TileSize;icon:keyof typeof Ionicons.glyphMap}[]=[
   {size:'1x1',icon:'square-outline'},
   {size:'2x1',icon:'tablet-landscape-outline'},
   {size:'1x2',icon:'tablet-portrait-outline'},
   {size:'2x2',icon:'grid-outline'},
 ];
 return <Animated.View
   ref={ref=>registerRef(block.id,ref as unknown as MeasurableTile|null)}
   onLayout={event=>onMeasure(block.id,event.nativeEvent.layout.height)}
   style={{position:'relative',zIndex:moving||sizeOpen||moveOpen?30:1,
     elevation:moving?14:0,opacity:moving?0.88:1,
     transform:offset.getTranslateTransform()}}>
   <InspirationTile block={block} onPress={onOpen} onLongPress={onMenu}/>
   {editable?<View style={{position:'absolute',right:7,bottom:7,
     flexDirection:'row',alignItems:'center',gap:4}}>
     <Pressable accessibilityRole="button"
       accessibilityLabel={'Changer la taille de '+(block.title||'cette inspiration')}
       accessibilityState={{expanded:sizeOpen}}
       onPress={()=>{setSizeOpen(value=>!value);setMoveOpen(false);}}
       style={{height:30,width:30,borderRadius:9,alignItems:'center',
         justifyContent:'center',borderWidth:0.6,borderColor:theme.border,
         backgroundColor:theme.dark?'rgba(35,35,35,.9)':'rgba(255,252,247,.92)'}}>
       <Ionicons name="resize-outline" size={15} color="#9D6C43"/>
     </Pressable>
     <View {...responder.panHandlers}
       accessible accessibilityRole="button"
       accessibilityLabel={'Glisser pour déplacer '+(block.title||'cette inspiration')}
       accessibilityHint="Maintenir et déplacer pour réorganiser les cartes, ou toucher pour les flèches"
       style={{width:30,height:30,borderRadius:9,alignItems:'center',
         justifyContent:'center',borderWidth:0.6,borderColor:theme.border,
         backgroundColor:theme.dark?'rgba(35,35,35,.9)':'rgba(255,252,247,.92)'}}>
       <Ionicons name="reorder-three-outline" size={20} color="#9D6C43"/>
     </View>
   </View>:null}
   {editable&&sizeOpen?<View style={{position:'absolute',right:6,bottom:41,
     flexDirection:'row',gap:4,padding:5,borderRadius:10,
     backgroundColor:theme.background,borderWidth:1,borderColor:theme.border,
     elevation:6,zIndex:75,shadowColor:'#332619',shadowOpacity:.12,shadowRadius:8}}>
     {resizeChoices.map(choice=><Pressable key={choice.size}
       accessibilityRole="button"
       accessibilityLabel={'Carte '+choice.size.replace('x',' par ')}
       accessibilityState={{selected:tileSizeOf(block)===choice.size}}
       onPress={()=>{onResize(choice.size);setSizeOpen(false);}}
       style={{width:37,height:44,borderRadius:7,
         justifyContent:'center',alignItems:'center',gap:2,
         backgroundColor:tileSizeOf(block)===choice.size?
           (theme.dark?'#4C3C30':'#F0E5D9'):'transparent'}}>
       <Ionicons name={choice.icon} color="#9D6C43" size={16}/>
       <Text style={{fontSize:9,color:theme.foreground}}>{choice.size.replace('x','×')}</Text>
     </Pressable>)}
   </View>:null}
   {editable&&moveOpen?<View style={{position:'absolute',right:7,bottom:41,
     flexDirection:'row',gap:6,padding:5,borderRadius:10,
     backgroundColor:theme.background,borderWidth:1,borderColor:theme.border,
     zIndex:75,elevation:6}}>
     {([-1,1] as const).map(direction=><Pressable key={direction}
       accessibilityRole="button"
       accessibilityLabel={direction===-1?'Déplacer avant':'Déplacer après'}
       onPress={()=>{onStep(block.id,direction);setMoveOpen(false);}}
       style={{width:42,height:39,alignItems:'center',justifyContent:'center'}}>
       <Ionicons name={direction===-1?'arrow-up':'arrow-down'}
         color="#9D6C43" size={21}/>
     </Pressable>)}
   </View>:null}
 </Animated.View>;
}

/** Inspiration references, not a second note editor. */
export default function SemenceInspirations({dream,editable,onShareInspiration,addRequestToken=0,showAddControl=false}:{
  dream:DreamEntry;editable:boolean;onShareInspiration?:(id:string)=>void;
  addRequestToken?:number;showAddControl?:boolean;
}) {
  const theme=useAppTheme();
  const {width}=useWindowDimensions();
  const {patch}=useDreams();
  const blocks=(dream.blocks||[]).filter(b=>b.kind!=='todo');
  const [choosing,setChoosing]=useState(false);
  const [draft,setDraft]=useState<DreamBlock|null>(null);
  const [selectedBlock,setSelectedBlock]=useState<DreamBlock|null>(null);
  const [selectedMenu,setSelectedMenu]=useState(false);
  const [message,setMessage]=useState('');
  const [picker,setPicker]=useState<'bible'|'publication'|'profile'|null>(null);
  const [heights,setHeights]=useState<Record<string,number>>({});
  const tileRefs=useRef<Record<string,MeasurableTile|null>>({});
  const dropRegions=useRef<Record<string,{x:number;y:number;width:number;height:number}>>({});
  const [draggingId,setDraggingId]=useState<string|null>(null);
  const onMeasure=(id:string,height:number)=>{
    if(!Number.isFinite(height)||height<=0)return;
    setHeights(current=>Math.abs((current[id]||0)-height)<4?
      current:{...current,[id]:height});
  };
  const beginDrag=(id:string)=>{
    setDraggingId(id);
    const snapshot:typeof dropRegions.current={};
    for(const [key,node] of Object.entries(tileRefs.current)){
      node?.measureInWindow((x,y,width,height)=>{
        if(width>0&&height>0)dropRegions.current[key]={x,y,width,height};
      });
    }
    dropRegions.current=snapshot;
  };
  const endDrag=()=>setDraggingId(null);
  const onDrop=(id:string,x:number,y:number)=>{
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    const positions=Object.entries(dropRegions.current)
      .filter(([otherId,box])=>otherId!==id&&box.width>0&&box.height>0);
    if(!positions.length)return;
    // Prefer the tile under the finger/cursor, or the closest one in the gap.
    const nearest=positions.map(([otherId,box])=>{
      const dx=Math.max(box.x-x,0,x-(box.x+box.width));
      const dy=Math.max(box.y-y,0,y-(box.y+box.height));
      return {id:otherId,box,distance:dx*dx+dy*dy};
    }).sort((a,b)=>a.distance-b.distance)[0];
    if(!nearest)return;
    const after=y>nearest.box.y+nearest.box.height*0.5;
    const original=dream.blocks||[];
    const reordered=reorderInspiration(original,id,nearest.id,after);
    if(reordered!==original)patch(dream.id,{blocks:reordered});
  };
  const onStep=(id:string,direction:-1|1)=>{
    const index=blocks.findIndex(b=>b.id===id);
    const target=blocks[index+direction];
    if(!target)return;
    const original=dream.blocks||[];
    const reordered=reorderInspiration(original,id,target.id,direction===1);
    if(reordered!==original)patch(dream.id,{blocks:reordered});
  };
  const visibleGroups=useMemo(()=>layoutInspirations(blocks,heights),[blocks,heights]);
  const renderTile=(block:DreamBlock)=><SortableInspirationCard key={block.id}
    block={block} editable={editable}
    onOpen={()=>{setSelectedBlock({...block});setSelectedMenu(false);setMessage('');}}
    onMenu={()=>{setSelectedBlock({...block});setSelectedMenu(true);setMessage('');}}
    onResize={size=>patch(dream.id,{blocks:(dream.blocks||[]).map(b=>
      b.id===block.id?{...b,tileSize:size}:b)})}
    onMeasure={onMeasure}
    registerRef={(id,node)=>{tileRefs.current[id]=node;}}
    onStartDrag={beginDrag} onFinishDrag={endDrag}
    onDrop={onDrop} onStep={onStep}/>;

  const canShow=choosing||!!draft;
  useEffect(()=>{if(addRequestToken>0&&editable){setChoosing(true);setMessage('');}},[addRequestToken]);
  const patchBlock=(updates:Partial<DreamBlock>)=>
    setDraft(current=>current?{...current,...updates}:current);
  const make=(kind:DreamBlockKind)=>{
    const base:DreamBlock={id:freshId(),kind,title:'',content:'',size:'small',
      tileSize:'1x1',noteBlocks:kind==='note'?[]:undefined,
      tone:'clear',font:'sans',align:'left',frame:'none'};
    setDraft(base);setChoosing(false);setMessage('');
    setPicker(kind==='bible-verse'?'bible':kind==='publication-ref'?'publication':kind==='profile-ref'?'profile':null);
  };
  const close=()=>{setChoosing(false);setDraft(null);setPicker(null);setMessage('');};
  const showError=(msg:string)=>{setMessage(msg);};
  const save=()=>{
    if(!draft||!editable)return;
    const title=draft.title?.trim()||'';
    const content=draft.content.trim();
    if(draft.kind==='quote'&&!content)return showError('Écris la citation à conserver.');
    if(draft.kind==='note'&&!draft.noteBlocks?.length)return showError('Ajoute au moins un bloc dans cette note.');
    if(draft.kind==='poem'&&!content)return showError('Écris ton poème ou ton texte.');
    if(draft.kind==='poem'&&content.length>2000)return showError('Pour un texte plus long, ajoute-le comme document.');
    if(draft.kind==='bible-verse'&&!title)return showError('Ajoute la référence du verset (par ex. Jean 3:16).');
    if(draft.kind==='publication-ref'&&!content)return showError('Saisis l’ID de la publication.');
    if(draft.kind==='profile-ref'&&!/^[a-zA-Z0-9_.-]{2,80}$/.test(content.replace(/^@/,'')))
      return showError('Sélectionne un profil JenLow valide.');
    if(['link','bookmark','embed'].includes(draft.kind)&&!isRemote(content))
      return showError('Utilise un lien qui commence par https:// ou http://.');
    if(['image','gallery','document','pdf','video','audio','music'].includes(draft.kind)&&!content)
      return showError('Ajoute un fichier ou un lien avant d’enregistrer.');
    const saved={...draft,title,content};
    const old=dream.blocks||[];
    const existing=old.some(block=>block.id===saved.id);
    patch(dream.id,{blocks:existing?old.map(block=>block.id===saved.id?saved:block):[...old,saved]});
    close();
  };
  const remove=()=>{
    if(!draft||!editable)return;
    const run=()=>{patch(dream.id,{blocks:(dream.blocks||[]).filter(b=>b.id!==draft.id)});close();};
    if(Platform.OS==='web'&&typeof window!=='undefined'){
      if(window.confirm('Supprimer cette inspiration ?'))run();
    }else Alert.alert('Supprimer cette inspiration ?',undefined,[
      {text:'Annuler',style:'cancel'},{text:'Supprimer',style:'destructive',onPress:run},
    ]);
  };
  const pickDocument=()=>{
    if(Platform.OS!=='web'||typeof document==='undefined'){
      showError('L’import de fichiers natif nécessite encore le sélecteur Android/iOS. Tu peux enregistrer un lien vers le document.');
      return;
    }
    const input=document.createElement('input');
    input.type='file';
    input.accept='.pdf,.txt,.md,.doc,.docx,.rtf,.odt,.csv,.xls,.xlsx,.ppt,.pptx';
    input.onchange=()=>{
      const file=input.files?.[0];
      if(!file)return;
      if(file.size>2_000_000){showError('Fichier trop volumineux pour le stockage local (2 Mo maximum).');return;}
      const reader=new FileReader();
      reader.onload=()=>{
        if(typeof reader.result==='string')patchBlock({kind:'document',
          title:file.name,content:reader.result,media:[reader.result]});
      };
      reader.onerror=()=>showError('Impossible de lire ce document.');
      reader.readAsDataURL(file);
    };
    input.click();
  };
  const pickMedia=()=>{
    if(!draft)return;
    if(draft.kind==='image'){
      pickDreamImage(content=>patchBlock({content,media:[content]}),showError);
      return;
    }
    if(draft.kind==='document'||draft.kind==='pdf'){pickDocument();return;}
    pickFlowerMedia(files=>{
      const item=files[0];
      if(item)patchBlock({content:item.uri,title:item.name,
        kind:item.kind==='photo'?'image':item.kind==='document'?'document':item.kind,
        media:[item.uri]});
    },showError);
  };
  const currentPub=usePublication(draft?.kind==='publication-ref'?draft.content.trim():undefined);
  const openReference=()=>{
    if(!draft)return;
    if(draft.kind==='publication-ref'){
      if(currentPub.item?.id===draft.content.trim())router.push(publicationPath(currentPub.item) as any);
    } else if(isRemote(draft.content)){
      void Linking.openURL(draft.content).catch(()=>showError('Impossible d’ouvrir ce lien.'));
    }else if(draft.content.startsWith('data:')&&Platform.OS==='web'&&typeof document!=='undefined'){
      const a=document.createElement('a');
      a.href=draft.content;a.download=draft.title||'inspiration';
      document.body.appendChild(a);a.click();a.remove();
    }
  };
  const input=(value:string,onChangeText:(value:string)=>void,placeholder:string,multiline=false)=>
    <TextInput value={value} onChangeText={onChangeText} editable={editable}
      multiline={multiline} textAlignVertical={multiline?'top':'center'}
      accessibilityLabel={placeholder}
      placeholder={placeholder} placeholderTextColor={theme.muted}
      autoCapitalize="sentences"
      style={{fontSize:15,lineHeight:23,color:theme.foreground,minHeight:multiline?120:46,
        paddingHorizontal:13,paddingVertical:12,borderWidth:1,borderColor:theme.border,
        borderRadius:11,backgroundColor:theme.background}}/>;

  return <View style={{paddingBottom:12,gap:12}}>
    {showAddControl?<View style={{flexDirection:'row',alignItems:'center',justifyContent:'flex-end',gap:8}}>
      {editable&&showAddControl?<Pressable accessibilityRole="button" accessibilityLabel="Ajouter une inspiration"
        onPress={()=>{setChoosing(true);setMessage('');}}
        style={{width:36,height:36,alignItems:'center',justifyContent:'center',
          borderRadius:18,backgroundColor:theme.surface,
          borderWidth:1,borderColor:theme.border}}>
        <Ionicons name="add" size={25} color="#A5713D"/>
      </Pressable>:null}
    </View>:null}
    {blocks.length?<View style={{gap:11}}>
      {visibleGroups.map((group,index)=>group.type==='wide'?
        <View key={'w-'+group.block.id} style={{zIndex:draggingId===group.block.id?60:1}}>
          {renderTile(group.block)}
        </View>:
        <View key={'group-'+index} style={{flexDirection:'row',
          alignItems:'flex-start',gap:11,
          zIndex:draggingId&&[...group.left,...group.right].some(b=>b.id===draggingId)?60:1}}>
          <View style={{flex:1,gap:11}}>
            {group.left.map(renderTile)}
          </View>
          <View style={{flex:1,gap:11}}>
            {group.right.map(renderTile)}
          </View>
        </View>)}
    </View>:<View style={{minHeight:142,alignItems:'center',justifyContent:'center',
      gap:12,paddingHorizontal:20}}>
      <Ionicons name="images-outline" size={26} color={theme.muted}/>
      <Text style={{fontSize:13,lineHeight:21,textAlign:'center',color:theme.muted}}>
        {editable?'Une image, un verset, une citation…\nAjoute ce qui te donne envie de rêver.':
          'Aucune inspiration conservée.'}
      </Text>
    </View>}
    {selectedBlock?<SemenceInspirationDetail
      key={selectedBlock.id+String(selectedMenu)}
      block={selectedBlock} editable={editable} initialMenu={selectedMenu}
      onClose={()=>setSelectedBlock(null)}
      onEdit={()=>{setDraft({...selectedBlock});setSelectedBlock(null);setMessage('');}}
      onDelete={()=>{
        const block=selectedBlock;
        setSelectedBlock(null);
        const doDelete=()=>patch(dream.id,{
          blocks:(dream.blocks||[]).filter(item=>item.id!==block.id),
        });
        if(Platform.OS==='web'&&typeof window!=='undefined'){
          if(window.confirm('Supprimer cette inspiration ?'))doDelete();
        }else Alert.alert('Supprimer cette inspiration ?',
          'Elle sera retirée de ce rêve.',[
            {text:'Annuler',style:'cancel'},
            {text:'Supprimer',style:'destructive',onPress:doDelete},
          ]);
      }}
      onShare={()=>{const id=selectedBlock.id;setSelectedBlock(null);
        onShareInspiration?.(id);}}
      onResize={size=>{
        const updated={...selectedBlock,tileSize:size};
        patch(dream.id,{blocks:(dream.blocks||[]).map(b=>
          b.id===selectedBlock.id?updated:b)});
        setSelectedBlock(null);
      }}
    />:null}
    <Modal visible={canShow} transparent animationType="slide" onRequestClose={close}>
      <View style={{flex:1,justifyContent:'flex-end'}}>
        <Pressable onPress={close} accessibilityRole="button"
          accessibilityLabel="Fermer" style={{flex:1,backgroundColor:'rgba(0,0,0,0.36)'}}/>
        <View style={{backgroundColor:theme.surface,
          borderTopLeftRadius:22,borderTopRightRadius:22,
          maxHeight:'85%',paddingHorizontal:19,paddingTop:16,
          paddingBottom:Platform.OS==='ios'?35:23}}>
          <View style={{alignItems:'center',marginBottom:12}}>
            <View style={{width:39,height:4,borderRadius:2,
              backgroundColor:theme.border}}/>
          </View>
          <View style={{flexDirection:'row',alignItems:'center',
            justifyContent:'space-between',marginBottom:16}}>
            <Text style={{fontFamily:'serif',fontSize:23,color:theme.foreground}}>
              {choosing?'Ajouter une inspiration':picker==='publication'?'Trouver une publication':picker==='profile'?'Trouver un profil':picker==='bible'?'Dans ma Bible':draft?typeLabel(draft.kind):'Inspiration'}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Fermer"
              onPress={close} style={{padding:7}}>
              <Ionicons name="close" color={theme.foreground} size={20}/>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:11,paddingBottom:14}}>
            {choosing?options.map(o=><Pressable key={o.kind} onPress={()=>make(o.kind)}
              accessibilityRole="button"
              style={{flexDirection:'row',alignItems:'center',gap:13,
                paddingVertical:12,borderBottomWidth:1,borderColor:theme.border}}>
              <View style={{width:39,height:39,borderRadius:11,
                alignItems:'center',justifyContent:'center',
                backgroundColor:theme.dark?'#373B40':'#F4EFEA'}}>
                <Ionicons name={o.icon} size={19} color={palette}/>
              </View>
              <View style={{flex:1,gap:3}}>
                <Text style={{fontSize:15,fontWeight:'600',color:theme.foreground}}>{o.label}</Text>
                <Text style={{fontSize:11,color:theme.muted}}>{o.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={theme.muted}/>
            </Pressable>):null}

            {draft&&picker==='bible'?<BiblePassagePicker compact
              title="Chercher un passage dans la Bible"
              onSelect={verse=>{patchBlock({
                title:bibleReference(verse),content:verse.text,
                caption:'Louis Segond 1910',
              });setPicker(null);}}/>:null}
            {draft&&picker==='profile'?<SemenceProfilePicker
              onSelect={member=>{patchBlock({content:member.handle,
                title:member.displayName,media:member.avatarUrl?[member.avatarUrl]:[]});
                setPicker(null);}}
              onBack={()=>setPicker(null)}/>:null}
            {draft&&picker==='publication'?<PublicationSearchPicker
              selectedId={draft.content}
              onManual={content=>patchBlock({content})}
              onSelect={item=>{const image=item.type==='talent'?item.avatar:
                item.type==='music'?(item.coverArt||item.image):item.image;
                if(item.type==='talent'&&item.authorHandle){
                  patchBlock({kind:'profile-ref',content:item.authorHandle,
                    title:item.author,media:image?[image]:[],icon:undefined});
                }else{
                  patchBlock({content:item.id,title:item.title,
                    media:image?[image]:[],icon:'publication-'+item.type});
                }
                setPicker(null);}}
              onDone={()=>setPicker(null)}/>:null}
            {draft&&!picker?<>
              {draft.kind==='image'||draft.kind==='gallery'?<>
                <Pressable accessibilityRole="button" onPress={pickMedia} disabled={!editable}
                  style={{height:105,borderRadius:12,borderWidth:1,borderColor:theme.border,
                    alignItems:'center',justifyContent:'center',gap:9,
                    backgroundColor:theme.background}}>
                  {hasImage(draft)?<Image source={{uri:draft.media?.[0]||draft.content}}
                    style={{width:'100%',height:105,borderRadius:11}}/>:
                    <><Ionicons name="image-outline" color={palette} size={23}/>
                    <Text style={{color:theme.foreground,fontSize:13}}>Choisir une photo</Text></>}
                </Pressable>
                {input(draft.title||'',title=>patchBlock({title}),'Légende (facultative)')}
                {input(draft.content,content=>patchBlock({content,media:[]}),
                  'Ou coller l’URL de l’image')}
              </>:null}
              {draft.kind==='quote'?<>
                {input(draft.content,content=>patchBlock({content}),
                  'Écris la citation…',true)}
                {input(draft.title||'',title=>patchBlock({title}),
                  'Auteur ou source (facultatif)')}
              </>:null}
              {draft.kind==='note'?<>
                {input(draft.title||'',title=>patchBlock({title}),'Titre de la note (facultatif)')}
                <RichInspirationNote blocks={draft.noteBlocks||[]} editable={editable}
                  onChange={noteBlocks=>patchBlock({noteBlocks,
                    content:noteBlocks.map(b=>b.title?b.title+' '+b.text:b.text).join('\n')})}/>
              </>:null}
              {draft.kind==='poem'?<>
                {input(draft.title||'',title=>patchBlock({title}),'Titre (facultatif)')}
                {input(draft.content,content=>patchBlock({content}),
                  'Écris ton poème ou ton court texte…',true)}
                <Text style={{fontSize:11,color:theme.muted}}>
                  Texte court, jusqu’à 2 000 caractères. Pour un travail plus long ou versionné, utilise un document.
                </Text>
              </>:null}
              {draft.kind==='bible-verse'?<>
                <View style={{padding:12,borderWidth:1,borderColor:theme.border,
                  borderRadius:10,gap:7}}>
                  <Text style={{fontWeight:'700',fontSize:13,color:theme.foreground}}>
                    {draft.title||'Verset non sélectionné'}
                  </Text>
                  <Text style={{fontFamily:'serif',fontSize:16,lineHeight:25,
                    color:theme.foreground}}>{draft.content||'Cherche un verset dans la Bible intégrée.'}</Text>
                </View>
                <Pressable onPress={()=>setPicker('bible')} accessibilityRole="button"
                  style={{flexDirection:'row',alignItems:'center',justifyContent:'center',
                    gap:8,padding:12,borderWidth:1,borderColor:theme.border,borderRadius:9}}>
                  <Ionicons name="book-outline" size={16} color={theme.foreground}/>
                  <Text style={{fontSize:12,fontWeight:'700',color:theme.foreground}}>
                    {draft.title?'Choisir un autre verset':'Chercher dans la Bible'}
                  </Text>
                </Pressable>
              </>:null}
              {draft.kind==='profile-ref'?<>
                <Pressable onPress={()=>setPicker('profile')} accessibilityRole="button"
                  style={{flexDirection:'row',alignItems:'center',gap:10,
                    padding:12,borderWidth:1,borderColor:theme.border,borderRadius:10}}>
                  <Ionicons name="person-outline" size={19} color={palette}/>
                  <Text style={{fontSize:13,color:theme.foreground,fontWeight:'600'}}>
                    {draft.content?'Changer de profil':'Rechercher un profil'}
                  </Text>
                </Pressable>
                {!!draft.content?<SemenceProfileCover handle={draft.content}
                  name={draft.title} avatar={draft.media?.[0]} height={205}/>:null}
              </>:null}
              {draft.kind==='publication-ref'?<>
                <Pressable onPress={()=>setPicker('publication')} accessibilityRole="button"
                  style={{flexDirection:'row',gap:9,alignItems:'center',padding:12,
                    borderRadius:10,borderWidth:1,borderColor:theme.border}}>
                  <Ionicons name="search-outline" size={18} color={theme.foreground}/>
                  <Text style={{fontSize:13,fontWeight:'700',color:theme.foreground}}>
                    Rechercher dans Découverte
                  </Text>
                </Pressable>
                {input(draft.content,content=>patchBlock({content}),
                  'ID de publication')}
                {input(draft.title||'',title=>patchBlock({title}),
                  'Titre / légende (facultatif)')}
                {draft.content.trim()?<View style={{gap:4}}>
                  <Text style={{fontSize:12,color:theme.muted}}>
                    {currentPub.item?.id===draft.content.trim()?'Publication trouvée : '+currentPub.item.title:
                      currentPub.state==='error'?'Publication introuvable pour le moment':
                      'Recherche de la publication…'}
                  </Text>
                  {currentPub.item?.id===draft.content.trim()?<Pressable onPress={openReference}
                    accessibilityRole="button" style={{paddingVertical:9}}>
                    <Text style={{fontSize:13,color:palette,fontWeight:'700'}}>
                      Ouvrir la publication
                    </Text>
                  </Pressable>:null}
                </View>:null}
              </>:null}
              {draft.kind==='document'||draft.kind==='pdf'?<>
                <Pressable onPress={pickDocument} disabled={!editable} accessibilityRole="button"
                  style={{borderRadius:11,borderWidth:1,borderColor:theme.border,
                    padding:14,flexDirection:'row',alignItems:'center',gap:11}}>
                  <Ionicons name="document-attach-outline" size={23} color={palette}/>
                  <Text style={{fontSize:13,fontWeight:'600',color:theme.foreground}}>
                    {draft.content.startsWith('data:')?'Remplacer le fichier':'Importer un document'}
                  </Text>
                </Pressable>
                {input(draft.title||'',title=>patchBlock({title}),'Nom du document')}
                {input(draft.content.startsWith('data:')?'':draft.content,
                  content=>patchBlock({content,media:[]}), 'Ou coller un lien vers le fichier')}
              </>:null}
              {['link','bookmark','embed'].includes(draft.kind)?<>
                {input(draft.title||'',title=>patchBlock({title}),'Nom de la référence')}
                {input(draft.content,content=>patchBlock({content}),'https://…')}
              </>:null}
              {['video','audio','music'].includes(draft.kind)?<>
                <Pressable accessibilityRole="button" onPress={pickMedia}
                  style={{borderRadius:11,padding:13,borderWidth:1,borderColor:theme.border,
                    flexDirection:'row',gap:10,alignItems:'center'}}>
                  <Ionicons name="cloud-upload-outline" size={21} color={palette}/>
                  <Text style={{fontSize:13,color:theme.foreground}}>Importer un média</Text>
                </Pressable>
                {input(draft.title||'',title=>patchBlock({title}),'Titre')}
                {input(draft.content.startsWith('data:')?'':draft.content,
                  content=>patchBlock({content,media:[]}), 'Ou coller un lien vers le média')}
              </>:null}
              {!['image','gallery','quote','poem','note','bible-verse','publication-ref','profile-ref','document','pdf','link','bookmark','embed','video','audio','music'].includes(draft.kind)?<>
                <Text style={{fontSize:11,color:theme.muted}}>
                  Ancien bloc conservé pour ne pas perdre tes idées.
                </Text>
                {input(draft.title||'',title=>patchBlock({title}),'Titre')}
                {input(draft.content,content=>patchBlock({content}),'Contenu',true)}
              </>:null}
              {!!message?<Text accessibilityRole="alert"
                style={{fontSize:12,color:'#BD3858',lineHeight:18}}>{message}</Text>:null}
              {editable?<View style={{gap:10,marginTop:5}}>
                <Pressable accessibilityRole="button" onPress={save}
                  style={{backgroundColor:theme.foreground,
                    paddingVertical:14,borderRadius:11,alignItems:'center'}}>
                  <Text style={{fontWeight:'700',color:theme.background,fontSize:14}}>
                    Enregistrer
                  </Text>
                </Pressable>
                {(dream.blocks||[]).some(b=>b.id===draft.id)?<Pressable
                  onPress={remove} accessibilityRole="button"
                  style={{padding:12,alignItems:'center'}}>
                  <Text style={{fontSize:12,color:'#B04C60'}}>Supprimer l’inspiration</Text>
                </Pressable>:null}
              </View>:null}
              {draft.content&&(draft.kind==='document'||draft.kind==='pdf'||draft.kind==='link')?
                <Pressable onPress={openReference}
                  style={{alignItems:'center',padding:9}} accessibilityRole="button">
                  <Text style={{fontSize:12,color:theme.muted}}>Ouvrir le fichier / lien</Text>
                </Pressable>:null}
            </>:null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </View>;
}
