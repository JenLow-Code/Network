import React,{useEffect,useState} from 'react';
import {Platform,Pressable,Text,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {MusicStudioTransport} from './MusicStudioTransportNext';
import {MusicAudioPeaks} from './MusicAudioPeaksNext';
import {MusicAudioCapture} from './MusicAudioCapture';
import {MusicAudioPreview} from './MusicAudioPreview';
import {MusicSongTabs} from './MusicSongTabs';
import {deleteUnassignedMusicTake} from '@/domain/musicLocalStorage';
import {musicNextState,makeWorkingVersion,makeWorkingTrack,changeWorkingVersion,
  undoWorkingVersion,isMusicTrackCandidate} from '@/domain/musicNext';
import {formatMusicDuration} from '@/domain/musicProjectSelectors';
import {newMusicId} from '@/domain/musicWorkspace';
import type {MusicProject,MusicProjectFile} from '@/domain/musicWorkspace';
import type {WorkingMusicVersion,WorkingMusicTrack} from '@/domain/musicNext';
const pink='#CB245C';
type Pending={id:string;filename:string;durationSeconds?:number};
export function MusicStudioV3({project,patch,onCapture}:{project:MusicProject;
  patch:(change:Partial<MusicProject>)=>void;onCapture:()=>void;}){
  const theme=useAppTheme();
  const state=musicNextState(project);
  const version=state.versions.find(v=>v.id===state.activeVersionId)||state.versions[0];
  const [versionMenu,setVersionMenu]=useState(false);
  const [chooseMode,setChooseMode]=useState<'none'|'first'|'add'>('none');
  const [recording,setRecording]=useState(false);
  const [pending,setPending]=useState<Pending|null>(null);
  const [deleteTake,setDeleteTake]=useState(false);
  const [trackMenu,setTrackMenu]=useState('');
  const [trackName,setTrackName]=useState('');
  const [settings,setSettings]=useState(false);
  const [section,setSection]=useState('');
  const [bpm,setBpm]=useState('');
  const [key,setKey]=useState('');
  const [meter,setMeter]=useState('');
  const [renaming,setRenaming]=useState(false);
  const [versionName,setVersionName]=useState('');
  const [deleting,setDeleting]=useState(false);
  const [error,setError]=useState('');
  const [legacy,setLegacy]=useState(false);
  const files=project.files||[];
  const sources=files.filter(isMusicTrackCandidate);
  useEffect(()=>{
    if(Platform.OS!=='web'||typeof window==='undefined'||!version)return;
    const handle=(e:KeyboardEvent)=>{
      const name=(e.target as HTMLElement|null)?.tagName||'';
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&
        !['INPUT','TEXTAREA'].includes(name)){
        e.preventDefault();patch({musicNext:undoWorkingVersion(state,version.id)});
      }
    };
    window.addEventListener('keydown',handle);
    return()=>window.removeEventListener('keydown',handle);
  },[state,version?.id]);
  const current=(next:WorkingMusicVersion)=>patch({musicNext:changeWorkingVersion(state,next)});
  const tracks=(list:WorkingMusicTrack[])=>{if(version)current({...version,tracks:list});};
  const first=(file:MusicProjectFile)=>{
    const created=makeWorkingVersion(file,state.versions.length+1);
    patch({musicNext:{...state,versions:[...state.versions,created],activeVersionId:created.id}});
    setChooseMode('none');setVersionMenu(false);
  };
  const add=(file:MusicProjectFile)=>{
    if(!version){first(file);return;}
    if(version.tracks.some(t=>t.sourceFileId===file.id)){
      setError('Cette prise est déjà utilisée dans cette version.');return;
    }
    tracks([...version.tracks,makeWorkingTrack(file)]);setChooseMode('none');setError('');
  };
  const keep=(to:'version'|'ideas')=>{
    if(!pending)return;
    const file:MusicProjectFile={
      id:newMusicId(),title:'Nouvelle prise',kind:'audio',sectionIds:[],
      localFileId:pending.id,originalFilename:pending.filename,
      mimeType:/\.m4a$/i.test(pending.filename)?'audio/mp4':'audio/webm',
      durationSeconds:pending.durationSeconds,createdAt:new Date().toISOString(),
    };
    if(to==='version'&&version){
      patch({files:[...files,file],musicNext:changeWorkingVersion(state,{
        ...version,tracks:[...version.tracks,makeWorkingTrack(file)],
      })});
    }else patch({files:[...files,file]});
    setPending(null);setRecording(false);setDeleteTake(false);
  };
  const discard=async()=>{
    if(!pending)return;
    try{await deleteUnassignedMusicTake(pending.id);
      setPending(null);setDeleteTake(false);setRecording(false);}
    catch{setError('Impossible de supprimer cette prise.');}
  };
  const openSettings=()=>{
    if(!version)return;
    setBpm(version.bpm===undefined?'':String(version.bpm));
    setKey(version.key||'');setMeter(version.meter||'4/4');
    setSettings(!settings);
  };
  const saveSettings=()=>{
    if(!version)return;
    const value=bpm.trim()?Number(bpm):undefined;
    if(value!==undefined&&(!Number.isFinite(value)||value<=0||value>400)){
      setError('Tempo non valide.');return;
    }
    current({...version,bpm:value,key:key.trim()||undefined,meter:meter.trim()||undefined});
    setSettings(false);setError('');
  };
  const field={backgroundColor:theme.surface,borderColor:theme.border,borderWidth:1,
    borderRadius:10,paddingVertical:10,paddingHorizontal:12,
    color:theme.foreground,fontSize:13} as const;
  const small=(label:string,fn:()=>void,primary=false)=>{
    return <Pressable onPress={fn} accessibilityRole="button"
      style={{alignSelf:'flex-start',minHeight:40,
        backgroundColor:primary?pink:theme.surface,
        borderColor:theme.border,borderWidth:primary?0:1,
        borderRadius:11,paddingVertical:10,paddingHorizontal:15,
        flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6}}>
      <Text style={{fontSize:12,fontWeight:'600',
        color:primary?'#fff':theme.foreground}}>{label}</Text>
    </Pressable>;
  };
  const icon=(name:keyof typeof Ionicons.glyphMap,label:string,fn:()=>void,
    selected=false)=><Pressable onPress={fn} accessibilityRole="button"
    accessibilityLabel={label} accessibilityState={{selected}}
    style={{width:40,height:40,alignItems:'center',justifyContent:'center',
      backgroundColor:selected?(theme.dark?'#3D2732':'#FCE7EE'):'transparent',
      borderRadius:11}}>
    <Ionicons name={name} size={20} color={selected?pink:theme.muted}/>
  </Pressable>;
  return <View style={{gap:18}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:9}}>
      <Pressable onPress={()=>setVersionMenu(!versionMenu)}
        accessibilityRole="button" accessibilityState={{expanded:versionMenu}}
        style={{flex:1,gap:4,paddingVertical:4,
          flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
        <View style={{gap:3}}>
          <Text style={{color:theme.muted,fontSize:11}}>VERSION DE TRAVAIL</Text>
          <Text style={{color:theme.foreground,fontSize:22,fontWeight:'700'}}>
            {version?.title||'Aucune version'}
          </Text>
        </View>
        <Ionicons name={versionMenu?'chevron-up':'chevron-down'}
          size={20} color={pink}/>
      </Pressable>
      {version?icon('arrow-undo-outline','Annuler',()=>
        patch({musicNext:undoWorkingVersion(state,version.id)})):null}
    </View>
    {versionMenu?<View style={{backgroundColor:theme.surface,borderRadius:14,
      padding:13,borderWidth:1,borderColor:theme.border,gap:6}}>
      {state.versions.map(v=><Pressable key={v.id}
        onPress={()=>{patch({musicNext:{...state,activeVersionId:v.id}});
          setVersionMenu(false);setSettings(false);}}
        accessibilityRole="button" style={{minHeight:47,flexDirection:'row',
          alignItems:'center',gap:9}}>
        <Ionicons name={v.id===version?.id?'checkmark-circle':'ellipse-outline'}
          color={v.id===version?.id?pink:theme.muted} size={19}/>
        <Text style={{fontSize:13,color:theme.foreground,flex:1}}>
          {v.title}
        </Text>
        <Text style={{fontSize:11,color:theme.muted}}>{v.tracks.length} pistes</Text>
      </Pressable>)}
      {small('Nouvelle version',()=>{
        setVersionMenu(false);setChooseMode('first');
      })}
      {version?<View style={{gap:9,paddingTop:8,
        borderTopWidth:1,borderColor:theme.border}}>
        <Pressable onPress={()=>{setVersionName(version.title);setRenaming(!renaming);}}
          style={{paddingVertical:7}}>
          <Text style={{fontSize:12,color:theme.muted}}>Renommer la version</Text>
        </Pressable>
        {renaming?<View style={{flexDirection:'row',gap:8,alignItems:'center'}}>
          <TextInput value={versionName} onChangeText={setVersionName}
            placeholder="Nom de la version" placeholderTextColor={theme.muted}
            style={{...field,flex:1}}/>
          {small('OK',()=>{
            if(versionName.trim())current({...version,title:versionName.trim()});
            setRenaming(false);
          },true)}
        </View>:null}
        <Pressable onPress={()=>setDeleting(!deleting)} style={{paddingVertical:7}}>
          <Text style={{fontSize:12,color:theme.muted}}>Supprimer cette version…</Text>
        </Pressable>
        {deleting?<View style={{gap:8,padding:11,borderRadius:12,
          backgroundColor:theme.dark?'#3A262C':'#FBEDEF'}}>
          <Text style={{fontSize:12,lineHeight:19,color:theme.foreground}}>
            Supprimer définitivement {version.title} et son historique ?
            Les enregistrements d’origine resteront dans le carnet.
          </Text>
          <View style={{flexDirection:'row',gap:9,flexWrap:'wrap'}}>
            {small('Supprimer définitivement',()=>{
              const remaining=state.versions.filter(v=>v.id!==version.id);
              patch({musicNext:{...state,versions:remaining,
                activeVersionId:remaining[0]?.id,
                history:(state.history||[]).filter(e=>e.versionId!==version.id)}});
              setDeleting(false);setVersionMenu(false);
            },true)}
            {small('Annuler',()=>setDeleting(false))}
          </View>
        </View>:null}
      </View>:null}
      {!!project.versions.length?<Pressable
        onPress={()=>setLegacy(!legacy)} style={{paddingVertical:10}}>
        <Text style={{fontSize:12,color:theme.muted}}>
          {legacy?'Masquer':'Voir'} les anciennes versions enregistrées
        </Text>
      </Pressable>:null}
      {legacy?project.versions.map(v=><View key={v.id} style={{gap:9}}>
        <Text style={{color:theme.foreground,fontWeight:'600',fontSize:12}}>{v.title}</Text>
        <MusicAudioPreview source={v}/>
      </View>):null}
    </View>:null}
    {!version?<View style={{padding:25,borderRadius:18,
      backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,gap:12}}>
      <Ionicons name="musical-notes-outline" size={30} color={pink}/>
      <Text style={{fontSize:17,fontWeight:'700',color:theme.foreground}}>
        Une première piste suffit.
      </Text>
      <Text style={{fontSize:12,lineHeight:20,color:theme.muted}}>
        Choisis une mélodie ou une prise existante. Rien d'autre ne sera ajouté
        automatiquement à cette version.
      </Text>
      {small('Créer Version 1',()=>setChooseMode('first'),true)}
      {small('Continuer à capturer',onCapture)}
    </View>:null}
    {version?<View style={{gap:14}}>
      <MusicStudioTransport key={version.id} version={version} files={files}/>
      <View style={{flexDirection:'row',alignItems:'center',gap:7,flexWrap:'wrap'}}>
        {small(version.bpm?version.bpm+' BPM':'Tempo —',openSettings)}
        {small(version.key||'Tonalité —',openSettings)}
        {small(version.meter||'4/4',openSettings)}
      </View>
      {settings?<View style={{gap:9,padding:13,borderWidth:1,borderColor:theme.border,
        backgroundColor:theme.surface,borderRadius:14}}>
        <Text style={{fontSize:12,color:theme.muted}}>
          Repères musicaux de cette version, modifiables à tout moment.
        </Text>
        <TextInput value={bpm} onChangeText={setBpm} keyboardType="numeric"
          placeholder="Tempo de base" placeholderTextColor={theme.muted} style={field}/>
        <TextInput value={key} onChangeText={setKey}
          placeholder="Tonalité (si connue)" placeholderTextColor={theme.muted} style={field}/>
        <TextInput value={meter} onChangeText={setMeter}
          placeholder="Mesure" placeholderTextColor={theme.muted} style={field}/>
        {small('Enregistrer',saveSettings,true)}
      </View>:null}
      <MusicSongTabs project={project} activeSectionId={section}
        onSelect={setSection} patch={patch}/>
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
        <Text style={{color:theme.foreground,fontSize:16,fontWeight:'700'}}>
          Les pistes
        </Text>
        <Text style={{color:theme.muted,fontSize:12}}>{version.tracks.length}</Text>
      </View>
      {version.tracks.map(t=>{
        const source=files.find(f=>f.id===t.sourceFileId);
        return <View key={t.id} style={{borderWidth:1,borderColor:theme.border,
          borderRadius:16,backgroundColor:theme.surface,
          padding:13,gap:11,opacity:t.muted?.65:1}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
            <View style={{width:37,height:37,borderRadius:10,
              backgroundColor:theme.dark?'#3C3038':'#F7EEF0',
              justifyContent:'center',alignItems:'center'}}>
              <Ionicons name="musical-notes-outline" size={19} color={pink}/>
            </View>
            <Pressable onPress={()=>{setTrackMenu(trackMenu===t.id?'':t.id);
              setTrackName(t.title);}} style={{flex:1,gap:3}}>
              <Text style={{color:theme.foreground,fontSize:13,fontWeight:'700'}}
                numberOfLines={1}>{t.title}</Text>
              <Text style={{color:theme.muted,fontSize:10}}>
                {t.instrument||'Piste'}{source?.durationSeconds?
                  ' · '+formatMusicDuration(source.durationSeconds):''}
              </Text>
            </Pressable>
            {icon(t.muted?'volume-mute-outline':'volume-high-outline',
              'Couper ou réactiver '+t.title,()=>tracks(version.tracks.map(x=>
                x.id===t.id?{...x,muted:!x.muted}:x)),t.muted)}
            {icon('headset-outline','Écouter uniquement '+t.title,
              ()=>tracks(version.tracks.map(x=>x.id===t.id?{
                ...x,solo:!x.solo}:x)),t.solo)}
          </View>
          <MusicAudioPeaks file={source} muted={t.muted}/>
          {trackMenu===t.id?<View style={{gap:9,paddingTop:7,
            borderTopWidth:1,borderColor:theme.border}}>
            <TextInput style={field} value={trackName}
              onChangeText={setTrackName} placeholder="Nom de piste"/>
            <View style={{flexDirection:'row',flexWrap:'wrap',gap:9}}>
              {small('Renommer',()=>{
                tracks(version.tracks.map(x=>x.id===t.id?{...x,title:trackName}:x));
                setTrackMenu('');
              })}
              {small('Retirer de la version',()=>{
                tracks(version.tracks.filter(x=>x.id!==t.id));setTrackMenu('');
              })}
              {small('Fermer',()=>setTrackMenu(''))}
            </View>
            <Text style={{fontSize:11,color:theme.muted}}>
              Retirer une piste ne supprime jamais l'enregistrement original.
            </Text>
          </View>:null}
        </View>;
      })}
      <View style={{flexDirection:'row',gap:9}}>
        <Pressable onPress={()=>setRecording(!recording)}
          accessibilityRole="button" accessibilityLabel="Enregistrer une nouvelle prise"
          style={{flex:1,backgroundColor:pink,borderRadius:13,
            minHeight:49,flexDirection:'row',alignItems:'center',
            justifyContent:'center',gap:9}}>
          <Ionicons name="radio-button-on" color="#fff" size={19}/>
          <Text style={{color:'#fff',fontSize:13,fontWeight:'700'}}>Enregistrer</Text>
        </Pressable>
        {icon('add-circle-outline','Ajouter une piste existante',
          ()=>setChooseMode(chooseMode==='add'?'none':'add'))}
      </View>
    </View>:null}
    {chooseMode!=='none'?<View style={{gap:8,padding:13,
      backgroundColor:theme.surface,borderWidth:1,
      borderColor:theme.border,borderRadius:14}}>
      <Text style={{color:theme.foreground,fontSize:14,fontWeight:'700'}}>
        {chooseMode==='first'?'Choisis une première prise':'Une piste à ajouter'}
      </Text>
      {sources.map(f=><Pressable key={f.id} onPress={()=>
        chooseMode==='first'?first(f):add(f)}
        style={{flexDirection:'row',alignItems:'center',gap:11,
          minHeight:47,borderBottomWidth:1,borderColor:theme.border}}>
        <Ionicons name="musical-note-outline" size={18} color={pink}/>
        <Text style={{flex:1,color:theme.foreground,fontSize:13}}>{f.title}</Text>
        <Ionicons name="add" size={17} color={pink}/>
      </Pressable>)}
      {!sources.length?<Text style={{color:theme.muted,fontSize:12}}>
        Aucune prise disponible. Enregistre une première idée dans le carnet.
      </Text>:null}
      {small('Fermer',()=>setChooseMode('none'))}
    </View>:null}
    {recording?<View style={{gap:12,backgroundColor:theme.surface,
      borderWidth:1,borderColor:theme.border,
      padding:13,borderRadius:16}}>
      <View style={{flexDirection:'row',alignItems:'center',
        justifyContent:'space-between'}}>
        <Text style={{fontSize:14,fontWeight:'700',color:theme.foreground}}>
          Nouvelle prise
        </Text>
        {icon('close-outline','Fermer',()=>setRecording(false))}
      </View>
      {!pending?<MusicAudioCapture onSaved={(id,filename,durationSeconds)=>{
        setPending({id,filename,durationSeconds});setDeleteTake(false);
      }}/>:<View style={{gap:11}}>
        <MusicAudioPreview source={{localAudioId:pending.id}}/>
        <Text style={{fontSize:12,color:theme.muted}}>
          Que veux-tu faire de cette prise ?
        </Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
          {small('Garder dans la version',()=>keep('version'),true)}
          {small('Garder dans le carnet',()=>keep('ideas'))}
          {small('Jeter',()=>setDeleteTake(true))}
        </View>
        {deleteTake?<View style={{gap:8}}>
          <Text style={{fontSize:12,color:theme.muted}}>
            Supprimer définitivement cette prise non attribuée ?
          </Text>
          <View style={{flexDirection:'row',gap:9}}>
            {small('Supprimer',()=>{void discard();},true)}
            {small('Annuler',()=>setDeleteTake(false))}
          </View>
        </View>:null}
      </View>}
    </View>:null}
    {error?<Text style={{fontSize:12,color:'#B34D67'}}>{error}</Text>:null}
  </View>;
}
