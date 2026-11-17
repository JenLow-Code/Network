import React,{useEffect,useRef,useState} from 'react';
import {Platform,Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {saveDraftAudio} from '@/domain/musicLocalStorage';
import {musicStamp,punchInAudio} from '@/domain/musicEditing';
import {MusicWaveformEditor} from './MusicWaveformEditor';
import {MusicAudioMarkers} from './MusicAudioMarkers';
import type {MusicAudioMarker} from '@/domain/musicWorkspace';

type Props={
  onSaved:(localAudioId:string,filename:string,durationSeconds?:number,
    startOffsetSeconds?:number,markers?:MusicAudioMarker[])=>void;
  /** Called when microphone recording actually begins/pauses, for optional backing playback. */
  onStarted?:(takePositionSeconds:number)=>void;
  onPaused?:()=>void;
  /** Only used for recording a NEW track inside an existing musical timeline. */
  timelineStartSeconds?:number;
  /** Current song-time playhead, independently of the take's recording clock. */
  backingPositionSeconds?:number;
};
const PINK='#CB245C';
type Status='idle'|'recording'|'paused';

/** Real microphone recording with pause and local non-destructive punch-in.
 * Web-only until a native capture engine is implemented and verified. */
export function MusicAudioCapture({onSaved,onStarted,onPaused,timelineStartSeconds=0,
  backingPositionSeconds}:Props){
  const theme=useAppTheme();
  const recorder=useRef<MediaRecorder|null>(null);
  const stream=useRef<MediaStream|null>(null);
  const audioCtx=useRef<AudioContext|null>(null);
  const ticker=useRef<ReturnType<typeof setInterval>|null>(null);
  const parts=useRef<Blob[]>([]);
  const base=useRef<File|null>(null);
  const history=useRef<{file:File|null;duration:number;cursor:number}[]>([]);
  const recordAt=useRef(0);
  const startedAt=useRef(0);
  const timelineStart=useRef(0);
  const elapsedRef=useRef(0);
  const finishRequested=useRef(false);
  const markerRef=useRef<MusicAudioMarker[]>([]);
  const takeCount=useRef(0);
  const audioElement=useRef<HTMLAudioElement|null>(null);
  const [status,setStatus]=useState<Status>('idle');
  const [file,setFile]=useState<File|null>(null);
  const [previewUrl,setPreviewUrl]=useState('');
  const [duration,setDuration]=useState(0);
  const [cursor,setCursor]=useState(0);
  const [elapsed,setElapsed]=useState(0);
  const [levels,setLevels]=useState<number[]>([]);
  const [zoom,setZoom]=useState(1);
  const [markers,setMarkers]=useState<MusicAudioMarker[]>([]);
  const [playing,setPlaying]=useState(false);
  const [processing,setProcessing]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const clearMic=()=>{
    if(ticker.current){clearInterval(ticker.current);ticker.current=null;}
    stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;
    if(audioCtx.current){void audioCtx.current.close().catch(()=>{});audioCtx.current=null;}
  };
  useEffect(()=>()=>{recorder.current&&(recorder.current.onstop=null);
    if(recorder.current?.state==='recording')recorder.current.stop();
    clearMic();
  },[]);
  useEffect(()=>{
    if(!file){setPreviewUrl('');return;}
    const url=URL.createObjectURL(file);setPreviewUrl(url);
    return ()=>URL.revokeObjectURL(url);
  },[file]);

  const start=async()=>{
    if(processing||saving||status==='recording')return;
    if(Platform.OS!=='web'||typeof navigator==='undefined'||
      !navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'||
      typeof AudioContext==='undefined'){
      setError('L’enregistrement et les retouches sont disponibles dans un navigateur compatible avec accès au microphone (HTTPS ou localhost).');
      return;
    }
    setError('');
    try{
      const microphone=await navigator.mediaDevices.getUserMedia({
        audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}
      });
      stream.current=microphone;
      const ctx=new AudioContext();audioCtx.current=ctx;
      await ctx.resume();
      const analyser=ctx.createAnalyser();analyser.fftSize=1024;
      ctx.createMediaStreamSource(microphone).connect(analyser);
      const samples=new Uint8Array(analyser.fftSize);
      const formats=['audio/webm;codecs=opus','audio/mp4','audio/webm','audio/ogg'];
      const mime=formats.find(format=>MediaRecorder.isTypeSupported(format));
      const r=mime?new MediaRecorder(microphone,{mimeType:mime}):new MediaRecorder(microphone);
      recorder.current=r;parts.current=[];
      finishRequested.current=false;
      audioElement.current?.pause();setPlaying(false);
      const first=takeCount.current===0;
      if(first)timelineStart.current=Math.max(0,timelineStartSeconds);
      const at=base.current?cursor:0;
      recordAt.current=at;
      r.ondataavailable=e=>{if(e.data.size)parts.current.push(e.data);};
      r.onerror=()=>setError('Le microphone a interrompu la prise. La précédente version est conservée.');
      r.onstop=()=>{
        clearMic();setProcessing(true);
        const mimeType=r.mimeType.split(';')[0]||'audio/webm';
        const ext=mimeType.includes('mp4')?'m4a':mimeType.includes('ogg')?'ogg':'webm';
        const blob=new Blob(parts.current,{type:mimeType});
        if(!blob.size){
          setError('Aucun audio reçu. La prise précédente est conservée.');
          setStatus(base.current?'paused':'idle');setProcessing(false);return;
        }
        const recorded=new File([blob],'prise-'+Date.now()+'.'+ext,{type:mimeType});
        const previous=base.current;
        const oldDuration=duration;
        const oldCursor=at;
        void punchInAudio(previous,recorded,at)
          .then(result=>{
            history.current.push({file:previous,duration:oldDuration,cursor:oldCursor});
            base.current=result.file;
            takeCount.current+=1;
            setFile(result.file);setDuration(result.durationSeconds);
            const next=Math.min(result.durationSeconds,Math.max(0,at+elapsedRef.current));
            setCursor(next);setStatus('paused');setLevels([]);
            if(finishRequested.current){
              setSaving(true);
              void saveDraftAudio(result.file).then(id=>{
                onSaved(id,result.file.name,result.durationSeconds,
                  timelineStart.current,markerRef.current);
              }).catch(e=>setError(e instanceof Error?e.message:'Sauvegarde impossible.'))
                .finally(()=>setSaving(false));
            }
          })
          .catch(e=>{
            setError(e instanceof Error?e.message:'Retouche impossible. L’audio initial est intact.');
            setStatus(previous?'paused':'idle');
          })
          .finally(()=>setProcessing(false));
      };
      startedAt.current=performance.now();
      elapsedRef.current=0;
      r.start(250);setElapsed(0);setLevels([]);
      setStatus('recording');
      ticker.current=setInterval(()=>{
        const secs=Math.max(0,(performance.now()-startedAt.current)/1000);
        elapsedRef.current=secs;setElapsed(secs);
        analyser.getByteTimeDomainData(samples);
        let sum=0;for(let i=0;i<samples.length;i++){
          const x=(samples[i]-128)/128;sum+=x*x;
        }
        const level=Math.max(.03,Math.min(1,Math.sqrt(sum/samples.length)*3.2));
        setLevels(prev=>[...prev.slice(-103),level]);
      },70);
      onStarted?.(at);
    }catch(e){
      clearMic();
      setError(e instanceof Error?'Microphone inaccessible : '+e.message:'Microphone indisponible.');
    }
  };
  const onMarkers=(next:MusicAudioMarker[])=>{
    markerRef.current=next;setMarkers(next);
  };
  const togglePlayback=()=>{
    const el=audioElement.current;
    if(!el||status==='recording'||processing)return;
    if(!el.paused){el.pause();setPlaying(false);return;}
    if(el.currentTime>=duration-.02)el.currentTime=0;
    void el.play().then(()=>setPlaying(true))
      .catch(()=>setError('Lecture audio indisponible sur ce navigateur.'));
  };
  const pause=()=>{
    if(recorder.current?.state==='recording'){
      const secs=Math.max(0,(performance.now()-startedAt.current)/1000);
      elapsedRef.current=secs;setElapsed(secs);
      setStatus('paused');
      // Stop creates a self-contained segment. MediaRecorder.pause() alone cannot
      // support recording over an earlier passage of the existing file.
      recorder.current.stop();setProcessing(true);
      clearMic();onPaused?.();
    }
  };
  const stop=()=>{
    finishRequested.current=true;
    pause();
  };
  const seek=(position:number)=>{
    if(status==='recording'||processing)return;
    const value=Math.max(0,Math.min(duration,position));
    setCursor(value);
    if(audioElement.current)audioElement.current.currentTime=value;
  };
  const undo=()=>{
    if(status==='recording'||processing)return;
    const previous=history.current.pop();
    if(!previous)return;
    base.current=previous.file;
    setFile(previous.file);setDuration(previous.duration);
    setCursor(previous.cursor);
    setStatus(previous.file?'paused':'idle');
  };
  const finish=async()=>{
    if(!file||saving||processing||status==='recording')return;
    setSaving(true);setError('');
    try{
      const id=await saveDraftAudio(file);
      onSaved(id,file.name,duration,timelineStart.current,markerRef.current);
    }catch(e){setError(e instanceof Error?e.message:'Sauvegarde audio impossible.');}
    finally{setSaving(false);}
  };
  const discard=()=>{
    if(status==='recording'||processing)return;
    history.current=[];base.current=null;takeCount.current=0;
    audioElement.current?.pause();setPlaying(false);
    setFile(null);setDuration(0);setCursor(0);setElapsed(0);setLevels([]);
    onMarkers([]);
    setStatus('idle');setError('');
  };
  const running=recordAt.current+elapsed;
  const shownLength=Math.max(duration,status==='recording'?running:0);
  return <View style={{gap:14}}>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',
      flexWrap:'wrap',gap:9}}>
      <View style={{gap:3}}>
        <Text style={{fontSize:11,fontWeight:'700',color:status==='recording'?PINK:theme.muted}}>
          {status==='recording'?'● ENREGISTREMENT':
            processing?'TRAITEMENT DE LA PRISE':status==='paused'?'EN PAUSE':'PRÊT À ENREGISTRER'}
        </Text>
        <Text style={{fontSize:25,fontWeight:'700',color:theme.foreground,
          fontVariant:['tabular-nums']}}>
          {musicStamp(status==='recording'?running:cursor)}
        </Text>
      </View>
      <View style={{alignItems:'flex-end',gap:4}}>
        <Text style={{fontSize:12,color:theme.muted}}>
          Durée {musicStamp(shownLength)}
        </Text>
        {backingPositionSeconds!==undefined?<Text style={{fontSize:13,
          color:PINK,fontWeight:'700',fontVariant:['tabular-nums']}}>
          Morceau {musicStamp(backingPositionSeconds)}
        </Text>:null}
      </View>
    </View>
    {previewUrl&&status!=='recording'&&Platform.OS==='web'
      ?React.createElement('audio',{
        ref:audioElement,src:previewUrl,preload:'metadata',
        onTimeUpdate:(e:React.SyntheticEvent<HTMLAudioElement>)=>
          setCursor(e.currentTarget.currentTime),
        onEnded:()=>setPlaying(false),
        style:{display:'none'}
      }):null}
    {status==='recording'?<View style={{height:87,borderRadius:13,backgroundColor:theme.dark?'#252029':'#F2F4F5',
      overflow:'hidden',paddingHorizontal:7,flexDirection:'row',alignItems:'center',gap:2}}>
      {levels.map((v,i)=><View key={i} style={{flex:1,
        height:Math.max(2,Math.round(v*69)),maxWidth:5,borderRadius:2,backgroundColor:PINK,
        opacity:.7}}/>)}
    </View>:file?<MusicWaveformEditor file={file} duration={duration} cursor={cursor}
      onSeek={seek} zoom={zoom} onZoom={setZoom} playing={playing}
      onTogglePlayback={togglePlayback} markers={markers}/>:
      <View style={{height:70,borderRadius:13,backgroundColor:theme.dark?'#252029':'#F2F4F5',
        justifyContent:'center',alignItems:'center'}}>
        <Text style={{fontSize:12,color:theme.muted}}>La forme d’onde suivra ta voix en direct.</Text>
      </View>}
    {status==='recording'?<View style={{flexDirection:'row',gap:9}}>
      <Pressable onPress={pause} accessibilityRole="button"
        accessibilityLabel="Pause de l’enregistrement"
        style={{flex:1,backgroundColor:'#27232A',borderRadius:12,minHeight:48,
          flexDirection:'row',justifyContent:'center',alignItems:'center',gap:8}}>
        <Ionicons name="pause" size={19} color="#fff"/>
        <Text style={{fontSize:13,color:'#fff',fontWeight:'700'}}>Pause</Text>
      </Pressable>
      <Pressable onPress={stop} accessibilityRole="button"
        accessibilityLabel="Terminer et sauvegarder l’enregistrement"
        style={{flex:1,backgroundColor:PINK,borderRadius:12,minHeight:48,
          flexDirection:'row',justifyContent:'center',alignItems:'center',gap:8}}>
        <Ionicons name="stop" size={19} color="#fff"/>
        <Text style={{fontSize:13,color:'#fff',fontWeight:'700'}}>Terminer</Text>
      </Pressable>
    </View>:
      <View style={{gap:9}}>
        <Pressable onPress={()=>{void start();}} disabled={processing||saving}
          accessibilityRole="button"
          style={{backgroundColor:PINK,opacity:processing||saving?.5:1,
            minHeight:48,borderRadius:13,alignItems:'center',justifyContent:'center',
            gap:9,flexDirection:'row'}}>
          <Ionicons name={file?'radio-button-on':'mic-outline'} color="#fff" size={20}/>
          <Text style={{fontSize:13,fontWeight:'700',color:'#fff'}}>
            {file?(cursor+0.02<duration?'Réenregistrer depuis ce point':'Continuer à enregistrer'):
              'Démarrer l’enregistrement'}
          </Text>
        </Pressable>
        {file?<View style={{gap:10}}>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
            <Pressable onPress={()=>{void finish();}} disabled={saving||processing}
              style={{minHeight:43,borderRadius:11,backgroundColor:PINK,
                paddingHorizontal:18,justifyContent:'center'}}>
              <Text style={{color:'#fff',fontWeight:'700',fontSize:12}}>
                {saving?'Sauvegarde…':'Conserver'}
              </Text>
            </Pressable>
            {history.current.length>0?<Pressable onPress={undo}
              style={{minHeight:43,paddingHorizontal:10,justifyContent:'center'}}>
              <Text style={{color:theme.foreground,fontSize:12}}>Annuler la dernière prise</Text>
            </Pressable>:null}
            <Pressable onPress={discard} style={{minHeight:43,paddingHorizontal:10,
              justifyContent:'center'}}>
              <Text style={{color:theme.muted,fontSize:12}}>Recommencer</Text>
            </Pressable>
          </View>
        </View>:null}
      </View>}
    {file?<MusicAudioMarkers markers={markers} duration={duration} cursor={cursor}
      onSeek={seek} onChange={onMarkers} disabled={status==='recording'||processing||saving}/>:null}
    {error?<Text style={{fontSize:12,lineHeight:20,color:'#B54B65'}}>{error}</Text>:null}
    {file?<Text style={{fontSize:11,lineHeight:18,color:theme.muted}}>
      Place le curseur sur la forme d’onde pour réenregistrer un passage. Le reste de la prise est conservé.
    </Text>:null}
  </View>;
}
