import React,{useRef,useState} from 'react';
import {Pressable,ScrollView,Text,View,useWindowDimensions} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {MusicAudioPeaks} from './MusicAudioPeaksNext';
import {musicStamp} from '@/domain/musicEditing';
import type {WorkingMusicTrack,WorkingMusicVersion} from '@/domain/musicNext';
import type {MusicProjectFile} from '@/domain/musicWorkspace';

const PINK='#CB245C';
type Change=Partial<Pick<WorkingMusicTrack,'offsetSeconds'|'trimStartSeconds'|'trimEndSeconds'>>;
type DragMode='move'|'start'|'end';
type Snapshot={id:string;mode:DragMode;x:number;
  offset:number;start:number;end:number;length:number};
type Preview=Change & {id:string};
type Props={
  version:WorkingMusicVersion;files:MusicProjectFile[];
  duration:number;position:number;
  onSeek:(position:number)=>void;onChangeTrack?:(id:string,patch:Change)=>void;
};
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const round=(v:number)=>Math.round(v*100)/100;
function clipInfo(track:WorkingMusicTrack,file?:MusicProjectFile){
  const total=Math.max(0,file?.durationSeconds||0);
  const start=clamp(track.trimStartSeconds||0,0,total);
  const end=clamp(track.trimEndSeconds??total,start,total);
  return {total,start,end,left:Math.max(0,track.offsetSeconds)};
}

/** Song-time ruler: all tracks align to the same real playback cursor.
 * Trim/move edits only update metadata. The source audio is never rewritten.
 */
export function MusicArrangementTimeline({version,files,duration,position,onSeek,onChangeTrack}:Props){
  const theme=useAppTheme();
  const {width}=useWindowDimensions();
  const compact=width<630;
  const viewport=Math.min(730,Math.max(260,width-(compact?60:130)));
  const maxEnd=Math.max(duration,10,...version.tracks.map(track=>{
    const info=clipInfo(track,files.find(f=>f.id===track.sourceFileId));
    return info.left+Math.max(0,info.end-info.start);
  }));
  const [zoom,setZoom]=useState(1);
  const [preview,setPreview]=useState<Preview|null>(null);
  const drag=useRef<Snapshot|null>(null);
  const contentWidth=Math.max(viewport,Math.round(viewport*zoom));
  const pixelsPerSecond=contentWidth/maxEnd;
  const guideCount=Math.max(1,Math.ceil(maxEnd/(zoom>=8?5:zoom>=3?10:30)));
  const unit=zoom>=8?5:zoom>=3?10:30;
  const marker=clamp(position/maxEnd*contentWidth,0,contentWidth);
  const startDrag=(mode:DragMode,t:WorkingMusicTrack,file?:MusicProjectFile,x=0)=>{
    const info=clipInfo(t,file);
    drag.current={id:t.id,mode,x,offset:info.left,start:info.start,end:info.end,length:info.total};
  };
  const moveDrag=(x:number)=>{
    const d=drag.current;
    if(!d||!onChangeTrack)return;
    const delta=round((x-d.x)/pixelsPerSecond);
    if(d.mode==='move'){
      setPreview({id:d.id,offsetSeconds:round(Math.max(0,d.offset+delta))});
    }else if(d.mode==='start'){
      const target=clamp(d.start+delta,Math.max(0,d.start-d.offset),Math.max(d.start,d.end-.02));
      setPreview({id:d.id,trimStartSeconds:round(target),
        offsetSeconds:round(d.offset+(target-d.start))});
    }else{
      setPreview({id:d.id,trimEndSeconds:round(clamp(d.end+delta,
        Math.min(d.length,d.start+.02),d.length))});
    }
  };
  const finishDrag=()=>{
    const value=preview,d=drag.current;
    if(d&&value&&d.id===value.id&&onChangeTrack){
      const {id,...patch}=value;
      onChangeTrack(id,patch);
    }
    drag.current=null;setPreview(null);
  };
  const grip=(mode:DragMode,track:WorkingMusicTrack,file?:MusicProjectFile)=><View
    onStartShouldSetResponder={()=>!!onChangeTrack}
    onMoveShouldSetResponder={()=>!!onChangeTrack}
    onResponderGrant={e=>startDrag(mode,track,file,e.nativeEvent.pageX)}
    onResponderMove={e=>moveDrag(e.nativeEvent.pageX)}
    onResponderRelease={finishDrag}
    onResponderTerminate={()=>{drag.current=null;setPreview(null);}}
    accessibilityLabel={mode==='move'?'Déplacer cette piste':
      mode==='start'?'Raccourcir le début':'Raccourcir la fin'}
    style={{width:25,height:52,justifyContent:'center',alignItems:'center',
      borderColor:theme.dark?'#B55E79':'#D87B9A',
      borderWidth:1,borderRadius:7,backgroundColor:theme.dark?'#4B2735':'#F9E8EE'}}>
    <Ionicons name={mode==='move'?'move-outline':'reorder-two-outline'}
      size={16} color={PINK}/>
  </View>;
  return <View style={{gap:10}}>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12}}>
      <View style={{gap:3}}>
        <Text style={{fontSize:13,fontWeight:'700',color:theme.foreground}}>
          Chronologie des pistes
        </Text>
        <Text style={{fontSize:11,color:theme.muted}}>
          Curseur {musicStamp(position)} · {musicStamp(maxEnd)}
        </Text>
      </View>
      <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
        <Pressable onPress={()=>setZoom(Math.max(1,zoom/2))}
          accessibilityLabel="Réduire la chronologie">
          <Ionicons name="remove-circle-outline" color={theme.muted} size={22}/>
        </Pressable>
        <Text style={{fontSize:11,color:theme.muted}}>×{zoom}</Text>
        <Pressable onPress={()=>setZoom(Math.min(16,zoom*2))}
          accessibilityLabel="Agrandir la chronologie">
          <Ionicons name="add-circle-outline" color={PINK} size={22}/>
        </Pressable>
      </View>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator
      style={{borderRadius:13,borderWidth:1,borderColor:theme.border,
        backgroundColor:theme.dark?'#242227':'#FDF8F7'}}
      contentContainerStyle={{width:contentWidth}}>
      <View style={{width:contentWidth,minHeight:70+version.tracks.length*66}}>
        <View style={{height:38}}>
          <Pressable onPress={e=>onSeek(round(clamp(e.nativeEvent.locationX/pixelsPerSecond,0,maxEnd)))}
            accessibilityRole="adjustable" accessibilityLabel="Déplacer le curseur dans le morceau"
            style={{height:38,width:contentWidth}}>
            <View style={{position:'absolute',top:12,left:0,right:0,height:1,
              backgroundColor:theme.border}}/>
            {Array.from({length:guideCount+1},(_,i)=>{
              const t=i*unit;if(t>maxEnd)return null;
              const x=t*pixelsPerSecond;
              return <View key={i} pointerEvents="none"
                style={{position:'absolute',left:x+1,top:4,gap:1}}>
                <View style={{height:8,width:1,backgroundColor:theme.muted}}/>
                <Text style={{fontSize:10,color:theme.muted}}>{musicStamp(t).slice(0,5)}</Text>
              </View>;
            })}
          </Pressable>
        </View>
        {version.tracks.map(track=>{
          const source=files.find(x=>x.id===track.sourceFileId);
          const info=clipInfo(track,source);
          const change=preview?.id===track.id?preview:null;
          const offset=change?.offsetSeconds??info.left;
          const from=change?.trimStartSeconds??info.start;
          const end=change?.trimEndSeconds??info.end;
          const left=offset*pixelsPerSecond;
          const w=Math.max(0,(end-from)*pixelsPerSecond);
          return <View key={track.id} style={{height:66,borderTopWidth:1,
            borderColor:theme.border,justifyContent:'center'}}>
            <Pressable onPress={e=>onSeek(round(clamp(e.nativeEvent.locationX/pixelsPerSecond,0,maxEnd)))}
              style={{position:'absolute',left:0,right:0,top:0,bottom:0}}/>
            {w>0?<View style={{position:'absolute',left,top:7,height:52,
              width:Math.max(w,3),borderRadius:9,borderWidth:1,
              borderColor:track.muted?theme.border:PINK,
              backgroundColor:theme.dark?'#382C36':'#F8E7ED',
              overflow:'hidden',opacity:track.muted?.55:1}}>
              <View style={{position:'absolute',left:0,right:0,top:1,bottom:1,
                justifyContent:'center'}}>
                <MusicAudioPeaks file={source} muted={track.muted} height={38}
                  trimStartSeconds={from} trimEndSeconds={end}
                  barCount={Math.min(360,Math.max(12,Math.round(w/3)))}/>
              </View>
              {w>90?<Text numberOfLines={1} pointerEvents="none"
                style={{position:'absolute',top:2,left:29,right:30,fontSize:10,
                  fontWeight:'700',color:theme.foreground}}>{track.title}</Text>:null}
              <View style={{position:'absolute',left:0,top:0,bottom:0}}>{grip('start',track,source)}</View>
              {w>75?<View style={{position:'absolute',left:Math.max(26,w/2-13),top:0}}>
                {grip('move',track,source)}</View>:null}
              <View style={{position:'absolute',right:0,top:0,bottom:0}}>
                {grip('end',track,source)}</View>
            </View>:null}
          </View>;
        })}
        <View pointerEvents="none" style={{position:'absolute',left:marker,top:0,
          height:38+version.tracks.length*66,width:2,backgroundColor:PINK}}>
          <View style={{position:'absolute',top:0,left:-4,width:10,height:10,
            borderRadius:6,backgroundColor:PINK}}/>
        </View>
      </View>
    </ScrollView>
    <Text style={{fontSize:11,color:theme.muted,lineHeight:18}}>
      Touche la règle pour placer le curseur. Glisse les poignées aux extrémités
      pour couper le début ou la fin ; déplace celle du milieu pour décaler une piste.
    </Text>
  </View>;
}
