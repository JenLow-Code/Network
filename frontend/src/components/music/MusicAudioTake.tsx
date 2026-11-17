import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Platform,Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {getDraftAudio} from '@/domain/musicLocalStorage';
import {punchInAudio} from '@/domain/musicEditing';
import {MusicWaveformEditor} from './MusicWaveformEditor';
import {MusicAudioCapture} from './MusicAudioCapture';
import {MusicAudioMarkers} from './MusicAudioMarkers';
import {useAppTheme} from '@/theme/AppTheme';
import type {MusicProjectFile,MusicAudioMarker} from '@/domain/musicWorkspace';

const PINK='#CB245C';
type Props={
  file:MusicProjectFile;
  compact?:boolean;
  editable?:boolean;
  onUpdate?:(change:Partial<MusicProjectFile>)=>void;
};
/**
 * One source recording, one waveform. The same seek and zoom interaction is used
 * in the Capture list, the saved-audio detail, and its non-destructive editor.
 * Never renders a second playback/progress bar.
 */
export function MusicAudioTake({file,compact=false,editable=false,onUpdate}:Props){
  const theme=useAppTheme();
  const [blob,setBlob]=useState<File|null>(null);
  const [url,setUrl]=useState('');
  const [error,setError]=useState('');
  const [cursor,setCursor]=useState(0);
  const [zoom,setZoom]=useState(1);
  const [playing,setPlaying]=useState(false);
  const [editing,setEditing]=useState(false);
  const [draftActive,setDraftActive]=useState(false);
  const [confirmExit,setConfirmExit]=useState(false);
  const audio=useRef<HTMLAudioElement|null>(null);
  useEffect(()=>{
    let live=true;
    setBlob(null);setError('');setCursor(0);setPlaying(false);
    if(Platform.OS!=='web'||!file.localFileId)return;
    void getDraftAudio(file.localFileId).then(async b=>{
      if(!b)throw Error('Enregistrement introuvable sur cet appareil.');
      const original=new File([b],file.originalFilename||'enregistrement.webm',
        {type:b.type||file.mimeType||'audio/webm'});
      // Older WebM recordings may lack a seekable duration index. Make a
      // temporary WAV for the editor without changing the saved original.
      const playable=/\.wav$/i.test(original.name)?original:
        (await punchInAudio(null,original,0)).file;
      if(live)setBlob(playable);
    }).catch(e=>{if(live)setError(e instanceof Error?e.message:'Enregistrement indisponible.');});
    return()=>{live=false;audio.current?.pause();};
  },[file.localFileId,file.originalFilename,file.mimeType]);
  useEffect(()=>{
    if(!blob||typeof URL==='undefined')return;
    const obj=URL.createObjectURL(blob);
    setUrl(obj);
    return()=>URL.revokeObjectURL(obj);
  },[blob]);
  const duration=file.durationSeconds||0;
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
  return <View style={{gap:compact?8:13}}>
    {editing?<View style={{gap:9}}>
      <MusicAudioCapture initialTake={{
        file:blob,durationSeconds:duration,markers:file.markers||[],title:file.title
      }} onSaved={saveEdited} onDraftChange={setDraftActive}/>
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
        <MusicWaveformEditor file={blob} duration={duration} cursor={cursor}
          onSeek={seek} zoom={zoom} onZoom={setZoom}
          onTogglePlayback={toggle} playing={playing} markers={file.markers||[]}
          compact={compact}/>
        {editable&&onUpdate?<>
          <MusicAudioMarkers markers={file.markers||[]} duration={duration} cursor={cursor}
            onChange={markers=>onUpdate({markers})} onSeek={seek}/>
          <Pressable onPress={()=>{audio.current?.pause();setPlaying(false);setEditing(true);}}
            accessibilityRole="button" style={{alignSelf:'flex-start',minHeight:38,
              flexDirection:'row',gap:7,alignItems:'center'}}>
            <Ionicons name="cut-outline" size={17} color={PINK}/>
            <Text style={{fontSize:12,color:PINK,fontWeight:'600'}}>Corriger l’enregistrement</Text>
          </Pressable>
        </>:null}
      </>}
  </View>;
}
