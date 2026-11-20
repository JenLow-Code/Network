import React from 'react';
import {ActivityIndicator,Text,View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {MusicWritingOverlay} from '@/components/music/MusicWritingOverlay';
import type {MusicWritingResult} from '@/components/music/MusicWritingStudio';
import {lyricStanzas} from '@/domain/musicImportedFiles';
import {newMusicId,useMusicWorkspaces} from '@/domain/musicWorkspace';
import type {MusicProjectFile} from '@/domain/musicWorkspace';
import type {MusicNotationEvent} from '@/domain/musicNotation';
import {PageHeader} from '@/components/navigation/PageHeader';

/** Each editor is a real, directly addressable page, not a tab in a shared modal. */
export function MusicEditorPage({kind}:{kind:'lyrics'|'score'}){
  const {id,fileId,sourceId}=useLocalSearchParams<{
    id:string;fileId?:string;sourceId?:string;
  }>();
  const {items,patch,ready}=useMusicWorkspaces();
  const theme=useAppTheme();
  const project=items.find(item=>item.id===id);
  const close=()=>router.replace({pathname:'/music-workspace/[id]',
    params:{id,tab:'capture'}});
  if(!ready)return <View style={{flex:1,backgroundColor:theme.background,
    alignItems:'center',justifyContent:'center'}}>
    <ActivityIndicator color="#CB245C"/>
  </View>;
  if(!project)return <View style={{flex:1,backgroundColor:theme.background,padding:24}}>
    <PageHeader onBack={close}/>
    <Ionicons name="alert-circle-outline" size={26} color={theme.muted}/>
    <Text style={{color:theme.foreground,fontSize:16}}>Morceau introuvable sur cet appareil.</Text>
  </View>;
  const files=project.files||[];
  const initialFile=files.find(file=>file.id===fileId)||null;
  const source=files.find(file=>file.id===sourceId)||null;
  const saveWritten=(result:MusicWritingResult)=>{
    if(!result.text.trim())return;
    const translated=result.mode==='translation';
    const lyrics=result.mode!=='note';
    const editing=files.find(file=>file.id===fileId);
    const current=translated&&editing&&!editing.translationOfFileId?undefined:editing;
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
      lyricReferences:result.lyricReferences||current?.lyricReferences||[],
      lyricComments:result.lyricComments||current?.lyricComments||[],
      createdAt:current?.createdAt||new Date().toISOString(),
    };
    const created=result.newSections||[];
    patch(project.id,{
      files:current?files.map(file=>file.id===current.id?item:file):[...files,item],
      sections:[...project.sections,...created.filter(section=>
        !project.sections.some(existing=>existing.id===section.id||
          existing.title.trim().toLocaleLowerCase()===section.title.trim().toLocaleLowerCase()))],
    });
    close();
  };
  const saveScore=(result:{title:string;events:MusicNotationEvent[];bpm:number;
    tone:string;sampleLocalId?:string;sampleName?:string;
    sampleRootMidi?:number;sampleRootHz?:number;clef?:'treble'|'bass';
    meterNumerator?:number;meterDenominator?:number;
    sampleEndMode?:'fade'|'repeat'|'slow';
    drumSamples?:MusicProjectFile['drumSamples']})=>{
    if(!result.events.length)return;
    const current=files.find(file=>file.id===fileId);
    const item:MusicProjectFile={
      id:current?.id||newMusicId(),kind:'score',
      sectionIds:current?.sectionIds||[],title:result.title,
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
    patch(project.id,{files:current?files.map(file=>file.id===current.id?item:file):[...files,item]});
    close();
  };
  const requestTranslator=(sourceFileId:string,targetLanguage:string)=>{
    const original=files.find(file=>file.id===sourceFileId);
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
    onSave={saveWritten} onSaveScore={saveScore}
    onRequestTranslator={requestTranslator}
    requestedLanguages={(project.needs||[]).filter(need=>
      need.sourceFileId===sourceId&&need.kind==='talent'&&
      need.label.toLowerCase()==='traducteur')
      .map(need=>need.targetLanguage||'')}
    onClose={close}/>;
}
