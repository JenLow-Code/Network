import React,{useRef,useState} from 'react';
import {Platform,Pressable,ScrollView,Text,View,useWindowDimensions} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {MusicAudioPeaks} from './MusicAudioPeaksNext';
import {musicStamp} from '@/domain/musicEditing';
import type {WorkingMusicTrack,WorkingMusicVersion} from '@/domain/musicNext';
import type {MusicProjectFile} from '@/domain/musicWorkspace';

const PINK='#CB245C';
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
};
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const precise=(x:number)=>Math.round(x*100)/100;
const clipInfo=(track:WorkingMusicTrack,file?:MusicProjectFile)=>{
  const total=Math.max(0,file?.durationSeconds||0);
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
  onChangeTrack,onSelectTrack,onToggleMute,onToggleSolo}:Props){
  const theme=useAppTheme();
  const {width}=useWindowDimensions();
  const compact=width<650;
  const [panelWidth,setPanelWidth]=useState(0);
  const [zoom,setZoom]=useState(1);
  const [preview,setPreview]=useState<{id:string;value:Timing}|null>(null);
  const drag=useRef<Snapshot|null>(null);
  const labelWidth=compact?116:177;
  const viewport=Math.max(150,(panelWidth||Math.min(860,width-36))-labelWidth);
  const maxEnd=Math.max(duration,10,...version.tracks.map(t=>{
    const info=clipInfo(t,files.find(f=>f.id===t.sourceFileId));
    return info.offset+info.end-info.start;
  }));
  const contentWidth=Math.round(viewport*zoom);
  const pixelsPerSecond=contentWidth/maxEnd;
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
    if(d.mode==='move')next={offsetSeconds:precise(Math.max(0,d.offset+delta))};
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
    const common={position:'absolute' as const,
      left:mode==='start'?0:mode==='end'?Math.max(0,w-23):23,
      top:0,bottom:0,width:mode==='move'?Math.max(0,w-46):23};
    const editable=!!onChangeTrack;
    if(Platform.OS==='web')return React.createElement('div',{
      key:t.id+mode,role:'button',tabIndex:0,
      'aria-label':mode==='move'?'Déplacer '+t.title:
        mode==='start'?'Couper le début de '+t.title:'Couper la fin de '+t.title,
      title:mode==='move'?'Glisser pour décaler la piste':
        mode==='start'?'Glisser pour ajuster le début':'Glisser pour ajuster la fin',
      onPointerDown:(e:React.PointerEvent<HTMLDivElement>)=>{
        if(!editable)return;
        e.preventDefault();e.stopPropagation();
        try{e.currentTarget.setPointerCapture(e.pointerId);}catch{}
        begin(e.clientX,mode,t,file,e.pointerId);
      },
      onPointerMove:(e:React.PointerEvent<HTMLDivElement>)=>{
        if(!drag.current)return;
        e.preventDefault();e.stopPropagation();move(e.clientX,e.pointerId);
      },
      onPointerUp:(e:React.PointerEvent<HTMLDivElement>)=>{
        e.preventDefault();e.stopPropagation();
        try{e.currentTarget.releasePointerCapture(e.pointerId);}catch{}
        stop(e.pointerId,true);
      },
      onPointerCancel:(e:React.PointerEvent<HTMLDivElement>)=>stop(e.pointerId,false),
      onKeyDown:(e:React.KeyboardEvent<HTMLDivElement>)=>{
        if(!editable||!['ArrowLeft','ArrowRight'].includes(e.key))return;
        e.preventDefault();e.stopPropagation();
        const step=e.shiftKey?.01:.1;
        const dir=e.key==='ArrowRight'?1:-1;
        const info=clipInfo(t,file);
        if(mode==='move')onChangeTrack?.(t.id,{offsetSeconds:precise(
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
        touchAction:'none',userSelect:'none',zIndex:mode==='move'?1:2,
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
        onResponderGrant:(e:any)=>begin(e.nativeEvent.pageX,mode,t,file,0),
        onResponderMove:(e:any)=>move(e.nativeEvent.pageX,0),
        onResponderRelease:()=>stop(0,true),
        onResponderTerminate:()=>stop(0,false)
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
          Curseur {musicStamp(position)}
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
    <View style={{flexDirection:'row',borderRadius:12,borderWidth:1,
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
            <Pressable onPress={()=>onSelectTrack?.(t.id)}
              accessibilityRole="button" accessibilityLabel={'Ouvrir les réglages de '+t.title}
              style={{flexDirection:'row',gap:4,alignItems:'center'}}>
              <Text numberOfLines={1} style={{flex:1,fontSize:compact?11:12,
                fontWeight:'700',color:theme.foreground}}>{i+1}. {t.title}</Text>
              <Ionicons name="options-outline" color={theme.muted} size={14}/>
            </Pressable>
            <View style={{flexDirection:'row',gap:8,alignItems:'center'}}>
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
              {!file?.durationSeconds?<Ionicons name="alert-circle-outline"
                color={theme.muted} size={15}/>:null}
            </View>
          </View>;
        })}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator
        keyboardShouldPersistTaps="handled" style={{flex:1}}
        contentContainerStyle={{width:contentWidth}}>
        <View style={{width:contentWidth,height:rulerHeight+rowHeight*rows}}>
          <Pressable accessibilityRole="adjustable" accessibilityLabel="Position dans la chanson"
            onPress={e=>onSeek(precise(clamp(e.nativeEvent.locationX/pixelsPerSecond,0,maxEnd)))}
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
            return <View key={t.id} style={{height:rowHeight,
              borderTopWidth:1,borderColor:theme.border,
              justifyContent:'center'}}>
              <Pressable onPress={e=>onSeek(precise(clamp(
                e.nativeEvent.locationX/pixelsPerSecond,0,maxEnd)))}
                style={{position:'absolute',left:0,right:0,top:0,bottom:0}}/>
              {info.total>0&&end>from?<View style={{position:'absolute',
                left,top:12,height:53,width:visibleWidth,
                borderRadius:8,borderWidth:1,borderColor:t.muted?theme.border:PINK,
                backgroundColor:theme.dark?'#44303B':'#F5E8EC',
                opacity:t.muted?.48:1,overflow:'hidden'}}>
                <View pointerEvents="none" style={{position:'absolute',
                  top:3,left:3,right:3,bottom:3,justifyContent:'center'}}>
                  <MusicAudioPeaks file={source} muted={t.muted} height={34}
                    trimStartSeconds={from} trimEndSeconds={end}
                    barCount={Math.max(16,Math.min(400,Math.round(visibleWidth/3)))}/>
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
          <View pointerEvents="none" style={{position:'absolute',top:0,
            left:clamp(position*pixelsPerSecond,0,contentWidth),height:rulerHeight+rowHeight*rows,
            width:2,backgroundColor:PINK}}>
            <View style={{position:'absolute',top:0,left:-4,width:10,height:10,
              backgroundColor:PINK,borderRadius:5}}/>
          </View>
        </View>
      </ScrollView>
    </View>
    <Text style={{fontSize:11,lineHeight:18,color:theme.muted}}>
      Chaque piste a sa propre ligne. Déplace son bloc pour la décaler ;
      glisse les bords pour couper le début ou la fin.
    </Text>
  </View>;
}
