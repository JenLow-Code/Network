import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Platform,Pressable,ScrollView,Text,View,useWindowDimensions} from 'react-native';
import Svg,{Rect,Line,Circle,Text as SvgText} from 'react-native-svg';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {musicStamp,musicStampMs} from '@/domain/musicEditing';
import {MusicWaveformMarkerHandles} from './MusicWaveformMarkerHandles';
import type {MusicAudioMarker} from '@/domain/musicWorkspace';

const pink='#CB245C';
type Props={file:File;duration:number;cursor:number;onSeek:(seconds:number)=>void;
  zoom:number;onZoom:(zoom:number)=>void;playing:boolean;onTogglePlayback:()=>void;
  markers?:MusicAudioMarker[];compact?:boolean;
  onChangeMarkers?:(markers:MusicAudioMarker[])=>void;
  onEditMarker?:(id:string)=>void;
  onCreateRange?:(startSeconds:number,endSeconds:number)=>void;
};
const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
export function MusicWaveformEditor({file,duration,cursor,onSeek,zoom,onZoom,
  playing,onTogglePlayback,markers=[],compact=false,onChangeMarkers,onEditMarker,onCreateRange}:Props){
  const theme=useAppTheme();
  const {width}=useWindowDimensions();
  // The ruler and waveform must fill the actual panel, not a hard-coded
  // viewport width. Measured layout also accounts for margins and modals.
  const [panelWidth,setPanelWidth]=useState(0);
  const viewport=panelWidth||Math.max(240,width-(compact?40:82));
  const px=Math.max(viewport,Math.round(viewport*zoom));
  const [data,setData]=useState<Float32Array|null>(null);
  const [decoding,setDecoding]=useState(false);
  const [selectedMarkerId,setSelectedMarkerId]=useState<string|null>(null);
  const [confirmDelete,setConfirmDelete]=useState(false);
  const [drawingRange,setDrawingRange]=useState<{start:number;end:number}|null>(null);
  const onSeekRef=useRef(onSeek);onSeekRef.current=onSeek;
  const onRangeRef=useRef(onCreateRange);onRangeRef.current=onCreateRange;
  const nativeRangeRef=useRef<{start:number;end:number;pageX:number}|null>(null);
  const drawingRef=useRef<{pointerId:number;startClientX:number;
    start:number;end:number;active:boolean;type:string;
    timer:ReturnType<typeof setTimeout>|null}|null>(null);
  const selectedMarker=markers.find(m=>m.id===selectedMarkerId);
  const selectMarker=(id:string)=>{setSelectedMarkerId(id);setConfirmDelete(false);};
  const pane=useRef<any>(null);
  const scroll=useRef<any>(null);
  const scrollX=useRef(0);
  const suppressClick=useRef(false);
  const pendingAnchor=useRef<{timeRatio:number;clientOffset:number}|null>(null);
  const pinching=useRef<{distance:number;scale:number}|null>(null);
  const zoomRef=useRef(zoom);zoomRef.current=zoom;
  const durationRef=useRef(duration);durationRef.current=duration;
  const pxRef=useRef(px);pxRef.current=px;
  useEffect(()=>{
    let live=true;
    setData(null);setDecoding(true);
    if(typeof AudioContext==='undefined')return;
    void (async()=>{
      const ctx=new AudioContext();
      try{
        const buffer=await ctx.decodeAudioData(await file.arrayBuffer());
        if(live)setData(buffer.getChannelData(0).slice());
      }finally{await ctx.close();}
    })().catch(()=>{}).finally(()=>{if(live)setDecoding(false);});
    return()=>{live=false;};
  },[file]);
  const bars=useMemo(()=>{
    if(!data?.length)return [] as number[];
    const count=Math.min(4500,Math.max(48,Math.round(px/3.1)));
    const stride=Math.max(1,Math.floor(data.length/(count*35)));
    return Array.from({length:count},(_,i)=>{
      const start=Math.floor(i*data.length/count);
      const end=Math.floor((i+1)*data.length/count);
      let peak=0;
      for(let n=start;n<end;n+=stride)peak=Math.max(peak,Math.abs(data[n]||0));
      return Math.max(.018,peak);
    });
  },[data,px]);
  const setScale=(factor:number,offset:number)=>{
    const next=clamp(zoomRef.current*factor,1,128);
    if(Math.abs(next-zoomRef.current)<.0001)return;
    const anchor=(scrollX.current+offset)/Math.max(1,pxRef.current);
    pendingAnchor.current={timeRatio:anchor,clientOffset:offset};
    onZoom(Math.round(next*100)/100);
  };
  useEffect(()=>{
    const anchor=pendingAnchor.current;
    if(!anchor)return;
    pendingAnchor.current=null;
    const next=clamp(anchor.timeRatio*px-anchor.clientOffset,0,Math.max(0,px-viewport));
    scroll.current?.scrollTo({x:next,animated:false});scrollX.current=next;
  },[px,viewport]);
  useEffect(()=>{
    if(!pane.current||typeof window==='undefined')return;
    const element=pane.current as unknown as HTMLElement;
    if(typeof element.addEventListener!=='function')return;
    const wheel=(e:WheelEvent)=>{
      if(e.shiftKey)return;
      if(!e.ctrlKey&&Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
      e.preventDefault();
      const rect=element.getBoundingClientRect();
      setScale(Math.exp(-e.deltaY*.0022),clamp(e.clientX-rect.left,0,viewport));
    };
    const distance=(a:Touch,b:Touch)=>Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
    const touchStart=(e:TouchEvent)=>{
      if(e.touches.length===2){
        const pending=drawingRef.current;
        if(pending?.timer)clearTimeout(pending.timer);
        drawingRef.current=null;setDrawingRange(null);
        pinching.current={distance:distance(e.touches[0],e.touches[1]),scale:zoomRef.current};
        return;
      }
      pinching.current=null;
      const touch=e.touches[0];
      if(!touch||!onRangeRef.current||
        !(e.target as HTMLElement)?.closest?.('svg'))return;
      const left=element.getBoundingClientRect().left;
      const start=clamp((touch.clientX-left+scrollX.current)/
        Math.max(pxRef.current,1)*durationRef.current,0,durationRef.current);
      if(drawingRef.current?.timer)clearTimeout(drawingRef.current.timer);
      const pending={pointerId:touch.identifier,startClientX:touch.clientX,
        start,startClientY:touch.clientY,end:start,active:false,type:'touch',
        timer:null as ReturnType<typeof setTimeout>|null};
      drawingRef.current=pending;
      pending.timer=setTimeout(()=>{
        if(drawingRef.current!==pending||pinching.current)return;
        pending.active=true;
        suppressClick.current=true;
        setDrawingRange({start:pending.start,end:pending.end});
      },330);
    };
    const touchMove=(e:TouchEvent)=>{
      const g=pinching.current;
      if(g&&e.touches.length===2){
        if(e.cancelable)e.preventDefault();
        suppressClick.current=true;
        const rect=element.getBoundingClientRect();
        const mid=(e.touches[0].clientX+e.touches[1].clientX)/2;
        const factor=distance(e.touches[0],e.touches[1])/Math.max(1,g.distance);
        const next=clamp(g.scale*factor,1,128);
        const offset=clamp(mid-rect.left,0,viewport);
        pendingAnchor.current={
          timeRatio:(scrollX.current+offset)/Math.max(1,pxRef.current),
          clientOffset:offset
        };
        onZoom(Math.round(next*100)/100);
        return;
      }
      const pending=drawingRef.current;
      if(!pending||pending.type!=='touch')return;
      const touch=Array.from(e.touches).find(t=>t.identifier===pending.pointerId);
      if(!touch)return;
      if(!pending.active){
        // Before the hold threshold, let people scroll the audio normally.
        if(Math.hypot(touch.clientX-pending.startClientX,
          touch.clientY-(pending as typeof pending & {startClientY:number}).startClientY)>12){
          if(pending.timer)clearTimeout(pending.timer);
          drawingRef.current=null;
        }
        return;
      }
      // Stop browser selection/scrolling once the hold has become a range gesture.
      if(e.cancelable)e.preventDefault();
      suppressClick.current=true;
      const left=element.getBoundingClientRect().left;
      pending.end=clamp((touch.clientX-left+scrollX.current)/
        Math.max(pxRef.current,1)*durationRef.current,0,durationRef.current);
      setDrawingRange({start:Math.min(pending.start,pending.end),
        end:Math.max(pending.start,pending.end)});
    };
    const touchEnd=(e:TouchEvent)=>{
      if(pinching.current){
        pinching.current=null;
        setTimeout(()=>{suppressClick.current=false;},180);
        return;
      }
      const pending=drawingRef.current;
      if(!pending||pending.type!=='touch')return;
      if(!Array.from(e.changedTouches).some(t=>t.identifier===pending.pointerId))return;
      if(pending.timer)clearTimeout(pending.timer);
      drawingRef.current=null;setDrawingRange(null);
      if(!pending.active)return; // A normal tap is handled by Pressable.
      if(e.cancelable)e.preventDefault();
      const a=Math.min(pending.start,pending.end),b=Math.max(pending.start,pending.end);
      if(b-a>=.025)onRangeRef.current?.(Math.round(a*1000)/1000,
        Math.round(b*1000)/1000);
      else onSeekRef.current(Math.round(pending.start*1000)/1000);
      setTimeout(()=>{suppressClick.current=false;},180);
    };
    const touchCancel=()=>{
      if(drawingRef.current?.timer)clearTimeout(drawingRef.current.timer);
      drawingRef.current=null;setDrawingRange(null);
      pinching.current=null;
      suppressClick.current=false;
    };
    // Tap seeks as usual; hold for 300ms on touch, or drag with mouse, to mark a range.
    const relative=(clientX:number)=>{
      const left=element.getBoundingClientRect().left;
      return clamp((clientX-left+scrollX.current)/Math.max(pxRef.current,1)*
        durationRef.current,0,durationRef.current);
    };
    const pointerDown=(e:PointerEvent)=>{
      if(e.pointerType==='touch'||!onRangeRef.current||
        e.button!==0||pinching.current)return;
      if(!(e.target as HTMLElement)?.closest?.('svg'))return;
      const point=relative(e.clientX);
      const pending={pointerId:e.pointerId,startClientX:e.clientX,
        start:point,end:point,active:false,type:e.pointerType,
        timer:null as ReturnType<typeof setTimeout>|null};
      if(drawingRef.current?.timer)clearTimeout(drawingRef.current.timer);
      drawingRef.current=pending;
      if(e.pointerType!=='mouse'){
        pending.timer=setTimeout(()=>{
          if(drawingRef.current!==pending||pinching.current)return;
          pending.active=true;
          try{element.setPointerCapture(e.pointerId);}catch{}
          setDrawingRange({start:point,end:point});
        },300);
      }
    };
    const pointerMove=(e:PointerEvent)=>{
      if(e.pointerType==='touch')return;
      const p=drawingRef.current;
      if(!p||p.pointerId!==e.pointerId||!onRangeRef.current)return;
      if(!p.active){
        if(p.type!=='mouse'){
          // Scrolling before a long press must not turn into an annotation.
          if(Math.abs(e.clientX-p.startClientX)>12){
            if(p.timer)clearTimeout(p.timer);
            drawingRef.current=null;
          }
          return;
        }
        if(Math.abs(e.clientX-p.startClientX)<7)return;
        p.active=true;
        try{element.setPointerCapture(e.pointerId);}catch{}
      }
      e.preventDefault();e.stopPropagation();
      p.end=relative(e.clientX);
      setDrawingRange({start:Math.min(p.start,p.end),end:Math.max(p.start,p.end)});
    };
    const pointerFinish=(e:PointerEvent,cancel=false)=>{
      const p=drawingRef.current;
      if(!p||p.pointerId!==e.pointerId)return;
      if(p.timer)clearTimeout(p.timer);
      if(p.active){
        suppressClick.current=true;
        const start=Math.min(p.start,p.end),end=Math.max(p.start,p.end);
        if(!cancel&&end-start>=.025){
          onRangeRef.current?.(Math.round(start*1000)/1000,Math.round(end*1000)/1000);
        }else if(!cancel)onSeekRef.current(Math.round(p.start*1000)/1000);
        setTimeout(()=>{suppressClick.current=false;},160);
      }
      try{element.releasePointerCapture(e.pointerId);}catch{}
      drawingRef.current=null;setDrawingRange(null);
    };
    const pointerUp=(e:PointerEvent)=>{if(e.pointerType!=='touch')pointerFinish(e);};
    const pointerCancel=(e:PointerEvent)=>{
      if(e.pointerType!=='touch')pointerFinish(e,true);
    };
    const dbl=(e:MouseEvent)=>{
      e.preventDefault();
      const rect=element.getBoundingClientRect();
      setScale(2,clamp(e.clientX-rect.left,0,viewport));
    };
    element.addEventListener('pointerdown',pointerDown);
    element.addEventListener('pointermove',pointerMove);
    element.addEventListener('pointerup',pointerUp);
    element.addEventListener('pointercancel',pointerCancel);
    element.addEventListener('wheel',wheel,{passive:false});
    element.addEventListener('dblclick',dbl);
    element.addEventListener('touchstart',touchStart,{passive:true});
    element.addEventListener('touchmove',touchMove,{passive:false});
    element.addEventListener('touchend',touchEnd);
    element.addEventListener('touchcancel',touchCancel);
    return ()=>{
      if(drawingRef.current?.timer)clearTimeout(drawingRef.current.timer);
      drawingRef.current=null;
      element.removeEventListener('pointerdown',pointerDown);
      element.removeEventListener('pointermove',pointerMove);
      element.removeEventListener('pointerup',pointerUp);
      element.removeEventListener('pointercancel',pointerCancel);
      element.removeEventListener('wheel',wheel);
      element.removeEventListener('dblclick',dbl);
      element.removeEventListener('touchstart',touchStart);
      element.removeEventListener('touchmove',touchMove);
      element.removeEventListener('touchend',touchEnd);
      element.removeEventListener('touchcancel',touchCancel);
    };
  },[onZoom,viewport]);
  const seek=(x:number)=>{
    if(suppressClick.current){suppressClick.current=false;return;}
    onSeek(clamp(Math.round(x/Math.max(px,1)*duration*1000)/1000,0,duration));
  };
  const cursorX=clamp(cursor/Math.max(.001,duration)*px,0,px);
  useEffect(()=>{
    if(!playing)return;
    const current=scrollX.current;
    if(cursorX>current+viewport*.88||cursorX<current+viewport*.08){
      const next=clamp(cursorX-viewport*.34,0,Math.max(0,px-viewport));
      scroll.current?.scrollTo({x:next,animated:false});scrollX.current=next;
    }
  },[cursorX,playing,px,viewport]);
  const interval=zoom>=30?.1:zoom>=10?1:zoom>=4?5:zoom>=2?10:30;
  const ticks=Array.from({length:Math.min(1200,Math.ceil(duration/interval)+1)},
    (_,i)=>i*interval).filter(t=>t<=duration);
  return <View style={{gap:7}}>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8}}>
      <View style={{flexDirection:'row',gap:10,alignItems:'center'}}>
        <Pressable onPress={onTogglePlayback} accessibilityRole="button"
          accessibilityLabel={playing?'Pause lecture':'Écouter le passage'}
          style={{width:40,height:40,borderRadius:20,backgroundColor:pink,
            justifyContent:'center',alignItems:'center'}}>
          <Ionicons name={playing?'pause':'play'} size={20} color="#fff"/>
        </Pressable>
        <View style={{gap:2}}>
          <Text style={{fontSize:12,fontWeight:'700',color:theme.foreground}}>
            {musicStampMs(cursor)} / {musicStampMs(duration)}
          </Text>
          {!compact?<Text style={{fontSize:11,color:theme.muted}}>Touche la forme d’onde pour te placer.</Text>:null}
        </View>
      </View>
      <Text style={{fontSize:11,color:theme.muted}}>×{Math.round(zoom*10)/10}</Text>
    </View>
    <View ref={pane} onLayout={e=>{
      const measured=Math.round(e.nativeEvent.layout.width);
      if(measured>0)setPanelWidth(old=>old===measured?old:measured);
    }} style={{width:'100%',borderRadius:12,
      borderWidth:1,borderColor:theme.border,
      backgroundColor:theme.dark?'#252329':'#F8F7F5',overflow:'hidden',
      ...({touchAction:'pan-x',userSelect:'none',WebkitTouchCallout:'none'} as any)}}>
      <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator
        onScroll={e=>{scrollX.current=e.nativeEvent.contentOffset.x;}}
        scrollEventThrottle={16} keyboardShouldPersistTaps="handled">
        <View style={{width:px,height:112,position:'relative'}}>
        <Pressable accessibilityRole="adjustable" accessibilityLabel="Chronologie de l’enregistrement"
          delayLongPress={320}
          onLongPress={e=>{
            if(Platform.OS==='web'||!onCreateRange)return;
            const start=clamp(e.nativeEvent.locationX/Math.max(px,1)*duration,0,duration);
            nativeRangeRef.current={start,end:start,pageX:e.nativeEvent.pageX};
            setDrawingRange({start,end:start});
          }}
          onTouchMove={e=>{
            if(Platform.OS==='web'||!nativeRangeRef.current)return;
            const range=nativeRangeRef.current;
            range.end=clamp(range.start+
              (e.nativeEvent.pageX-range.pageX)/Math.max(px,1)*duration,0,duration);
            setDrawingRange({start:Math.min(range.start,range.end),
              end:Math.max(range.start,range.end)});
          }}
          onTouchEnd={()=>{
            const range=nativeRangeRef.current;
            if(Platform.OS==='web'||!range)return;
            nativeRangeRef.current=null;setDrawingRange(null);
            suppressClick.current=true;
            const a=Math.min(range.start,range.end),b=Math.max(range.start,range.end);
            if(b-a>=.025)onCreateRange?.(Math.round(a*1000)/1000,Math.round(b*1000)/1000);
            else onSeek(Math.round(range.start*1000)/1000);
            setTimeout(()=>{suppressClick.current=false;},160);
          }}
          onPress={e=>{
            // SVG bars can be the native event target. Derive the absolute
            // position from the viewport plus its actual scroll offset.
            let x=e.nativeEvent.locationX;
            const el=pane.current as HTMLElement|null;
            if(Platform.OS==='web'&&el?.getBoundingClientRect&&
              Number.isFinite(e.nativeEvent.pageX)){
              const left=el.getBoundingClientRect().left;
              x=e.nativeEvent.pageX-(typeof window!=='undefined'?window.scrollX:0)-
                left+scrollX.current;
            }
            seek(x);
          }}
          style={{width:px,height:112,justifyContent:'center'}}>
          <Svg width={px} height={112} viewBox={'0 0 '+px+' 112'}>
            <Line x1={0} y1={59} x2={px} y2={59}
              stroke={theme.border} strokeWidth={1}/>
            {markers.map(m=>{
              const x=clamp(m.startSeconds/Math.max(.001,duration)*px,0,px);
              const end=m.endSeconds===undefined?x:
                clamp(m.endSeconds/Math.max(.001,duration)*px,x,px);
              return <React.Fragment key={m.id}>
                {end>x?<>
                  <Line x1={x} y1={23} x2={end} y2={23}
                    stroke={pink} strokeWidth={2} opacity={.85}/>
                  <Circle cx={end} cy={23} r={3} fill={pink}/>
                </>:null}
                <Line x1={x} y1={15} x2={x} y2={end>x?31:38}
                  stroke={pink} strokeWidth={1.5}/>
                <Circle cx={x} cy={13} r={3} fill={pink}/>
              </React.Fragment>;
            })}
            {drawingRange?<React.Fragment>
              <Rect x={Math.min(drawingRange.start,drawingRange.end)/
                Math.max(duration,.001)*px} y={29}
                width={Math.max(1,Math.abs(drawingRange.end-drawingRange.start)/
                  Math.max(duration,.001)*px)} height={77}
                fill={pink} opacity={.13}/>
              {[drawingRange.start,drawingRange.end].map((value,i)=>
                <Line key={i} x1={value/Math.max(duration,.001)*px}
                  x2={value/Math.max(duration,.001)*px}
                  y1={25} y2={108} stroke={pink} strokeWidth={2}/>)}
            </React.Fragment>:null}
            {bars.map((v,i)=>{
              const w=px/bars.length;
              return <Rect key={i} x={i*w+.5} y={59-v*31}
                width={Math.max(1,w-.8)} height={Math.max(2,v*62)}
                rx={1} fill={theme.foreground} opacity={.6}/>;
            })}
            {ticks.map(t=>{
              const x=t/Math.max(.001,duration)*px;
              return <React.Fragment key={t}>
                <Line x1={x} y1={0} x2={x} y2={9}
                  stroke={theme.muted} strokeWidth={1}/>
                <SvgText x={x+3} y={20} fontSize={10} fill={theme.muted}>
                  {zoom>=30?musicStampMs(t):zoom>=10?musicStamp(t):musicStamp(t).slice(0,5)}
                </SvgText>
              </React.Fragment>;
            })}
            <Line x1={cursorX} y1={0} x2={cursorX} y2={112}
              stroke={pink} strokeWidth={2}/>
            <Circle cx={cursorX} cy={6} r={4} fill={pink}/>
          </Svg>
        </Pressable>
        <MusicWaveformMarkerHandles markers={markers} width={px} duration={duration}
          selectedId={selectedMarkerId} onSelect={selectMarker}
          onChange={onChangeMarkers}/>
        </View>
      </ScrollView>
    </View>
    {selectedMarker?<View style={{backgroundColor:theme.surface,
      borderWidth:1,borderColor:theme.border,borderRadius:11,padding:11,gap:9}}>
      <View style={{flexDirection:'row',gap:10,alignItems:'flex-start'}}>
        <Ionicons name="bookmark-outline" size={17} color={pink}/>
        <View style={{flex:1,gap:5}}>
          <Text style={{fontSize:12,fontWeight:'600',color:theme.foreground}}>
            {selectedMarker.note}
          </Text>
          <Text style={{fontSize:11,color:theme.muted,fontVariant:['tabular-nums']}}>
            {musicStampMs(selectedMarker.startSeconds)}
            {selectedMarker.endSeconds!==undefined?
              ' – '+musicStampMs(selectedMarker.endSeconds):''}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer le repère"
          onPress={()=>{setSelectedMarkerId(null);setConfirmDelete(false);}}
          style={{padding:4}}>
          <Ionicons name="close-outline" color={theme.muted} size={19}/>
        </Pressable>
      </View>
      {onChangeMarkers?<View style={{flexDirection:'row',
        alignItems:'center',gap:12,flexWrap:'wrap'}}>
        {onEditMarker?<Pressable onPress={()=>onEditMarker(selectedMarker.id)}
          accessibilityRole="button" style={{paddingVertical:6}}>
          <Text style={{fontSize:12,fontWeight:'600',color:pink}}>Modifier la note</Text>
        </Pressable>:null}
        <Pressable onPress={()=>setConfirmDelete(true)}
          accessibilityRole="button" style={{paddingVertical:6}}>
          <Text style={{fontSize:12,color:theme.muted}}>Supprimer</Text>
        </Pressable>
        {confirmDelete?<View style={{flexDirection:'row',gap:12,
          alignItems:'center',flexWrap:'wrap'}}>
          <Text style={{fontSize:11,color:theme.foreground}}>Supprimer ce repère ?</Text>
          <Pressable onPress={()=>{
            onChangeMarkers(markers.filter(m=>m.id!==selectedMarker.id));
            setSelectedMarkerId(null);setConfirmDelete(false);
          }} accessibilityRole="button" style={{paddingVertical:6}}>
            <Text style={{fontSize:12,fontWeight:'700',color:pink}}>Confirmer</Text>
          </Pressable>
          <Pressable onPress={()=>setConfirmDelete(false)}
            accessibilityRole="button" style={{paddingVertical:6}}>
            <Text style={{fontSize:12,color:theme.muted}}>Annuler</Text>
          </Pressable>
        </View>:null}
      </View>:null}
      <Text style={{fontSize:11,color:theme.muted,lineHeight:17}}>
        Glisse les extrémités pour modifier l’intervalle ; glisse la ligne pour le déplacer.
      </Text>
    </View>:null}
    {!compact?<Text style={{fontSize:11,color:theme.muted,lineHeight:18}}>
      Toucher : placer le curseur · Maintenir et glisser : sélectionner un intervalle · Pincer : zoomer.
    </Text>:null}
  </View>;
}
