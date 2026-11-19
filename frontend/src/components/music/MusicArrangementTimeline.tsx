import React,{useEffect,useRef,useState} from 'react';
import {Platform,Pressable,ScrollView,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {MusicAudioPeaks} from './MusicAudioPeaksNext';
import {musicSourceDuration} from '@/domain/musicNext';
import {musicStamp,musicStampMs} from '@/domain/musicEditing';
import type {WorkingMusicTrack,WorkingMusicVersion} from '@/domain/musicNext';
import type {MusicProjectFile} from '@/domain/musicWorkspace';

const PINK='#CB245C';
const TRACK_EMOJIS=['🎤','🎙️','🎹','🎸','🥁','🪘','🎺','🎷','🎻','🪕','🪈','🎶','🎧','🎼','🎛️','🔊','💻','🎵'];
type Timing=Partial<Pick<WorkingMusicTrack,'offsetSeconds'|'trimStartSeconds'|'trimEndSeconds'>>;
type Mode='move'|'start'|'end';
type Snapshot={pointerId:number;id:string;mode:Mode;x:number;
  offset:number;start:number;end:number;total:number;next:Timing};
type Props={
  version:WorkingMusicVersion;files:MusicProjectFile[];
  duration:number;position:number;onSeek:(position:number)=>void;
  onChangeTrack?:(id:string,patch:Timing)=>void;
  onSelectTrack?:(id:string)=>void;
  onToggleMute?:(id:string)=>void;
  onToggleSolo?:(id:string)=>void;
  onMarkTrackRange?:(trackId:string,startSeconds:number,endSeconds:number)=>void;
  onRenameTrack?:(id:string,name:string)=>void;
  onEmojiTrack?:(id:string,emoji:string)=>void;
  onRemoveTrack?:(id:string)=>void;
  onReorderTrack?:(fromId:string,toId:string)=>void;
  onDropSource?:(fileId:string,atSeconds:number)=>void;
};
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const precise=(x:number)=>Math.round(x*100)/100;
const clipInfo=(track:WorkingMusicTrack,file?:MusicProjectFile)=>{
  const total=musicSourceDuration(file);
  const start=clamp(track.trimStartSeconds||0,0,total);
  const end=clamp(track.trimEndSeconds??total,start,total);
  return {total,start,end,offset:Math.max(0,track.offsetSeconds||0)};
};

/**
 * One independent row per track, with actual draggable clip bodies and trim
 * handles. The original audio is never cut or rewritten by these gestures.
 * Mouse and touch on web use pointer capture; native uses responder callbacks.
 */
export function MusicArrangementTimeline({version,files,duration,position,onSeek,
  onChangeTrack,onSelectTrack,onToggleMute,onToggleSolo,onMarkTrackRange,
  onRenameTrack,onEmojiTrack,onRemoveTrack,onReorderTrack,onDropSource}:Props){
  const theme=useAppTheme();
  const {width}=useWindowDimensions();
  const compact=width<650;
  const [panelWidth,setPanelWidth]=useState(0);
  const [zoom,setZoom]=useState(1);
  const [renaming,setRenaming]=useState<string|null>(null);
  const renamingRef=useRef<string|null>(null);
  const [draftName,setDraftName]=useState('');
  const [emojiOpen,setEmojiOpen]=useState<string|null>(null);
  const [confirmRemove,setConfirmRemove]=useState<string|null>(null);
  const [dragOver,setDragOver]=useState(false);
  const [scrubbing,setScrubbing]=useState(false);
  const scrubRef=useRef<{pointerId:number}|null>(null);
  const nativeScrub=useRef<{pageX:number;seconds:number}|null>(null);
  const scrollX=useRef(0);
  const timelineRef=useRef<any>(null);
  const scrollRef=useRef<any>(null);
  const [preview,setPreview]=useState<{id:string;value:Timing}|null>(null);
  const drag=useRef<Snapshot|null>(null);
  const rangeHold=useRef<{pointerId:number;id:string;start:number;end:number;
    pressedX:number;active:boolean;timer:ReturnType<typeof setTimeout>|null}|null>(null);
  const [rangePreview,setRangePreview]=useState<{id:string;start:number;end:number}|null>(null);
  const [heldRange,setHeldRange]=useState<{id:string;start:number;end:number}|null>(null);
  const rememberRange=(id:string,a:number,b:number)=>{
    if(b-a<.03)return;
    const start=Math.round(a*1000)/1000,end=Math.round(b*1000)/1000;
    setHeldRange({id,start,end});
    onMarkTrackRange?.(id,start,end);
  };
  const clearRange=()=>setHeldRange(null);
  const labelWidth=compact?116:177;
  const viewport=Math.max(150,(panelWidth||Math.min(860,width-36))-labelWidth);
  const maxEnd=Math.max(duration,10,...version.tracks.map(t=>{
    const info=clipInfo(t,files.find(f=>f.id===t.sourceFileId));
    return info.offset+info.end-info.start;
  }));
  const contentWidth=Math.round(viewport*zoom);
  const pixelsPerSecond=contentWidth/maxEnd;
  const beatSeconds=60/(version.bpm||100);
  const snap=(seconds:number)=>version.snapToBeat?
    precise(Math.round(seconds/beatSeconds)*beatSeconds):precise(seconds);
  const seekAtClient=(clientX:number,element:HTMLElement)=>{
    const x=clientX-element.getBoundingClientRect().left+scrollX.current;
    onSeek(precise(clamp(x/pixelsPerSecond,0,maxEnd)));
  };
  const commitName=(id:string)=>{
    if(renamingRef.current!==id)return;
    renamingRef.current=null;
    const value=draftName.trim();
    if(value&&value!==version.tracks.find(track=>track.id===id)?.title)
      onRenameTrack?.(id,value);
    setRenaming(null);
  };
  const dropReady=useRef(onDropSource);dropReady.current=onDropSource;
  const pxReady=useRef(pixelsPerSecond);pxReady.current=pixelsPerSecond;
  useEffect(()=>{
    if(Platform.OS!=='web'||!scrollRef.current)return;
    const el=scrollRef.current as HTMLElement;
    if(!el.addEventListener)return;
    el.setAttribute('data-jenlow-music-dropzone','true');
    el.setAttribute('data-jenlow-seconds-per-pixel',String(1/pxReady.current));
    const over=(e:DragEvent)=>{
      if(!e.dataTransfer?.types?.includes('application/x-jenlow-music-file'))return;
      e.preventDefault();
      e.dataTransfer.dropEffect='copy';setDragOver(true);
    };
    const leave=(e:DragEvent)=>{if(!el.contains(e.relatedTarget as Node))setDragOver(false);};
    const drop=(e:DragEvent)=>{
      setDragOver(false);
      if(!e.dataTransfer?.types?.includes('application/x-jenlow-music-file'))return;
      e.preventDefault();
      const id=e.dataTransfer.getData('application/x-jenlow-music-file');
      const x=e.clientX-el.getBoundingClientRect().left+el.scrollLeft;
      if(id)dropReady.current?.(id,precise(Math.max(0,x/pxReady.current)));
    };
    el.addEventListener('dragover',over);el.addEventListener('drop',drop);
    el.addEventListener('dragleave',leave);
    return()=>{el.removeEventListener('dragover',over);el.removeEventListener('drop',drop);
      el.removeEventListener('dragleave',leave);
      el.removeAttribute('data-jenlow-music-dropzone');
      el.removeAttribute('data-jenlow-seconds-per-pixel');};
  },[version.tracks.length,zoom,panelWidth]);
  const tick=zoom>=8?2:zoom>=4?5:zoom>=2?10:30;
  const rows=version.tracks.length;
  const rowHeight=77,rulerHeight=43;

  const begin=(eventX:number,mode:Mode,track:WorkingMusicTrack,
    file:MusicProjectFile|undefined,pointerId:number)=>{
    if(!onChangeTrack)return;
    const info=clipInfo(track,file);
    drag.current={id:track.id,mode,pointerId,x:eventX,...info,
      next:{}};
    setPreview(null);
  };
  const move=(eventX:number,pointerId:number)=>{
    const d=drag.current;
    if(!d||d.pointerId!==pointerId||!onChangeTrack)return;
    const delta=precise((eventX-d.x)/pixelsPerSecond);
    let next:Timing={};
    if(d.mode==='move')next={offsetSeconds:snap(Math.max(0,d.offset+delta))};
    if(d.mode==='start'){
      const shift=clamp(delta,-d.offset,Math.max(0,d.end-d.start-.025));
      next={offsetSeconds:precise(d.offset+shift),
        trimStartSeconds:precise(clamp(d.start+shift,0,d.end-.025))};
    }
    if(d.mode==='end')next={trimEndSeconds:precise(
      clamp(d.end+delta,Math.min(d.total,d.start+.025),d.total))};
    d.next=next;
    setPreview({id:d.id,value:next});
  };
  const stop=(pointerId:number,commit:boolean)=>{
    const d=drag.current;
    if(!d||d.pointerId!==pointerId)return;
    drag.current=null;
    setPreview(null);
    if(commit&&Object.keys(d.next).length&&onChangeTrack)onChangeTrack(d.id,d.next);
  };
  // A full clip is draggable. The two end handles adjust its trim.
  const gesture=(mode:Mode,t:WorkingMusicTrack,file:MusicProjectFile|undefined,
    left:number,w:number)=>{
    const grip=Math.min(23,Math.max(11,w/3));
    const common={position:'absolute' as const,
      left:mode==='start'?0:mode==='end'?Math.max(0,w-grip):grip,
      top:0,bottom:0,width:mode==='move'?Math.max(9,w-2*grip):grip};
    const editable=!!onChangeTrack;
    if(Platform.OS==='web')return React.createElement('div',{
      key:t.id+mode,role:'button',tabIndex:0,
      'aria-label':mode==='move'?'Déplacer '+t.title:
        mode==='start'?'Couper le début de '+t.title:'Couper la fin de '+t.title,
      title:mode==='move'?'Glisser pour décaler la piste':
        mode==='start'?'Glisser pour ajuster le début':'Glisser pour ajuster la fin',
      onPointerDown:(e:React.PointerEvent<HTMLDivElement>)=>{
        if(!editable||e.pointerType==='touch')return;
        e.preventDefault();e.stopPropagation();
        const element=e.currentTarget;
        const pointerId=e.pointerId;
        try{element.setPointerCapture(pointerId);}catch{}
        begin(e.clientX,mode,t,file,pointerId);
        if(mode==='move'&&onMarkTrackRange){
          const info=clipInfo(t,file);
          const rect=element.getBoundingClientRect();
          const at=clamp(info.start+(e.clientX-rect.left)/pixelsPerSecond,
            info.start,info.end);
          const hold={pointerId,id:t.id,start:at,end:at,
            pressedX:e.clientX,active:false,
            timer:null as ReturnType<typeof setTimeout>|null};
          rangeHold.current=hold;
          hold.timer=setTimeout(()=>{
            if(rangeHold.current!==hold)return;
            hold.active=true;drag.current=null;
            setPreview(null);setRangePreview({id:t.id,start:at,end:at});
          },350);
        }
      },
      onPointerMove:(e:React.PointerEvent<HTMLDivElement>)=>{
        if(e.pointerType==='touch')return;
        const hold=rangeHold.current;
        if(hold?.pointerId===e.pointerId){
          if(hold.active){
            e.preventDefault();e.stopPropagation();
            const info=clipInfo(t,file);
            hold.end=clamp(hold.start+(e.clientX-hold.pressedX)/pixelsPerSecond,
              info.start,info.end);
            setRangePreview({id:t.id,start:Math.min(hold.start,hold.end),
              end:Math.max(hold.start,hold.end)});
            return;
          }
          if(Math.abs(e.clientX-hold.pressedX)>5){
            if(hold.timer)clearTimeout(hold.timer);
            rangeHold.current=null;
          }
        }
        if(!drag.current)return;
        e.preventDefault();e.stopPropagation();move(e.clientX,e.pointerId);
      },
      onPointerUp:(e:React.PointerEvent<HTMLDivElement>)=>{
        if(e.pointerType==='touch')return;
        e.preventDefault();e.stopPropagation();
        const hold=rangeHold.current;
        if(hold?.timer)clearTimeout(hold.timer);
        rangeHold.current=null;
        if(hold?.active){
          const a=Math.min(hold.start,hold.end),b=Math.max(hold.start,hold.end);
          rememberRange(t.id,a,b);
          setRangePreview(null);
        }else{
          const item=drag.current;
          if(item?.mode==='move'&&Object.keys(item.next).length===0){
            // Tapping the centre of a clip positions the song playhead.
            const info=clipInfo(t,file);
            const grip=Math.min(23,Math.max(11,w/3));
            const rect=e.currentTarget.getBoundingClientRect();
            const clickAt=info.offset+(e.clientX-rect.left+grip)/pixelsPerSecond;
            clearRange();onSeek(precise(clamp(clickAt,0,maxEnd)));
          }else stop(e.pointerId,true);
          if(item?.mode==='move'&&Object.keys(item.next).length===0)
            drag.current=null;
        }
        try{e.currentTarget.releasePointerCapture(e.pointerId);}catch{}
      },
      onPointerCancel:(e:React.PointerEvent<HTMLDivElement>)=>{
        if(e.pointerType==='touch')return;
        if(rangeHold.current?.timer)clearTimeout(rangeHold.current.timer);
        rangeHold.current=null;setRangePreview(null);stop(e.pointerId,false);
      },
      onTouchStart:(e:React.TouchEvent<HTMLDivElement>)=>{
        if(!editable)return;
        const finger=e.touches[0];
        if(!finger||e.touches.length!==1)return;
        e.stopPropagation();
        begin(finger.clientX,mode,t,file,-1);
        if(mode==='move'&&onMarkTrackRange){
          const info=clipInfo(t,file);
          const rect=e.currentTarget.getBoundingClientRect();
          const at=clamp(info.start+(finger.clientX-rect.left)/pixelsPerSecond,
            info.start,info.end);
          const hold={pointerId:-1,id:t.id,start:at,end:at,
            pressedX:finger.clientX,active:false,
            timer:null as ReturnType<typeof setTimeout>|null};
          rangeHold.current=hold;
          hold.timer=setTimeout(()=>{
            if(rangeHold.current!==hold)return;
            hold.active=true;drag.current=null;setPreview(null);
            setRangePreview({id:t.id,start:at,end:at});
          },330);
        }
      },
      onTouchMove:(e:React.TouchEvent<HTMLDivElement>)=>{
        const finger=e.touches[0];
        if(!finger)return;
        e.stopPropagation();
        const hold=rangeHold.current;
        if(hold?.pointerId===-1){
          if(hold.active){
            const info=clipInfo(t,file);
            hold.end=clamp(hold.start+
              (finger.clientX-hold.pressedX)/pixelsPerSecond,info.start,info.end);
            setRangePreview({id:t.id,start:Math.min(hold.start,hold.end),
              end:Math.max(hold.start,hold.end)});
            return;
          }
          if(Math.abs(finger.clientX-hold.pressedX)>7){
            if(hold.timer)clearTimeout(hold.timer);
            rangeHold.current=null;
          }
        }
        move(finger.clientX,-1);
      },
      onTouchEnd:(e:React.TouchEvent<HTMLDivElement>)=>{
        e.stopPropagation();
        const hold=rangeHold.current;
        if(hold?.timer)clearTimeout(hold.timer);
        rangeHold.current=null;
        if(hold?.active){
          const start=Math.min(hold.start,hold.end),end=Math.max(hold.start,hold.end);
          rememberRange(t.id,start,end);
          setRangePreview(null);
          drag.current=null;
          return;
        }
        const current=drag.current;
        if(current?.pointerId===-1&&
          current.mode==='move'&&Object.keys(current.next).length===0){
          const finger=e.changedTouches[0];
          if(finger){
            const grip=Math.min(23,Math.max(11,w/3));
            const rect=e.currentTarget.getBoundingClientRect();
            const at=clipInfo(t,file).offset+
              (finger.clientX-rect.left+grip)/pixelsPerSecond;
            clearRange();onSeek(precise(clamp(at,0,maxEnd)));
          }
          drag.current=null;setPreview(null);
        }else stop(-1,true);
      },
      onTouchCancel:()=>{
        if(rangeHold.current?.timer)clearTimeout(rangeHold.current.timer);
        rangeHold.current=null;setRangePreview(null);stop(-1,false);
      },
      onContextMenu:(e:React.MouseEvent<HTMLDivElement>)=>{
        e.preventDefault();
      },
      onKeyDown:(e:React.KeyboardEvent<HTMLDivElement>)=>{
        if(!editable||!['ArrowLeft','ArrowRight'].includes(e.key))return;
        e.preventDefault();e.stopPropagation();
        const step=e.shiftKey?.01:.1;
        const dir=e.key==='ArrowRight'?1:-1;
        const info=clipInfo(t,file);
        if(mode==='move')onChangeTrack?.(t.id,{offsetSeconds:snap(
          Math.max(0,info.offset+dir*step))});
        if(mode==='start'){
          const delta=clamp(dir*step,-info.offset,Math.max(0,info.end-info.start-.025));
          onChangeTrack?.(t.id,{offsetSeconds:precise(info.offset+delta),
            trimStartSeconds:precise(info.start+delta)});
        }
        if(mode==='end')onChangeTrack?.(t.id,{trimEndSeconds:precise(
          clamp(info.end+dir*step,Math.min(info.total,info.start+.025),info.total))});
      },
      style:{...common,cursor:mode==='move'?'grab':'ew-resize',
        touchAction:'none',userSelect:'none',WebkitTouchCallout:'none',
        zIndex:mode==='move'?1:2,
        borderLeft:mode==='start'?'2px solid '+PINK:undefined,
        borderRight:mode==='end'?'2px solid '+PINK:undefined,
        borderRadius:5,
        backgroundColor:mode==='move'?'transparent':'rgba(203,36,92,.08)'}
    },mode==='move'?null:React.createElement('span',{style:{position:'absolute',
      top:22,left:mode==='start'?5:7,width:4,height:12,borderRadius:3,
      backgroundColor:PINK,pointerEvents:'none'}}));
    return <View key={t.id+mode} {...{
        onStartShouldSetResponder:()=>editable,
        onMoveShouldSetResponder:()=>editable,
        onResponderGrant:(e:any)=>{
          const x=e.nativeEvent.pageX;
          begin(x,mode,t,file,0);
          if(mode==='move'&&onMarkTrackRange){
            const info=clipInfo(t,file);
            const at=clamp(info.start+(e.nativeEvent.locationX||0)/pixelsPerSecond,
              info.start,info.end);
            const hold={pointerId:0,id:t.id,start:at,end:at,
              pressedX:x,active:false,
              timer:null as ReturnType<typeof setTimeout>|null};
            rangeHold.current=hold;
            hold.timer=setTimeout(()=>{
              if(rangeHold.current!==hold)return;
              hold.active=true;drag.current=null;setPreview(null);
              setRangePreview({id:t.id,start:at,end:at});
            },350);
          }
        },
        onResponderMove:(e:any)=>{
          const hold=rangeHold.current;
          if(hold){
            if(hold.active){
              const info=clipInfo(t,file);
              hold.end=clamp(hold.start+(e.nativeEvent.pageX-hold.pressedX)/pixelsPerSecond,
                info.start,info.end);
              setRangePreview({id:t.id,start:Math.min(hold.start,hold.end),
                end:Math.max(hold.start,hold.end)});
              return;
            }
            if(Math.abs(e.nativeEvent.pageX-hold.pressedX)>5){
              if(hold.timer)clearTimeout(hold.timer);
              rangeHold.current=null;
            }
          }
          move(e.nativeEvent.pageX,0);
        },
        onResponderRelease:()=>{
          const hold=rangeHold.current;
          if(hold?.timer)clearTimeout(hold.timer);
          rangeHold.current=null;
          if(hold?.active){
            const a=Math.min(hold.start,hold.end),b=Math.max(hold.start,hold.end);
            rememberRange(t.id,a,b);
            setRangePreview(null);
          }else stop(0,true);
        },
        onResponderTerminate:()=>{
          if(rangeHold.current?.timer)clearTimeout(rangeHold.current.timer);
          rangeHold.current=null;setRangePreview(null);stop(0,false);
        }
      }} style={{...common,backgroundColor:mode==='move'?'transparent':'rgba(203,36,92,.12)'}}>
      {mode!=='move'?<View style={{width:4,height:12,marginLeft:8,marginTop:19,
        borderRadius:3,backgroundColor:PINK}}/>:null}
    </View>;
  };
  return <View onLayout={e=>{
    const measured=Math.round(e.nativeEvent.layout.width);
    if(measured>0)setPanelWidth(old=>old===measured?old:measured);
  }} style={{gap:10}}>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
      <View style={{gap:3}}>
        <Text style={{fontSize:13,fontWeight:'700',color:theme.foreground}}>
          Pistes · {rows}
        </Text>
        <Text style={{fontSize:11,color:theme.muted}}>
          Départ : {musicStampMs(position)}
        </Text>
      </View>
      <View style={{flexDirection:'row',alignItems:'center',gap:9}}>
        <Pressable accessibilityLabel="Réduire le zoom" onPress={()=>setZoom(Math.max(1,zoom/2))}>
          <Ionicons name="remove-circle-outline" size={21} color={theme.muted}/>
        </Pressable>
        <Text style={{fontSize:11,color:theme.muted}}>×{zoom}</Text>
        <Pressable accessibilityLabel="Agrandir le zoom" onPress={()=>setZoom(Math.min(16,zoom*2))}>
          <Ionicons name="add-circle-outline" size={21} color={PINK}/>
        </Pressable>
      </View>
    </View>
    {emojiOpen&&version.tracks.some(t=>t.id===emojiOpen)?<View style={{
      borderRadius:12,borderWidth:1,borderColor:theme.border,
      backgroundColor:theme.surface,padding:10,gap:9}}>
      <View style={{flexDirection:'row',justifyContent:'space-between',
        alignItems:'center'}}>
        <Text style={{fontSize:12,fontWeight:'600',color:theme.foreground}}>
          Emoji · {version.tracks.find(t=>t.id===emojiOpen)?.title}
        </Text>
        <Pressable onPress={()=>setEmojiOpen(null)}
          accessibilityLabel="Fermer les emojis" style={{padding:6}}>
          <Ionicons name="close-outline" size={18} color={theme.muted}/>
        </Pressable>
      </View>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:5}}>
        <Pressable accessibilityRole="button" accessibilityLabel="Sans emoji"
          onPress={()=>{onEmojiTrack?.(emojiOpen,'');setEmojiOpen(null);}}
          style={{minWidth:56,height:42,paddingHorizontal:6,
            justifyContent:'center',alignItems:'center',borderRadius:9}}>
          <Text style={{fontSize:11,color:theme.muted}}>Aucun</Text>
        </Pressable>
        {TRACK_EMOJIS.map(emoji=><Pressable key={emoji}
          accessibilityRole="button" accessibilityLabel={'Choisir '+emoji}
          onPress={()=>{
            onEmojiTrack?.(emojiOpen,emoji);
            setEmojiOpen(null);
          }} style={{width:42,height:42,justifyContent:'center',
            alignItems:'center',borderRadius:9,
            backgroundColor:version.tracks.find(t=>t.id===emojiOpen)?.emoji===emoji?
              theme.border:'transparent'}}>
          <Text style={{fontSize:23}}>{emoji}</Text>
        </Pressable>)}
      </View>
    </View>:null}
    <View ref={timelineRef} style={{flexDirection:'row',borderRadius:12,borderWidth:1,
      borderColor:theme.border,overflow:'hidden',
      backgroundColor:theme.dark?'#242227':'#F9F8F6'}}>
      <View style={{width:labelWidth,backgroundColor:theme.surface,
        borderRightWidth:1,borderColor:theme.border}}>
        <View style={{height:rulerHeight,justifyContent:'center',paddingHorizontal:9}}>
          <Text style={{fontSize:10,color:theme.muted}}>PISTE</Text>
        </View>
        {version.tracks.map((t,i)=>{
          const file=files.find(f=>f.id===t.sourceFileId);
          return <View key={t.id} style={{height:rowHeight,
            borderTopWidth:1,borderColor:theme.border,
            paddingHorizontal:compact?7:10,justifyContent:'center',gap:5}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:3}}>
              <Pressable accessibilityRole="button" accessibilityLabel={'Emoji de '+t.title}
                accessibilityHint="Choisir une icône pour cette piste"
                onPress={()=>setEmojiOpen(emojiOpen===t.id?null:t.id)}
                style={{paddingVertical:5,paddingHorizontal:3,minWidth:28,
                  alignItems:'center',justifyContent:'center'}}>
                {t.emoji?<Text style={{fontSize:18}}>{t.emoji}</Text>:
                  <Ionicons name="musical-notes-outline" size={17} color={theme.muted}/>}
              </Pressable>
              {renaming===t.id?<TextInput autoFocus selectTextOnFocus
                value={draftName} onChangeText={setDraftName}
                onSubmitEditing={()=>commitName(t.id)}
                onBlur={()=>commitName(t.id)}
                accessibilityLabel={'Nom de la piste '+t.title}
                style={{flex:1,minWidth:0,fontSize:12,color:theme.foreground,
                  borderBottomWidth:1,borderColor:PINK,paddingVertical:3}}/>:
                <Pressable onPress={()=>{
                  renamingRef.current=t.id;
                  setDraftName(t.title);
                  setRenaming(t.id);
                }} accessibilityRole="button"
                  accessibilityLabel={'Toucher pour renommer '+t.title}
                  style={{flex:1,minWidth:0,paddingVertical:5}}>
                  <Text numberOfLines={1} style={{fontSize:compact?11:12,
                    fontWeight:'700',color:theme.foreground}}>{t.title}</Text>
                </Pressable>}
            </View>
            <View style={{flexDirection:'row',gap:compact?3:8,alignItems:'center'}}>
              <Pressable onPress={()=>onToggleMute?.(t.id)} accessibilityRole="button"
                accessibilityLabel={'Muet '+t.title}
                style={{padding:5,borderRadius:6,
                  backgroundColor:t.muted?theme.border:'transparent'}}>
                <Ionicons name={t.muted?'volume-mute-outline':'volume-medium-outline'}
                  color={t.muted?PINK:theme.muted} size={17}/>
              </Pressable>
              <Pressable onPress={()=>onToggleSolo?.(t.id)} accessibilityRole="button"
                accessibilityLabel={'Solo '+t.title}
                style={{padding:5,borderRadius:6,
                  backgroundColor:t.solo?theme.border:'transparent'}}>
                <Ionicons name="headset-outline" color={t.solo?PINK:theme.muted} size={17}/>
              </Pressable>
              <Pressable accessibilityRole="button"
                accessibilityLabel={'Retirer '+t.title+' de la version'}
                onPress={()=>setConfirmRemove(t.id)} style={{padding:5}}>
                <Ionicons name="trash-outline" color={theme.muted} size={16}/>
              </Pressable>
              {!musicSourceDuration(file)?<Ionicons name="alert-circle-outline"
                color={theme.muted} size={15}/>:null}
            </View>
          </View>;
        })}
      </View>
      <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator
        onScroll={e=>{scrollX.current=e.nativeEvent.contentOffset.x;}}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled" style={{flex:1,
          backgroundColor:dragOver?'rgba(203,36,92,.10)':'transparent'}}
        contentContainerStyle={{width:contentWidth}}>
        <View style={{width:contentWidth,height:rulerHeight+rowHeight*rows}}>
          <Pressable accessibilityRole="adjustable" accessibilityLabel="Position dans la chanson"
            onPress={e=>{clearRange();onSeek(precise(
              clamp(e.nativeEvent.locationX/pixelsPerSecond,0,maxEnd)));}}
            style={{height:rulerHeight,width:contentWidth}}>
            <View style={{position:'absolute',top:15,left:0,width:contentWidth,
              backgroundColor:theme.border,height:1}}/>
            {Array.from({length:Math.ceil(maxEnd/tick)+1},(_,i)=>{
              const seconds=i*tick;
              if(seconds>maxEnd)return null;
              return <View key={i} pointerEvents="none" style={{position:'absolute',
                left:seconds*pixelsPerSecond+2,top:5,gap:3}}>
                <View style={{width:1,height:8,backgroundColor:theme.muted}}/>
                <Text style={{fontSize:10,color:theme.muted}}>
                  {musicStamp(seconds).slice(0,5)}
                </Text>
              </View>;
            })}
          </Pressable>
          {Array.from({length:Math.min(1000,Math.ceil(maxEnd/beatSeconds)+1)},(_,i)=>i)
            .map(i=><View key={'beat-'+i} pointerEvents="none"
              style={{position:'absolute',left:i*beatSeconds*pixelsPerSecond,
                top:rulerHeight,height:rowHeight*rows,width:i%4===0?1.5:1,
                backgroundColor:theme.muted,opacity:i%4===0?0.24:0.10}}/>)}
          {version.tracks.map(t=>{
            const source=files.find(f=>f.id===t.sourceFileId);
            const info=clipInfo(t,source);
            const live=preview?.id===t.id?preview.value:null;
            const offset=live?.offsetSeconds??info.offset;
            const from=live?.trimStartSeconds??info.start;
            const end=live?.trimEndSeconds??info.end;
            const left=offset*pixelsPerSecond;
            const width=Math.max(0,(end-from)*pixelsPerSecond);
            const visibleWidth=Math.max(36,width);
            const dragging=preview?.id===t.id;
            const activeRange=rangePreview?.id===t.id?rangePreview:
              heldRange?.id===t.id?heldRange:null;
            return <View key={t.id} style={{height:rowHeight,
              borderTopWidth:1,borderColor:theme.border,
              justifyContent:'center'}}>
              <Pressable onPress={e=>{
                clearRange();onSeek(precise(clamp(
                  e.nativeEvent.locationX/pixelsPerSecond,0,maxEnd)));
              }}
                style={{position:'absolute',left:0,right:0,top:0,bottom:0}}/>
              {info.total>0&&end>from?<View style={{position:'absolute',
                left,top:12,height:53,width:visibleWidth,
                borderRadius:8,borderWidth:1,borderColor:t.muted?theme.border:PINK,
                backgroundColor:theme.dark?'#44303B':'#F5E8EC',
                opacity:t.muted?.48:1,overflow:'hidden'}}>
                {dragging?<View pointerEvents="none" style={{
                  position:'absolute',top:0,left:Math.min(18,visibleWidth/4),
                  backgroundColor:theme.dark?'#251921':'#FFFFFF',zIndex:6,
                  borderRadius:5,paddingHorizontal:5,paddingVertical:2}}>
                  <Text style={{fontSize:10,fontWeight:'700',color:PINK}}>
                    {musicStampMs(offset)}
                  </Text>
                </View>:null}
                {activeRange?<View pointerEvents="none"
                  style={{position:'absolute',
                    left:Math.max(0,(Math.min(activeRange.start,activeRange.end)-from)*pixelsPerSecond),
                    top:0,height:51,
                    width:Math.max(1,(Math.abs(activeRange.end-activeRange.start))*pixelsPerSecond),
                    backgroundColor:'rgba(203,36,92,.18)',
                    borderLeftWidth:2,borderRightWidth:2,borderColor:PINK,zIndex:3}}/>:null}
                {(t.markers||[]).map(m=>{
                  const a=Math.max(from,m.startSeconds),b=Math.min(end,m.endSeconds??m.startSeconds);
                  if(a>end||b<from)return null;
                  return <View key={m.id} pointerEvents="none" style={{
                    position:'absolute',left:Math.max(0,(a-from)*pixelsPerSecond),
                    top:1,height:6,width:Math.max(2,(b-a)*pixelsPerSecond),
                    backgroundColor:PINK,opacity:.85,borderRadius:3}}/>;
                })}
                <View pointerEvents="none" style={{position:'absolute',
                  top:3,left:3,right:3,bottom:3,justifyContent:'center'}}>
                  {source?.musicEvents?.length?
                    <Text style={{fontSize:12,fontWeight:'700',color:PINK}}>
                      ♫ MIDI · {source.musicEvents.length} notes
                    </Text>:
                    <MusicAudioPeaks file={source} muted={t.muted} height={34}
                      trimStartSeconds={from} trimEndSeconds={end}
                      barCount={Math.max(16,Math.min(400,Math.round(visibleWidth/3)))}/>} 
                </View>
                {gesture('move',t,source,left,visibleWidth)}
                {gesture('start',t,source,left,visibleWidth)}
                {gesture('end',t,source,left,visibleWidth)}
              </View>:<Pressable onPress={()=>onSelectTrack?.(t.id)}
                accessibilityRole="button"
                style={{marginLeft:6,marginRight:6,minHeight:49,
                  justifyContent:'center',paddingHorizontal:10,borderWidth:1,
                  borderStyle:'dashed',borderRadius:8,borderColor:theme.border}}>
                <Text style={{fontSize:11,color:theme.muted}}>
                  Durée indisponible · ouvrir les réglages de la piste
                </Text>
              </Pressable>}
            </View>;
          })}
          <View pointerEvents="none" style={{position:'absolute',top:rulerHeight-2,
            left:clamp(position*pixelsPerSecond,0,contentWidth),
            height:rowHeight*rows+2,width:2,backgroundColor:PINK}}/>
          {Platform.OS==='web'?React.createElement('div',{
            role:'slider',tabIndex:0,
            'aria-label':'Position de lecture, glisser pour définir le départ',
            'aria-valuemin':0,'aria-valuemax':Math.ceil(maxEnd*1000),
            'aria-valuenow':Math.round(position*1000),
            'aria-valuetext':musicStampMs(position),
            title:'Glisser pour choisir le point de départ',
            onPointerDown:(e:React.PointerEvent<HTMLDivElement>)=>{
              e.preventDefault();e.stopPropagation();
              scrubRef.current={pointerId:e.pointerId};
              setScrubbing(true);
              try{e.currentTarget.setPointerCapture(e.pointerId);}catch{}
            },
            onPointerMove:(e:React.PointerEvent<HTMLDivElement>)=>{
              if(scrubRef.current?.pointerId!==e.pointerId)return;
              e.preventDefault();e.stopPropagation();
              const el=scrollRef.current as HTMLElement|null;
              if(el?.getBoundingClientRect)seekAtClient(e.clientX,el);
            },
            onPointerUp:(e:React.PointerEvent<HTMLDivElement>)=>{
              if(scrubRef.current?.pointerId!==e.pointerId)return;
              e.preventDefault();e.stopPropagation();
              const el=scrollRef.current as HTMLElement|null;
              if(el?.getBoundingClientRect)seekAtClient(e.clientX,el);
              try{e.currentTarget.releasePointerCapture(e.pointerId);}catch{}
              scrubRef.current=null;setScrubbing(false);
            },
            onPointerCancel:()=>{scrubRef.current=null;setScrubbing(false);},
            onKeyDown:(e:React.KeyboardEvent<HTMLDivElement>)=>{
              if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;
              e.preventDefault();e.stopPropagation();
              const delta=e.shiftKey?1:.1;
              onSeek(precise(clamp(position+(e.key==='ArrowRight'?delta:-delta),0,maxEnd)));
            },
            style:{
              position:'absolute',top:0,zIndex:12,
              left:clamp(position*pixelsPerSecond-16,0,Math.max(0,contentWidth-32)),
              width:32,height:rulerHeight,cursor:'ew-resize',
              display:'flex',justifyContent:'center',alignItems:'flex-start',
              paddingTop:2,touchAction:'none',userSelect:'none',
            }
          },React.createElement('div',{style:{
            width:scrubbing?18:16,height:scrubbing?22:20,
            backgroundColor:PINK,borderRadius:'5px 5px 8px 8px',
            border:'2px solid #fff',boxShadow:'0 1px 4px rgba(0,0,0,.2)',
            marginLeft:8,pointerEvents:'none'
          }})):
          <View {...{
            onStartShouldSetResponder:()=>true,
            onMoveShouldSetResponder:()=>true,
            onResponderGrant:(e:any)=>{
              nativeScrub.current={pageX:e.nativeEvent.pageX,seconds:position};
              setScrubbing(true);
            },
            onResponderMove:(e:any)=>{
              const starting=nativeScrub.current;
              if(!starting)return;
              onSeek(precise(clamp(starting.seconds+
                (e.nativeEvent.pageX-starting.pageX)/pixelsPerSecond,0,maxEnd)));
            },
            onResponderRelease:()=>{nativeScrub.current=null;setScrubbing(false);},
            onResponderTerminate:()=>{nativeScrub.current=null;setScrubbing(false);},
          }} style={{position:'absolute',top:0,zIndex:12,
            left:clamp(position*pixelsPerSecond-16,0,Math.max(0,contentWidth-32)),
            width:32,height:rulerHeight,alignItems:'center',paddingTop:4}}>
            <View style={{width:16,height:21,borderRadius:5,backgroundColor:PINK}}/>
          </View>}
        </View>
      </ScrollView>
    </View>
    {confirmRemove?<View style={{borderWidth:1,borderColor:theme.border,
      borderRadius:10,padding:11,gap:10}}>
      <Text style={{fontSize:12,color:theme.foreground}}>
        Retirer « {version.tracks.find(t=>t.id===confirmRemove)?.title} » de cette version ?
        L’enregistrement reste disponible dans Capturer.
      </Text>
      <View style={{flexDirection:'row',gap:14}}>
        <Pressable accessibilityRole="button" onPress={()=>{
          onRemoveTrack?.(confirmRemove);setConfirmRemove(null);
        }} style={{padding:8}}>
          <Text style={{fontSize:12,color:PINK,fontWeight:'700'}}>Retirer</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={()=>setConfirmRemove(null)}
          style={{padding:8}}>
          <Text style={{fontSize:12,color:theme.muted}}>Annuler</Text>
        </Pressable>
      </View>
    </View>:null}
    <Text style={{fontSize:11,lineHeight:18,color:theme.muted}}>
      Toucher la règle : choisir le départ · Glisser la tête de lecture : avancer ou reculer
    </Text>
  </View>;
}
