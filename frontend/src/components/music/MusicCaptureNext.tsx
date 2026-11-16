import React,{useState} from 'react';
import {Platform,Pressable,Text,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {MusicAudioCapture} from './MusicAudioCapture';
import {MusicAudioPreview} from './MusicAudioPreview';
import {importSongFile,classifySongFile,lyricStanzas} from '@/domain/musicImportedFiles';
import {newMusicId} from '@/domain/musicWorkspace';
import {isPlayableMusicFile,isMusicTrackCandidate} from '@/domain/musicNext';
import {formatMusicDuration} from '@/domain/musicProjectSelectors';
import {getDraftAttachment} from '@/domain/musicLocalStorage';
import type {MusicProject,MusicProjectFile,MusicSection} from '@/domain/musicWorkspace';

const pink='#CB245C';
const sectionNames=['Intro','Couplet','Refrain','Pont','Solo','Outro'];
type Props={project:MusicProject;patch:(change:Partial<MusicProject>)=>void;
  onStartVersion:(file:MusicProjectFile)=>void;onUseFile:(file:MusicProjectFile)=>void;
  activeVersion:boolean;};
function iconFor(file:MusicProjectFile):keyof typeof Ionicons.glyphMap {
  if(/\.(png|jpg|jpeg|webp)$/i.test(file.originalFilename||''))return 'image-outline';
  return file.kind==='lyrics'?'document-text-outline':file.kind==='audio'?'mic-outline':
    file.kind==='track'?'musical-note-outline':file.kind==='score'?'document-attach-outline':
    file.kind==='note'?'reader-outline':file.kind==='idea'?'bulb-outline':'document-outline';
}
const isImage=(f:MusicProjectFile)=>/\.(png|jpg|jpeg|webp)$/i.test(f.originalFilename||'');
const typeName=(f:MusicProjectFile)=>isImage(f)?'Image':
  f.kind==='lyrics'?'Paroles':f.kind==='audio'?'Audio':f.kind==='track'?'Piste':
  f.kind==='score'?'Partition':f.kind==='note'?'Note':f.kind==='idea'?'Idée':'Document';

export function MusicCaptureSpace({project,patch,onStartVersion,onUseFile,activeVersion}:Props){
  const theme=useAppTheme();
  const [action,setAction]=useState<'none'|'record'|'write'>('none');
  const [newText,setNewText]=useState('');
  const [newTitle,setNewTitle]=useState('');
  const [newKind,setNewKind]=useState<'note'|'lyrics'>('note');
  const [expanded,setExpanded]=useState('');
  const [showSections,setShowSections]=useState('');
  const [showType,setShowType]=useState('');
  const [customSection,setCustomSection]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const files=project.files||[];
  const input={borderWidth:1,borderColor:theme.border,backgroundColor:theme.surface,
    borderRadius:10,paddingHorizontal:12,paddingVertical:10,fontSize:13,
    color:theme.foreground} as const;
  const update=(id:string,change:Partial<MusicProjectFile>)=>
    patch({files:files.map(f=>f.id===id?{...f,...change}:f)});
  const addRecorded=(localFileId:string,name:string,durationSeconds?:number)=>{
    const f:MusicProjectFile={id:newMusicId(),title:'Nouvelle prise',kind:'audio',
      originalFilename:name,localFileId,durationSeconds,
      mimeType:/\.m4a$/i.test(name)?'audio/mp4':'audio/webm',sectionIds:[],
      createdAt:new Date().toISOString()};
    patch({files:[...files,f]});setAction('none');setExpanded(f.id);
  };
  const addNote=()=>{
    const f:MusicProjectFile={id:newMusicId(),title:newTitle.trim()||
      (newKind==='lyrics'?'Paroles':'Note'),kind:newKind,sectionIds:[],
      text:newText,language:newKind==='lyrics'?project.originalLanguage:undefined,
      lyricSegments:newKind==='lyrics'?lyricStanzas(newText):undefined,
      createdAt:new Date().toISOString()};
    patch({files:[...files,f]});setNewText('');setNewTitle('');
    setAction('none');setExpanded(f.id);
  };
  const importFile=()=>{
    if(Platform.OS!=='web'||typeof document==='undefined'){
      setError('L’import est disponible dans le navigateur web.');return;
    }
    const picker=document.createElement('input');
    picker.type='file';
    picker.accept='.doc,.docx,.txt,.md,.pdf,.png,.jpg,.jpeg,.webp,.mp3,.wav,.m4a,.ogg,.webm,.aac,.mid,.midi';
    picker.multiple=true;
    picker.onchange=()=>{
      const chosen=Array.from(picker.files||[]);
      if(!chosen.length)return;
      setBusy(true);setError('');
      void (async()=>{
        const imported:MusicProjectFile[]=[];
        for(const file of chosen){
          const item=await importSongFile(file,project.originalLanguage);
          imported.push(isImage(item)?{...item,kind:'idea'}:item);
        }
        patch({files:[...files,...imported]});setExpanded(imported[0].id);
      })().catch(e=>setError(e instanceof Error?e.message:'Import impossible.'))
        .finally(()=>setBusy(false));
    };
    picker.click();
  };
  const sectionFor=(section:string):MusicSection|undefined=>
    project.sections.find(s=>s.title.toLowerCase()===section.toLowerCase());
  const toggleSection=(file:MusicProjectFile,section:MusicSection)=>{
    const chosen=file.sectionIds||[];
    update(file.id,{sectionIds:chosen.includes(section.id)?chosen.filter(id=>id!==section.id):
      [...chosen,section.id]});
  };
  const chooseSection=(file:MusicProjectFile,name:string)=>{
    const found=sectionFor(name);
    if(found){toggleSection(file,found);return;}
    const newPart:MusicSection={id:newMusicId(),title:name};
    patch({sections:[...project.sections,newPart],
      files:files.map(f=>f.id===file.id?{...f,sectionIds:[...(f.sectionIds||[]),newPart.id]}:f)});
    setCustomSection('');
  };
  const openOriginal=async(f:MusicProjectFile)=>{
    if(!f.localFileId||typeof document==='undefined')return;
    const blob=await getDraftAttachment(f.localFileId);
    if(!blob){setError('Fichier introuvable sur cet appareil.');return;}
    const uri=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=uri;a.download=f.originalFilename||f.title;
    a.click();setTimeout(()=>URL.revokeObjectURL(uri),60000);
  };
  const chip=(name:string,selected:boolean,fn:()=>void)=><Pressable key={name}
    onPress={fn} accessibilityRole="button"
    style={{paddingHorizontal:11,paddingVertical:8,borderWidth:1,
      borderColor:selected?pink:theme.border,borderRadius:17,
      backgroundColor:selected?(theme.dark?'#422B36':'#FBEAF0'):theme.surface}}>
    <Text style={{fontSize:11,color:selected?pink:theme.foreground}}>{name}</Text>
  </Pressable>;
  return <View style={{gap:16}}>
    <View style={{gap:5}}>
      <Text style={{fontSize:18,fontWeight:'700',color:theme.foreground}}>Matière créative</Text>
      <Text style={{fontSize:12,color:theme.muted,lineHeight:19}}>
        Tout ce que tu captures reste libre. Tu décideras si et quand l'utiliser dans une version.
      </Text>
    </View>
    <View style={{flexDirection:'row',gap:9}}>
      {([
        {name:'Enregistrer',icon:'mic-outline' as const,run:()=>setAction(action==='record'?'none':'record')},
        {name:'Importer',icon:'cloud-upload-outline' as const,run:importFile},
        {name:'Écrire',icon:'create-outline' as const,run:()=>setAction(action==='write'?'none':'write')},
      ]).map(item=><Pressable key={item.name} disabled={busy} accessibilityRole="button"
        onPress={item.run} style={{flex:1,backgroundColor:theme.surface,
        minHeight:80,borderRadius:15,borderWidth:1,borderColor:theme.border,
        justifyContent:'center',alignItems:'center',gap:9,padding:10}}>
        <Ionicons name={item.icon} size={22} color={pink}/>
        <Text style={{fontWeight:'600',fontSize:12,color:theme.foreground}}>{item.name}</Text>
      </Pressable>)}
    </View>
    {action==='record'?<View style={{padding:13,backgroundColor:theme.surface,
      borderRadius:14,borderWidth:1,borderColor:theme.border}}>
      <MusicAudioCapture onSaved={addRecorded}/>
    </View>:null}
    {action==='write'?<View style={{padding:13,backgroundColor:theme.surface,
      borderRadius:14,borderWidth:1,borderColor:theme.border,gap:9}}>
      <View style={{flexDirection:'row',gap:7}}>
        {chip('Note',newKind==='note',()=>setNewKind('note'))}
        {chip('Paroles',newKind==='lyrics',()=>setNewKind('lyrics'))}
      </View>
      <TextInput placeholder="Titre (facultatif)" placeholderTextColor={theme.muted}
        style={input} value={newTitle} onChangeText={setNewTitle}/>
      <TextInput placeholder={newKind==='lyrics'?'Tes paroles, même incomplètes…':'Écris librement…'}
        placeholderTextColor={theme.muted} multiline textAlignVertical="top"
        style={{...input,minHeight:115}} value={newText} onChangeText={setNewText}/>
      <View style={{flexDirection:'row',gap:9,alignItems:'center'}}>
        <Pressable onPress={addNote} disabled={!newText.trim()}
          style={{backgroundColor:pink,borderRadius:9,paddingHorizontal:14,
            paddingVertical:10,opacity:newText.trim()?1:0.45}}>
          <Text style={{color:'#fff',fontWeight:'700',fontSize:12}}>Conserver</Text>
        </Pressable>
        {chip('Annuler',false,()=>setAction('none'))}
      </View>
    </View>:null}
    {error?<Text style={{color:'#B34D67',fontSize:12}}>{error}</Text>:null}
    <View style={{gap:3}}>
      <Text style={{color:theme.foreground,fontWeight:'700',fontSize:15}}>Tes éléments</Text>
      <Text style={{fontSize:11,color:theme.muted}}>
        {files.length} élément{files.length>1?'s':''}
      </Text>
    </View>
    {!files.length?<View style={{borderWidth:1,borderStyle:'dashed',
      borderColor:theme.border,borderRadius:15,padding:20,gap:7,alignItems:'center'}}>
      <Ionicons name="musical-notes-outline" color={pink} size={28}/>
      <Text style={{fontSize:12,color:theme.muted,textAlign:'center'}}>
        Une idée, une mélodie ou quelques paroles suffisent pour commencer.
      </Text>
    </View>:null}
    {files.map(f=><View key={f.id} style={{borderBottomWidth:1,borderBottomColor:theme.border,
      paddingVertical:9,gap:10}}>
      <Pressable onPress={()=>{setExpanded(expanded===f.id?'':f.id);
        setShowSections('');setShowType('');}} accessibilityRole="button"
        accessibilityState={{expanded:expanded===f.id}}
        style={{flexDirection:'row',alignItems:'center',gap:11,minHeight:49}}>
        <View style={{width:42,height:42,borderRadius:12,backgroundColor:theme.surface,
          alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:theme.border}}>
          <Ionicons name={iconFor(f)} color={pink} size={21}/>
        </View>
        <View style={{flex:1,gap:4}}>
          <Text numberOfLines={1} style={{color:theme.foreground,fontSize:13,fontWeight:'600'}}>
            {f.title}
          </Text>
          <Text numberOfLines={1} style={{fontSize:11,color:theme.muted}}>
            {typeName(f)}{(f.sectionIds||[]).length?' · '+f.sectionIds.map(id=>
              project.sections.find(s=>s.id===id)?.title||'').filter(Boolean).join(', '):''}
            {f.durationSeconds!==undefined?' · '+formatMusicDuration(f.durationSeconds):''}
          </Text>
        </View>
        <Ionicons name={expanded===f.id?'chevron-up':'chevron-down'}
          color={theme.muted} size={18}/>
      </Pressable>
      {expanded===f.id?<View style={{gap:12,paddingHorizontal:3,paddingBottom:11}}>
        <TextInput style={input} value={f.title} onChangeText={title=>update(f.id,{title})}
          accessibilityLabel="Nom de cet élément"/>
        {isPlayableMusicFile(f)?<MusicAudioPreview source={{localAudioId:f.localFileId}}/>:null}
        {f.kind==='lyrics'||f.kind==='note'||f.kind==='idea'||f.kind==='document'?
          <TextInput multiline textAlignVertical="top"
            value={f.text||''} onChangeText={text=>update(f.id,{
              text,lyricSegments:f.kind==='lyrics'?lyricStanzas(text):f.lyricSegments,
            })}
            placeholder={f.localFileId?'Texte associé au document…':'Ton texte…'}
            placeholderTextColor={theme.muted} style={{...input,minHeight:85,lineHeight:21}}/>:null}
        {f.conversionWarning?<Text style={{fontSize:11,color:theme.muted}}>
          {f.conversionWarning}
        </Text>:null}
        <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
          {chip(typeName(f)+'  ·',showType===f.id,()=>setShowType(showType===f.id?'':f.id))}
          {chip((f.sectionIds||[]).length?
            f.sectionIds.map(id=>project.sections.find(s=>s.id===id)?.title||'').join(', '):
            'Associer à une partie',showSections===f.id,
            ()=>setShowSections(showSections===f.id?'':f.id))}
        </View>
        {showType===f.id?<View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
          {(['lyrics','audio','track','score','note','idea','document'] as MusicProjectFile['kind'][])
            .map(kind=>chip(({lyrics:'Paroles',audio:'Audio',track:'Piste',
              score:'Partition',note:'Note',idea:'Idée',document:'Document'} as const)[kind],
              f.kind===kind,()=>{update(f.id,classifySongFile(f,kind));setShowType('');}))}
        </View>:null}
        {showSections===f.id?<View style={{gap:9}}>
          <Text style={{fontSize:11,color:theme.muted}}>
            Une partie peut exister avant Version 1. Association facultative.
          </Text>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
            {[...project.sections.map(s=>s.title),
              ...sectionNames.filter(name=>!sectionFor(name))].map(name=>
                chip(name,!!sectionFor(name)&&(f.sectionIds||[]).includes(sectionFor(name)!.id),
                  ()=>chooseSection(f,name)))}
          </View>
          <View style={{flexDirection:'row',gap:8}}>
            <TextInput placeholder="Autre partie…" placeholderTextColor={theme.muted}
              value={customSection} onChangeText={setCustomSection}
              style={{...input,flex:1}}/>
            <Pressable onPress={()=>{if(customSection.trim())chooseSection(f,customSection.trim());}}
              disabled={!customSection.trim()}
              style={{justifyContent:'center',paddingHorizontal:9}}>
              <Ionicons name="add-circle-outline" color={pink} size={22}/>
            </Pressable>
          </View>
        </View>:null}
        <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
          {isMusicTrackCandidate(f)?chip(activeVersion?'Ajouter à la version':'Créer Version 1',
            false,()=>activeVersion?onUseFile(f):onStartVersion(f)):null}
          {f.localFileId?chip('Fichier original',false,()=>{void openOriginal(f);}):null}
        </View>
      </View>:null}
    </View>)}
  </View>;
}
