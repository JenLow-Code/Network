import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Pressable,ScrollView,Text,View,useWindowDimensions} from 'react-native';
import Svg,{Rect,Line,Circle} from 'react-native-svg';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {musicStamp} from '@/domain/musicEditing';
import type {MusicAudioMarker} from '@/domain/musicWorkspace';

const pink='#CB245C';
type Props={file:File;duration:number;cursor:number;onSeek:(seconds:number)=>void;
  zoom:number;onZoom:(zoom:number)=>void;playing:boolean;onTogglePlayback:()=>void;
  markers?:MusicAudioMarker[]};
const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
export function MusicWaveformEditor({file,duration,cursor,onSeek,zoom,onZoom,
  playing,onTogglePlayback,markers=[]}:Props){
  const theme=useAppTheme();
  const {width}=useWindowDimensions();
  const viewport=Math.min(650,Math.max(260,width-82));
  const px=Math.max(viewport,Math.round(viewport*zoom));
  const [data,setData]=useState<Float32Array|null>(null);
  const [decoding,setDecoding]=useState(false);
  const pane=useRef<View|null>(null);
  const scroll=useRef<ScrollView|null>(null);
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
    const next=clamp(zoomRef.current*factor,1,64);
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
      if(e.touches.length!==2){pinching.current=null;return;}
      pinching.current={distance:distance(e.touches[0],e.touches[1]),scale:zoomRef.current};
    };
    const touchMove=(e:TouchEvent)=>{
      const g=pinching.current;
      if(!g||e.touches.length!==2)return;
      e.preventDefault();suppressClick.current=true;
      const rect=element.getBoundingClientRect();
      const mid=(e.touches[0].clientX+e.touches[1].clientX)/2;
      const factor=distance(e.touches[0],e.touches[1])/Math.max(1,g.distance);
      const next=clamp(g.scale*factor,1,64);
      const offset=clamp(mid-rect.left,0,viewport);
      pendingAnchor.current={
        timeRatio:(scrollX.current+offset)/Math.max(1,pxRef.current),
        clientOffset:offset
      };
      onZoom(Math.round(next*100)/100);
    };
    const touchEnd=()=>{pinching.current=null;};
    element.addEventListener('wheel',wheel,{passive:false});
    element.addEventListener('touchstart',touchStart,{passive:true});
    element.addEventListener('touchmove',touchMove,{passive:false});
    element.addEventListener('touchend',touchEnd);
    element.addEventListener('touchcancel',touchEnd);
    return ()=>{
      element.removeEventListener('wheel',wheel);
      element.removeEventListener('touchstart',touchStart);
      element.removeEventListener('touchmove',touchMove);
      element.removeEventListener('touchend',touchEnd);
      element.removeEventListener('touchcancel',touchEnd);
    };
  },[onZoom,viewport]);
  const seek=(x:number)=>{
    if(suppressClick.current){suppressClick.current=false;return;}
    onSeek(clamp(Math.round(x/Math.max(px,1)*duration*100)/100,0,duration));
  };
  const cursorX=clamp(cursor/Math.max(.001,duration)*px,0,px);
  const interval=zoom>=10?1:zoom>=4?5:zoom>=2?10:30;
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
            {musicStamp(cursor)} / {musicStamp(duration)}
          </Text>
          <Text style={{fontSize:11,color:theme.muted}}>Clique sur la forme d’onde pour te placer.</Text>
        </View>
      </View>
      <Text style={{fontSize:11,color:theme.muted}}>×{Math.round(zoom*10)/10}</Text>
    </View>
    <View ref={pane} style={{maxWidth:'100%',borderRadius:12,
      borderWidth:1,borderColor:theme.border,
      backgroundColor:theme.dark?'#252329':'#F8F7F5',overflow:'hidden'}}>
      <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator
        onScroll={e=>{scrollX.current=e.nativeEvent.contentOffset.x;}}
        scrollEventThrottle={16} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="adjustable" accessibilityLabel="Chronologie de l’enregistrement"
          onPress={e=>seek(e.nativeEvent.locationX)}
          style={{width:px,height:112,justifyContent:'center'}}>
          <Svg width={px} height={112} viewBox={'0 0 '+px+' 112'}>
            <Line x1={0} y1={59} x2={px} y2={59}
              stroke={theme.border} strokeWidth={1}/>
            {markers.map(m=>{
              const x=clamp(m.startSeconds/Math.max(.001,duration)*px,0,px);
              const end=m.endSeconds===undefined?x:
                clamp(m.endSeconds/Math.max(.001,duration)*px,x,px);
              return <React.Fragment key={m.id}>
                {end>x?<Rect x={x} y={18} width={end-x} height={88}
                  fill={pink} opacity={.10}/>:null}
                <Line x1={x} y1={13} x2={x} y2={106}
                  stroke={pink} strokeWidth={1} strokeDasharray="4,3"/>
                <Circle cx={x} cy={12} r={3} fill={pink}/>
              </React.Fragment>;
            })}
            {bars.map((v,i)=>{
              const w=px/bars.length;
              return <Rect key={i} x={i*w+.5} y={59-v*31}
                width={Math.max(1,w-.8)} height={Math.max(2,v*62)}
                rx={1} fill={theme.foreground} opacity={.6}/>;
            })}
            {ticks.map(t=>{
              const x=t/Math.max(.001,duration)*px;
              return <React.Fragment key={t}>
                <Line x1={x} y1={0} x2={x} y2={8}
                  stroke={theme.muted} strokeWidth={1}/>
              </React.Fragment>;
            })}
            <Line x1={cursorX} y1={0} x2={cursorX} y2={112}
              stroke={pink} strokeWidth={2}/>
            <Circle cx={cursorX} cy={6} r={4} fill={pink}/>
          </Svg>
        </Pressable>
      </ScrollView>
    </View>
    <Text style={{fontSize:11,color:theme.muted,lineHeight:18}}>
      Molette ou pincement pour zoomer · glisser pour parcourir.
    </Text>
  </View>;
}
