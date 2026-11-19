import React,{useRef,useState} from 'react';
import {Platform,Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {formatMusicDuration} from '@/domain/musicProjectSelectors';
import {musicSourceDuration} from '@/domain/musicNext';
import type {MusicProjectFile} from '@/domain/musicWorkspace';

const ACCENT='#CB245C';
type Props={files:MusicProjectFile[];onAdd:(file:MusicProjectFile,at?:number)=>void};
type TouchDrag={id:string;pointerId:number;x:number;y:number;over:boolean};
const ZONE='[data-jenlow-music-dropzone]';

/** An accessible source shelf directly before the arrangement.
 * Desktop: native HTML5 drag/drop. Mobile web: drag from the dedicated grip.
 * Tapping "Ajouter" always works when dragging is unsuitable.
 */
export function MusicSourceBank({files,onAdd}:Props){
  const theme=useAppTheme();
  const [expanded,setExpanded]=useState(true);
  const [search,setSearch]=useState('');
  const [moving,setMoving]=useState<TouchDrag|null>(null);
  const drag=useRef<TouchDrag|null>(null);
  const pointerKind=useRef<'mouse'|'touch'|'pen'>('mouse');
  const pendingHold=useRef<{id:string;identifier:number;x:number;y:number;
    timer:ReturnType<typeof setTimeout>|null}|null>(null);
  const cancelHold=()=>{
    if(pendingHold.current?.timer)clearTimeout(pendingHold.current.timer);
    pendingHold.current=null;
  };
  const shown=files.filter(f=>f.title.toLowerCase().includes(search.trim().toLowerCase()));

  const locate=(clientX:number,clientY:number)=>{
    if(typeof document==='undefined')return null;
    const hovered=document.elementFromPoint(clientX,clientY);
    const immediate=hovered?.closest(ZONE) as HTMLElement|null;
    if(immediate)return immediate;
    // Touch pointer capture can affect event targeting in some browsers.
    return Array.from(document.querySelectorAll<HTMLElement>(ZONE))
      .find(element=>{
        const r=element.getBoundingClientRect();
        return clientX>=r.left&&clientX<=r.right&&
          clientY>=r.top&&clientY<=r.bottom;
      })||null;
  };
  const positionAt=(area:HTMLElement,clientX:number)=>{
    const rect=area.getBoundingClientRect();
    const secondsPerPx=Number(area.getAttribute('data-jenlow-seconds-per-pixel'));
    if(!Number.isFinite(secondsPerPx)||secondsPerPx<=0)return 0;
    return Math.round(Math.max(0,(clientX-rect.left+area.scrollLeft)
      *secondsPerPx)*100)/100;
  };
  const complete=(file:MusicProjectFile,clientX:number,clientY:number)=>{
    const zone=locate(clientX,clientY);
    drag.current=null;setMoving(null);
    if(zone)onAdd(file,positionAt(zone,clientX));
  };
  const finish=(event:React.PointerEvent<HTMLElement>,file:MusicProjectFile)=>{
    const current=drag.current;
    if(!current||current.pointerId!==event.pointerId)return;
    event.preventDefault();event.stopPropagation();
    try{event.currentTarget.releasePointerCapture(event.pointerId);}catch{}
    complete(file,event.clientX,event.clientY);
  };
  const grip=(file:MusicProjectFile)=>{
    if(Platform.OS!=='web')
      return <Ionicons name="reorder-three-outline" size={22} color={ACCENT}/>;
    return React.createElement('div',{
      role:'button',tabIndex:0,'aria-label':'Glisser '+file.title+' vers la chronologie',
      title:'Maintenir et glisser vers la chronologie',
      // The browser's native draggable interaction must never take over a finger.
      // Use TouchEvents for iOS Safari, which may cancel PointerEvents while scrolling.
      onTouchStart:(event:React.TouchEvent<HTMLDivElement>)=>{
        const t=event.touches[0];
        if(!t)return;
        pointerKind.current='touch';
        event.stopPropagation();
        const value={id:file.id,pointerId:t.identifier,x:t.clientX,y:t.clientY,over:false};
        drag.current=value;setMoving(value);
      },
      onTouchMove:(event:React.TouchEvent<HTMLDivElement>)=>{
        const t=event.touches[0],current=drag.current;
        if(!t||!current||current.id!==file.id)return;
        event.stopPropagation();
        const value={...current,x:t.clientX,y:t.clientY,
          over:!!locate(t.clientX,t.clientY)};
        drag.current=value;setMoving(value);
      },
      onTouchEnd:(event:React.TouchEvent<HTMLDivElement>)=>{
        if(drag.current?.id!==file.id)return;
        event.stopPropagation();
        const t=event.changedTouches[0];
        if(t)complete(file,t.clientX,t.clientY);
        else{drag.current=null;setMoving(null);}
      },
      onTouchCancel:()=>{drag.current=null;setMoving(null);},
      onContextMenu:(event:React.MouseEvent<HTMLDivElement>)=>event.preventDefault(),
      onPointerDown:(event:React.PointerEvent<HTMLDivElement>)=>{
        if(event.pointerType==='touch')return;
        pointerKind.current=event.pointerType as 'mouse'|'pen';
        // Desktop mouse uses native drag-and-drop; pen uses PointerEvents.
        if(event.pointerType==='mouse')return;
        event.preventDefault();event.stopPropagation();
        const value={id:file.id,pointerId:event.pointerId,x:event.clientX,y:event.clientY,
          over:false};
        drag.current=value;setMoving(value);
        try{event.currentTarget.setPointerCapture(event.pointerId);}catch{}
      },
      onPointerMove:(event:React.PointerEvent<HTMLDivElement>)=>{
        if(event.pointerType==='touch'||!drag.current||drag.current.pointerId!==event.pointerId)return;
        event.preventDefault();event.stopPropagation();
        const value={...drag.current,x:event.clientX,y:event.clientY,
          over:!!locate(event.clientX,event.clientY)};
        drag.current=value;setMoving(value);
      },
      onPointerUp:(event:React.PointerEvent<HTMLDivElement>)=>{
        if(event.pointerType!=='touch')finish(event,file);
      },
      onPointerCancel:()=>{
        drag.current=null;setMoving(null);
      },
      onKeyDown:(event:React.KeyboardEvent<HTMLDivElement>)=>{
        if(event.key!=='Enter'&&event.key!==' ')return;
        event.preventDefault();onAdd(file);
      },
      style:{width:29,height:40,display:'flex',alignItems:'center',
        justifyContent:'center',touchAction:'none',cursor:'grab',
        userSelect:'none',flexShrink:0}
    },React.createElement('span',{
      style:{fontSize:23,color:ACCENT,pointerEvents:'none',lineHeight:'22px'}
    },'⠿'));
  };

  return <View style={{gap:8}}>
    <Pressable onPress={()=>setExpanded(!expanded)}
      accessibilityRole="button" accessibilityState={{expanded}}
      style={{flexDirection:'row',alignItems:'center',gap:8,minHeight:39}}>
      <Ionicons name="albums-outline" size={18} color={ACCENT}/>
      <Text style={{flex:1,fontSize:13,fontWeight:'700',color:theme.foreground}}>
        À placer · {files.length}
      </Text>
      <Ionicons name={expanded?'chevron-up':'chevron-down'} size={17} color={theme.muted}/>
    </Pressable>
    {expanded?<>
      {files.length>4?<TextInput value={search} onChangeText={setSearch}
        placeholder="Chercher une prise…" placeholderTextColor={theme.muted}
        accessibilityLabel="Rechercher les enregistrements"
        style={{borderWidth:1,borderColor:theme.border,backgroundColor:theme.surface,
          borderRadius:10,paddingHorizontal:12,paddingVertical:9,
          color:theme.foreground,fontSize:12}}/>:null}
      {!shown.length?<Text style={{fontSize:12,color:theme.muted}}>
        {files.length?'Aucune prise correspondante.':'Aucun enregistrement disponible.'}
      </Text>:null}
      <ScrollView horizontal showsHorizontalScrollIndicator
        keyboardShouldPersistTaps="handled" style={{maxHeight:83}}>
        <View style={{flexDirection:'row',gap:8,paddingBottom:6}}>
          {shown.map(file=>{
            const content=<View style={{width:154,minHeight:68,borderRadius:11,
              borderWidth:1,borderColor:moving?.id===file.id?ACCENT:theme.border,
              paddingHorizontal:9,paddingVertical:7,backgroundColor:theme.surface,
              gap:5}}>
              <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                {grip(file)}
                <View style={{flex:1,gap:2}}>
                  <Text numberOfLines={1} style={{fontSize:12,fontWeight:'700',
                    color:theme.foreground}}>{file.title}</Text>
                  <Text style={{fontSize:10,color:theme.muted}}>
                    {file.musicEvents?.length?'MIDI · '+file.musicEvents.length+' notes':
                      musicSourceDuration(file)?
                        formatMusicDuration(musicSourceDuration(file)):
                        /\.midi?$/i.test(file.originalFilename||'')?
                          'MIDI importé':'Durée inconnue'}
                  </Text>
                </View>
              </View>
              <Pressable accessibilityRole="button"
                accessibilityLabel={'Ajouter '+file.title+' au curseur'}
                onPress={()=>onAdd(file)}
                style={{alignSelf:'flex-end',minHeight:27,flexDirection:'row',
                  alignItems:'center',gap:4,paddingHorizontal:6}}>
                <Ionicons name="add-outline" color={ACCENT} size={17}/>
                <Text style={{fontSize:10,fontWeight:'600',color:ACCENT}}>
                  Ajouter
                </Text>
              </Pressable>
            </View>;
            if(Platform.OS!=='web')return <View key={file.id}>{content}</View>;
            return React.createElement('div',{
              key:file.id,draggable:true,
              'aria-label':'Prise source : '+file.title,
              // On phones, long-pressing the card works as well as the grip.
              // Movement before the threshold is treated as normal scrolling.
              onTouchStart:(event:React.TouchEvent<HTMLDivElement>)=>{
                const finger=event.touches[0];
                if(!finger||(event.target as HTMLElement)?.closest?.('button'))return;
                pointerKind.current='touch';
                cancelHold();
                const pending={id:file.id,identifier:finger.identifier,
                  x:finger.clientX,y:finger.clientY,
                  timer:null as ReturnType<typeof setTimeout>|null};
                pendingHold.current=pending;
                pending.timer=setTimeout(()=>{
                  if(pendingHold.current!==pending)return;
                  const value={id:file.id,pointerId:finger.identifier,
                    x:pending.x,y:pending.y,over:false};
                  drag.current=value;setMoving(value);
                },350);
              },
              onTouchMove:(event:React.TouchEvent<HTMLDivElement>)=>{
                const finger=event.touches[0],pending=pendingHold.current;
                if(!finger)return;
                if(pending?.id===file.id&&
                  Math.hypot(finger.clientX-pending.x,finger.clientY-pending.y)>12){
                  cancelHold();
                }
                if(drag.current?.id!==file.id)return;
                const value={...drag.current,x:finger.clientX,y:finger.clientY,
                  over:!!locate(finger.clientX,finger.clientY)};
                drag.current=value;setMoving(value);
              },
              onTouchEnd:(event:React.TouchEvent<HTMLDivElement>)=>{
                cancelHold();
                if(drag.current?.id!==file.id)return;
                const finger=event.changedTouches[0];
                if(finger)complete(file,finger.clientX,finger.clientY);
                else{drag.current=null;setMoving(null);}
              },
              onTouchCancel:()=>{
                cancelHold();drag.current=null;setMoving(null);
              },
              onContextMenu:(event:React.MouseEvent<HTMLDivElement>)=>{
                event.preventDefault();
              },
              onDragStart:(event:React.DragEvent<HTMLDivElement>)=>{
                if(pointerKind.current==='touch'){
                  event.preventDefault();return;
                }
                event.dataTransfer.effectAllowed='copy';
                event.dataTransfer.setData('application/x-jenlow-music-file',file.id);
                event.dataTransfer.setData('text/plain',file.title);
                setMoving({id:file.id,pointerId:-1,x:0,y:0,over:false});
              },
              onDragEnd:()=>{cancelHold();drag.current=null;setMoving(null);},
              style:{cursor:'grab',userSelect:'none',touchAction:'pan-y',WebkitTouchCallout:'none'}
            },content);
          })}
        </View>
      </ScrollView>
      {moving?.pointerId!==-1&&moving&&Platform.OS==='web'?
        React.createElement('div',{style:{
          position:'fixed',top:moving.y-27,left:moving.x+15,zIndex:9999,
          padding:'8px 12px',borderRadius:9,
          backgroundColor:theme.surface,color:theme.foreground,
          border:'1px solid '+(moving.over?ACCENT:theme.border),
          pointerEvents:'none',fontSize:12,fontWeight:600,
          boxShadow:'0 3px 14px rgba(0,0,0,.14)'
        }},(moving.over?'✓ ':'↗ ')+files.find(f=>f.id===moving.id)?.title):null}
    </>:null}
  </View>;
}
