import React,{useState} from 'react';
import {Pressable,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {MusicAudioCapture} from './MusicAudioCapture';
import {MusicAudioPreview} from './MusicAudioPreview';
import {MusicAudioPeaks} from './MusicAudioPeaksNext';
import {MusicStudioTransport} from './MusicStudioTransportNext';
import {MusicSongTabs} from './MusicSongTabs';
import {deleteUnassignedMusicTake} from '@/domain/musicLocalStorage';
import {musicNextState,makeWorkingVersion,makeWorkingTrack,
  changeWorkingVersion,undoWorkingVersion,isMusicTrackCandidate} from '@/domain/musicNext';
import {formatMusicDuration} from '@/domain/musicProjectSelectors';
import {newMusicId} from '@/domain/musicWorkspace';
import type {MusicProject,MusicProjectFile} from '@/domain/musicWorkspace';
import type {WorkingMusicTrack,WorkingMusicVersion} from '@/domain/musicNext';

const PINK='#CB245C';
type Props={project:MusicProject;patch:(changes:Partial<MusicProject>)=>void;onCapture:()=>void};
type Pending={id:string;filename:string;durationSeconds?:number};
type PickMode='none'|'start'|'add';

export function MusicCreateExperience({project,patch,onCapture}:Props) {
  const theme=useAppTheme();
  const {width}=useWindowDimensions();
  const compact=width<600;
  const state=musicNextState(project);
  const version=state.versions.find(v=>v.id===state.activeVersionId)||state.versions[0];
  const sources=project.files.filter(isMusicTrackCandidate);
  const [versionMenu,setVersionMenu]=useState(false);
  const [pickMode,setPickMode]=useState<PickMode>('none');
  const [recording,setRecording]=useState(false);
  const [pending,setPending]=useState<Pending|null>(null);
  const [confirmDiscard,setConfirmDiscard]=useState(false);
  const [confirmDelete,setConfirmDelete]=useState(false);
  const [editTrack,setEditTrack]=useState('');
  const [trackTitle,setTrackTitle]=useState('');
  const [showSettings,setShowSettings]=useState(false);
  const [showSections,setShowSections]=useState(false);
  const [sectionId,setSectionId]=useState('');
  const [tempo,setTempo]=useState('');
  const [meter,setMeter]=useState('');
  const [tone,setTone]=useState('');
  const [error,setError]=useState('');
  const input={backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,
    borderRadius:10,paddingHorizontal:12,paddingVertical:10,fontSize:13,
    color:theme.foreground} as const;
  const edit=(updated:WorkingMusicVersion)=>
    patch({musicNext:changeWorkingVersion(state,updated)});
  const editTracks=(tracks:WorkingMusicTrack[])=>{
    if(version)edit({...version,tracks});
  };
  const first=(file:MusicProjectFile)=>{
    const created=makeWorkingVersion(file,state.versions.length+1);
    patch({musicNext:{...state,versions:[...state.versions,created],activeVersionId:created.id}});
    setPickMode('none');setVersionMenu(false);setError('');
  };
  const add=(file:MusicProjectFile)=>{
    if(!version){first(file);return;}
    if(version.tracks.some(t=>t.sourceFileId===file.id)){
      setError('Cette prise est déjà présente dans cette version.');return;
    }
    editTracks([...version.tracks,makeWorkingTrack(file)]);
    setPickMode('none');setError('');
  };
  const copyVersion=()=>{
    if(!version)return;
    const now=new Date().toISOString();
    const next:WorkingMusicVersion={...version,id:newMusicId(),
      title:'Version '+(state.versions.length+1),createdAt:now,updatedAt:now,
      tracks:version.tracks.map(track=>({...track,id:newMusicId()}))};
    patch({musicNext:{...state,versions:[...state.versions,next],activeVersionId:next.id}});
    setVersionMenu(false);setShowSettings(false);
  };
  const keep=(target:'version'|'notebook')=>{
    if(!pending)return;
    const item:MusicProjectFile={id:newMusicId(),title:'Nouvelle prise',kind:'audio',
      sectionIds:[],localFileId:pending.id,originalFilename:pending.filename,
      mimeType:/\.m4a$/i.test(pending.filename)?'audio/mp4':'audio/webm',
      durationSeconds:pending.durationSeconds,createdAt:new Date().toISOString()};
    if(target==='version'&&version){
      patch({files:[...project.files,item],musicNext:changeWorkingVersion(state,{
        ...version,tracks:[...version.tracks,makeWorkingTrack(item)]
      })});
    }else patch({files:[...project.files,item]});
    setPending(null);setRecording(false);setConfirmDiscard(false);setError('');
  };
  const discard=async()=>{
    if(!pending)return;
    try{
      await deleteUnassignedMusicTake(pending.id);
      setPending(null);setConfirmDiscard(false);setRecording(false);
    }catch{setError('Impossible de supprimer cette prise sur cet appareil.');}
  };
  const openSettings=()=>{
    if(!version)return;
    setTempo(version.bpm===undefined?'':String(version.bpm));
    setTone(version.key||'');
    setMeter(version.meter||'');
    setShowSettings(!showSettings);
  };
  const saveSettings=()=>{
    if(!version)return;
    const bpm=tempo.trim()?Number(tempo):undefined;
    if(bpm!==undefined&&(!Number.isFinite(bpm)||bpm<1||bpm>400)){
      setError('Le tempo doit être un nombre entre 1 et 400.');return;
    }
    edit({...version,bpm,key:tone.trim()||undefined,meter:meter.trim()||undefined});
    setError('');setShowSettings(false);
  };
  const button=(label:string,fn:()=>void,primary=false,icon?:keyof typeof Ionicons.glyphMap)=>
    <Pressable onPress={fn} accessibilityRole="button"
      style={{minHeight:43,flexDirection:'row',gap:8,alignItems:'center',justifyContent:'center',
        backgroundColor:primary?PINK:theme.surface,borderRadius:12,
        borderWidth:primary?0:1,borderColor:theme.border,paddingHorizontal:15,paddingVertical:10}}>
      {icon?<Ionicons name={icon} size={17} color={primary?'#fff':PINK}/>:null}
      <Text style={{fontSize:12,fontWeight:'700',color:primary?'#fff':theme.foreground}}>{label}</Text>
    </Pressable>;
  const tiny=(icon:keyof typeof Ionicons.glyphMap,label:string,fn:()=>void,active=false)=>
    <Pressable onPress={fn} accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{selected:active}}
      style={{width:39,height:39,alignItems:'center',justifyContent:'center',
        backgroundColor:active?(theme.dark?'#3D2934':'#FAE8EE'):'transparent',
        borderRadius:10}}>
      <Ionicons name={icon} size={19} color={active?PINK:theme.muted}/>
    </Pressable>;
  return <View style={{gap:22}}>
    <View style={{gap:7}}>
      <Text style={{fontSize:22,fontWeight:'700',color:theme.foreground}}>Faire vivre la chanson.</Text>
      <Text style={{fontSize:13,lineHeight:21,color:theme.muted,maxWidth:560}}>
        Assemble tes prises dans des versions différentes. Les idées originales restent dans le carnet.
      </Text>
    </View>
    <View style={{gap:11}}>
      <View style={{flexDirection:'row',gap:10,alignItems:'center'}}>
        <Pressable onPress={()=>setVersionMenu(!versionMenu)} accessibilityRole="button"
          accessibilityState={{expanded:versionMenu}}
          style={{flex:1,flexDirection:'row',gap:10,alignItems:'center',paddingVertical:7}}>
          <View style={{flex:1,gap:4}}>
            <Text style={{fontSize:10,color:theme.muted,letterSpacing:1,fontWeight:'700'}}>
              VERSION DE TRAVAIL
            </Text>
            <Text style={{fontSize:compact?21:25,fontWeight:'700',color:theme.foreground}}>
              {version?.title||'Aucune version'}
            </Text>
          </View>
          <Ionicons name={versionMenu?'chevron-up':'chevron-down'} color={PINK} size={19}/>
        </Pressable>
        {version?tiny('arrow-undo-outline','Annuler la dernière modification',()=>{
          patch({musicNext:undoWorkingVersion(state,version.id)});
        }):null}
      </View>
      {versionMenu?<View style={{padding:15,backgroundColor:theme.surface,borderRadius:15,
        borderWidth:1,borderColor:theme.border,gap:8}}>
        {state.versions.map(v=><Pressable key={v.id} accessibilityRole="button"
          onPress={()=>{patch({musicNext:{...state,activeVersionId:v.id}});setVersionMenu(false);}}
          style={{flexDirection:'row',alignItems:'center',gap:10,minHeight:39}}>
          <Ionicons name={v.id===version?.id?'checkmark-circle':'ellipse-outline'}
            color={v.id===version?.id?PINK:theme.muted} size={20}/>
          <Text style={{color:theme.foreground,fontSize:13,flex:1}}>{v.title}</Text>
          <Text style={{color:theme.muted,fontSize:11}}>{v.tracks.length} pistes</Text>
        </Pressable>)}
        {version?button('Créer une variante de cette version',copyVersion,false,'git-branch-outline'):null}
        {button('Créer une version à partir d’une autre prise',()=>{
          setPickMode('start');setVersionMenu(false);
        },false,'add-outline')}
        {version?<Pressable onPress={()=>setConfirmDelete(!confirmDelete)} style={{paddingVertical:7}}>
          <Text style={{fontSize:12,color:theme.muted}}>Supprimer cette version…</Text>
        </Pressable>:null}
        {confirmDelete&&version?<View style={{padding:11,gap:10,
          backgroundColor:theme.dark?'#38282E':'#FBEEF1',borderRadius:12}}>
          <Text style={{fontSize:12,lineHeight:19,color:theme.foreground}}>
            Supprimer définitivement {version.title} et son historique ?
            Les enregistrements originaux seront conservés dans Capturer.
          </Text>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
            {button('Supprimer la version',()=>{
              const remaining=state.versions.filter(v=>v.id!==version.id);
              patch({musicNext:{...state,versions:remaining,
                activeVersionId:remaining[0]?.id,
                history:(state.history||[]).filter(entry=>entry.versionId!==version.id)}});
              setConfirmDelete(false);setVersionMenu(false);
            },true)}
            {button('Annuler',()=>setConfirmDelete(false))}
          </View>
        </View>:null}
        {!!project.versions.length?<View style={{gap:9,borderTopWidth:1,
          borderColor:theme.border,paddingTop:12}}>
          <Text style={{fontSize:12,fontWeight:'700',color:theme.foreground}}>Anciennes versions publiées</Text>
          {project.versions.map(v=><View key={v.id} style={{gap:7}}>
            <Text style={{fontSize:12,color:theme.muted}}>{v.title}</Text>
            <MusicAudioPreview source={v}/>
          </View>)}
        </View>:null}
      </View>:null}
    </View>
    {!version?<View style={{gap:14,paddingVertical:26,borderTopWidth:1,
      borderBottomWidth:1,borderColor:theme.border}}>
      <Ionicons name="radio-outline" color={PINK} size={30}/>
      <Text style={{fontSize:17,color:theme.foreground,fontWeight:'700'}}>
        Ta première version commence avec une piste.
      </Text>
      <Text style={{fontSize:13,color:theme.muted,lineHeight:21,maxWidth:480}}>
        Choisis une prise enregistrée dans Capturer. Aucun autre élément ne sera ajouté automatiquement.
      </Text>
      <View style={{alignSelf:'flex-start',gap:9}}>
        {button('Choisir ma première piste',()=>setPickMode('start'),true,'add-outline')}
        {button('Retourner à mes idées',onCapture)}
      </View>
    </View>:null}
    {version?<View style={{gap:20}}>
      <MusicStudioTransport key={version.id} version={version} files={project.files}/>
      <View style={{flexDirection:'row',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <Text style={{fontSize:12,color:theme.muted}}>
          {version.bpm?version.bpm+' BPM':'Tempo libre'}
          {version.key?' · '+version.key:''}
          {version.meter?' · '+version.meter:''}
        </Text>
        <Pressable onPress={openSettings} accessibilityRole="button"
          style={{flexDirection:'row',alignItems:'center',gap:4,paddingVertical:6}}>
          <Ionicons name="options-outline" size={16} color={PINK}/>
          <Text style={{fontSize:12,color:PINK}}>Repères musicaux</Text>
        </Pressable>
      </View>
      {showSettings?<View style={{gap:10,padding:14,borderRadius:14,
        borderWidth:1,borderColor:theme.border,backgroundColor:theme.surface}}>
        <Text style={{fontSize:12,color:theme.muted,lineHeight:19}}>
          Ces indications sont facultatives. Aucune tonalité ni aucun tempo ne sont déduits sans analyse.
        </Text>
        <TextInput style={input} keyboardType="numeric" value={tempo} onChangeText={setTempo}
          placeholder="Tempo en BPM (si connu)" placeholderTextColor={theme.muted}/>
        <TextInput style={input} value={tone} onChangeText={setTone}
          placeholder="Tonalité (si connue)" placeholderTextColor={theme.muted}/>
        <TextInput style={input} value={meter} onChangeText={setMeter}
          placeholder="Mesure, p. ex. 4/4" placeholderTextColor={theme.muted}/>
        <View style={{alignSelf:'flex-start'}}>{button('Conserver les repères',saveSettings,true)}</View>
      </View>:null}
      <View style={{gap:12}}>
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
          <Text style={{fontSize:17,fontWeight:'700',color:theme.foreground}}>Pistes</Text>
          <Text style={{fontSize:12,color:theme.muted}}>{version.tracks.length}</Text>
        </View>
        {version.tracks.map(track=>{
          const source=project.files.find(file=>file.id===track.sourceFileId);
          return <View key={track.id} style={{paddingVertical:13,gap:9,
            borderTopWidth:1,borderColor:theme.border,opacity:track.muted?.65:1}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:9}}>
              <View style={{width:36,height:36,borderRadius:10,
                alignItems:'center',justifyContent:'center',
                backgroundColor:theme.dark?'#392A33':'#F5E7EC'}}>
                <Ionicons name={track.instrument?.toLowerCase().includes('voix')?'mic-outline':
                  'musical-notes-outline'} size={17} color={PINK}/>
              </View>
              <Pressable onPress={()=>{setEditTrack(editTrack===track.id?'':track.id);
                setTrackTitle(track.title);}} style={{flex:1,gap:4}}>
                <Text style={{fontSize:14,fontWeight:'600',color:theme.foreground}}
                  numberOfLines={1}>{track.title}</Text>
                <Text style={{fontSize:11,color:theme.muted}}>
                  {track.instrument||'Piste'}{source?.durationSeconds?
                    ' · '+formatMusicDuration(source.durationSeconds):''}
                </Text>
              </Pressable>
              {tiny('volume-mute-outline','Silencieux '+track.title,()=>
                editTracks(version.tracks.map(t=>t.id===track.id?{...t,muted:!t.muted}:t)),track.muted)}
              {tiny('headset-outline','Solo '+track.title,()=>
                editTracks(version.tracks.map(t=>t.id===track.id?{...t,solo:!t.solo}:t)),track.solo)}
            </View>
            <MusicAudioPeaks file={source} muted={track.muted}/>
            {source&&!source.mimeType?.startsWith('audio/')&&/\.midi?$/i.test(source.originalFilename||'')?
              <Text style={{fontSize:11,color:theme.muted}}>
                Lecture MIDI à intégrer ultérieurement ; les notes originales restent conservées.
              </Text>:null}
            {editTrack===track.id?<View style={{gap:9,padding:12,
              backgroundColor:theme.surface,borderRadius:12}}>
              <TextInput style={input} value={trackTitle} onChangeText={setTrackTitle}
                placeholder="Nom de la piste"/>
              <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
                {button('Renommer',()=>{
                  if(trackTitle.trim())editTracks(version.tracks.map(t=>t.id===track.id
                    ?{...t,title:trackTitle.trim()}:t));
                  setEditTrack('');
                })}
                {button('Retirer de la version',()=>{
                  editTracks(version.tracks.filter(t=>t.id!==track.id));setEditTrack('');
                })}
              </View>
              <Text style={{fontSize:11,color:theme.muted}}>
                L'enregistrement original restera disponible dans Capturer.
              </Text>
            </View>:null}
          </View>;
        })}
      </View>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:9}}>
        {button(recording?'Fermer l’enregistreur':'Enregistrer une prise',()=>{
          if(pending)return;setRecording(!recording);
        },true,'radio-button-on-outline')}
        {button('Ajouter une piste',()=>setPickMode(pickMode==='add'?'none':'add'),false,'add-outline')}
      </View>
      {recording?<View style={{backgroundColor:theme.surface,borderRadius:15,
        borderWidth:1,borderColor:theme.border,padding:compact?13:19,gap:13}}>
        <Text style={{fontSize:15,fontWeight:'700',color:theme.foreground}}>Nouvelle prise</Text>
        {!pending?<MusicAudioCapture onSaved={(id,filename,durationSeconds)=>
          setPending({id,filename,durationSeconds})}/>:
          <View style={{gap:13}}>
            <MusicAudioPreview source={{localAudioId:pending.id}}/>
            <Text style={{color:theme.foreground,fontWeight:'600',fontSize:13}}>
              Que veux-tu conserver ?
            </Text>
            <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
              {button('Dans cette version',()=>keep('version'),true)}
              {button('Dans le carnet',()=>keep('notebook'))}
              {button('Jeter la prise',()=>setConfirmDiscard(true))}
            </View>
            {confirmDiscard?<View style={{gap:10}}>
              <Text style={{fontSize:12,color:theme.muted}}>
                Supprimer définitivement cette prise encore non attribuée ?
              </Text>
              <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
                {button('Oui, supprimer',()=>{void discard();},true)}
                {button('Annuler',()=>setConfirmDiscard(false))}
              </View>
            </View>:null}
          </View>}
      </View>:null}
      <View style={{borderTopWidth:1,borderColor:theme.border,paddingTop:14}}>
        <Pressable onPress={()=>setShowSections(!showSections)}
          style={{flexDirection:'row',alignItems:'center',gap:9,minHeight:40}}>
          <Ionicons name="list-outline" size={18} color={PINK}/>
          <Text style={{flex:1,fontSize:13,fontWeight:'600',color:theme.foreground}}>
            Parties de la chanson
          </Text>
          <Ionicons name={showSections?'chevron-up':'chevron-down'} color={theme.muted} size={17}/>
        </Pressable>
        {showSections?<MusicSongTabs project={project} patch={patch}
          activeSectionId={sectionId} onSelect={setSectionId}/>:null}
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
    {error?<Text style={{fontSize:12,color:'#B94A60',lineHeight:20}}>{error}</Text>:null}
    {version?<Text style={{fontSize:11,color:theme.muted,lineHeight:18}}>
      La lecture multipiste est actuellement prise en charge sur navigateur compatible.
      Pour enregistrer par-dessus une piste, utilise un casque : la compensation automatique de latence
      n'est pas encore disponible.
    </Text>:null}
  </View>;
}
