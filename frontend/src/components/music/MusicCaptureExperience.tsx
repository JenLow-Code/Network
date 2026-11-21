import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {router} from 'expo-router';
import { useAppTheme } from '@/theme/AppTheme';
import { MusicAudioCapture } from './MusicAudioCapture';
import {workspaceLayout} from '@/theme/workspaceLayout';
import { MusicAudioTake } from './MusicAudioTake';
import { MusicNotePreview, type MusicWritingResult } from './MusicWritingStudio';

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
  hasVersion:boolean;newVersionMode?:boolean;
  quickAction?:'write'|'upload'|'play'|'record'};
type Composer='none'|'write'|'record';
type Writing='lyrics'|'note';
const isImage=(file:MusicProjectFile)=>/\.(jpg|jpeg|png|webp)$/i.test(file.originalFilename||'');
const isAudio=(file:MusicProjectFile)=>isPlayableMusicFile(file);
const content=(file:MusicProjectFile)=>file.text??
  (file.kind==='lyrics'?file.lyricSegments?.map(v=>v.text).join('\n\n')||'':'');
type CaptureFilter='all'|'audio'|'image'|'lyrics'|'score'|'note'|'other';
type CaptureSort='name'|'date'|'type';
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

export function MusicCaptureExperience({project,patch,onStartVersion,onUseFile,
  hasVersion,newVersionMode=false,quickAction}:Props) {
  const theme=useAppTheme();
  const {width}=useWindowDimensions();
  const compact=width<630;
  const desktopList=Platform.OS==='web'&&workspaceLayout(width).desktop;
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
  const [sortBy,setSortBy]=useState<CaptureSort>('date');
  const [sortAscending,setSortAscending]=useState(false);
  const [hoveredRow,setHoveredRow]=useState('');
  const [actionsOpen,setActionsOpen]=useState(false);
  const [expandedLyrics,setExpandedLyrics]=useState<Record<string,boolean>>({});
  useEffect(()=>{
    // Sidebar actions select a real Capture workflow; importing requires
    // an additional user click because browsers block delayed file pickers.
    if(quickAction==='write'||quickAction==='play'){
      router.replace({pathname:quickAction==='play'
        ?'/music-composer/[id]':'/music-lyrics/[id]',
        params:{id:project.id}});
    }else if(quickAction==='record'){
      setComposer('record');setEditingFileId('');setTranslationSourceId('');
    }else if(quickAction==='upload'){
      setActionsOpen(true);
    }
  },[quickAction]);
  const visibleFiles=files.filter(file=>!file.renderedFromMidiId)
    .filter(file=>!file.translationOfFileId||
      !files.some(original=>original.id===file.translationOfFileId))
    // Mobile keeps its existing filters; desktop always shows every type.
    .filter(file=>desktopList||filter==='all'||fileGroup(file)===filter);
  const displayedFiles=desktopList?[...visibleFiles].sort((a,b)=>{
    let comparison=0;
    if(sortBy==='date'){
      const aTime=Date.parse(a.createdAt||'');
      const bTime=Date.parse(b.createdAt||'');
      comparison=(Number.isFinite(aTime)?aTime:0)-
        (Number.isFinite(bTime)?bTime:0);
    }else if(sortBy==='type'){
      const typeName=(file:MusicProjectFile)=>
        filterOptions.find(option=>option.id===fileGroup(file))?.label||'Autres';
      comparison=typeName(a).localeCompare(typeName(b),'fr',
        {sensitivity:'base',numeric:true});
    }else{
      comparison=a.title.localeCompare(b.title,'fr',
        {sensitivity:'base',numeric:true});
    }
    if(comparison!==0)return sortAscending?comparison:-comparison;
    // Secondary alphabetical order ensures a predictable sort within types/dates.
    const titleOrder=a.title.localeCompare(b.title,'fr',
      {sensitivity:'base',numeric:true});
    return titleOrder||a.id.localeCompare(b.id);
  }):visibleFiles;
  const updateSort=(next:CaptureSort)=>{
    if(next===sortBy)setSortAscending(previous=>!previous);
    else {setSortBy(next);setSortAscending(next!=='date');}
  };
  const selectedFile=files.find(f=>f.id===selected)||null;
  const translationSource=files.find(f=>f.id===translationSourceId)||null;
  const editingFile=files.find(f=>f.id===editingFileId)||null;
  const finishRecordingNavigation=()=>{
    // Clear only the temporary recording intent. Keep the open recorder and
    // its not-yet-saved take mounted when the microphone stops.
    if(quickAction==='record')router.setParams({intent:undefined});
  };
  const closeComposer=()=>{
    if(composer==='record'&&unsavedRecording){setConfirmClose(true);return;}
    setComposer('none');setTranslationSourceId('');setEditingFileId('');
    setConfirmClose(false);
    finishRecordingNavigation();
  };
  const openWrite=(sourceId='',fileId='',nextTab:'lyrics'|'score'='lyrics')=>{
    if(composer==='record'&&unsavedRecording){setConfirmClose(true);return;}
    const file=files.find(candidate=>candidate.id===fileId);
    const page=file?.musicEvents?'score':nextTab;
    router.push({pathname:page==='score'
      ?'/music-composer/[id]':'/music-lyrics/[id]',
      params:{id:project.id,...(sourceId?{sourceId}:{}),...(fileId?{fileId}:{})}});
  };
  const changeFile=(id:string,change:Partial<MusicProjectFile>)=>
    patch({files:files.map(file=>file.id===id?{...file,...change}:file)});
  const addWritten=(result:MusicWritingResult)=>{
    if(!result.text.trim())return;
    const translated=result.mode==='translation';
    const lyrics=result.mode!=='note';
    const editing=files.find(file=>file.id===editingFileId);
    // Translating an existing lyric is ALWAYS a new document, never an
    // overwrite of its original text. Only an existing translation is edited.
    const current=translated&&editing&&!editing.translationOfFileId?
      undefined:editing;
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
    item.lyricComments=result.lyricComments||current?.lyricComments||[];
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
    setConfirmClose(false);finishRecordingNavigation();
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
    {quickAction==='upload'?<Pressable onPress={pickFiles}
      accessibilityRole="button" accessibilityLabel="Choisir des fichiers à importer"
      style={{alignSelf:'flex-start',minHeight:43,flexDirection:'row',
        alignItems:'center',gap:9,paddingHorizontal:14,borderRadius:10,
        backgroundColor:PINK}}>
      <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF"/>
      <Text style={{color:'#FFFFFF',fontWeight:'700',fontSize:12}}>
        Choisir des fichiers à importer
      </Text>
    </Pressable>:null}
    <View style={{gap:8}}>
      <View style={{flexDirection:'row',alignItems:'center',
        justifyContent:'space-between',minHeight:46}}>
        <View style={{flexDirection:'row',alignItems:'baseline',gap:8}}>
          <Text style={{fontSize:compact?15:17,fontWeight:'700',color:theme.foreground}}>
            {project.title}
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
        alignItems:'stretch',paddingBottom:5,width:'100%',
        maxWidth:compact?undefined:650,alignSelf:'flex-end'}}>
        {([
          {label:'Écrire',icon:'pencil-outline' as const,run:()=>openWrite()},
          {label:'Composer',icon:'musical-notes-outline' as const,run:()=>openWrite('','','score')},
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
    </View>
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
            finishRecordingNavigation();
          })}
        </View>
      </View>:null}
      <MusicAudioCapture onSaved={addRecorded}
        onPaused={finishRecordingNavigation}
        onDraftChange={setUnsavedRecording}
        suggestedTitle={'Prise '+(files.filter(isAudio).length+1)}/>
    </View>:null}
    {error?<Text style={{fontSize:12,color:'#B64A60'}}>{error}</Text>:null}
    {desktopList&&files.length?<View accessibilityRole="header"
      style={{width:'100%',flexDirection:'row',alignItems:'center',
        paddingHorizontal:12,paddingVertical:8,gap:14,
        borderBottomWidth:1,borderBottomColor:theme.border}}>
      {([
        {id:'name' as const,label:'Nom',width:210},
        {id:'date' as const,label:'Date',width:120},
        {id:'type' as const,label:'Type',width:undefined},
      ]).map(column=>{
        const selected=sortBy===column.id;
        return <Pressable key={column.id}
          onPress={()=>updateSort(column.id)}
          accessibilityRole="button"
          accessibilityLabel={'Trier les fichiers par '+column.label+
            (selected?(sortAscending?' (croissant)':' (décroissant)'):'')}
          accessibilityState={{selected}}
          style={{width:column.width,flex:column.id==='type'?1:undefined,
            flexDirection:'row',alignItems:'center',gap:5,
            minWidth:0,minHeight:38}}>
          <Text style={{color:selected?PINK:theme.muted,
            fontSize:13,fontWeight:'700'}}>{column.label}</Text>
          <Ionicons size={13}
            name={selected?(sortAscending?'arrow-up':'arrow-down'):
              'swap-vertical-outline'}
            color={selected?PINK:theme.muted}/>
        </Pressable>;
      })}
      <View style={{width:28}}/>
    </View>:null}
    {!desktopList&&files.length?<ScrollView horizontal showsHorizontalScrollIndicator={false}
      style={{flexGrow:0}}
      contentContainerStyle={{gap:7,alignItems:'center',paddingRight:6}}>
      {filterOptions.map(option=>{
        const selected=filter===option.id;
        return <Pressable key={option.id} onPress={()=>setFilter(option.id)}
          accessibilityRole="button"
          accessibilityLabel={'Afficher '+option.label.toLowerCase()}
          accessibilityState={{selected}}
          style={{paddingHorizontal:compact?5:13,width:compact?92:undefined,minHeight:36,alignItems:'center',
            justifyContent:'center',borderRadius:18,
            backgroundColor:selected?(theme.dark?'#492735':'#F9E8EE'):'transparent',
            borderWidth:1,borderColor:selected?PINK:theme.border}}>
          <Text style={{color:selected?PINK:theme.muted,fontSize:12,
            fontWeight:selected?'700':'500'}}>{option.label}</Text>
        </Pressable>;
      })}
    </ScrollView>:null}
    {files.length?<View style={{width:'100%',gap:0}}>

      {displayedFiles.map(file=>{
        const image=isImage(file);
        const sound=isAudio(file)||file.kind==='audio';
        const text=content(file).trim();
        const translations=files.filter(candidate=>candidate.translationOfFileId===file.id);
        const lyricExpanded=!!expandedLyrics[file.id];
        const firstLine=text.split(/\r?\n/).find(line=>line.trim())?.trim()||'';
        const created=new Date(file.createdAt||'');
        const dateLabel=Number.isNaN(created.getTime())?'':created.toLocaleDateString(
          'fr-FR',{day:'numeric',month:'short',year:'numeric'});
        const openDetails=()=>{
          if(file.musicEvents?.length){
            openWrite('',file.id,'score');return;
          }
          if(file.kind==='lyrics'||file.kind==='note'){
            openWrite(file.translationOfFileId||'',file.id);return;
          }
          setSelected(file.id);
        };
        // One true list row: title -> date -> file preview -> details arrow.
        // On narrow screens the preview wraps below the same header, rather
        // than squeezing a waveform or notation into an unusably small strip.
        // Match the inner waveform boundaries of the audio player for every
        // preview type. The first 34px are reserved for the play button and
        // the final 65px for duration, even when that type has neither.
        const alignedPreview=(child:React.ReactNode)=>
          desktopList?<View style={{flexDirection:'row',alignItems:'center',
            gap:10,width:'100%',minWidth:0}}>
            <View style={{width:34,flexShrink:0}}/>
            <View style={{flex:1,minWidth:0,justifyContent:'center'}}>
              {child}
            </View>
            <View style={{width:65,flexShrink:0}}/>
          </View>:child;
        const representation=<View style={{width:'100%',minWidth:0}}>
          {image?
            alignedPreview(<Pressable onPress={openDetails}
              accessibilityRole="button"
              accessibilityLabel={'Voir l’image '+file.title}>
              <MusicLocalArt file={file} banner/>
            </Pressable>):
            sound&&file.localFileId?
              <MusicAudioTake file={file} compact
                onOpen={openDetails}/>:
            file.musicEvents?.length?
              <MusicCaptureScoreStrip file={file} aligned={desktopList}/>:
            isMidiSource(file)?
              alignedPreview(<MusicMidiPreview file={file}/>):
            text&&(file.kind==='lyrics'||file.kind==='note')?
              alignedPreview(<View style={{flexDirection:'row',alignItems:'center',gap:10,
                minHeight:38,minWidth:0}}>
                <Text numberOfLines={desktopList?1:lyricExpanded?undefined:1}
                  ellipsizeMode="tail"
                  style={{flex:1,minWidth:0,
                    fontFamily:file.kind==='lyrics'?'Georgia':undefined,
                    fontSize:compact?14:15,lineHeight:23,
                    color:theme.muted}}>
                  {lyricExpanded&&!desktopList?text:firstLine}
                </Text>
                {file.kind==='lyrics'?
                  <Pressable accessibilityRole="button"
                    accessibilityLabel={(lyricExpanded?'Voir moins':'Voir plus')+
                      ' : '+file.title}
                    accessibilityState={{expanded:lyricExpanded}}
                    onPress={()=>setExpandedLyrics(old=>({
                      ...old,[file.id]:!old[file.id],
                    }))}
                    style={{minHeight:38,justifyContent:'center',
                      flexShrink:0,paddingHorizontal:5}}>
                    <Text style={{fontSize:12,fontWeight:'700',color:PINK}}>
                      {lyricExpanded?'Voir moins':'Voir plus…'}
                    </Text>
                  </Pressable>:null}
              </View>):
              alignedPreview(<Pressable onPress={openDetails} accessibilityRole="button"
                accessibilityLabel={'Ouvrir '+file.title}
                style={{minHeight:38,flexDirection:'row',
                  alignItems:'center',gap:9}}>
                <Ionicons name={file.kind==='document'?
                  'document-outline':file.kind==='note'?
                  'reader-outline':'attach-outline'}
                  size={17} color={theme.muted}/>
                <Text numberOfLines={1} style={{color:theme.muted,fontSize:13,
                  flex:1,minWidth:0}}>
                  {text?firstLine:file.originalFilename||file.title}
                </Text>
              </Pressable>)}
        </View>;
        const detailArrow=<Pressable onPress={openDetails}
          accessibilityRole="button"
          accessibilityLabel={'Voir les détails de '+file.title}
          style={{height:44,width:28,alignItems:'flex-end',
            justifyContent:'center',flexShrink:0}}>
          <Ionicons name="chevron-forward" size={17} color={theme.muted}/>
        </Pressable>;
        return <View key={file.id}
          onPointerEnter={desktopList?()=>setHoveredRow(file.id):undefined}
          onPointerLeave={desktopList?()=>setHoveredRow(current=>
            current===file.id?'':current):undefined}
          style={{width:'100%',minWidth:0,
            paddingHorizontal:desktopList?12:0,
            borderTopWidth:desktopList?0:1,
            borderColor:theme.border,gap:6,
            borderRadius:desktopList?10:0,
            backgroundColor:desktopList&&hoveredRow===file.id?
              (theme.dark?'#28242A':'#F7F3EE'):'transparent'}}>
          <View style={{flexDirection:desktopList?'row':'column',
            width:'100%',minWidth:0,
            height:desktopList?94:undefined,
            paddingVertical:desktopList?0:compact?10:14,
            alignItems:desktopList?'center':'stretch',
            gap:desktopList?14:4}}>
            <Pressable onPress={openDetails} accessibilityRole="button"
              accessibilityLabel={'Ouvrir '+file.title}
              style={{width:desktopList?210:'100%',minWidth:0,
                minHeight:40,justifyContent:'center'}}>
              <Text numberOfLines={1} style={{
                color:theme.foreground,fontSize:compact?14:15,
                fontWeight:'600'}}>{file.title}</Text>
            </Pressable>
            {desktopList?
              <Text numberOfLines={1} style={{width:120,
                color:theme.foreground,fontSize:15,
                fontWeight:'400',fontVariant:['tabular-nums']}}>
                {dateLabel}
              </Text>:
              <View style={{flexDirection:'row',alignItems:'center',
                justifyContent:'space-between',minHeight:32}}>
                {dateLabel?<Text numberOfLines={1} style={{
                  color:theme.foreground,fontSize:11,
                  fontVariant:['tabular-nums']}}>{dateLabel}</Text>:<View/>}
                {detailArrow}
              </View>}
            <View style={{flex:desktopList?1:undefined,
              width:desktopList?undefined:'100%',minWidth:0,
              maxHeight:desktopList?86:undefined,
              overflow:desktopList?'hidden':'visible',
              justifyContent:'center'}}>
              {representation}
            </View>
            {desktopList?detailArrow:null}
          </View>
          {desktopList&&lyricExpanded&&file.kind==='lyrics'?
            <View style={{paddingLeft:210+120+28,paddingRight:28,
              paddingBottom:14}}>
              <Text style={{fontFamily:'Georgia',fontSize:15,
                lineHeight:24,color:theme.muted}}>{text}</Text>
            </View>:null}
          {newVersionMode&&isMusicTrackCandidate(file)?
            <Pressable accessibilityRole="button"
              accessibilityLabel={'Créer une nouvelle version depuis '+file.title}
              onPress={()=>onStartVersion(file)}
              style={{alignSelf:'flex-start',flexDirection:'row',
                alignItems:'center',gap:7,minHeight:39,
                paddingHorizontal:12,borderRadius:9,backgroundColor:PINK}}>
              <Ionicons name="add-circle-outline" color="#FFFFFF" size={16}/>
              <Text style={{fontSize:12,fontWeight:'700',color:'#FFFFFF'}}>
                Démarrer une version avec cette prise
              </Text>
            </Pressable>:null}
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
    {newVersionMode&&!files.some(file=>isMusicTrackCandidate(file))?
      <View style={{padding:13,borderRadius:10,
        borderWidth:1,borderColor:theme.border,gap:5}}>
        <Text style={{fontSize:13,fontWeight:'600',color:theme.foreground}}>
          Pas encore de prise audio ou MIDI
        </Text>
        <Text style={{fontSize:12,lineHeight:19,color:theme.muted}}>
          Enregistre ou importe une prise dans Capturer. Tu pourras ensuite
          l'utiliser comme première piste d'une nouvelle version.
        </Text>
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

  </View>;
}
