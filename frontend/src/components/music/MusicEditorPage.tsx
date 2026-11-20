import React,{useRef} from 'react';
import {ActivityIndicator,Text,View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {MusicWritingOverlay} from '@/components/music/MusicWritingOverlay';
import type {MusicWritingResult} from '@/components/music/MusicWritingStudio';
import {lyricStanzas} from '@/domain/musicImportedFiles';
import {newMusicId,useMusicWorkspaces} from '@/domain/musicWorkspace';
import type {MusicProjectFile,MusicSection} from '@/domain/musicWorkspace';
import type {MusicNotationEvent} from '@/domain/musicNotation';
import {PageHeader} from '@/components/navigation/PageHeader';

type ScoreDraft={title:string;events:MusicNotationEvent[];bpm:number;
  tone:string;sampleLocalId?:string;sampleName?:string;
  sampleRootMidi?:number;sampleRootHz?:number;clef?:'treble'|'bass';
  meterNumerator?:number;meterDenominator?:number;
  sampleEndMode?:'fade'|'repeat'|'slow';
  drumSamples?:MusicProjectFile['drumSamples']};

/** Each editor is an independent page. Drafts write to one stable file ID
 * throughout the session; explicit Save remains available and closes the page. */
export function MusicEditorPage({kind}:{kind:'lyrics'|'score'}){
  const {id,fileId,sourceId}=useLocalSearchParams<{
    id:string;fileId?:string;sourceId?:string;
  }>();
  const {items,patch,ready}=useMusicWorkspaces();
  const theme=useAppTheme();
  const project=items.find(item=>item.id===id);
  const filesRef=useRef<MusicProjectFile[]>([]);
  const sectionsRef=useRef<MusicSection[]>([]);
  const draftIdsRef=useRef<Record<string,string>>({});
  // Keep the latest optimistic snapshot so rapid edits to different tabs never
  // overwrite a previous write with a stale project.files array.
  if(project){
    filesRef.current=project.files||[];
    sectionsRef.current=project.sections||[];
  }
  const close=()=>router.replace({pathname:'/music-workspace/[id]',
    params:{id,tab:'capture'}});
  if(!ready)return <View style={{flex:1,backgroundColor:theme.background,
    alignItems:'center',justifyContent:'center'}}>
    <ActivityIndicator color="#D71D77"/>
  </View>;
  if(!project)return <View style={{flex:1,backgroundColor:theme.background,padding:24}}>
    <PageHeader onBack={close}/>
    <Ionicons name="alert-circle-outline" size={26} color={theme.muted}/>
    <Text style={{color:theme.foreground,fontSize:16}}>Morceau introuvable sur cet appareil.</Text>
  </View>;

  const initialFile=(project.files||[]).find(file=>file.id===fileId)||null;
  const source=(project.files||[]).find(file=>file.id===sourceId)||null;
  const persistWritten=(result:MusicWritingResult,closeAfter=false):string|undefined=>{
    const files=filesRef.current;
    const translated=result.mode==='translation';
    const lyrics=result.mode!=='note';
    const modeKey=translated?'translation:'+(result.translationOfFileId||sourceId||''):result.mode;
    const priorId=draftIdsRef.current[modeKey];
    let current=files.find(file=>file.id===priorId);
    if(!current&&fileId){
      const opened=files.find(file=>file.id===fileId);
      if(opened&&(translated?!!opened.translationOfFileId:
        result.mode==='note'?opened.kind==='note':
        opened.kind==='lyrics'&&!opened.translationOfFileId))current=opened;
    }
    if(!current&&!priorId&&!result.title.trim()&&!result.text.trim())return;
    const savedId=current?.id||priorId||newMusicId();
    draftIdsRef.current[modeKey]=savedId;
    const title=result.title.trim()||(translated
      ?'Traduction · '+(result.language||'langue à définir')
      :lyrics?'Paroles':result.text.trim().split('\n')[0].slice(0,52)||'Note');
    const stanzas=lyrics?lyricStanzas(result.text.trim()):undefined;
    const item:MusicProjectFile={
      ...(current||{}),
      id:savedId,kind:lyrics?'lyrics':'note',
      sectionIds:current?.sectionIds||[],
      title,text:result.text,
      lyricSegments:stanzas?.map((stanza,index)=>({
        ...stanza,
        id:current?.lyricSegments?.[index]?.id||stanza.id,
        sectionIds:current?.lyricSegments?.[index]?.sectionIds||[],
      })),
      language:lyrics?(translated?(result.language||''):(result.language||project.originalLanguage)):undefined,
      translationOfFileId:translated?
        (result.translationOfFileId||current?.translationOfFileId):undefined,
      lyricReferences:result.lyricReferences||current?.lyricReferences||[],
      lyricComments:result.lyricComments||current?.lyricComments||[],
      createdAt:current?.createdAt||new Date().toISOString(),
    };
    const nextFiles=files.some(file=>file.id===savedId)
      ?files.map(file=>file.id===savedId?item:file):[...files,item];
    const nextSections=[...sectionsRef.current];
    (result.newSections||[]).forEach(section=>{
      if(!nextSections.some(existing=>existing.id===section.id||
        existing.title.trim().toLocaleLowerCase()===section.title.trim().toLocaleLowerCase()))
        nextSections.push(section);
    });
    filesRef.current=nextFiles;sectionsRef.current=nextSections;
    patch(project.id,{files:nextFiles,sections:nextSections});
    if(closeAfter)close();
    return savedId;
  };
  const persistScore=(result:ScoreDraft,closeAfter=false)=>{
    const files=filesRef.current;
    const priorId=draftIdsRef.current.score;
    const current=files.find(file=>file.id===priorId)||
      files.find(file=>file.id===fileId&&file.kind==='score');
    if(!current&&!priorId&&!result.events.length)return;
    const savedId=current?.id||priorId||newMusicId();
    draftIdsRef.current.score=savedId;
    const item:MusicProjectFile={
      ...(current||{}),
      id:savedId,kind:'score',
      sectionIds:current?.sectionIds||[],
      title:result.title||'Idée musicale',
      musicEvents:result.events,tempoBpm:result.bpm,
      timeSignatureNumerator:result.meterNumerator,
      timeSignatureDenominator:result.meterDenominator,
      instrumentTone:result.tone,
      instrumentSampleLocalId:result.sampleLocalId,
      instrumentSampleName:result.sampleName,
      instrumentSampleRootMidi:result.sampleRootMidi,
      instrumentSampleRootHz:result.sampleRootHz,
      instrumentSampleEndMode:result.sampleEndMode||'fade',
      drumSamples:result.drumSamples,scoreClef:result.clef,
      createdAt:current?.createdAt||new Date().toISOString(),
    };
    const nextFiles=files.some(file=>file.id===savedId)
      ?files.map(file=>file.id===savedId?item:file):[...files,item];
    filesRef.current=nextFiles;
    patch(project.id,{files:nextFiles});
    if(closeAfter)close();
  };
  const requestTranslator=(sourceFileId:string,targetLanguage:string)=>{
    const original=filesRef.current.find(file=>file.id===sourceFileId);
    if(!original||!targetLanguage.trim())return;
    if((project.needs||[]).some(need=>need.kind==='talent'&&
      need.label.toLowerCase()==='traducteur'&&
      need.sourceFileId===sourceFileId&&need.targetLanguage===targetLanguage.trim()))return;
    patch(project.id,{needs:[...(project.needs||[]),{
      id:newMusicId(),kind:'talent',label:'Traducteur',sourceFileId,
      sourceLanguage:original.language||project.originalLanguage,
      targetLanguage:targetLanguage.trim(),
    }]});
  };
  return <MusicWritingOverlay key={[kind,fileId,sourceId].join('-')}
    project={project} mode={initialFile?.kind==='note'?'note':'lyrics'}
    startTab={kind==='score'?'score':'lyrics'}
    onModeChange={()=>{}} source={source} initialFile={initialFile}
    onSave={result=>{persistWritten(result,true);}}
    onAutoSave={result=>persistWritten(result,false)}
    onSaveScore={result=>{persistScore(result,true);}}
    onAutoSaveScore={result=>{persistScore(result,false);}}
    onRequestTranslator={requestTranslator}
    requestedLanguages={(project.needs||[]).filter(need=>
      need.sourceFileId===(sourceId||initialFile?.translationOfFileId)&&
      need.kind==='talent'&&need.label.toLowerCase()==='traducteur')
      .map(need=>need.targetLanguage||'')}
    onClose={close}/>;
}
