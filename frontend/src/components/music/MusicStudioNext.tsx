import React,{useEffect,useState} from 'react';
import {Platform,Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {MusicAudioCapture} from './MusicAudioCapture';
import {MusicAudioPreview} from './MusicAudioPreview';
import {MusicStudioTransport} from './MusicStudioTransportNext';
import {MusicAudioPeaks} from './MusicAudioPeaksNext';
import {MusicSongTabs} from './MusicSongTabs';
import {deleteUnassignedMusicTake} from '@/domain/musicLocalStorage';
import {formatMusicDuration} from '@/domain/musicProjectSelectors';
import {musicNextState,changeWorkingVersion,undoWorkingVersion,
  makeWorkingTrack,makeWorkingVersion,isPlayableMusicFile} from '@/domain/musicNext';
import {newMusicId} from '@/domain/musicWorkspace';
import type {MusicProject,MusicProjectFile} from '@/domain/musicWorkspace';
import type {WorkingMusicVersion,WorkingMusicTrack} from '@/domain/musicNext';

const pink='#CB245C';
type Pending={id:string;fileName:string;durationSeconds?:number};
type Props={project:MusicProject;patch:(changes:Partial<MusicProject>)=>void;
  onCapture:()=>void;};
export function MusicStudioNext({project,patch,onCapture}:Props){
  const theme=useAppTheme();
  const state=musicNextState(project);
  const versions=state.versions;
  const version=versions.find(v=>v.id===state.activeVersionId)||versions[0];
  const [showVersions,setShowVersions]=useState(false);
  const [showSources,setShowSources]=useState(false);
  const [sourceMode,setSourceMode]=useState<'new'|'add'>('add');
  const [deletingVersion,setDeletingVersion]=useState('');
  const [showRecord,setShowRecord]=useState(false);
  const [pending,setPending]=useState<Pending|null>(null);
  const [confirmDiscard,setConfirmDiscard]=useState(false);
  const [error,setError]=useState('');
  const [section,setSection]=useState('');
  const [editingName,setEditingName]=useState(false);
  const [editingMusical,setEditingMusical]=useState(false);
  const [bpm,setBpm]=useState('');
  const [tonality,setTonality]=useState('');
  const [meter,setMeter]=useState('');
  const [renamingTrack,setRenamingTrack]=useState('');
  const [trackMenu,setTrackMenu]=useState('');
  const [confirmRemove,setConfirmRemove]=useState('');
  const [legacyOpen,setLegacyOpen]=useState(false);
  const files=project.files||[];
  useEffect(()=>{
    if(Platform.OS!=='web'||typeof window==='undefined'||!version)return;
    const handle=(e:KeyboardEvent)=>{
      const node=e.target as HTMLElement|null;
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&
        !['INPUT','TEXTAREA'].includes(node?.tagName||'')){
        e.preventDefault();
        patch({musicNext:undoWorkingVersion(state,version.id)});
      }
    };
    window.addEventListener('keydown',handle);
    return()=>window.removeEventListener('keydown',handle);
  },[version?.id,state]);
  const playable=files.filter(isPlayableMusicFile);
  const input={backgroundColor:theme.surface,borderColor:theme.border,borderWidth:1,
    borderRadius:10,paddingHorizontal:11,paddingVertical:9,
    color:theme.foreground,fontSize:12} as const;
  const update=(next:WorkingMusicVersion)=>{
    patch({musicNext:changeWorkingVersion(state,next)});
  };
  const updateTracks=(tracks:WorkingMusicTrack[])=>{
    if(version)update({...version,tracks});
  };
  const startVersion=(file:MusicProjectFile)=>{
    const next=makeWorkingVersion(file,versions.length+1);
    patch({musicNext:{...state,activeVersionId:next.id,versions:[...versions,next]}});
    setShowVersions(false);setShowSources(false);
  };
  const addTrack=(f:MusicProjectFile)=>{
    if(!version){startVersion(f);return;}
    if(version.tracks.some(t=>t.sourceFileId===f.id)){
      setError('Cette prise est déjà utilisée dans cette version.');return;
    }
    updateTracks([...version.tracks,makeWorkingTrack(f)]);
    setShowSources(false);setError('');
  };
  const keepRecorded=(where:'version'|'capture')=>{
    if(!pending)return;
    const f:MusicProjectFile={id:newMusicId(),title:'Nouvelle prise',
      kind:'audio',localFileId:pending.id,originalFilename:pending.fileName,
      mimeType:/\.m4a$/i.test(pending.fileName)?'audio/mp4':'audio/webm',
      sectionIds:[],durationSeconds:pending.durationSeconds,createdAt:new Date().toISOString()};
    const updatedFiles=[...files,f];
    if(where==='capture'||!version){patch({files:updatedFiles});}
    else{
      const track=makeWorkingTrack(f);
      patch({files:updatedFiles,musicNext:changeWorkingVersion(state,{
        ...version,tracks:[...version.tracks,track],
      })});
    }
    setShowRecord(false);setPending(null);setConfirmDiscard(false);setError('');
  };
  const discard=async()=>{
    if(!pending)return;
    try{await deleteUnassignedMusicTake(pending.id);
      setPending(null);setConfirmDiscard(false);setShowRecord(false);
    }catch{setError('Impossible de supprimer la prise de cet appareil.');}
  };
  const saveMusic=()=>{
    if(!version)return;
    const parsed=bpm.trim()?Number(bpm):undefined;
    if(bpm.trim()&&(!Number.isFinite(parsed)||parsed!<1||parsed!>400)){
      setError('Choisis un tempo de base entre 1 et 400 BPM.');return;
    }
    update({...version,bpm:parsed,key:tonality.trim()||undefined,
      meter:meter.trim()||undefined});
    setEditingMusical(false);setError('');
  };
  const openMusicEditor=()=>{
    if(!version)return;
    setBpm(version.bpm!==undefined?String(version.bpm):'');
    setTonality(version.key||'');setMeter(version.meter||'4/4');setEditingMusical(true);
  };
  const iconButton=(icon:keyof typeof Ionicons.glyphMap,label:string,onPress:()=>void,
    selected=false)=><Pressable accessibilityRole="button" accessibilityLabel={label}
    onPress={onPress} style={{width:37,height:38,alignItems:'center',
      justifyContent:'center',borderRadius:10,
      backgroundColor:selected?(theme.dark?'#462A3A':'#FAE9EF'):'transparent'}}>
    <Ionicons name={icon} color={selected?pink:theme.muted} size={20}/>
  </Pressable>;
  const action=(title:string,onPress:()=>void,strong=false)=><Pressable
    onPress={onPress} accessibilityRole="button"
    style={{minHeight:40,paddingHorizontal:13,paddingVertical:10,
      borderRadius:10,alignItems:'center',justifyContent:'center',
      backgroundColor:strong?pink:theme.surface,borderWidth:strong?0:1,
      borderColor:theme.border}}>
    <Text style={{color:strong?'#fff':theme.foreground,fontSize:12,fontWeight:'600'}}>
      {title}
    </Text>
  </Pressable>;
  const drawTrack=(track:WorkingMusicTrack)=>{
    const source=files.find(f=>f.id===track.sourceFileId);
    const muted=track.muted;
    return <View key={track.id} style={{gap:8,paddingHorizontal:10,paddingVertical:11,
      backgroundColor:theme.surface,borderRadius:13,borderWidth:1,
      borderColor:theme.border,opacity:muted?.7:1}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
        <View style={{width:34,height:34,borderRadius:10,backgroundColor:theme.dark?'#402D38':'#F7EAF0',
          alignItems:'center',justifyContent:'center'}}>
          <Ionicons name={track.instrument?.toLowerCase().includes('voix')?'mic-outline':
            'musical-notes-outline'} color={pink} size={18}/>
        </View>
        <Pressable onPress={()=>setRenamingTrack(renamingTrack===track.id?'':track.id)}
          style={{flex:1,gap:3}}>
          <Text numberOfLines={1} style={{color:theme.foreground,fontSize:13,fontWeight:'700'}}>
            {track.title}
          </Text>
          <Text style={{color:theme.muted,fontSize:11}}>
            {track.instrument||'Piste'}{source?.durationSeconds!==undefined?
              ' · '+formatMusicDuration(source.durationSeconds):''}
          </Text>
        </Pressable>
        {iconButton(muted?'volume-mute-outline':'volume-high-outline',
          muted?'Réactiver '+track.title:'Couper le son de '+track.title,
          ()=>updateTracks(version!.tracks.map(t=>t.id===track.id?{...t,muted:!t.muted}:t)),
          muted)}
        <Pressable onPress={()=>updateTracks(version!.tracks.map(t=>t.id===track.id?{
          ...t,solo:!t.solo}:t))}
          accessibilityRole="button" accessibilityLabel={'Solo '+track.title}
          style={{minWidth:30,minHeight:34,borderRadius:8,justifyContent:'center',
            alignItems:'center',backgroundColor:track.solo?(theme.dark?'#462A3A':'#FBEAF0'):
              'transparent'}}>
          <Text style={{color:track.solo?pink:theme.muted,fontWeight:'700',fontSize:12}}>S</Text>
        </Pressable>
        {iconButton('ellipsis-horizontal','Options de '+track.title,()=>setTrackMenu(
          trackMenu===track.id?'':track.id))}
      </View>
      <View style={{paddingLeft:42,paddingRight:4}}>
        <MusicAudioPeaks file={source} muted={muted}/>
      </View>
      {renamingTrack===track.id?<View style={{gap:8}}>
        <TextInput value={track.title} onChangeText={title=>updateTracks(
          version!.tracks.map(t=>t.id===track.id?{...t,title}:t))}
          style={input} placeholder="Nom de la piste" placeholderTextColor={theme.muted}/>
        <TextInput value={track.instrument||''} onChangeText={instrument=>updateTracks(
          version!.tracks.map(t=>t.id===track.id?{...t,instrument}:t))}
          style={input} placeholder="Instrument (facultatif)" placeholderTextColor={theme.muted}/>
        {action('Terminé',()=>setRenamingTrack(''))}
      </View>:null}
      {trackMenu===track.id?<View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
        {action('Retirer de la version',()=>setConfirmRemove(track.id))}
        {action('Fermer',()=>setTrackMenu(''))}
      </View>:null}
      {confirmRemove===track.id?<View style={{gap:8}}>
        <Text style={{color:theme.muted,fontSize:11}}>
          La prise d'origine restera dans la matière créative du morceau.
        </Text>
        <View style={{flexDirection:'row',gap:8}}>
          {action('Retirer la piste',()=>{
            updateTracks(version!.tracks.filter(t=>t.id!==track.id));
            setConfirmRemove('');setTrackMenu('');
          },true)}
          {action('Annuler',()=>setConfirmRemove(''))}
        </View>
      </View>:null}
    </View>;
  };
  return <View style={{gap:15}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
      <View style={{flex:1,gap:4}}>
        <Text style={{fontSize:18,fontWeight:'700',color:theme.foreground}}>
          Atelier musical
        </Text>
        <Text style={{fontSize:12,color:theme.muted}}>
          {version?'Ta version, à ton rythme.':'Une version commence par une première piste.'}
        </Text>
      </View>
      {version?iconButton('arrow-undo-outline','Annuler la dernière modification',
        ()=>patch({musicNext:undoWorkingVersion(state,version.id)})):null}
    </View>
    <Pressable onPress={()=>setShowVersions(!showVersions)} accessibilityRole="button"
      accessibilityState={{expanded:showVersions}}
      style={{flexDirection:'row',alignItems:'center',gap:10,minHeight:48,
        borderBottomWidth:1,borderColor:theme.border,paddingBottom:8}}>
      <Ionicons name="layers-outline" color={pink} size={21}/>
      <View style={{flex:1,gap:4}}>
        <Text style={{fontSize:14,fontWeight:'700',color:theme.foreground}}>
          {version?.title||'Aucune version pour le moment'}
        </Text>
        <Text style={{fontSize:11,color:theme.muted}}>
          {version?'Version de travail':'Les éléments restent indépendants'}
        </Text>
      </View>
      <Ionicons name={showVersions?'chevron-up':'chevron-down'} color={theme.muted} size={18}/>
    </Pressable>
    {showVersions?<View style={{gap:9,padding:11,borderWidth:1,borderColor:theme.border,
      borderRadius:13,backgroundColor:theme.surface}}>
      {versions.map(v=><Pressable key={v.id}
        onPress={()=>{patch({musicNext:{...state,activeVersionId:v.id}});
          setShowVersions(false);setEditingMusical(false);}}
        style={{minHeight:42,flexDirection:'row',alignItems:'center',gap:9}}>
        <Ionicons name={v.id===version?.id?'radio-button-on':'radio-button-off'}
          size={18} color={v.id===version?.id?pink:theme.muted}/>
        <Text style={{flex:1,color:theme.foreground,fontSize:12}}>{v.title}</Text>
        <Text style={{color:theme.muted,fontSize:10}}>{v.tracks.length} piste(s)</Text>
      </Pressable>)}
      {versions.length>0?<Pressable
        onPress={()=>setDeletingVersion(deletingVersion?'':version?.id||'')}
        style={{alignSelf:'flex-start',paddingVertical:7}}>
        <Text style={{color:theme.muted,fontSize:11}}>Supprimer une version…</Text>
      </Pressable>:null}
      {!!deletingVersion?<View style={{gap:9}}>
        <Text style={{fontSize:11,color:theme.muted}}>
          Supprimer définitivement cette version et son historique ? Les enregistrements
          originaux restent disponibles dans la matière créative.
        </Text>
        <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
          {action('Supprimer définitivement',()=>{
            const remain=state.versions.filter(v=>v.id!==deletingVersion);
            patch({musicNext:{...state,versions:remain,
              history:(state.history||[]).filter(e=>e.versionId!==deletingVersion),
              activeVersionId:remain[0]?.id}});
            setDeletingVersion('');setShowVersions(false);
          },true)}
          {action('Annuler',()=>setDeletingVersion(''))}
        </View>
      </View>:null}
      <View style={{borderTopWidth:1,borderColor:theme.border,paddingTop:10,gap:8}}>
        <Text style={{fontSize:11,color:theme.muted}}>
          Pour une autre version, choisis une première prise de ta matière créative.
        </Text>
        {action('Créer une autre version',()=>{
          setSourceMode('new');setShowSources(true);setShowVersions(false);
        })}
        {!!project.versions.length?action('Versions de l’ancien atelier',
          ()=>setLegacyOpen(!legacyOpen)):null}
        {legacyOpen?project.versions.map(v=><View key={v.id} style={{gap:7}}>
          <Text style={{fontSize:12,color:theme.foreground}}>{v.title}</Text>
          <MusicAudioPreview source={v}/>
        </View>):null}
      </View>
    </View>:null}
    {!version?<View style={{gap:12,padding:17,backgroundColor:theme.surface,
      borderWidth:1,borderColor:theme.border,borderRadius:15}}>
      <Ionicons name="musical-notes-outline" size={28} color={pink}/>
      <Text style={{color:theme.foreground,fontWeight:'700',fontSize:14}}>
        Prête à devenir une chanson ?
      </Text>
      <Text style={{color:theme.muted,fontSize:12,lineHeight:19}}>
        Choisis une prise audio existante comme première piste. Tu peux continuer à capturer des
        idées sans créer de version.
      </Text>
      {action('Choisir ma première piste',()=>{
        setSourceMode('new');setShowSources(true);
      },true)}
      {action('Continuer à capturer',onCapture)}
    </View>:null}
    {version?<View style={{gap:12}}>
      <MusicStudioTransport key={version.id} version={version} files={files}/>
      <Pressable onPress={editingMusical?()=>setEditingMusical(false):openMusicEditor}
        style={{flexDirection:'row',gap:10,alignItems:'center',justifyContent:'space-between',
          paddingVertical:9}}>
        <Text style={{color:theme.muted,fontSize:11}}>Tempo {version.bpm??'—'} BPM</Text>
        <Text style={{color:theme.muted,fontSize:11}}>Tonalité {version.key||'—'}</Text>
        <Text style={{color:theme.muted,fontSize:11}}>Mesure {version.meter||'—'}</Text>
        <Ionicons name="pencil-outline" size={16} color={pink}/>
      </Pressable>
      {editingMusical?<View style={{padding:11,borderWidth:1,borderColor:theme.border,
        borderRadius:12,gap:9}}>
        <Text style={{fontSize:11,color:theme.muted}}>
          Ces repères sont facultatifs. Les changements de tempo dans le morceau
          seront définis dans l’éditeur musical avancé.
        </Text>
        <TextInput style={input} keyboardType="numeric" value={bpm}
          onChangeText={setBpm} placeholder="Tempo de base (BPM)" placeholderTextColor={theme.muted}/>
        <TextInput style={input} value={tonality} onChangeText={setTonality}
          placeholder="Tonalité, si connue" placeholderTextColor={theme.muted}/>
        <TextInput style={input} value={meter} onChangeText={setMeter}
          placeholder="Mesure (ex. 4/4)" placeholderTextColor={theme.muted}/>
        {action('Enregistrer',saveMusic,true)}
      </View>:null}
      {editingName?<TextInput style={input} autoFocus value={version.title}
        onBlur={()=>setEditingName(false)}
        onChangeText={title=>update({...version,title})}/>:
        <Pressable accessibilityRole="button" accessibilityLabel="Renommer cette version"
          onPress={()=>setEditingName(true)} style={{alignSelf:'flex-start',
            flexDirection:'row',alignItems:'center',gap:6,paddingVertical:4}}>
          <Text style={{fontSize:12,color:theme.muted}}>Renommer la version</Text>
          <Ionicons name="pencil-outline" size={14} color={theme.muted}/>
        </Pressable>}
      <MusicSongTabs project={project} activeSectionId={section}
        onSelect={setSection} patch={patch}/>
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
        <Text style={{fontWeight:'700',fontSize:15,color:theme.foreground}}>Pistes</Text>
        <Text style={{fontSize:11,color:theme.muted}}>{version.tracks.length}</Text>
      </View>
      {version.tracks.map(drawTrack)}
      {!version.tracks.length?<Text style={{fontSize:12,color:theme.muted}}>
        Aucune piste actuellement. Tu peux reprendre une prise existante.
      </Text>:null}
      <View style={{flexDirection:'row',gap:9}}>
        <Pressable onPress={()=>setShowRecord(!showRecord)} accessibilityRole="button"
          style={{flex:1,backgroundColor:pink,borderRadius:12,minHeight:48,
            flexDirection:'row',alignItems:'center',justifyContent:'center',gap:9}}>
          <Ionicons name="radio-button-on" color="#fff" size={20}/>
          <Text style={{fontSize:13,color:'#fff',fontWeight:'700'}}>Enregistrer</Text>
        </Pressable>
        <Pressable onPress={()=>{setSourceMode('add');setShowSources(!showSources);}}
          accessibilityRole="button" accessibilityLabel="Ajouter une piste existante"
          style={{width:49,height:48,alignItems:'center',justifyContent:'center',
            borderWidth:1,borderColor:theme.border,borderRadius:12,
            backgroundColor:theme.surface}}>
          <Ionicons name="add" size={23} color={pink}/>
        </Pressable>
      </View>
      {showRecord?<View style={{borderWidth:1,borderColor:theme.border,
        backgroundColor:theme.surface,borderRadius:13,padding:12,gap:8}}>
        <Text style={{fontSize:12,color:theme.muted,lineHeight:18}}>
          Écoute les autres pistes avec un casque, puis enregistre ta nouvelle prise.
          Tu choisis ensuite ce que tu souhaites conserver.
        </Text>
        {!pending?<MusicAudioCapture onSaved={(id,fileName,durationSeconds)=>{
          setPending({id,fileName,durationSeconds});setConfirmDiscard(false);
        }}/>:null}
        {pending?<View style={{gap:10}}>
          <Text style={{fontWeight:'700',fontSize:13,color:theme.foreground}}>
            Nouvelle prise enregistrée
          </Text>
          <MusicAudioPreview source={{localAudioId:pending.id}}/>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
            {action('Garder dans la version',()=>keepRecorded('version'),true)}
            {action('Garder comme idée',()=>keepRecorded('capture'))}
            {action('Jeter la prise',()=>setConfirmDiscard(true))}
          </View>
          {confirmDiscard?<View style={{gap:8}}>
            <Text style={{fontSize:11,color:theme.muted}}>
              Supprimer définitivement cet enregistrement non attribué ?
            </Text>
            <View style={{flexDirection:'row',gap:8}}>
              {action('Supprimer',()=>{void discard();},true)}
              {action('Annuler',()=>setConfirmDiscard(false))}
            </View>
          </View>:null}
        </View>:null}
        {!pending? action('Fermer',()=>setShowRecord(false)):null}
      </View>:null}
    </View>:null}
    {showSources?<View style={{gap:10,borderRadius:13,borderWidth:1,
      borderColor:theme.border,backgroundColor:theme.surface,padding:12}}>
      <Text style={{fontWeight:'700',fontSize:13,color:theme.foreground}}>
        {sourceMode==='new'||!version?'Choisir la première piste':'Utiliser une prise existante'}
      </Text>
      {!playable.length?<Text style={{fontSize:12,color:theme.muted}}>
        Aucune prise audio disponible. Enregistre ou importe un son d’abord.
      </Text>:null}
      {playable.map(f=><Pressable key={f.id}
        accessibilityRole="button" onPress={()=>{if(sourceMode==='new'||!version)startVersion(f);else addTrack(f);}}
        style={{flexDirection:'row',alignItems:'center',gap:9,minHeight:43,
          borderBottomWidth:1,borderColor:theme.border}}>
        <Ionicons name="musical-note-outline" color={pink} size={18}/>
        <Text style={{flex:1,color:theme.foreground,fontSize:12}} numberOfLines={1}>
          {f.title}
        </Text>
        <Ionicons name="add-circle-outline" color={pink} size={19}/>
      </Pressable>)}
      {action('Fermer',()=>setShowSources(false))}
    </View>:null}
    {error?<Text style={{color:'#B34D67',fontSize:12}}>{error}</Text>:null}
  </View>;
}
