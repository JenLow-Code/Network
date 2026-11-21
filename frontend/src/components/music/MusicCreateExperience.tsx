import React,{useEffect,useRef,useState} from 'react';
import {Platform} from 'react-native';
import {getDraftAttachment} from '@/domain/musicLocalStorage';
import {musicStamp} from '@/domain/musicEditing';
import {Modal,Pressable,ScrollView,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {MusicAudioCapture} from './MusicAudioCapture';
import {MusicAudioPreview} from './MusicAudioPreview';
import {MusicStudioTransport,versionLength} from './MusicStudioTransportNext';
import {isMidiSource,renderMidiSource} from '@/domain/musicMidiAudio';
import {MusicAudioMarkers} from './MusicAudioMarkers';
import {MusicSourceBank} from './MusicSourceBank';
import {MusicLyricTimeline} from './MusicLyricTimeline';
import {useMusicMetronome} from './useMusicMetronome';
import {MusicSongTabs} from './MusicSongTabs';
import {MusicSongMetadata} from './MusicSongMetadata';
import {musicNextState,makeWorkingVersion,makeWorkingTrack,
  changeWorkingVersion,undoWorkingVersion,isMusicTrackCandidate,musicSourceDuration} from '@/domain/musicNext';
import {formatMusicDuration} from '@/domain/musicProjectSelectors';
import {newMusicId} from '@/domain/musicWorkspace';
import type {MusicProject,MusicProjectFile,MusicAudioMarker} from '@/domain/musicWorkspace';
import type {WorkingMusicTrack,WorkingMusicVersion} from '@/domain/musicNext';

const PINK='#CB245C';
type Props={project:MusicProject;patch:(changes:Partial<MusicProject>)=>void;onCapture:()=>void};
type PickMode='none'|'start'|'add';

export function MusicCreateExperience({project,patch,onCapture}:Props) {
  const theme=useAppTheme();
  const {width}=useWindowDimensions();
  const compact=width<600;
  const state=musicNextState(project);
  // A version exists only when it contains at least one arranged source.
  const versions=state.versions.filter(v=>v.tracks.length>0);
  const version=versions.find(v=>v.id===state.activeVersionId)||versions[0];
  // Rendered WAVs are internal derivatives; Capture and the source bank keep
  // only the original editable MIDI (the WAV stays linked to that original).
  const sources=project.files.filter(file=>
    isMusicTrackCandidate(file)&&!file.renderedFromMidiId);
  const availableSources=version?sources.filter(file=>
    !version.tracks.some(track=>{
      const used=project.files.find(item=>item.id===track.sourceFileId);
      return used?.id===file.id||used?.renderedFromMidiId===file.id;
    })):sources;
  // Older takes may have been saved before their duration was known.
  // Decode the real file instead of drawing a zero-width phantom track.
  const unknownDurationIds=version?.tracks
    .map(track=>project.files.find(file=>file.id===track.sourceFileId))
    .filter((file):file is MusicProjectFile=>
      !!file?.localFileId&&!(file.durationSeconds&&file.durationSeconds>0))
    .map(file=>file.id) || [];
  const unknownKey=unknownDurationIds.join('|');
  useEffect(()=>{
    if(Platform.OS!=='web'||typeof AudioContext==='undefined'||!unknownKey)return;
    let alive=true;
    void (async()=>{
      const context=new AudioContext();
      try{
        const resolved:{id:string;duration:number}[]=[];
        for(const file of project.files.filter(x=>unknownDurationIds.includes(x.id))){
          const blob=file.localFileId?await getDraftAttachment(file.localFileId):null;
          if(!blob)continue;
          try{
            const buffer=await context.decodeAudioData(await blob.arrayBuffer());
            if(Number.isFinite(buffer.duration)&&buffer.duration>0)
              resolved.push({id:file.id,duration:buffer.duration});
          }catch{}
        }
        if(alive&&resolved.length){
          patch({files:project.files.map(file=>{
            const match=resolved.find(result=>result.id===file.id);
            return match?{...file,durationSeconds:match.duration}:file;
          })});
        }
      }finally{await context.close();}
    })().catch(()=>{});
    return()=>{alive=false;};
  },[unknownKey,project.id]);
  const [versionMenu,setVersionMenu]=useState(false);
  const [versionExpanded,setVersionExpanded]=useState(true);
  const [pickMode,setPickMode]=useState<PickMode>('none');
  const [recording,setRecording]=useState(false);
  const [unsavedRecording,setUnsavedRecording]=useState(false);
  const [confirmClose,setConfirmClose]=useState(false);
  const [confirmDelete,setConfirmDelete]=useState(false);
  const [editTrack,setEditTrack]=useState('');
  const [selectedTrackId,setSelectedTrackId]=useState('');
  const [copiedTrack,setCopiedTrack]=useState<WorkingMusicTrack|null>(null);
  const [pasteCount,setPasteCount]=useState(0);
  const [showTracks,setShowTracks]=useState(!compact);
  const [rangeRequest,setRangeRequest]=useState<{
    trackId:string;start:number;end:number;nonce:number
  }|null>(null);
  const [trackOffset,setTrackOffset]=useState('0');
  const [trimStart,setTrimStart]=useState('0');
  const [trimEnd,setTrimEnd]=useState('0');
  const [timelineCursor,setTimelineCursor]=useState(0);
  const [recordOrigin,setRecordOrigin]=useState(0);
  const [playbackRequest,setPlaybackRequest]=useState<{at:number;serial:number}|null>(null);
  const [seekRequest,setSeekRequest]=useState<{at:number;serial:number}|null>(null);
  const [pauseRequest,setPauseRequest]=useState(0);
  const [showSettings,setShowSettings]=useState(false);
  const [showSections,setShowSections]=useState(false);
  const [infoOpen,setInfoOpen]=useState(false);
  const [showSongInfo,setShowSongInfo]=useState(false);
  const [sectionId,setSectionId]=useState('');
  const [tempo,setTempo]=useState('');
  const [meter,setMeter]=useState('');
  const [tone,setTone]=useState('');
  const [error,setError]=useState('');
  const metronome=useMusicMetronome();
  const [bpmInput,setBpmInput]=useState(String(version?.bpm||100));
  useEffect(()=>setBpmInput(String(version?.bpm||100)),[version?.id]);
  const effectiveBpm=version?.bpm||100;
  const meterBeats=Math.max(1,Math.min(12,parseInt(version?.meter||'4',10)||4));
  useEffect(()=>{
    metronome.setSettings(effectiveBpm,!!version?.metronomeMuted,meterBeats);
  },[effectiveBpm,version?.metronomeMuted,meterBeats]);
  const input={backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,
    borderRadius:10,paddingHorizontal:12,paddingVertical:10,fontSize:13,
    color:theme.foreground} as const;
  const edit=(updated:WorkingMusicVersion)=>
    patch({musicNext:changeWorkingVersion(state,updated)});
  const editTracks=(tracks:WorkingMusicTrack[])=>{
    if(version)edit({...version,tracks});
  };
  const editOneTrack=(id:string,changes:Partial<WorkingMusicTrack>)=>{
    if(!version)return;
    editTracks(version.tracks.map(t=>t.id===id?{...t,...changes}:t));
  };
  const openTrack=(t:WorkingMusicTrack,file?:MusicProjectFile,force=false)=>{
    setEditTrack(force?t.id:editTrack===t.id?'':t.id);
    setTrackOffset(String(t.offsetSeconds||0));
    setTrimStart(String(t.trimStartSeconds||0));
    setTrimEnd(String(t.trimEndSeconds??file?.durationSeconds??0));
  };
  const saveTrackTiming=(t:WorkingMusicTrack,file?:MusicProjectFile)=>{
    const offset=Number(trackOffset.replace(',','.'));
    const start=Number(trimStart.replace(',','.'));
    const end=Number(trimEnd.replace(',','.'));
    const length=file?.durationSeconds;
    if(!Number.isFinite(offset)||offset<0||!Number.isFinite(start)||start<0||
      !Number.isFinite(end)||end<=start||length===undefined||end>length+.001){
      setError('Vérifie le début, la fin et la position. La fin ne peut pas dépasser la durée du fichier.');
      return;
    }
    editOneTrack(t.id,{offsetSeconds:Math.round(offset*100)/100,
      trimStartSeconds:Math.round(start*100)/100,trimEndSeconds:Math.round(end*100)/100});
    setError('');setEditTrack('');
  };
  const convertingRef=useRef(false);
  const [converting,setConverting]=useState('');
  /** Before a MIDI idea enters the studio, render a separate, audible WAV.
   * The original score/MIDI stays untouched in Capturer.
   * A single metadata patch commits both the WAV and the track atomically. */
  const addToVersion=async(file:MusicProjectFile,at?:number,forceNew=false)=>{
    if(convertingRef.current)return;
    const existing=!forceNew?version:undefined;
    if(existing&&existing.tracks.some(track=>{
      const used=project.files.find(item=>item.id===track.sourceFileId);
      return used?.id===file.id||used?.renderedFromMidiId===file.id;
    })){
      setError('Cette prise est déjà dans la version. Duplique-la dans les pistes si nécessaire.');
      return;
    }
    convertingRef.current=true;
    setConverting(isMidiSource(file)?file.id:'');
    setError('');
    try{
      const audible=isMidiSource(file)?await renderMidiSource(file):file;
      const files=audible===file?project.files:[...project.files,audible];
      if(!existing){
        const created=makeWorkingVersion(audible,versions.length+1);
        patch({files,musicNext:{...state,versions:[...versions,created],
          activeVersionId:created.id,history:(state.history||[])
            .filter(entry=>versions.some(v=>v.id===entry.versionId))}});
      }else{
        const updated={...existing,tracks:[...existing.tracks,{
          ...makeWorkingTrack(audible),
          offsetSeconds:Math.max(0,Math.round((at??timelineCursor)*100)/100),
        }]};
        patch({files,musicNext:changeWorkingVersion(state,updated)});
      }
      setPickMode('none');setVersionMenu(false);
      setVersionExpanded(true);setError('');
    }catch(e){
      setError(e instanceof Error?e.message:
        'Impossible de convertir cette partition MIDI en une prise audio.');
    }finally{convertingRef.current=false;setConverting('');}
  };
  const first=(file:MusicProjectFile)=>{void addToVersion(file,0,true);};
  const add=(file:MusicProjectFile,at=timelineCursor)=>{
    void addToVersion(file,at);
  };
  const copyVersion=()=>{
    if(!version)return;
    const now=new Date().toISOString();
    const next:WorkingMusicVersion={...version,id:newMusicId(),
      title:'Version '+(versions.length+1),createdAt:now,updatedAt:now,
      tracks:version.tracks.map(track=>({...track,id:newMusicId()}))};
    patch({musicNext:{...state,versions:[...versions,next],activeVersionId:next.id}});
    setVersionMenu(false);setVersionExpanded(true);setShowSettings(false);
  };
  const copySelectedTrack=()=>{
    const track=version?.tracks.find(item=>item.id===selectedTrackId);
    if(!track)return;
    setCopiedTrack({...track,markers:track.markers?.map(m=>({...m}))});
    setPasteCount(0);setError('');
  };
  const pasteTrack=()=>{
    if(!version||!copiedTrack)return;
    const source=project.files.find(f=>f.id===copiedTrack.sourceFileId);
    if(!source){setError('La source de la piste copiée est introuvable.');return;}
    const total=musicSourceDuration(source);
    const start=Number.isFinite(copiedTrack.trimStartSeconds)?
      Math.max(0,copiedTrack.trimStartSeconds||0):0;
    const end=Number.isFinite(copiedTrack.trimEndSeconds)?
      Math.max(start,copiedTrack.trimEndSeconds||0):total;
    const length=Math.max(.1,end-start);
    const origin=Number.isFinite(copiedTrack.offsetSeconds)?
      Math.max(0,copiedTrack.offsetSeconds):0;
    const pasted:WorkingMusicTrack={
      ...copiedTrack,id:newMusicId(),
      title:copiedTrack.title+' · copie '+(pasteCount+1),
      offsetSeconds:Math.round((origin+length*(pasteCount+1))*1000)/1000,
      markers:copiedTrack.markers?.map(m=>({...m,id:newMusicId()})),
    };
    editTracks([...version.tracks,pasted]);
    setSelectedTrackId(pasted.id);setPasteCount(n=>n+1);setError('');
  };
  useEffect(()=>{
    if(Platform.OS!=='web'||typeof window==='undefined'||!versionExpanded)return;
    const onKey=(event:KeyboardEvent)=>{
      if(!(event.ctrlKey||event.metaKey)||event.altKey)return;
      const target=event.target as HTMLElement|null;
      if(target?.closest('input,textarea,[contenteditable="true"]')||
        window.getSelection()?.toString())return;
      const key=event.key.toLowerCase();
      if(key==='c'&&version?.tracks.some(t=>t.id===selectedTrackId)){
        event.preventDefault();copySelectedTrack();
      }else if(key==='v'&&copiedTrack){
        event.preventDefault();pasteTrack();
      }
    };
    window.addEventListener('keydown',onKey);
    return()=>window.removeEventListener('keydown',onKey);
  },[version?.id,version?.tracks,selectedTrackId,copiedTrack,pasteCount,versionExpanded]);
  const saveTake=(id:string,filename:string,durationSeconds?:number,
    startAt?:number,markers?:MusicAudioMarker[],name?:string)=>{
    if(!version)return;
    const item:MusicProjectFile={id:newMusicId(),title:name?.trim()||'Nouvelle prise',kind:'audio',
      sectionIds:[],localFileId:id,originalFilename:filename,
      mimeType:/\.wav$/i.test(filename)?'audio/wav':/\.m4a$/i.test(filename)?'audio/mp4':'audio/webm',
      durationSeconds,markers:markers||[],createdAt:new Date().toISOString()};
    patch({files:[...project.files,item],musicNext:changeWorkingVersion(state,{
      ...version,tracks:[...version.tracks,{
        ...makeWorkingTrack(item),offsetSeconds:startAt??recordOrigin
      }]
    })});
    setRecording(false);setUnsavedRecording(false);setConfirmClose(false);setError('');
  };
  const applyBpm=()=>{
    if(!version)return;
    const parsed=Number(bpmInput.replace(',','.'));
    if(!Number.isFinite(parsed)||parsed<30||parsed>300){
      setError('Le BPM doit être entre 30 et 300.');return;
    }
    const bpm=Math.round(parsed);
    setBpmInput(String(bpm));setError('');
    edit({...version,bpm});
    metronome.setSettings(bpm,!!version.metronomeMuted,meterBeats);
  };
  const toggleClick=()=>{
    if(!version)return;
    if(metronome.running){metronome.stop();return;}
    // A hidden historic mute setting must never create a silently running click.
    if(version.metronomeMuted)edit({...version,metronomeMuted:false});
    if(!metronome.start(Number(bpmInput)||effectiveBpm,false,meterBeats))
      setError('Le métronome nécessite Web Audio.');
  };
  const openSettings=()=>{
    if(!version)return;
    setTempo(version.bpm===undefined?'':String(version.bpm));
    setTone(version.key||'');
    setMeter(version.meter||'');
    setShowSettings(true);
  };
  const saveSettings=()=>{
    if(!version)return;
    const bpm=tempo.trim()?Number(tempo):undefined;
    if(bpm!==undefined&&(!Number.isFinite(bpm)||bpm<1||bpm>400)){
      setError('Le tempo doit être un nombre entre 1 et 400.');return;
    }
    edit({...version,bpm,key:tone.trim()||undefined,meter:meter.trim()||undefined});
    setBpmInput(String(bpm||100));setError('');setShowSettings(false);
  };
  const button=(label:string,fn:()=>void,primary=false,icon?:keyof typeof Ionicons.glyphMap)=>
    <Pressable onPress={fn} accessibilityRole="button"
      style={{minHeight:43,flexDirection:'row',gap:8,alignItems:'center',justifyContent:'center',
        backgroundColor:primary?PINK:theme.surface,borderRadius:12,
        borderWidth:primary?0:1,borderColor:theme.border,paddingHorizontal:15,paddingVertical:10}}>
      {icon?<Ionicons name={icon} size={17} color={primary?'#fff':PINK}/>:null}
      <Text style={{fontSize:12,fontWeight:'700',color:primary?'#fff':theme.foreground}}>{label}</Text>
    </Pressable>;
  const menuChoice=(label:string,icon:keyof typeof Ionicons.glyphMap,run:()=>void)=>
    <Pressable onPress={run} accessibilityRole="button" accessibilityLabel={label}
      style={{alignSelf:'flex-start',minHeight:40,flexDirection:'row',
        alignItems:'center',gap:9,paddingHorizontal:6}}>
      <Ionicons name={icon} size={18} color={PINK}/>
      <Text style={{fontSize:12,color:theme.foreground,fontWeight:'600'}}>
        {label}
      </Text>
    </Pressable>;
  const sectionPanel=()=> <View style={{borderTopWidth:1,borderColor:theme.border,paddingTop:13,gap:10}}>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:showSections}}
      onPress={()=>setShowSections(!showSections)}
      style={{flexDirection:'row',alignItems:'center',gap:8,minHeight:43}}>
      <Ionicons name="list-outline" size={19} color={PINK}/>
      <Text style={{flex:1,fontSize:13,fontWeight:'600',color:theme.foreground}}>
        Structure du morceau{project.sections.length?' · '+project.sections.length+' parties':''}
      </Text>
      <Ionicons name={showSections?'chevron-up':'chevron-down'} size={17} color={theme.muted}/>
    </Pressable>
    {showSections?<View style={{gap:14}}>
      <MusicSongTabs project={project} patch={patch}
        activeSectionId={sectionId} onSelect={setSectionId}/>
      {version&&project.sections.length?<View style={{gap:3}}>
        <Text style={{fontSize:11,color:theme.muted,lineHeight:19}}>
          Place les parties sur la chronologie de cette version.
          Chaque repère reste modifiable sans toucher aux prises.
        </Text>
        {project.sections.map(part=>{
          const at=version.sectionMarkers?.[part.id];
          const positioned=at!==undefined&&Number.isFinite(at);
          return <View key={part.id} style={{minHeight:46,flexDirection:'row',
            alignItems:'center',gap:8,borderBottomWidth:1,borderColor:theme.border}}>
            <Text numberOfLines={1} style={{fontSize:12,fontWeight:'600',
              color:theme.foreground,flex:1,minWidth:0}}>{part.title}</Text>
            <Text style={{fontSize:11,color:theme.muted}}>
              {positioned?musicStamp(at):'Non placée'}
            </Text>
            {positioned?<Pressable accessibilityRole="button"
              accessibilityLabel={'Aller à '+part.title}
              onPress={()=>{
                setSeekRequest(prev=>({at,serial:(prev?.serial||0)+1}));
                setVersionExpanded(true);setInfoOpen(false);
              }} style={{width:42,height:42,alignItems:'center',
                justifyContent:'center'}}>
              <Ionicons name="locate-outline" size={18} color={PINK}/>
            </Pressable>:null}
            <Pressable accessibilityRole="button"
              accessibilityLabel={'Placer '+part.title+' au curseur'}
              onPress={()=>edit({...version,sectionMarkers:{
                ...(version.sectionMarkers||{}),
                [part.id]:Math.round(timelineCursor*1000)/1000,
              }})}
              style={{minHeight:42,paddingHorizontal:8,
                alignItems:'center',justifyContent:'center'}}>
              <Text style={{fontSize:11,color:PINK}}>
                {positioned?'Déplacer':'Placer ici'}
              </Text>
            </Pressable>
          </View>;
        })}
      </View>:null}
      {project.sections.some(part=>part.id===sectionId)?<View style={{gap:10}}>
        <Text style={{fontSize:12,fontWeight:'700',color:theme.foreground}}>
          Extraits de paroles de cette partie
        </Text>
        {project.files.flatMap(file=>(file.lyricReferences||[])
          .filter(ref=>ref.sectionId===sectionId).map(ref=>({
            id:ref.id,title:file.title,text:ref.text
          }))).map(ref=><View key={ref.id}
          style={{paddingVertical:10,borderTopWidth:1,borderColor:theme.border,gap:5}}>
          <Text style={{fontSize:11,color:theme.muted}}>{ref.title}</Text>
          <Text style={{fontSize:15,lineHeight:24,color:theme.foreground}}>{ref.text}</Text>
        </View>)}
        {!project.files.some(file=>(file.lyricReferences||[])
          .some(ref=>ref.sectionId===sectionId))?<Text style={{fontSize:12,color:theme.muted}}>
          Aucun extrait associé. Sélectionne un passage dans Capturer pour le lier ici.
        </Text>:null}
      </View>:null}
    </View>:null}
  </View>;
  const tiny=(icon:keyof typeof Ionicons.glyphMap,label:string,fn:()=>void,active=false)=>
    <Pressable onPress={fn} accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{selected:active}}
      style={{width:39,height:39,alignItems:'center',justifyContent:'center',
        backgroundColor:active?(theme.dark?'#3D2934':'#FAE8EE'):'transparent',
        borderRadius:10}}>
      <Ionicons name={icon} size={19} color={active?PINK:theme.muted}/>
    </Pressable>;
  return <View style={{gap:compact?16:22}}>
    {version?<View style={{gap:11}}>
      <View style={{flexDirection:'row',gap:10,alignItems:'center'}}>
        <Pressable onPress={()=>{
          if(recording&&unsavedRecording){
            setError('Termine ou sauvegarde la prise avant de replier la version.');
            return;
          }
          setVersionExpanded(open=>!open);setVersionMenu(false);
        }}
          accessibilityRole="button" accessibilityState={{expanded:versionExpanded}}
          style={{flex:1,flexDirection:'row',gap:10,alignItems:'center',paddingVertical:7}}>
          <Ionicons name="layers-outline" size={20} color={PINK}/>
          <Text style={{fontSize:compact?15:18,fontWeight:'700',
            color:theme.foreground}}>{version.title}</Text>
          <Ionicons name={versionExpanded?'chevron-up':'chevron-down'} color={PINK} size={19}/>
        </Pressable>
        {tiny('copy-outline','Dupliquer cette version',copyVersion)}
        {tiny('ellipsis-horizontal-outline','Gérer les versions',()=>setVersionMenu(open=>!open),versionMenu)}
        {version?tiny('arrow-undo-outline','Annuler la dernière modification',()=>{
          patch({musicNext:undoWorkingVersion(state,version.id)});
        }):null}
      </View>
      {versionMenu?<View style={{paddingVertical:7,gap:5}}>
        {versions.map(v=><Pressable key={v.id} accessibilityRole="button"
          onPress={()=>{patch({musicNext:{...state,activeVersionId:v.id}});
            setVersionMenu(false);setVersionExpanded(true);}}
          style={{flexDirection:'row',alignItems:'center',gap:10,minHeight:39}}>
          <View style={{width:3,height:21,borderRadius:3,
            backgroundColor:v.id===version?.id?PINK:'transparent'}}/>
          <Text style={{color:theme.foreground,fontSize:13,flex:1}}>{v.title}</Text>
          <Text style={{color:theme.muted,fontSize:11}}>{v.tracks.length} pistes</Text>
        </Pressable>)}
        {version?menuChoice('Structure et informations','document-text-outline',()=>{
          setInfoOpen(true);setShowSections(true);setVersionMenu(false);
        }):null}
        {menuChoice('Nouvelle version depuis Capturer','add-outline',()=>{
          setPickMode('start');setVersionMenu(false);
        })}
        {version?<Pressable onPress={()=>setConfirmDelete(!confirmDelete)} style={{paddingVertical:7}}>
          <Text style={{fontSize:12,color:theme.muted}}>Supprimer cette version…</Text>
        </Pressable>:null}
        {!!project.versions.length?<View style={{gap:9,borderTopWidth:1,
          borderColor:theme.border,paddingTop:12}}>
          <Text style={{fontSize:12,fontWeight:'700',color:theme.foreground}}>Anciennes versions publiées</Text>
          {project.versions.map(v=><View key={v.id} style={{gap:7}}>
            <Text style={{fontSize:12,color:theme.muted}}>{v.title}</Text>
            <MusicAudioPreview source={v}/>
          </View>)}
        </View>:null}
      </View>:null}
      {!versionExpanded?<View style={{
        paddingVertical:9,paddingHorizontal:11,gap:8,borderRadius:12,
        backgroundColor:theme.dark?'rgba(255,255,255,.045)':'rgba(36,38,37,.035)'}}>
        <Text numberOfLines={1} style={{fontSize:11,color:theme.muted}}>
          {version.tracks.length} piste{version.tracks.length>1?'s':''}
          {'  ·  '+formatMusicDuration(versionLength(version,project.files))}
          {'  ·  '+effectiveBpm+' BPM'}
          {version.key?'  ·  '+version.key:''}
        </Text>
        <View style={{flexDirection:'row',alignItems:'center',gap:5,flexWrap:'wrap'}}>
          {version.tracks.slice(0,4).map(track=><View key={track.id}
            style={{paddingHorizontal:8,paddingVertical:5,borderRadius:7,
              borderWidth:1,borderColor:theme.border}}>
            <Text numberOfLines={1} style={{fontSize:10,color:theme.foreground,maxWidth:135}}>
              {track.emoji||'♫'} {track.title}
            </Text>
          </View>)}
          {version.tracks.length>4?<Text style={{fontSize:10,color:theme.muted}}>
            +{version.tracks.length-4}
          </Text>:null}
        </View>
        {project.sections.length?<Text numberOfLines={1}
          style={{fontSize:10,color:theme.muted}}>
          {project.sections.map(part=>part.title).join('  ·  ')}
        </Text>:null}
      </View>:null}
    </View>:null}
    {/* Other versions remain visible as collapsed siblings, even while
        the selected version's full studio is expanded. */}
    {versions.filter(other=>other.id!==version?.id).map(other=>
      <Pressable key={other.id} accessibilityRole="button"
        accessibilityLabel={'Déployer '+other.title}
        accessibilityState={{expanded:false}}
        onPress={()=>{
          if(recording&&unsavedRecording){
            setError('Termine ou sauvegarde la prise avant de changer de version.');
            return;
          }
          patch({musicNext:{...state,activeVersionId:other.id}});
          setVersionExpanded(true);setVersionMenu(false);
          setSelectedTrackId('');setEditTrack('');setError('');
        }}
        style={{paddingHorizontal:compact?11:15,paddingVertical:11,gap:7,
          borderRadius:12,borderWidth:1,borderColor:theme.border,
          backgroundColor:theme.dark?'rgba(255,255,255,.045)':'rgba(36,38,37,.035)'}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:9}}>
          <Ionicons name="layers-outline" size={17} color={theme.muted}/>
          <Text numberOfLines={1} style={{flex:1,color:theme.foreground,
            fontWeight:'600',fontSize:compact?13:15}}>{other.title}</Text>
          <Text style={{fontSize:11,color:theme.muted}}>
            {other.tracks.length} piste{other.tracks.length>1?'s':''}
          </Text>
          <Ionicons name="chevron-down" size={17} color={theme.muted}/>
        </View>
        <Text numberOfLines={1} style={{fontSize:11,color:theme.muted,
          paddingLeft:26}}>
          {formatMusicDuration(versionLength(other,project.files))+
            ' · '+(other.bpm||100)+' BPM'}
          {other.key?' · '+other.key:''}
        </Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:5,paddingLeft:26}}>
          {other.tracks.slice(0,4).map(track=>
            <View key={track.id} style={{borderRadius:7,paddingHorizontal:7,
              paddingVertical:4,borderWidth:1,borderColor:theme.border}}>
              <Text numberOfLines={1} style={{color:theme.foreground,
                fontSize:10,maxWidth:compact?95:150}}>
                {track.emoji||'♫'} {track.title}
              </Text>
            </View>)}
          {other.tracks.length>4?<Text style={{fontSize:10,
            color:theme.muted}}>+{other.tracks.length-4}</Text>:null}
        </View>
      </Pressable>)}
    {!version?<View style={{alignSelf:'flex-start',paddingTop:compact?4:10}}>
      {sources.length?
        button('Choisir une prise · 1re version',()=>setPickMode('start'),true,'add-outline'):
        button('Capturer ma première prise',onCapture,true,'mic-outline')}
    </View>:null}
    {converting?<Text style={{fontSize:12,color:PINK}}>
      Conversion MIDI en audio WAV… Le fichier d’origine est conservé.
    </Text>:null}
    {version&&versionExpanded?<View style={{gap:12}}>
      <View style={{flexDirection:'row',alignItems:'baseline',gap:10}}>
        <Text style={{fontSize:compact?18:22,fontWeight:'700',color:theme.foreground}}>
          Pistes · {version.tracks.length}
        </Text>
        <Text style={{fontSize:11,color:theme.muted}}>
          Studio de travail
        </Text>
      </View>
      <View style={{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'}}>
        {selectedTrackId&&version.tracks.some(t=>t.id===selectedTrackId)?
          button('Copier la piste',copySelectedTrack,false,'copy-outline'):
          <Text style={{fontSize:11,color:theme.muted}}>
            Choisis une piste pour la copier.
          </Text>}
        {copiedTrack?button('Coller'+(pasteCount?' · '+pasteCount:''),pasteTrack,false,'copy-outline'):null}
        {selectedTrackId&&version.tracks.some(t=>t.id===selectedTrackId)?
          button('Réglages',()=>{
            const track=version.tracks.find(t=>t.id===selectedTrackId)!;
            openTrack(track,project.files.find(f=>f.id===track.sourceFileId),true);
          },false,'options-outline'):null}
      </View>
      {availableSources.length?<MusicSourceBank files={availableSources} onAdd={add}/>:null}
      <MusicStudioTransport key={version.id} version={version} files={project.files}
        selectedTrackId={selectedTrackId}
        sections={project.sections} seekRequest={seekRequest}
        onPositionChange={setTimelineCursor}
        onTrackChange={editOneTrack}
        onRenameTrack={(id,title)=>editOneTrack(id,{title})}
        onEmojiTrack={(id,emoji)=>editOneTrack(id,{emoji})}
        onRemoveTrack={id=>{
          const remainingTracks=version.tracks.filter(t=>t.id!==id);
          if(remainingTracks.length)editTracks(remainingTracks);
          else {
            const remainingVersions=versions.filter(v=>v.id!==version.id);
            patch({musicNext:{...state,versions:remainingVersions,
              activeVersionId:remainingVersions[0]?.id,
              history:(state.history||[]).filter(entry=>entry.versionId!==version.id)}});
            setVersionMenu(false);
          }
          setEditTrack('');setSelectedTrackId('');metronome.stop();
        }}
        onDropSource={(id,time)=>{
          const file=project.files.find(f=>f.id===id);
          if(file&&availableSources.some(source=>source.id===file.id))add(file,time);
        }}
        onMarkTrackRange={(trackId,start,end)=>setRangeRequest(previous=>({
          trackId,start,end,nonce:(previous?.nonce||0)+1
        }))}
        onSelectTrack={id=>setSelectedTrackId(id)}
        playbackRequest={playbackRequest} pauseRequest={pauseRequest}/>
      {rangeRequest&&version.tracks.some(t=>t.id===rangeRequest.trackId)?(()=>{
        const track=version.tracks.find(t=>t.id===rangeRequest.trackId)!;
        const source=project.files.find(f=>f.id===track.sourceFileId);
        return <View style={{padding:13,borderRadius:13,
          borderWidth:1,borderColor:theme.border,backgroundColor:theme.surface,gap:8}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
            <Text style={{flex:1,fontSize:13,fontWeight:'700',color:theme.foreground}}>
              Repère · {track.title}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Fermer l’ajout du repère"
              onPress={()=>setRangeRequest(null)} style={{padding:7}}>
              <Ionicons name="close-outline" size={18} color={theme.muted}/>
            </Pressable>
          </View>
          <MusicAudioMarkers markers={track.markers||[]}
             sourceFiles={project.files} sections={project.sections}
            cursor={rangeRequest.start}
            duration={Math.max(source?.durationSeconds||0,rangeRequest.end)}
            rangeRequest={rangeRequest}
            onChange={markers=>{
              editOneTrack(track.id,{markers});setRangeRequest(null);
            }}
            onSeek={seconds=>setTimelineCursor(Math.max(0,
              track.offsetSeconds+seconds-(track.trimStartSeconds||0)))}/>
        </View>;
      })():null}

      <View style={{padding:12,borderRadius:12,
        backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:7,flexWrap:'wrap'}}>
          <Ionicons name="speedometer-outline" color={PINK} size={18}/>
          <Text style={{fontSize:12,fontWeight:'700',color:theme.foreground}}>Tempo</Text>
          <TextInput value={bpmInput} onChangeText={setBpmInput}
            onSubmitEditing={applyBpm} onBlur={applyBpm}
            keyboardType="numeric" accessibilityLabel="Tempo en BPM"
            style={{width:65,textAlign:'center',borderRadius:9,
              borderWidth:1,borderColor:theme.border,backgroundColor:theme.background,
              color:theme.foreground,fontSize:14,fontWeight:'700',paddingVertical:6}}/>
          <Text style={{fontSize:12,color:theme.muted}}>BPM</Text>
          <Pressable onPress={toggleClick} accessibilityRole="button"
            accessibilityLabel={metronome.running?
              'Arrêter le clic du métronome':'Démarrer le clic du métronome'}
            accessibilityState={{selected:metronome.running}}
            style={{flexDirection:'row',gap:6,alignItems:'center',
              minHeight:44,paddingHorizontal:10,borderRadius:10,
              backgroundColor:metronome.running?
                (theme.dark?'#452935':'#FAE9EF'):'transparent'}}>
            <Ionicons name={metronome.running?'stop-circle-outline':'pulse-outline'}
              color={metronome.running?PINK:theme.muted} size={19}/>
            <Text style={{fontSize:12,fontWeight:'600',color:metronome.running?
              PINK:theme.foreground}}>
              {metronome.running?'Arrêter le clic':'Métronome'}
            </Text>
          </Pressable>
        </View>
      </View>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:9}}>
        {button(recording?'Fermer l’enregistreur':'Enregistrer une prise',()=>{
          if(recording&&unsavedRecording){setConfirmClose(true);return;}
          if(!recording){setRecordOrigin(timelineCursor);setPauseRequest(n=>n+1);
            metronome.stop();}
          setRecording(!recording);
        },true,'radio-button-on-outline')}

      </View>
      {confirmClose?<View style={{borderWidth:1,borderColor:theme.border,
        borderRadius:12,padding:12,gap:9}}>
        <Text style={{color:theme.foreground,fontSize:12,lineHeight:19}}>
          Abandonner la prise non enregistrée ?
        </Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
          {button('Continuer',()=>setConfirmClose(false))}
          {button('Abandonner',()=>{
            metronome.stop();setRecording(false);setUnsavedRecording(false);setConfirmClose(false);
          })}
        </View>
      </View>:null}
      {recording?<View style={{backgroundColor:theme.surface,borderRadius:15,
        borderWidth:1,borderColor:theme.border,padding:compact?13:19,gap:13}}>
        <Text style={{fontSize:15,fontWeight:'700',color:theme.foreground}}>
          Nouvelle prise · à partir de {musicStamp(recordOrigin)}
        </Text>
        <Text style={{fontSize:12,lineHeight:19,color:theme.muted}}>
          La prise sera ajoutée automatiquement à cette version. Utilise un casque pour écouter les autres pistes.
        </Text>
        <MusicAudioCapture timelineStartSeconds={recordOrigin}
          onDraftChange={setUnsavedRecording}
          backingPositionSeconds={timelineCursor}
          onStarted={at=>{
            if(version&&!version.bpm)edit({...version,bpm:effectiveBpm});
            metronome.start(effectiveBpm,!!version?.metronomeMuted,meterBeats,recordOrigin+at);
            setPlaybackRequest(previous=>({
              at:recordOrigin+at,serial:(previous?.serial||0)+1
            }));
          }}
          onPaused={()=>{metronome.stop();setPauseRequest(n=>n+1);}}
          onSaved={(...args)=>{metronome.stop();saveTake(...args);}}/>
      </View>:null}

      <View style={{gap:12}}>
        <Pressable onPress={()=>setShowTracks(!showTracks)} accessibilityRole="button"
          accessibilityState={{expanded:showTracks}}
          style={{flexDirection:'row',alignItems:'center',gap:9,
            borderTopWidth:1,borderColor:theme.border,paddingVertical:11}}>
          <Ionicons name="options-outline" color={PINK} size={17}/>
          <Text style={{fontSize:14,fontWeight:'600',color:theme.foreground,flex:1}}>
            Réglages des pistes
          </Text>
          <Ionicons name={showTracks?'chevron-up':'chevron-down'}
            color={theme.muted} size={17}/>
        </Pressable>
        {showTracks?version.tracks.map(track=>{
          const source=project.files.find(file=>file.id===track.sourceFileId);
          return <View key={track.id} style={{paddingVertical:13,gap:9,
            borderTopWidth:1,borderColor:theme.border,opacity:track.muted?.65:1}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:9}}>
              <View style={{width:36,height:36,borderRadius:10,
                alignItems:'center',justifyContent:'center',
                backgroundColor:theme.dark?'#392A33':'#ECF0F2'}}>
                {track.emoji?<Text style={{fontSize:20}}>{track.emoji}</Text>:
                  <Ionicons name={track.instrument?.toLowerCase().includes('voix')?
                    'mic-outline':'musical-notes-outline'} size={17} color={PINK}/>}
              </View>
              <Pressable onPress={()=>{
                setSelectedTrackId(track.id);openTrack(track,source,true);
              }} style={{flex:1,gap:4}}>
                <Text style={{fontSize:14,fontWeight:'600',color:theme.foreground}}
                  numberOfLines={1}>{track.title}</Text>
                <Text style={{fontSize:11,color:theme.muted}}>
                  {track.instrument||'Piste'}{source?.durationSeconds?
                    ' · '+formatMusicDuration(source.durationSeconds):''}
                </Text>
              </Pressable>
              {tiny(track.muted?'volume-mute-outline':'volume-high-outline',
                'Couper ou réactiver '+track.title,()=>
                editTracks(version.tracks.map(t=>t.id===track.id?{...t,muted:!t.muted}:t)),track.muted)}
              {tiny('headset-outline','Solo '+track.title,()=>
                editTracks(version.tracks.map(t=>t.id===track.id?{...t,solo:!t.solo}:t)),track.solo)}
            </View>
            <Text style={{fontSize:11,color:theme.muted}}>
              Position {musicStamp(track.offsetSeconds)} · Coupe
              {musicStamp(track.trimStartSeconds||0)} – {musicStamp(track.trimEndSeconds??source?.durationSeconds??0)}
            </Text>
            {source&&!source.mimeType?.startsWith('audio/')&&/\.midi?$/i.test(source.originalFilename||'')?
              <Text style={{fontSize:11,color:theme.muted}}>
                Lecture MIDI à intégrer ultérieurement ; les notes originales restent conservées.
              </Text>:null}

          </View>;
        }):null}
      </View>

    </View>:null}
    {pickMode!=='none'?<View style={{borderWidth:1,borderColor:theme.border,borderRadius:15,
      padding:15,backgroundColor:theme.surface,gap:10}}>
      <Text style={{fontSize:14,fontWeight:'700',color:theme.foreground}}>
        {pickMode==='start'?'Choisis le début de cette version':'Ajouter depuis le carnet'}
      </Text>
      {sources.map(file=><Pressable key={file.id} onPress={()=>
        pickMode==='start'?first(file):add(file)}
        style={{minHeight:47,borderBottomWidth:1,borderColor:theme.border,
          flexDirection:'row',alignItems:'center',gap:12}}>
        <Ionicons name="musical-note-outline" size={19} color={PINK}/>
        <View style={{flex:1,gap:3}}>
          <Text style={{fontSize:13,color:theme.foreground}}>{file.title}</Text>
          <Text style={{fontSize:10,color:theme.muted}}>
            {file.durationSeconds!==undefined?formatMusicDuration(file.durationSeconds):
              file.originalFilename||'Matière créative'}
          </Text>
        </View>
        <Ionicons name="add-outline" size={19} color={PINK}/>
      </Pressable>)}
      {!sources.length?<Text style={{fontSize:12,color:theme.muted,lineHeight:19}}>
        Aucune prise audio ou MIDI disponible. Commence par capturer ta première mélodie.
      </Text>:null}
      <View style={{alignSelf:'flex-start',flexDirection:'row',gap:8,flexWrap:'wrap'}}>
        {button('Fermer',()=>setPickMode('none'))}
        {!sources.length?button('Aller à Capturer',()=>{setPickMode('none');onCapture();},true):null}
      </View>
    </View>:null}

    <Modal visible={confirmDelete} transparent animationType="fade"
      onRequestClose={()=>setConfirmDelete(false)}>
      <View style={{flex:1,alignItems:'center',justifyContent:'center',
        backgroundColor:'rgba(0,0,0,.55)',padding:20}}>
        <Pressable onPress={()=>setConfirmDelete(false)}
          style={{position:'absolute',top:0,bottom:0,left:0,right:0}}/>
        <View style={{backgroundColor:theme.surface,borderRadius:17,padding:21,
          width:'100%',maxWidth:400,gap:15}}>
          <Ionicons name="warning-outline" size={24} color={PINK}/>
          <Text style={{fontSize:17,fontWeight:'700',color:theme.foreground}}>
            Supprimer cette version ?
          </Text>
          <Text style={{fontSize:13,lineHeight:21,color:theme.muted}}>
            Supprimer définitivement {version?.title||'la version'} et son historique ?
            Les enregistrements originaux restent disponibles dans Capturer.
          </Text>
          <View style={{flexDirection:'row',gap:9,justifyContent:'flex-end'}}>
            {button('Annuler',()=>setConfirmDelete(false))}
            {button('Supprimer',()=>{
              if(!version)return;
              const remaining=state.versions.filter(v=>v.id!==version.id);
              patch({musicNext:{...state,versions:remaining,
                activeVersionId:remaining[0]?.id,
                history:(state.history||[]).filter(entry=>entry.versionId!==version.id)}});
              setConfirmDelete(false);setVersionMenu(false);
            },true)}
          </View>
        </View>
      </View>
    </Modal>
    <Modal visible={!!editTrack} transparent animationType="fade"
      onRequestClose={()=>setEditTrack('')}>
      <View style={{flex:1,justifyContent:'center',alignItems:'center',
        padding:16,backgroundColor:'rgba(0,0,0,.55)'}}>
        <Pressable onPress={()=>setEditTrack('')}
          style={{position:'absolute',top:0,bottom:0,left:0,right:0}}/>
        <View style={{width:'100%',maxWidth:465,borderRadius:17,
          padding:19,gap:14,backgroundColor:theme.surface}}>
          <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
            <Text style={{fontSize:17,fontWeight:'700',color:theme.foreground}}>
              Réglages de la piste
            </Text>
            <Pressable onPress={()=>setEditTrack('')} accessibilityLabel="Fermer">
              <Ionicons name="close" size={22} color={theme.muted}/>
            </Pressable>
          </View>
          {version?.tracks.filter(t=>t.id===editTrack).map(track=>{
            const source=project.files.find(f=>f.id===track.sourceFileId);
            return <View key={track.id} style={{gap:12}}>
              <Text numberOfLines={2} style={{fontSize:14,fontWeight:'600',
                color:theme.foreground}}>{track.title}</Text>
              <Text style={{fontSize:12,lineHeight:19,color:theme.muted}}>
                Modifier la position et les coupes sans toucher à l'audio original.
              </Text>
              <View style={{gap:6}}>
                <Text style={{fontSize:12,color:theme.muted}}>Position (secondes)</Text>
                <TextInput style={input} value={trackOffset} onChangeText={setTrackOffset}
                  keyboardType="decimal-pad" accessibilityLabel="Position en secondes"/>
                <Text style={{fontSize:12,color:theme.muted}}>Début de la source (secondes)</Text>
                <TextInput style={input} value={trimStart} onChangeText={setTrimStart}
                  keyboardType="decimal-pad" accessibilityLabel="Début de coupe en secondes"/>
                <Text style={{fontSize:12,color:theme.muted}}>Fin de la source (secondes)</Text>
                <TextInput style={input} value={trimEnd} onChangeText={setTrimEnd}
                  keyboardType="decimal-pad" accessibilityLabel="Fin de coupe en secondes"/>
              </View>
              <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
                {button('Annuler',()=>setEditTrack(''))}
                {button('Appliquer',()=>saveTrackTiming(track,source),true)}
              </View>
            </View>;
          })}
        </View>
      </View>
    </Modal>
    <Modal visible={infoOpen} animationType="slide" presentationStyle="pageSheet"
      onRequestClose={()=>setInfoOpen(false)}>
      <View style={{flex:1,backgroundColor:theme.background}}>
        <View style={{minHeight:57,flexDirection:'row',alignItems:'center',
          paddingHorizontal:18,borderBottomWidth:1,borderColor:theme.border}}>
          <Pressable onPress={()=>setInfoOpen(false)} accessibilityRole="button"
            accessibilityLabel="Retour à la version" style={{width:43,height:43,
              justifyContent:'center'}}>
            <Ionicons name="arrow-back" color={theme.foreground} size={22}/>
          </Pressable>
          <Text style={{fontSize:16,fontWeight:'700',color:theme.foreground,
            flex:1,textAlign:'center'}}>Structure et informations</Text>
          <View style={{width:43}}/>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled"
          contentContainerStyle={{padding:compact?16:27,
            paddingBottom:100,maxWidth:930,width:'100%',alignSelf:'center',gap:16}}>
          {version?<View style={{gap:5,paddingBottom:5}}>
            <Text style={{color:theme.foreground,fontSize:16,fontWeight:'700'}}>
              {version.title}
            </Text>
            <Text style={{color:theme.muted,fontSize:12}}>
              {version.tracks.length} pistes · {formatMusicDuration(versionLength(version,project.files))}
              {' · '+effectiveBpm+' BPM'}
              {version.meter?' · '+version.meter:''}
            </Text>
          </View>:null}
          {sectionPanel()}
          {version?<MusicLyricTimeline files={project.files}
            cues={version.lyricCues||[]} cursor={timelineCursor}
            onChange={lyricCues=>edit({...version,lyricCues})}
            onSeek={seconds=>{
              setSeekRequest(previous=>({at:seconds,serial:(previous?.serial||0)+1}));
              setVersionExpanded(true);setInfoOpen(false);
            }}/>:null}
          <View style={{borderTopWidth:1,borderColor:theme.border,paddingTop:7}}>
            <Pressable onPress={()=>setShowSongInfo(open=>!open)}
              accessibilityRole="button"
              accessibilityState={{expanded:showSongInfo}}
              style={{minHeight:46,flexDirection:'row',alignItems:'center',gap:9}}>
              <Ionicons name="information-circle-outline" color={PINK} size={19}/>
              <Text style={{flex:1,fontSize:13,fontWeight:'600',color:theme.foreground}}>
                Informations générales du morceau
              </Text>
              <Ionicons name={showSongInfo?'chevron-up':'chevron-down'}
                color={theme.muted} size={17}/>
            </Pressable>
            {showSongInfo?<View style={{gap:10,paddingTop:8}}>
              <Text style={{fontSize:11,color:theme.muted,lineHeight:18}}>
                Langue, styles et instruments du projet, communs à ses versions.
                Le tempo et la tonalité propres à la version se règlent ci-dessous.
              </Text>
              <MusicSongMetadata project={project} patch={patch} showTalent={false}/>
            </View>:null}
          </View>
          {version?<View style={{borderTopWidth:1,borderColor:theme.border,paddingTop:7}}>
            <Pressable onPress={()=>showSettings?setShowSettings(false):openSettings()}
              accessibilityRole="button" accessibilityState={{expanded:showSettings}}
              style={{minHeight:46,flexDirection:'row',alignItems:'center',gap:9}}>
              <Ionicons name="options-outline" color={PINK} size={19}/>
              <View style={{flex:1,gap:3}}>
                <Text style={{fontSize:13,fontWeight:'600',color:theme.foreground}}>
                  Réglages de cette version
                </Text>
                <Text style={{fontSize:11,color:theme.muted}}>
                  {effectiveBpm} BPM · {version.key||'Tonalité libre'}
                  {' · '+(version.meter||'4/4')}
                  {version.snapToBeat?' · Aimantation active':''}
                </Text>
              </View>
              <Ionicons name={showSettings?'chevron-up':'chevron-down'}
                color={theme.muted} size={17}/>
            </Pressable>
            {showSettings?<View style={{gap:12,paddingTop:12}}>
              <Text style={{fontSize:11,color:theme.muted}}>
                Ces paramètres concernent uniquement {version.title}.
              </Text>
              <View style={{flexDirection:'row',gap:9,flexWrap:'wrap'}}>
                <View style={{flex:1,minWidth:110,gap:5}}>
                  <Text style={{fontSize:11,color:theme.muted}}>Tempo (BPM)</Text>
                  <TextInput style={input} value={tempo}
                    onChangeText={setTempo} keyboardType="numeric"
                    placeholder="100" placeholderTextColor={theme.muted}/>
                </View>
                <View style={{flex:1,minWidth:110,gap:5}}>
                  <Text style={{fontSize:11,color:theme.muted}}>Mesure</Text>
                  <TextInput style={input} value={meter}
                    onChangeText={setMeter} placeholder="4/4"
                    placeholderTextColor={theme.muted}/>
                </View>
                <View style={{flex:1,minWidth:150,gap:5}}>
                  <Text style={{fontSize:11,color:theme.muted}}>Tonalité</Text>
                  <TextInput style={input} value={tone}
                    onChangeText={setTone} placeholder="Do majeur…"
                    placeholderTextColor={theme.muted}/>
                </View>
              </View>
              <Pressable onPress={()=>edit({...version,
                snapToBeat:!version.snapToBeat})}
                accessibilityRole="checkbox"
                accessibilityState={{checked:!!version.snapToBeat}}
                style={{flexDirection:'row',alignItems:'center',gap:8,minHeight:43}}>
                <Ionicons name={version.snapToBeat?'checkbox':'square-outline'}
                  size={19} color={PINK}/>
                <View style={{gap:3,flex:1}}>
                  <Text style={{fontSize:12,color:theme.foreground}}>
                    Aimantation des pistes aux temps
                  </Text>
                  <Text style={{fontSize:11,lineHeight:18,color:theme.muted}}>
                    Aligne les déplacements de clips sur le BPM.
                    Ne modifie ni l’audio ni le métronome.
                  </Text>
                </View>
              </Pressable>
              <View style={{alignSelf:'flex-start'}}>
                {button('Enregistrer les réglages',saveSettings,true)}
              </View>
            </View>:null}
          </View>:null}
        </ScrollView>
      </View>
    </Modal>
    {error?<Text style={{fontSize:12,color:'#B94A60',lineHeight:20}}>{error}</Text>:null}
    {version?<Text style={{fontSize:11,color:theme.muted,lineHeight:18}}>
      La lecture multipiste et l’enregistrement de retouches fonctionnent sur navigateur compatible.
      La lecture d’accompagnement commence au point choisi, mais sa latence peut varier selon
      le navigateur et le microphone ; un réglage manuel de la position reste possible.
    </Text>:null}
  </View>;
}
