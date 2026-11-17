import React,{useRef,useState} from 'react';
import {Platform,Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {formatMusicDuration} from '@/domain/musicProjectSelectors';
import type {MusicProjectFile} from '@/domain/musicWorkspace';
const PINK='#CB245C';

type Props={files:MusicProjectFile[];onAdd:(file:MusicProjectFile,at?:number)=>void};

/**
 * Source library: original files stay in Capture; arranging a source creates
 * an independent clip reference. Desktop HTML drag/drop + touch long-press.
 * Tap "+" is the accessible fallback on any device.
 */
export function MusicSourceBank({files,onAdd}:Props){
  const theme=useAppTheme();
  const [open,setOpen]=useState(true);
  const [moving,setMoving]=useState<string|null>(null);
  const drag=useRef<{id:string;pointerId:number;active:boolean;
    startX:number;startY:number;timer:ReturnType<typeof setTimeout>|null}|null>(null);
  const end=(e:React.PointerEvent<HTMLElement>,file:MusicProjectFile)=>{
    const d=drag.current;
    if(!d||d.pointerId!==e.pointerId)return;
    if(d.timer)clearTimeout(d.timer);
    drag.current=null;
    setMoving(null);
    if(!d.active)return;
    const hovered=document.elementFromPoint(e.clientX,e.clientY);
    const area=hovered?.closest('[data-jenlow-music-dropzone]') as HTMLElement|null;
    if(area){
      const secondsPerPixel=Number(area.getAttribute('data-jenlow-seconds-per-pixel'))||0;
      const seconds=Math.max(0,(e.clientX-area.getBoundingClientRect().left+
        area.scrollLeft)*secondsPerPixel);
      onAdd(file,Math.round(seconds*100)/100);
    }
  };
  return <View style={{borderTopWidth:1,borderColor:theme.border,paddingTop:12,gap:10}}>
    <Pressable onPress={()=>setOpen(!open)} accessibilityRole="button"
      accessibilityState={{expanded:open}}
      style={{flexDirection:'row',alignItems:'center',gap:8,minHeight:42}}>
      <Ionicons name="albums-outline" color={PINK} size={18}/>
      <Text style={{fontSize:14,fontWeight:'700',color:theme.foreground,flex:1}}>
        Prises disponibles · {files.length}
      </Text>
      <Ionicons name={open?'chevron-up':'chevron-down'} color={theme.muted} size={17}/>
    </Pressable>
    {open?<View style={{gap:7}}>
      {!files.length?<Text style={{fontSize:12,color:theme.muted}}>
        Aucun enregistrement dans Capturer.
      </Text>:null}
      {files.map(file=>{
        const body=<View style={{flexDirection:'row',gap:10,alignItems:'center',
          minHeight:51,paddingHorizontal:10,paddingVertical:7,
          borderWidth:1,borderRadius:11,borderColor:theme.border,
          backgroundColor:moving===file.id?theme.border:theme.surface}}>
          <Ionicons name="reorder-three-outline" size={21} color={PINK}/>
          <View style={{flex:1,gap:4}}>
            <Text numberOfLines={1} style={{fontSize:13,fontWeight:'600',
              color:theme.foreground}}>{file.title}</Text>
            <Text style={{fontSize:10,color:theme.muted}}>
              {file.durationSeconds?formatMusicDuration(file.durationSeconds):
                'Durée inconnue'}
            </Text>
          </View>
          <Pressable onPress={()=>onAdd(file)} accessibilityRole="button"
            accessibilityLabel={'Ajouter '+file.title+' à la version'}
            style={{padding:9,flexDirection:'row',alignItems:'center',gap:4}}>
            <Ionicons name="add-circle-outline" size={20} color={PINK}/>
            <Text style={{fontSize:11,color:PINK,fontWeight:'700'}}>Ajouter</Text>
          </Pressable>
        </View>;
        if(Platform.OS!=='web')return <View key={file.id}>{body}</View>;
        return React.createElement('div',{
          key:file.id,draggable:true,
          'aria-label':'Glisser '+file.title+' sur la chronologie',
          onDragStart:(e:React.DragEvent<HTMLDivElement>)=>{
            e.dataTransfer.effectAllowed='copy';
            e.dataTransfer.setData('application/x-jenlow-music-file',file.id);
            e.dataTransfer.setData('text/plain',file.title);
          },
          onDragEnd:()=>setMoving(null),
          onPointerDown:(e:React.PointerEvent<HTMLDivElement>)=>{
            if(e.pointerType==='mouse'||(e.target as HTMLElement)?.closest?.('button'))return;
            const d={id:file.id,pointerId:e.pointerId,active:false,
              startX:e.clientX,startY:e.clientY,timer:null as ReturnType<typeof setTimeout>|null};
            drag.current=d;
            d.timer=setTimeout(()=>{
              if(drag.current!==d)return;
              d.active=true;setMoving(file.id);
              try{e.currentTarget.setPointerCapture(e.pointerId);}catch{}
            },320);
          },
          onPointerMove:(e:React.PointerEvent<HTMLDivElement>)=>{
            const d=drag.current;
            if(!d||d.pointerId!==e.pointerId)return;
            if(!d.active&&Math.hypot(e.clientX-d.startX,e.clientY-d.startY)>12){
              if(d.timer)clearTimeout(d.timer);
              drag.current=null;
            }
            if(d.active){e.preventDefault();}
          },
          onPointerUp:(e:React.PointerEvent<HTMLDivElement>)=>end(e,file),
          onPointerCancel:()=>{
            if(drag.current?.timer)clearTimeout(drag.current.timer);
            drag.current=null;setMoving(null);
          },
          style:{touchAction:'pan-y',userSelect:'none',cursor:'grab'}
        },body);
      })}
      <Text style={{fontSize:11,lineHeight:18,color:theme.muted}}>
        Glisse une prise sur la chronologie ou touche Ajouter.
        Les fichiers d’origine restent dans Capturer.
      </Text>
    </View>:null}
  </View>;
}
