import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Platform,Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {getDraftAudio} from '@/domain/musicLocalStorage';
import {punchInAudio} from '@/domain/musicEditing';
import {MusicWaveformEditor} from './MusicWaveformEditor';
import {MusicAudioCapture} from './MusicAudioCapture';
import {MusicAudioMarkers} from './MusicAudioMarkers';
import {MusicAudioPeaks} from './MusicAudioPeaksNext';
import {useAppTheme} from '@/theme/AppTheme';
import type {MusicProjectFile,MusicAudioMarker,MusicSection} from '@/domain/musicWorkspace';

const PINK='#CB245C';
type Props={
  file:MusicProjectFile;
  compact?:boolean;
  editable?:boolean;
  onOpen?:()=>void;
  onUpdate?:(change:Partial<MusicProjectFile>)=>void;
  sourceFiles?:MusicProjectFile[];sections?:MusicSection[];
};
/**
 * One source recording, one waveform. The same seek and zoom interaction is used
 * in the Capture list, the saved-audio detail, and its non-destructive editor.
 * Never renders a second playback/progress bar.
 */
export function MusicAudioTake({file,compact=false,editable=false,onUpdate,onOpen,
  sourceFiles=[],sections=[]}:Props){
  const theme=useAppTheme();
  const [blob,setBlob]=useState<File|null>(null);
  const [url,setUrl]=useState('');
  const [error,setError]=useState('');
  const [cursor,setCursor]=useState(0);
  const [measuredDuration,setMeasuredDuration]=useState<number|undefined>();
  const [zoom,setZoom]=useState(1);
  const [playing,setPlaying]=useState(false);
  const [editing,setEditing]=useState(false);
  const [draftActive,setDraftActive]=useState(false);
  const [confirmExit,setConfirmExit]=useState(false);
  const [editMarkerRequest,setEditMarkerRequest]=useState<{id:string;nonce:number}|null>(null);
  const [selectedRange,setSelectedRange]=useState<{start:number;end:number}|null>(null);
  const audio=useRef<HTMLAudioElement|null>(null);
  useEffect(()=>{
    let live=true;
    setBlob(null);setMeasuredDuration(undefined);setError('');setCursor(0);setPlaying(false);
    if(Platform.OS!=='web'||!file.localFileId)return;
    void getDraftAudio(file.localFileId).then(async b=>{
      if(!b)throw Error('Enregistrement introuvable sur cet appareil.');
      const original=new File([b],file.originalFilename||'enregistrement.webm',
        {type:b.type||file.mimeType||'audio/webm'});
      // Older WebM recordings may lack a seekable duration index. Make a
      // temporary WAV for the editor without changing the saved original.
      const normalised=/\.wav$/i.test(original.name)?null:
        await punchInAudio(null,original,0);
      if(live){
        setBlob(normalised?.file||original);
        if(normalised)setMeasuredDuration(normalised.durationSeconds);
      }
    }).catch(e=>{if(live)setError(e instanceof Error?e.message:'Enregistrement indisponible.');});
    return()=>{live=false;audio.current?.pause();};
  },[file.localFileId,file.originalFilename,file.mimeType]);
  useEffect(()=>{
    if(!blob||typeof URL==='undefined')return;
    const obj=URL.createObjectURL(blob);
    setUrl(obj);
    return()=>URL.revokeObjectURL(obj);
  },[blob]);
  const duration=measuredDuration||file.durationSeconds||0;
  const seek=(seconds:number)=>{
    const at=Math.min(Math.max(0,seconds),duration);
    setCursor(at);
    if(audio.current)audio.current.currentTime=at;
  };
  const toggle=()=>{
    const player=audio.current;
    if(!player)return;
    if(!player.paused){player.pause();setPlaying(false);return;}
    if(player.currentTime>=duration-.002)player.currentTime=0;
    void player.play().then(()=>setPlaying(true))
      .catch(()=>setError('Lecture indisponible dans ce navigateur.'));
  };
  const saveEdited=(id:string,filename:string,seconds?:number,
    _offset?:number,markers?:MusicAudioMarker[],title?:string)=>{
    onUpdate?.({
      localFileId:id,originalFilename:filename,durationSeconds:seconds,
      mimeType:/\.wav$/i.test(filename)?'audio/wav':/\.m4a$/i.test(filename)?'audio/mp4':
        /\.ogg$/i.test(filename)?'audio/ogg':'audio/webm',
      markers:markers||[],title:title?.trim()||file.title,
    });
    setEditing(false);setDraftActive(false);setConfirmExit(false);
  };
  if(Platform.OS!=='web')
    return <Text style={{fontSize:12,color:theme.muted}}>
      Édition de la forme d’onde disponible sur le navigateur web.
    </Text>;
  if(error)return <Text style={{fontSize:12,color:'#AD3857'}}>{error}</Text>;
  if(!blob)return <ActivityIndicator size="small" color={PINK}/>;
  // Overview is a preview, never an editor. Markers, seeking, zoom and
  // punch-in controls belong exclusively to the audio detail view.
  if(compact)return <View style={{gap:4}}>
    {url?React.createElement('audio',{
      ref:audio,src:url,preload:'metadata',
      onTimeUpdate:(e:React.SyntheticEvent<HTMLAudioElement>)=>
        setCursor(e.currentTarget.currentTime),
      onEnded:()=>setPlaying(false),
      style:{display:'none'}
    }):null}
    <View style={{flexDirection:'row',alignItems:'center',gap:11,minHeight:44}}>
      <Pressable onPress={toggle} accessibilityRole="button"
        accessibilityLabel={playing?'Mettre en pause '+file.title:'Écouter '+file.title}
        style={{width:44,height:44,borderRadius:22,backgroundColor:PINK,
          justifyContent:'center',alignItems:'center',flexShrink:0}}>
        <Ionicons name={playing?'pause':'play'} size={18} color="#fff"/>
      </Pressable>
      <Pressable onPress={onOpen} accessibilityRole="button"
        accessibilityLabel={'Ouvrir '+file.title+' pour éditer l’audio'}
        style={{flex:1,minWidth:0,minHeight:44,justifyContent:'center'}}>
        <MusicAudioPeaks file={file} height={31} barCount={76}/>
      </Pressable>
    </View>
    <View style={{marginLeft:55,flexDirection:'row',alignItems:'center',
      justifyContent:'space-between',minHeight:18}}>
      <Text style={{fontSize:10,color:theme.muted,fontVariant:['tabular-nums']}}>
        {Math.floor(cursor/60)}:{String(Math.floor(cursor%60)).padStart(2,'0')}
        {' / '}{Math.floor(duration/60)}:{String(Math.floor(duration%60)).padStart(2,'0')}
      </Text>
      <Pressable onPress={onOpen} accessibilityRole="button"
        accessibilityLabel={'Modifier '+file.title}
        style={{minWidth:44,minHeight:28,alignItems:'flex-end',
          justifyContent:'center'}}>
        <Ionicons name="chevron-forward" size={17} color={theme.muted}/>
      </Pressable>
    </View>
  </View>;
  return <View style={{gap:compact?8:13}}>
    {editing?<View style={{gap:9}}>
      <MusicAudioCapture initialTake={{
        file:blob,durationSeconds:duration,markers:file.markers||[],title:file.title
      }} initialCursorSeconds={cursor}
         onSaved={saveEdited} onDraftChange={setDraftActive}/>
      {confirmExit?<View style={{padding:12,borderWidth:1,borderColor:theme.border,
        borderRadius:11,gap:9}}>
        <Text style={{fontSize:12,color:theme.foreground}}>
          Abandonner les changements non enregistrés ?
        </Text>
        <View style={{flexDirection:'row',gap:13}}>
          <Pressable onPress={()=>setConfirmExit(false)} style={{padding:10}}>
            <Text style={{fontSize:12,color:PINK}}>Continuer</Text>
          </Pressable>
          <Pressable onPress={()=>{
            setEditing(false);setConfirmExit(false);
          }} style={{padding:10}}>
            <Text style={{fontSize:12,color:theme.foreground}}>Abandonner</Text>
          </Pressable>
        </View>
      </View>:null}
      <Pressable onPress={()=>{
        if(draftActive)setConfirmExit(true);else setEditing(false);
      }} style={{alignSelf:'flex-start',paddingVertical:7}}>
        <Text style={{fontSize:12,color:theme.muted}}>Fermer l’édition</Text>
      </Pressable>
    </View>:
      <>
        {url?React.createElement('audio',{
          ref:audio,src:url,preload:'metadata',
          onTimeUpdate:(e:React.SyntheticEvent<HTMLAudioElement>)=>
            setCursor(e.currentTarget.currentTime),
          onEnded:()=>setPlaying(false),
          style:{display:'none'}
        }):null}
        {editable&&onUpdate?<Pressable
          onPress={()=>{audio.current?.pause();setPlaying(false);setEditing(true);}}
          accessibilityRole="button" accessibilityLabel="Corriger l’enregistrement"
          style={{alignSelf:'flex-end',minHeight:37,flexDirection:'row',gap:7,
            alignItems:'center',paddingHorizontal:2}}>
          <Ionicons name="cut-outline" size={18} color={PINK}/>
          <Text style={{fontSize:12,color:PINK,fontWeight:'600'}}>
            Corriger l’enregistrement
          </Text>
        </Pressable>:null}
        <MusicWaveformEditor file={blob} duration={duration} cursor={cursor}
          sourceFiles={sourceFiles} sections={sections}
          onSeek={seek} zoom={zoom} onZoom={setZoom}
          onTogglePlayback={toggle} playing={playing} markers={file.markers||[]}
          onChangeMarkers={onUpdate?markers=>onUpdate({markers}):undefined}
          onCreateRange={onUpdate?(start,end)=>setSelectedRange({start,end}):undefined}
          selectedRange={selectedRange}
          onClearSelectedRange={()=>setSelectedRange(null)}
          onEditMarker={onUpdate?id=>setEditMarkerRequest(previous=>({
            id,nonce:(previous?.nonce||0)+1
          })):undefined}
          compact={compact}/>
        {onUpdate?<MusicAudioMarkers
          markers={file.markers||[]} duration={duration} cursor={cursor}
          sourceFiles={sourceFiles.filter(source=>source.id!==file.id)} sections={sections}
          onChange={markers=>onUpdate({markers})} onSeek={seek}
          editRequest={editMarkerRequest} selectedRange={selectedRange}/>:null}

      </>}
  </View>;
}
