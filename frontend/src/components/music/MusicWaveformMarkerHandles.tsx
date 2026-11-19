import React,{useRef,useState} from 'react';
import {Platform,Pressable,Text,View} from 'react-native';
import type {MusicAudioMarker} from '@/domain/musicWorkspace';
import {musicStampMs} from '@/domain/musicEditing';

const PINK='#CB245C';
type Mode='start'|'end'|'move';
type Drag={pointerId:number;id:string;mode:Mode;clientX:number;
  original:MusicAudioMarker;current:MusicAudioMarker};
type Props={markers:MusicAudioMarker[];width:number;duration:number;
  selectedId:string|null;onSelect:(id:string)=>void;
  onChange?:(markers:MusicAudioMarker[])=>void};
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
const precise=(v:number)=>Math.round(v*1000)/1000;

/** Real draggable overlay over the waveform's marker lane.
 * Pointer capture keeps handles active across the entire drag on desktop
 * and mobile browsers. Preview is local; data changes only on release.
 */
export function MusicWaveformMarkerHandles({markers,width,duration,selectedId,onSelect,onChange}:Props){
  const drag=useRef<Drag|null>(null);
  const [preview,setPreview]=useState<MusicAudioMarker|null>(null);
  const secondsPerPx=duration/Math.max(width,1);
  const begin=(event:React.PointerEvent<HTMLElement>,m:MusicAudioMarker,mode:Mode)=>{
    event.stopPropagation();
    event.preventDefault();
    if(!onChange){onSelect(m.id);return;}
    try{event.currentTarget.setPointerCapture(event.pointerId);}catch{}
    drag.current={pointerId:event.pointerId,id:m.id,mode,
      clientX:event.clientX,original:m,current:m};
    onSelect(m.id);
  };
  const move=(event:React.PointerEvent<HTMLElement>)=>{
    const d=drag.current;
    if(!d||d.pointerId!==event.pointerId)return;
    event.preventDefault();event.stopPropagation();
    const delta=(event.clientX-d.clientX)*secondsPerPx;
    const m=d.original;
    let next:MusicAudioMarker=m;
    if(d.mode==='end'&&m.endSeconds===undefined){
      // Pull an existing point marker outward: it grows into an interval.
      // A tap or tiny finger movement leaves it a point.
      if(Math.abs(delta)<Math.max(.075,secondsPerPx*5))next=m;
      else next=delta>=0?
        {...m,endSeconds:precise(clamp(m.startSeconds+delta,
          m.startSeconds+.001,duration))}:
        {...m,startSeconds:precise(clamp(m.startSeconds+delta,0,m.startSeconds)),
          endSeconds:m.startSeconds};
    }else if(d.mode==='move'){
      const last=m.endSeconds??m.startSeconds;
      const shift=clamp(delta,-m.startSeconds,duration-last);
      next={...m,startSeconds:precise(m.startSeconds+shift),
        ...(m.endSeconds!==undefined?{endSeconds:precise(m.endSeconds+shift)}:{})};
    }else if(d.mode==='start'){
      const limit=m.endSeconds!==undefined?Math.max(0,m.endSeconds-.001):duration;
      next={...m,startSeconds:precise(clamp(m.startSeconds+delta,0,limit))};
    }else if(m.endSeconds!==undefined){
      next={...m,endSeconds:precise(clamp(m.endSeconds+delta,
        Math.min(duration,m.startSeconds+.001),duration))};
    }
    d.current=next;
    setPreview(next);
  };
  const stop=(event:React.PointerEvent<HTMLElement>,commit:boolean)=>{
    const d=drag.current;
    if(!d||d.pointerId!==event.pointerId)return;
    event.preventDefault();event.stopPropagation();
    try{event.currentTarget.releasePointerCapture(event.pointerId);}catch{}
    drag.current=null;
    setPreview(null);
    if(commit&&onChange&&
      (d.current.startSeconds!==d.original.startSeconds||
       d.current.endSeconds!==d.original.endSeconds)){
      onChange(markers.map(m=>m.id===d.id?d.current:m)
        .sort((a,b)=>a.startSeconds-b.startSeconds));
    }
  };
  // RN native has no DOM pointer capture. Provide a usable marker selection
  // target; precise dragging remains a web-only interaction for now.
  return <View pointerEvents="box-none" style={{position:'absolute',
    top:0,left:0,width,height:48,zIndex:5}}>
    {markers.map(m=>{
      const rendered=preview?.id===m.id?preview:m;
      const beginX=clamp(rendered.startSeconds/Math.max(duration,.001)*width,0,width);
      const lastX=rendered.endSeconds===undefined?beginX:
        clamp(rendered.endSeconds/Math.max(duration,.001)*width,beginX,width);
      const active=selectedId===m.id;
      const handle=(at:number,mode:Mode,label:string)=>{
        const style:React.CSSProperties={position:'absolute',left:clamp(at-13,0,Math.max(0,width-26)),top:2,
          width:26,height:36,display:'flex',alignItems:'flex-start',
          paddingTop:10,justifyContent:'center',cursor:'ew-resize',
          touchAction:'none',userSelect:'none',pointerEvents:'auto',
          zIndex:mode==='start'?3:2};
        const point=React.createElement('span',{style:{
          height:active?12:10,width:active?12:10,borderRadius:8,
          backgroundColor:PINK,border:'2px solid #FFF',
          boxShadow:active?'0 0 0 1px '+PINK:undefined,
          pointerEvents:'none'
        }});
        if(Platform.OS==='web')return React.createElement('div',{
          key:m.id+'-'+mode,role:'button','aria-label':label,tabIndex:0,
          title:label,onPointerDown:(e:React.PointerEvent<HTMLElement>)=>begin(e,m,mode),
          onPointerMove:move,onPointerUp:e=>stop(e,true),
          onPointerCancel:e=>stop(e,false),
          onClick:(e:React.MouseEvent)=>{e.stopPropagation();onSelect(m.id);},
          onKeyDown:(e:React.KeyboardEvent)=>{
            if(!onChange||!['ArrowLeft','ArrowRight'].includes(e.key))return;
            e.preventDefault();e.stopPropagation();
            const dir=e.key==='ArrowRight'?1:-1;
            const step=e.shiftKey?.001:.01;
            const change:MusicAudioMarker=mode==='move'?
              (()=>{
                const last=m.endSeconds??m.startSeconds;
                const shift=clamp(dir*step,-m.startSeconds,duration-last);
                return {...m,startSeconds:precise(m.startSeconds+shift),
                  ...(m.endSeconds!==undefined?{endSeconds:precise(m.endSeconds+shift)}:{})};
              })():
              mode==='end'&&m.endSeconds!==undefined?
              {...m,endSeconds:precise(clamp(m.endSeconds+dir*step,
                m.startSeconds+.001,duration))}:
              {...m,startSeconds:precise(clamp(m.startSeconds+dir*step,
                0,m.endSeconds===undefined?duration:m.endSeconds-.001))};
            onChange(markers.map(x=>x.id===m.id?change:x));onSelect(m.id);
          },style
        },point);
        return <Pressable key={m.id+'-'+mode}
          accessibilityRole="button" accessibilityLabel={label}
          onPress={()=>onSelect(m.id)} style={{position:'absolute',
            left:clamp(at-13,0,Math.max(0,width-26)),top:2,
            width:26,height:36,alignItems:'center',paddingTop:10}}>
          <View style={{height:11,width:11,borderRadius:6,backgroundColor:PINK}}/>
        </Pressable>;
      };
      return <React.Fragment key={m.id}>
        {lastX>beginX+12&&Platform.OS==='web'?
          React.createElement('div',{role:'button',tabIndex:0,
            'aria-label':'Déplacer le repère '+m.note,
            title:'Glisser pour déplacer le repère',
            onPointerDown:(e:React.PointerEvent<HTMLElement>)=>begin(e,m,'move'),
            onPointerMove:move,onPointerUp:e=>stop(e,true),
            onPointerCancel:e=>stop(e,false),
            onClick:(e:React.MouseEvent)=>{e.stopPropagation();onSelect(m.id);},
            style:{position:'absolute',left:beginX+8,top:12,width:Math.max(1,lastX-beginX-16),
              height:21,backgroundColor:active?'rgba(203,36,92,.15)':'rgba(203,36,92,.09)',
              borderRadius:5,cursor:'grab',touchAction:'none',userSelect:'none',
              pointerEvents:'auto',zIndex:1}}
          ):null}
        {handle(beginX,m.endSeconds===undefined?'end':'start',
          m.endSeconds===undefined?
            'Tirer pour transformer le repère en intervalle : '+m.note:
            'Déplacer le début du repère '+m.note+
            ' ('+musicStampMs(rendered.startSeconds)+')')}
        {rendered.endSeconds!==undefined?
          handle(lastX,'end','Déplacer la fin du repère '+m.note+
            ' ('+musicStampMs(rendered.endSeconds)+')'):null}
      </React.Fragment>;
    })}
  </View>;
}
