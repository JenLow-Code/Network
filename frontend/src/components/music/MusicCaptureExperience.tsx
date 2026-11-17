import React, { useState } from 'react';
import { Platform, Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import { MusicAudioCapture } from './MusicAudioCapture';
import { MusicAudioTake } from './MusicAudioTake';
import { MusicWritingStudio, MusicNotePreview, type MusicWritingResult } from './MusicWritingStudio';

import { MusicLocalArt } from './MusicLocalArtNext';
import { MusicMaterialViewer } from './MusicMaterialViewerV3';
import { importSongFile, classifySongFile, lyricStanzas } from '@/domain/musicImportedFiles';
import { isMusicTrackCandidate } from '@/domain/musicNext';
import { formatMusicDuration } from '@/domain/musicProjectSelectors';
import { newMusicId } from '@/domain/musicWorkspace';
import type { MusicProject, MusicProjectFile, MusicSection, MusicAudioMarker } from '@/domain/musicWorkspace';

const PINK='#CB245C';
type Props={project:MusicProject;patch:(changes:Partial<MusicProject>)=>void;
  onStartVersion:(source:MusicProjectFile)=>void;onUseFile:(source:MusicProjectFile)=>void;
  hasVersion:boolean};
type Composer='none'|'write'|'record';
type Writing='lyrics'|'note';
const isImage=(file:MusicProjectFile)=>/\.(jpg|jpeg|png|webp)$/i.test(file.originalFilename||'');
const isAudio=(file:MusicProjectFile)=>!!file.mimeType?.startsWith('audio/')||
  /\.(wav|mp3|m4a|webm|ogg|aac)$/i.test(file.originalFilename||'');
const content=(file:MusicProjectFile)=>file.kind==='lyrics'&&file.lyricSegments?.length
  ?file.lyricSegments.map(v=>v.text).join('\n\n'):(file.text||'');
function category(file:MusicProjectFile) {
  if(isImage(file))return 'Image';
  return ({lyrics:'Paroles',audio:'Audio',track:'Piste',score:'Partition',
    note:'Note',idea:'Idée',document:'Document'} as const)[file.kind];
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
  const [draftDirty,setDraftDirty]=useState(false);
  const [translationSourceId,setTranslationSourceId]=useState('');
  const [selected,setSelected]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const selectedFile=files.find(f=>f.id===selected)||null;
  const translationSource=files.find(f=>f.id===translationSourceId)||null;
  const closeComposer=()=>{
    if((composer==='record'&&unsavedRecording)||(composer==='write'&&draftDirty)){
      setConfirmClose(true);return;
    }
    setComposer('none');setTranslationSourceId('');setConfirmClose(false);
  };
  const openWrite=(sourceId='')=>{
    if(composer==='record'&&unsavedRecording){setConfirmClose(true);return;}
    if(composer==='write'&&draftDirty&&translationSourceId!==sourceId){
      setConfirmClose(true);return;
    }
    setTranslationSourceId(sourceId);setComposer('write');setConfirmClose(false);
  };
  const changeFile=(id:string,change:Partial<MusicProjectFile>)=>
    patch({files:files.map(file=>file.id===id?{...file,...change}:file)});
  const addWritten=(result:MusicWritingResult)=>{
    if(!result.text.trim())return;
    const translated=result.mode==='translation';
    const lyrics=result.mode!=='note';
    const title=result.title.trim()||(translated
      ?'Traduction · '+result.language
      :lyrics?'Paroles':result.text.trim().split('\n')[0].slice(0,52)||'Note');
    const item:MusicProjectFile={
      id:newMusicId(),kind:lyrics?'lyrics':'note',sectionIds:[],
      title,text:result.text.trim(),
      lyricSegments:lyrics?lyricStanzas(result.text.trim()):undefined,
      language:lyrics?(result.language||project.originalLanguage):undefined,
      translationOfFileId:translated?result.translationOfFileId:undefined,
      createdAt:new Date().toISOString(),
    };
    patch({files:[...files,item]});
    setDraftDirty(false);setComposer('none');setTranslationSourceId('');
    setSelected(item.id);
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
  const action=(label:string,icon:keyof typeof Ionicons.glyphMap,fn:()=>void,primary=false)=>
    <Pressable onPress={fn} accessibilityRole="button" accessibilityLabel={label}
      style={{minHeight:45,flexDirection:'row',alignItems:'center',justifyContent:'center',
        gap:9,paddingHorizontal:15,paddingVertical:10,borderRadius:12,
        backgroundColor:primary?PINK:theme.surface,borderWidth:primary?0:1,
        borderColor:theme.border}}>
      <Ionicons name={icon} size={18} color={primary?'#fff':PINK}/>
      <Text style={{fontSize:13,fontWeight:'600',color:primary?'#fff':theme.foreground}}>{label}</Text>
    </Pressable>;
  const field={fontSize:15,lineHeight:24,color:theme.foreground,
    backgroundColor:theme.surface,borderRadius:13,borderWidth:1,borderColor:theme.border,
    paddingHorizontal:16,paddingVertical:14} as const;
  return <View style={{gap:23}}>
    <View style={{gap:7}}>
      <Text style={{fontSize:22,fontWeight:'700',color:theme.foreground}}>Capturer</Text>
      <Text style={{fontSize:13,lineHeight:21,color:theme.muted,maxWidth:560}}>
        Enregistre, écris ou importe. Les éléments restent indépendants des versions.
      </Text>
    </View>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:9}}>
      {action('Enregistrer','mic-outline',()=>{
        if(composer==='record'){closeComposer();return;}
        if(composer==='write'&&draftDirty){setConfirmClose(true);return;}
        setComposer('record');setTranslationSourceId('');
      },true)}
      {action('Écrire','pencil-outline',()=>{
        if(composer==='write'&&!translationSourceId){closeComposer();return;}
        openWrite();
      })}
      {action(busy?'Import…':'Importer','add-outline',pickFiles)}
    </View>
    {composer!=='none'?<View style={{gap:16,padding:compact?16:22,
      borderWidth:1,borderColor:theme.border,borderRadius:18,backgroundColor:theme.surface}}>
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'flex-end'}}>
        <Pressable onPress={closeComposer} accessibilityLabel="Fermer" style={{padding:6}}>
          <Ionicons name="close" size={20} color={theme.muted}/>
        </Pressable>
      </View>
      {confirmClose?<View style={{borderRadius:12,borderWidth:1,borderColor:theme.border,
        padding:12,gap:10}}>
        <Text style={{fontSize:12,color:theme.foreground,lineHeight:19}}>
          {composer==='record'?'Abandonner la prise non enregistrée ?':'Abandonner ce brouillon ?'}
        </Text>
        <View style={{flexDirection:'row',gap:9,flexWrap:'wrap'}}>
          {action('Continuer', 'arrow-back-outline',()=>setConfirmClose(false))}
          {action('Abandonner','close-outline',()=>{
            setUnsavedRecording(false);setDraftDirty(false);setTranslationSourceId('');
            setComposer('none');setConfirmClose(false);
          })}
        </View>
      </View>:null}
      {composer==='record' ? <MusicAudioCapture onSaved={addRecorded}
        onDraftChange={setUnsavedRecording}
        suggestedTitle={'Prise '+(files.filter(isAudio).length+1)}/> :
        <MusicWritingStudio mode={writing} onModeChange={setWriting}
          originalLanguage={project.originalLanguage}
          source={translationSource} onSave={addWritten}
          onRequestTranslator={requestTranslator} onDirtyChange={setDraftDirty}
          requestPending={!!(project.needs||[]).find(need=>
            need.sourceFileId===translationSourceId&&need.kind==='talent'&&
            need.label.toLowerCase()==='traducteur')}/>}
    </View>:null}
    {error?<Text style={{fontSize:12,color:'#B64A60'}}>{error}</Text>:null}
    <View style={{gap:11}}>
      <View style={{flexDirection:'row',alignItems:'baseline',gap:9}}>
        <Text style={{color:theme.foreground,fontSize:17,fontWeight:'700'}}>Éléments enregistrés</Text>
        {files.length ? <Text style={{fontSize:12,color:theme.muted}}>{files.length}</Text> : null}
      </View>
      {!files.length ? <View style={{borderTopWidth:1,borderColor:theme.border,
        minHeight:160,alignItems:'center',justifyContent:'center',gap:12}}>
        <Ionicons name="leaf-outline" size={30} color={PINK}/>
        <Text style={{fontSize:13,color:theme.muted,textAlign:'center',lineHeight:21,maxWidth:280}}>
          Aucun élément. Enregistre, écris ou importe pour commencer.
        </Text>
      </View> : null}
      {files.filter(file=>!file.translationOfFileId||
        !files.some(original=>original.id===file.translationOfFileId)).map(file=>{
        const image=isImage(file), sound=isAudio(file), text=content(file).trim();
        const translations=files.filter(candidate=>candidate.translationOfFileId===file.id);
        return <View key={file.id} style={{paddingVertical:18,borderTopWidth:1,
          borderColor:theme.border,gap:12}}>
          <Pressable onPress={()=>setSelected(file.id)} accessibilityRole="button"
            accessibilityLabel={'Ouvrir '+file.title} style={{gap:11}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:9}}>
            <Text style={{color:PINK,fontSize:11,fontWeight:'700'}}>{category(file)}</Text>
            {file.language?<Text style={{color:theme.muted,fontSize:11}}>· {file.language}</Text>:null}
            <View style={{flex:1}}/>
            <Ionicons name="ellipsis-horizontal" color={theme.muted} size={20}/>
          </View>
          {image?<View style={{borderRadius:16,overflow:'hidden'}}>
            <MusicLocalArt file={file} cover/>
          </View>:null}
          {text&&file.kind==='note'?<View style={{maxWidth:650}}>
            <MusicNotePreview text={text.split('\n').slice(0,5).join('\n')}
              color={theme.foreground}/>
          </View>:text ? <Text numberOfLines={6}
            style={{fontFamily:file.kind==='lyrics'?'Georgia':undefined,
              fontSize:file.kind==='lyrics'?18:14,
              lineHeight:file.kind==='lyrics'?28:23,color:theme.foreground,
              maxWidth:650}}>{text}</Text> : null}
          {sound?<View style={{gap:10}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:9}}>
              <Ionicons name="mic-outline" size={18} color={theme.muted}/>
              <Text style={{fontSize:13,fontWeight:'600',color:theme.foreground,flex:1}}
                numberOfLines={1}>{file.title}</Text>
              {file.durationSeconds!==undefined?<Text style={{fontSize:11,color:theme.muted}}>
                {formatMusicDuration(file.durationSeconds)}
              </Text>:null}
            </View>

          </View>:null}
          {!image&&!sound&&!text?<View style={{flexDirection:'row',gap:10,alignItems:'center'}}>
            <Ionicons name="document-outline" color={theme.muted} size={20}/>
            <Text numberOfLines={2} style={{color:theme.foreground,fontSize:14}}>{file.title}</Text>
          </View>:null}

          </Pressable>
          {sound&&file.localFileId?<MusicAudioTake file={file} compact
            onOpen={()=>setSelected(file.id)}/>:null}
          {file.kind==='lyrics'&&!file.translationOfFileId?
            <Pressable onPress={()=>openWrite(file.id)} accessibilityRole="button"
              style={{alignSelf:'flex-start',minHeight:40,flexDirection:'row',
                alignItems:'center',gap:8}}>
              <Ionicons name="language-outline" size={17} color={PINK}/>
              <Text style={{fontSize:12,fontWeight:'600',color:PINK}}>Traduire ces paroles</Text>
            </Pressable>:null}
          {translations.length?<View style={{gap:6,paddingTop:8}}>
            <Text style={{fontSize:11,color:theme.muted,fontWeight:'600'}}>Traductions</Text>
            {translations.map(translation=><Pressable key={translation.id}
              accessibilityRole="button"
              accessibilityLabel={'Ouvrir '+translation.title}
              onPress={()=>setSelected(translation.id)}
              style={{flexDirection:'row',alignItems:'center',gap:8,
                paddingVertical:9,paddingHorizontal:12,borderRadius:10,
                backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border}}>
              <Ionicons name="language-outline" color={PINK} size={16}/>
              <Text numberOfLines={1} style={{color:theme.foreground,fontSize:13,
                flex:1}}>{translation.title}</Text>
              <Text style={{color:theme.muted,fontSize:11}}>{translation.language}</Text>
              <Ionicons name="chevron-forward" color={theme.muted} size={16}/>
            </Pressable>)}
          </View>:null}
        </View>;
      })}
    </View>
    <MusicMaterialViewer key={selectedFile?.id||'closed'} visible={!!selectedFile}
      file={selectedFile} project={project} onClose={()=>setSelected('')}
      onUpdate={changeFile} onChangeType={(id,kind)=>{
        const item=files.find(f=>f.id===id);
        if(item)changeFile(id,classifySongFile(item,kind));
      }} onSection={associate} onNewSection={newSection}
      onStartVersion={onStartVersion} onUseFile={onUseFile}
      onTranslate={file=>openWrite(file.id)} onOpenFile={setSelected}
      hasVersion={hasVersion}/>
  </View>;
}
