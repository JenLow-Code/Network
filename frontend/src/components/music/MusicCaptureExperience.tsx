import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import { MusicAudioCapture } from './MusicAudioCapture';
import { MusicAudioTake } from './MusicAudioTake';
import { MusicNotePreview, type MusicWritingResult } from './MusicWritingStudio';
import { MusicWritingOverlay } from './MusicWritingOverlay';

import { MusicLocalArt } from './MusicLocalArtNext';
import { MusicMaterialViewer } from './MusicMaterialViewerV3';
import { importSongFile, classifySongFile, lyricStanzas } from '@/domain/musicImportedFiles';
import { isMusicTrackCandidate,isPlayableMusicFile } from '@/domain/musicNext';
import {isMidiSource} from '@/domain/musicMidiAudio';
import {MusicMidiPreview} from './MusicMidiPreview';
import { newMusicId } from '@/domain/musicWorkspace';
import type { MusicProject, MusicProjectFile, MusicSection, MusicAudioMarker } from '@/domain/musicWorkspace';
import type {MusicNotationEvent} from '@/domain/musicNotation';
import {MusicCaptureScoreStrip} from './MusicCaptureScoreStrip';

const PINK='#CB245C';
type Props={project:MusicProject;patch:(changes:Partial<MusicProject>)=>void;
  onStartVersion:(source:MusicProjectFile)=>void;onUseFile:(source:MusicProjectFile)=>void;
  hasVersion:boolean};
type Composer='none'|'write'|'record';
type Writing='lyrics'|'note';
const isImage=(file:MusicProjectFile)=>/\.(jpg|jpeg|png|webp)$/i.test(file.originalFilename||'');
const isAudio=(file:MusicProjectFile)=>isPlayableMusicFile(file);
const content=(file:MusicProjectFile)=>file.text??
  (file.kind==='lyrics'?file.lyricSegments?.map(v=>v.text).join('\n\n')||'':'');
type CaptureFilter='all'|'audio'|'image'|'lyrics'|'score'|'note'|'other';
const filterOptions:{id:CaptureFilter;label:string}[]=[
  {id:'all',label:'Tous'},
  {id:'audio',label:'Audio'},
  {id:'image',label:'Images'},
  {id:'lyrics',label:'Paroles'},
  {id:'score',label:'Partitions'},
  {id:'note',label:'Notes'},
  {id:'other',label:'Autres'},
];
function fileGroup(file:MusicProjectFile):CaptureFilter {
  if(isImage(file))return 'image';
  if(file.kind==='score'||/\.midi?$/i.test(file.originalFilename||''))return 'score';
  if(isAudio(file)||file.kind==='audio'||file.kind==='track')return 'audio';
  if(file.kind==='lyrics')return 'lyrics';
  if(file.kind==='note')return 'note';
  return 'other';
}

export function MusicCaptureExperience({project,patch,onStartVersion,onUseFile,hasVersion}:Props) {
  const theme=useAppTheme();
  const {width}=useWindowDimensions();
  const compact=width<630;
  const files=project.files||[];
  const [composer,setComposer]=useState<Composer>('none');
  const [unsavedRecording,setUnsavedRecording]=useState(false);
  const [confirmClose,setConfirmClose]=useState(false);
  const [writing,setWriting]=useState<Writing>('lyrics');
  const [writingTab,setWritingTab]=useState<'lyrics'|'score'>('lyrics');
  const [translationSourceId,setTranslationSourceId]=useState('');
  const [editingFileId,setEditingFileId]=useState('');
  const [selected,setSelected]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [filter,setFilter]=useState<CaptureFilter>('all');
  const [actionsOpen,setActionsOpen]=useState(false);
  const visibleFiles=files.filter(file=>!file.renderedFromMidiId)
    .filter(file=>!file.translationOfFileId||
      !files.some(original=>original.id===file.translationOfFileId))
    .filter(file=>filter==='all'||fileGroup(file)===filter);
  const selectedFile=files.find(f=>f.id===selected)||null;
  const translationSource=files.find(f=>f.id===translationSourceId)||null;
  const editingFile=files.find(f=>f.id===editingFileId)||null;
  const closeComposer=()=>{
    if(composer==='record'&&unsavedRecording){setConfirmClose(true);return;}
    setComposer('none');setTranslationSourceId('');setEditingFileId('');
    setConfirmClose(false);
  };
  const openWrite=(sourceId='',fileId='',nextTab:'lyrics'|'score'='lyrics')=>{
    if(composer==='record'&&unsavedRecording){setConfirmClose(true);return;}
    const file=files.find(candidate=>candidate.id===fileId);
    setEditingFileId(fileId);
    setWritingTab(file?.musicEvents?'score':nextTab);
    setWriting(file?.kind==='note'?'note':'lyrics');
    setTranslationSourceId(sourceId);setComposer('write');setConfirmClose(false);
  };
  const changeFile=(id:string,change:Partial<MusicProjectFile>)=>
    patch({files:files.map(file=>file.id===id?{...file,...change}:file)});
  const addWritten=(result:MusicWritingResult)=>{
    if(!result.text.trim())return;
    const translated=result.mode==='translation';
    const lyrics=result.mode!=='note';
    const current=files.find(file=>file.id===editingFileId);
    const title=result.title.trim()||(translated
      ?'Traduction · '+result.language
      :lyrics?'Paroles':result.text.trim().split('\n')[0].slice(0,52)||'Note');
    const stanzas=lyrics?lyricStanzas(result.text.trim()):undefined;
    const item:MusicProjectFile={
      ...(current||{}),
      id:current?.id||newMusicId(),kind:lyrics?'lyrics':'note',
      sectionIds:current?.sectionIds||[],
      title,text:result.text,
      lyricSegments:stanzas?.map((stanza,index)=>({
        ...stanza,
        id:current?.lyricSegments?.[index]?.id||stanza.id,
        sectionIds:current?.lyricSegments?.[index]?.sectionIds||[],
      })),
      language:lyrics?(result.language||project.originalLanguage):undefined,
      translationOfFileId:translated?(result.translationOfFileId||current?.translationOfFileId):undefined,
      createdAt:current?.createdAt||new Date().toISOString(),
    };
    item.lyricReferences=result.lyricReferences||current?.lyricReferences||[];
    const created=result.newSections||[];
    patch({
      files:current?files.map(file=>file.id===current.id?item:file):[...files,item],
      sections:[...project.sections,...created.filter(section=>
        !project.sections.some(existing=>existing.id===section.id||
          existing.title.trim().toLocaleLowerCase()===section.title.trim().toLocaleLowerCase()))],
    });
    setComposer('none');setTranslationSourceId('');setEditingFileId('');
  };
  const saveScore=(result:{title:string;events:MusicNotationEvent[];bpm:number;
    tone:string;sampleLocalId?:string;sampleName?:string;
    sampleRootMidi?:number;sampleRootHz?:number;clef?:'treble'|'bass';
    drumSamples?:MusicProjectFile['drumSamples']})=>{
    if(!result.events.length)return;
    const current=files.find(file=>file.id===editingFileId);
    const item:MusicProjectFile={
      id:current?.id||newMusicId(),kind:'score',
      sectionIds:current?.sectionIds||[],title:result.title,
      musicEvents:result.events,tempoBpm:result.bpm,
      instrumentTone:result.tone,
      instrumentSampleLocalId:result.sampleLocalId,
      instrumentSampleName:result.sampleName,
      instrumentSampleRootMidi:result.sampleRootMidi,
      instrumentSampleRootHz:result.sampleRootHz,
      drumSamples:result.drumSamples,
      scoreClef:result.clef,
      createdAt:current?.createdAt||new Date().toISOString(),
    };
    patch({files:current
      ?files.map(file=>file.id===current.id?item:file):[...files,item]});
    setComposer('none');setEditingFileId('');setTranslationSourceId('');
  };
  const requestTranslator=(sourceId:string,targetLanguage:string)=>{
    const source=files.find(file=>file.id===sourceId);
    if(!source||!targetLanguage.trim())return;
    if((project.needs||[]).some(need=>need.kind==='talent'&&
      need.label.toLowerCase()==='traducteur'&&need.sourceFileId===sourceId&&
      need.targetLanguage===targetLanguage.trim()))return;
    patch({needs:[...(project.needs||[]),{id:newMusicId(),kind:'talent',
      label:'Traducteur',sourceFileId:sourceId,
      sourceLanguage:source.language||project.originalLanguage,
      targetLanguage:targetLanguage.trim()}]});
  };
  const addRecorded=(id:string,filename:string,durationSeconds?:number,
    _offset?:number,markers?:MusicAudioMarker[],name?:string)=>{
    const item:MusicProjectFile={
       id:newMusicId(),title:name?.trim()||'Prise '+(files.filter(isAudio).length+1),
      kind:'audio',sectionIds:[],localFileId:id,originalFilename:filename,
      mimeType:/\.wav$/i.test(filename)?'audio/wav':/\.m4a$/i.test(filename)?'audio/mp4':/\.ogg$/i.test(filename)?'audio/ogg':'audio/webm',
      durationSeconds,markers:markers||[],createdAt:new Date().toISOString(),
    };
    patch({files:[...files,item]});setComposer('none');setUnsavedRecording(false);
    setConfirmClose(false);
  };
  const pickFiles=()=>{
    if(Platform.OS!=='web'||typeof document==='undefined'){
      setError('L’import depuis le navigateur web est disponible pour le moment.');return;
    }
    const picker=document.createElement('input');
    picker.type='file';picker.multiple=true;
    picker.accept='.doc,.docx,.txt,.md,.pdf,.png,.jpg,.jpeg,.webp,.mp3,.wav,.m4a,.ogg,.aac,.webm,.mid,.midi';
    picker.onchange=()=>{
      const incoming=Array.from(picker.files||[]);
      if(!incoming.length)return;
      setBusy(true);setError('');
      void (async()=>{
        const added:MusicProjectFile[]=[];
        for(const file of incoming)added.push(await importSongFile(file,project.originalLanguage));
        patch({files:[...files,...added]});
        setSelected(added[0].id);
      })().catch(e=>setError(e instanceof Error?e.message:'Import impossible.'))
        .finally(()=>setBusy(false));
    };
    picker.click();
  };
  const associate=(file:MusicProjectFile,part:MusicSection)=>{
    const ids=file.sectionIds||[];
    changeFile(file.id,{sectionIds:ids.includes(part.id)?
      ids.filter(id=>id!==part.id):[...ids,part.id]});
  };
  const newSection=(file:MusicProjectFile,name:string,stanzaId?:string)=>{
    const label=name.trim();if(!label)return;
    const old=project.sections.find(p=>p.title.toLowerCase()===label.toLowerCase());
    const part=old||{id:newMusicId(),title:label};
    patch({
      sections:old?project.sections:[...project.sections,part],
      files:files.map(f=>{
        if(f.id!==file.id)return f;
        if(stanzaId)return {...f,lyricSegments:(f.lyricSegments||[]).map(stanza=>
          stanza.id===stanzaId?{...stanza,sectionIds:[...new Set([...stanza.sectionIds,part.id])]}:stanza)};
        return {...f,sectionIds:[...new Set([...(f.sectionIds||[]),part.id])]};
      })
    });
  };
  const action=(label:string,icon:keyof typeof Ionicons.glyphMap,fn:()=>void,
    primary=false,toolbar=false)=>
    <Pressable onPress={fn} accessibilityRole="button" accessibilityLabel={label}
      style={{flex:toolbar&&compact?1:undefined,minWidth:0,
        minHeight:toolbar&&compact?70:45,
        flexDirection:toolbar&&compact?'column':'row',
        alignItems:'center',justifyContent:'center',
        gap:toolbar&&compact?6:9,paddingHorizontal:toolbar&&compact?5:15,
        paddingVertical:10,borderRadius:12,
        backgroundColor:primary?PINK:theme.surface,borderWidth:primary?0:1,
        borderColor:theme.border}}>
      <Ionicons name={icon} size={toolbar&&compact?23:18}
        color={primary?'#fff':PINK}/>
      <Text numberOfLines={1} style={{fontSize:toolbar&&compact?11:13,
        fontWeight:'600',color:primary?'#fff':theme.foreground}}>{label}</Text>
    </Pressable>;
  const railAction=(label:string,icon:keyof typeof Ionicons.glyphMap,
    fn:()=>void,active=false,disabled=false)=>
    <Pressable onPress={()=>{fn();setActionsOpen(false);}} disabled={disabled}
      accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{disabled}}
      style={{flexDirection:'row',alignItems:'center',gap:11,minHeight:46,
        opacity:disabled?.5:1}}>
      <Text style={{fontSize:12,fontWeight:'600',color:theme.foreground}}>{label}</Text>
      <View style={{width:46,height:46,borderRadius:23,alignItems:'center',
        justifyContent:'center',borderWidth:1,
        borderColor:active?PINK:theme.border,
        backgroundColor:active?PINK:theme.surface}}>
        <Ionicons name={icon} size={21} color={active?'#fff':PINK}/>
      </View>
    </Pressable>;
  return <View style={{gap:compact?12:18}}>
    {compact?<View style={{gap:8}}>
      <View style={{flexDirection:'row',alignItems:'center',
        justifyContent:'space-between',minHeight:46}}>
        <View style={{flexDirection:'row',alignItems:'baseline',gap:8}}>
          <Text style={{fontSize:15,fontWeight:'700',color:theme.foreground}}>
            Éléments enregistrés
          </Text>
          <Text style={{fontSize:12,color:theme.muted}}>{files.filter(f=>!f.renderedFromMidiId).length}</Text>
        </View>
        <Pressable onPress={()=>setActionsOpen(!actionsOpen)}
          accessibilityRole="button"
          accessibilityLabel={actionsOpen?'Fermer les actions':'Ajouter un élément'}
          accessibilityState={{expanded:actionsOpen}}
          style={{width:46,height:46,borderRadius:23,backgroundColor:PINK,
            alignItems:'center',justifyContent:'center'}}>
          <Ionicons name={actionsOpen?'close':'add'} size={25} color="#fff"/>
        </Pressable>
      </View>
      {actionsOpen?<View style={{flexDirection:'row',gap:7,
        alignItems:'stretch',paddingBottom:5}}>
        {([
          {label:'Écrire',icon:'pencil-outline' as const,run:()=>openWrite()},
          {label:'Jouer',icon:'musical-notes-outline' as const,run:()=>openWrite('','','score')},
          {label:'Enregistrer',icon:'mic-outline' as const,run:()=>{
            if(composer==='record'){closeComposer();return;}
            if(composer==='write')return;
            setComposer('record');setTranslationSourceId('');
          }},
          {label:'Importer',icon:'cloud-upload-outline' as const,run:pickFiles},
        ]).map(item=><Pressable key={item.label}
          onPress={()=>{setActionsOpen(false);item.run();}}
          accessibilityRole="button" accessibilityLabel={item.label}
          disabled={busy&&item.label==='Importer'}
          style={{flex:1,minWidth:0,minHeight:69,borderRadius:13,borderWidth:1,
            borderColor:theme.border,backgroundColor:theme.surface,
            alignItems:'center',justifyContent:'center',gap:7}}>
          <Ionicons name={item.icon} size={21} color={PINK}/>
          <Text numberOfLines={1} style={{fontSize:10.5,fontWeight:'600',
            color:theme.foreground}}>{item.label}</Text>
        </Pressable>)}
      </View>:null}
    </View>:
      <View style={{flexDirection:'row',gap:9,alignItems:'center'}}>
        {action('Enregistrer','mic-outline',()=>{
          if(composer==='record'){closeComposer();return;}
          if(composer==='write')return;
          setComposer('record');setTranslationSourceId('');
        },composer==='record')}
        {action('Écrire','pencil-outline',()=>openWrite(),composer==='write')}
        {action(busy?'Import…':'Importer','cloud-upload-outline',pickFiles)}
      </View>}
    {composer==='record'?<View style={{gap:16,padding:compact?16:22,
      borderWidth:1,borderColor:theme.border,borderRadius:18,
      backgroundColor:theme.surface}}>
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'flex-end'}}>
        <Pressable onPress={closeComposer} accessibilityLabel="Fermer"
          style={{padding:6}}>
          <Ionicons name="close" size={20} color={theme.muted}/>
        </Pressable>
      </View>
      {confirmClose?<View style={{borderRadius:12,borderWidth:1,
        borderColor:theme.border,padding:12,gap:10}}>
        <Text style={{fontSize:12,color:theme.foreground,lineHeight:19}}>
          Abandonner la prise non enregistrée ?
        </Text>
        <View style={{flexDirection:'row',gap:9,flexWrap:'wrap'}}>
          {action('Continuer','arrow-back-outline',()=>setConfirmClose(false))}
          {action('Abandonner','close-outline',()=>{
            setUnsavedRecording(false);setTranslationSourceId('');
            setComposer('none');setConfirmClose(false);
          })}
        </View>
      </View>:null}
      <MusicAudioCapture onSaved={addRecorded}
        onDraftChange={setUnsavedRecording}
        suggestedTitle={'Prise '+(files.filter(isAudio).length+1)}/>
    </View>:null}
    {error?<Text style={{fontSize:12,color:'#B64A60'}}>{error}</Text>:null}
    {files.length?<ScrollView horizontal showsHorizontalScrollIndicator={false}
      style={{flexGrow:0}}
      contentContainerStyle={{gap:7,alignItems:'center',paddingRight:6}}>
      {filterOptions.map(option=>{
        const selected=filter===option.id;
        return <Pressable key={option.id} onPress={()=>setFilter(option.id)}
          accessibilityRole="button"
          accessibilityLabel={'Afficher '+option.label.toLowerCase()}
          accessibilityState={{selected}}
          style={{paddingHorizontal:13,minHeight:36,alignItems:'center',
            justifyContent:'center',borderRadius:18,
            backgroundColor:selected?(theme.dark?'#492735':'#F9E8EE'):'transparent',
            borderWidth:1,borderColor:selected?PINK:theme.border}}>
          <Text style={{color:selected?PINK:theme.muted,fontSize:12,
            fontWeight:selected?'700':'500'}}>{option.label}</Text>
        </Pressable>;
      })}
    </ScrollView>:null}
    {files.length?<View style={{gap:0}}>
      {!compact?<View style={{flexDirection:'row',alignItems:'baseline',gap:9,
        paddingBottom:4}}>
        <Text style={{color:theme.foreground,fontSize:17,fontWeight:'700'}}>
          Éléments enregistrés
        </Text>
        <Text style={{fontSize:12,color:theme.muted}}>{files.length}</Text>
      </View>:null}
      {visibleFiles.map(file=>{
        const image=isImage(file);
        const sound=isAudio(file)||file.kind==='audio';
        const text=content(file).trim();
        const translations=files.filter(candidate=>candidate.translationOfFileId===file.id);
        return <View key={file.id} style={{paddingVertical:compact?12:18,
          borderTopWidth:1,borderColor:theme.border,gap:compact?7:12}}>
          <Pressable onPress={()=>{
            if(file.musicEvents?.length){
              openWrite('',file.id,'score');return;
            }
            if(file.kind==='lyrics'||file.kind==='note'){
              openWrite(file.translationOfFileId||'',file.id);return;
            }
            setSelected(file.id);
          }} accessibilityRole="button"
            accessibilityLabel={'Ouvrir '+file.title}
            style={{gap:compact?7:11}}>
            {image?
              <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
                <MusicLocalArt file={file} thumbnail/>
                <Text numberOfLines={2} style={{flex:1,fontSize:compact?14:16,
                  fontWeight:'600',color:theme.foreground}}>{file.title}</Text>
                <Ionicons name="chevron-forward" size={17} color={theme.muted}/>
              </View>:
              <View style={{flexDirection:'row',gap:9,alignItems:'center'}}>
                {!sound&&!file.musicEvents?.length?<Ionicons name={file.kind==='score'?'musical-notes-outline':
                  file.kind==='lyrics'?'document-text-outline':
                  file.kind==='note'?'reader-outline':'document-outline'}
                  size={17} color={theme.muted}/>:null}
                <View style={{flex:1,gap:2}}>
                  <Text numberOfLines={2} style={{fontSize:compact?14:16,
                    fontWeight:'600',color:theme.foreground}}>{file.title}</Text>
                  {file.kind==='lyrics'&&file.language?
                    <Text style={{fontSize:11,color:theme.muted}}>{file.language}</Text>:null}
                </View>
                <Ionicons name="chevron-forward" color={theme.muted} size={16}/>
              </View>}
            {text&&!image&&!sound&&(file.kind==='note'||file.kind==='lyrics')?
              <Text numberOfLines={1} ellipsizeMode="tail"
                style={{fontFamily:file.kind==='lyrics'?'Georgia':undefined,
                  fontSize:file.kind==='lyrics'?(compact?14:16):13,
                  lineHeight:compact?21:23,color:theme.muted}}>
                {text.replace(/\s+/g,' ').trim()}
              </Text>:null}
          </Pressable>
          {sound&&file.localFileId?<MusicAudioTake file={file} compact
            onOpen={()=>setSelected(file.id)}/>:null}
          {file.musicEvents?.length?<MusicCaptureScoreStrip file={file}/>:
            isMidiSource(file)?<MusicMidiPreview file={file}/>:null}
          {translations.length?<View style={{gap:6}}>
            {translations.map(translation=><Pressable key={translation.id}
              accessibilityRole="button"
              accessibilityLabel={'Ouvrir '+translation.title}
              onPress={()=>setSelected(translation.id)}
              style={{flexDirection:'row',alignItems:'center',gap:8,
                paddingVertical:8,paddingHorizontal:10,borderRadius:10,
                backgroundColor:theme.surface,borderWidth:1,
                borderColor:theme.border}}>
              <Ionicons name="language-outline" color={PINK} size={16}/>
              <Text numberOfLines={1} style={{color:theme.foreground,
                fontSize:12,flex:1}}>{translation.title}</Text>
              <Ionicons name="chevron-forward" color={theme.muted} size={15}/>
            </Pressable>)}
          </View>:null}
        </View>;
      })}
      {!visibleFiles.length?
        <Text style={{color:theme.muted,fontSize:13,paddingVertical:15}}>
          Aucun élément dans ce filtre.
        </Text>:null}
    </View>:null}
    <MusicMaterialViewer key={selectedFile?.id||'closed'} visible={!!selectedFile}
      file={selectedFile} project={project} onClose={()=>setSelected('')}
      onUpdate={changeFile} onChangeType={(id,kind)=>{
        const item=files.find(f=>f.id===id);
        if(item)changeFile(id,classifySongFile(item,kind));
      }} onSection={associate} onNewSection={newSection}
      onStartVersion={onStartVersion} onUseFile={onUseFile}
      onTranslate={file=>{setSelected('');openWrite(file.id);}}
      onEdit={file=>{setSelected('');openWrite(file.translationOfFileId||'',file.id);}}
      onOpenFile={setSelected} hasVersion={hasVersion}/>
    {composer==='write'?<MusicWritingOverlay key={editingFileId||translationSourceId||'new'}
      project={project} mode={writing} onModeChange={setWriting}
      startTab={writingTab}
      source={translationSource} initialFile={editingFile}
      onSave={addWritten} onSaveScore={saveScore} onRequestTranslator={requestTranslator}
      requestedLanguages={(project.needs||[]).filter(need=>
        need.sourceFileId===translationSourceId&&need.kind==='talent'&&
        need.label.toLowerCase()==='traducteur')
        .map(need=>need.targetLanguage||'')}
      onClose={closeComposer}/>:null}
  </View>;
}
