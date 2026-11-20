import React,{useRef,useState} from 'react';
import {
  KeyboardAvoidingView,Modal,Platform,Pressable,ScrollView,
  Text,View,useWindowDimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {MusicAudioPreview} from './MusicAudioPreview';
import {MusicWritingStudio,type MusicWritingResult} from './MusicWritingStudio';
import {MusicSketchStudio} from './MusicSketchStudio';
import {useAppTheme} from '@/theme/AppTheme';
import type {MusicProject,MusicProjectFile} from '@/domain/musicWorkspace';
import type {MusicNotationEvent} from '@/domain/musicNotation';
import {musicNextState} from '@/domain/musicNext';

const PINK='#CB245C';
type WritingMode='lyrics'|'note';
type Tab='lyrics'|'note'|'score'|'translation';
type Props={
  project:MusicProject;
  mode:WritingMode;
  startTab?:'lyrics'|'score';
  onModeChange:(mode:WritingMode)=>void;
  source?:MusicProjectFile|null;
  initialFile?:MusicProjectFile|null;
  onSave:(result:MusicWritingResult)=>void;
  onSaveScore:(result:{title:string;events:MusicNotationEvent[];bpm:number;
    tone:string;sampleLocalId?:string;sampleName?:string;
    sampleRootMidi?:number;clef?:'treble'|'bass'})=>void;
  onRequestTranslator:(sourceId:string,language:string)=>void;
  requestedLanguages:string[];
  onClose:()=>void;
};
function isCaptureAudio(file:MusicProjectFile){
  return !!file.localFileId && (!!file.mimeType?.startsWith('audio/')||
    /\.(wav|mp3|m4a|webm|ogg|aac)$/i.test(file.originalFilename||''));
}
/** One immersive workspace, four distinct tools, independent persistent drafts. */
export function MusicWritingOverlay({project,mode,startTab,onModeChange,source,initialFile,
  onSave,onSaveScore,onRequestTranslator,requestedLanguages,onClose}:Props){
  const theme=useAppTheme();
  const {width}=useWindowDimensions();
  const compact=width<650;
  const initialTab:Tab=initialFile?.musicEvents?'score':
    (source||initialFile?.translationOfFileId)?'translation':(startTab||mode);
  const [tab,setTab]=useState<Tab>(initialTab);
  const bodyScrollRef=useRef<React.ElementRef<typeof ScrollView>>(null);
  const [writerDirty,setWriterDirty]=useState(false);
  const [translationDirty,setTranslationDirty]=useState(false);
  const [scoreDirty,setScoreDirty]=useState(false);
  const [confirmExit,setConfirmExit]=useState(false);
  const [listen,setListen]=useState(false);
  const [choosing,setChoosing]=useState(false);
  const [audioId,setAudioId]=useState('');
  const [sourceId,setSourceId]=useState(source?.id||initialFile?.translationOfFileId||'');
  const [sourceOpen,setSourceOpen]=useState(false);
  const [sourceWarning,setSourceWarning]=useState('');
  const dirty=writerDirty||translationDirty||scoreDirty;
  const hasVersion=musicNextState(project).versions.length>0;
  const audioFiles=(project.files||[]).filter(isCaptureAudio);
  const audioChoices=[
    ...audioFiles.map(file=>({
      id:'capture-'+file.id,title:file.title,file,
      type:file.kind==='track'?'Piste de Capture':'Audio de Capture',
    })),
    ...musicNextState(project).versions.flatMap(version=>version.tracks.flatMap(track=>{
      const file=audioFiles.find(candidate=>candidate.id===track.sourceFileId);
      return file?[{
        id:'track-'+track.id,title:track.title,file,
        type:'Piste · '+version.title,
      }]:[];
    })),
  ];
  const selectedAudio=audioChoices.find(option=>option.id===audioId);
  const lyricSources=(project.files||[]).filter(file=>file.kind==='lyrics'&&
    !file.translationOfFileId&&
    !!(file.text?.trim()||file.lyricSegments?.some(segment=>segment.text.trim())));
  const selectedSource=lyricSources.find(file=>file.id===sourceId)||null;
  const tabs:{id:Tab;title:string;icon:keyof typeof Ionicons.glyphMap}[]=[
    {id:'lyrics',title:'Paroles',icon:'text-outline'},
    {id:'note',title:'Notes',icon:'reader-outline'},
    {id:'score',title:'Partition',icon:'musical-notes-outline'},
    {id:'translation',title:'Traduction',icon:'language-outline'},
  ];
  const exit=()=>{
    if(dirty)setConfirmExit(true);
    else onClose();
  };
  const changeTab=(next:Tab)=>{
    if(initialFile&&next!==tab)return;
    bodyScrollRef.current?.scrollTo({y:0,animated:false});
    setTab(next);
    if(next==='lyrics'||next==='note')onModeChange(next);
    setSourceWarning('');
    setChoosing(false);
  };
  const chooseSource=(id:string)=>{
    if(id!==sourceId&&translationDirty){
      setSourceWarning('Enregistre ou termine cette traduction avant de choisir un autre original.');
      return;
    }
    setSourceId(id);setSourceOpen(false);setSourceWarning('');
  };
  return <Modal visible animationType="slide"
    presentationStyle="fullScreen" onRequestClose={exit}>
    <SafeAreaView style={{flex:1,minHeight:0,overflow:'hidden',backgroundColor:theme.background}}>
      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined}
        style={{flex:1,minHeight:0}}>
        <View style={{height:54,flexShrink:0,flexDirection:'row',alignItems:'center',
          paddingHorizontal:compact?11:24,borderBottomWidth:1,borderColor:theme.border,
          backgroundColor:theme.background,zIndex:2}}>
          <Pressable onPress={exit} accessibilityRole="button"
            accessibilityLabel="Fermer l’éditeur"
            style={{width:43,height:43,justifyContent:'center',alignItems:'center'}}>
            <Ionicons name="close" size={23} color={theme.foreground}/>
          </Pressable>
          <Text style={{flex:1,textAlign:'center',color:theme.foreground,
            fontWeight:'600',fontSize:compact?15:17}}>Écrire & composer</Text>
          <View style={{width:43}}/>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{gap:2,alignItems:'center',paddingHorizontal:compact?8:24}}
          style={{height:51,maxHeight:51,flexGrow:0,flexShrink:0,
            overflow:'hidden',backgroundColor:theme.background,zIndex:2,
            borderBottomWidth:1,borderColor:theme.border}}>
          {tabs.map(item=>{
            const active=tab===item.id;
            const disabled=!!initialFile&&!active;
            return <Pressable key={item.id} onPress={()=>changeTab(item.id)}
              disabled={disabled} accessibilityRole="tab" accessibilityState={{selected:active,disabled}}
              accessibilityLabel={item.title}
              style={{height:49,flexDirection:'row',alignItems:'center',
                justifyContent:'center',gap:active?5:0,paddingHorizontal:compact?13:16,
                borderBottomWidth:active?2:0,borderBottomColor:PINK,opacity:disabled?.35:1}}>
              <Ionicons name={item.icon} size={compact?19:16} color={active?PINK:theme.muted}/>
              {(!compact||active)?<Text numberOfLines={1}
                style={{fontSize:compact?12:13,fontWeight:active?'700':'500',
                  color:active?theme.foreground:theme.muted}}>{item.title}</Text>:null}
            </Pressable>;
          })}
        </ScrollView>
        {tab==='lyrics'?<View style={{gap:7,width:'100%',maxWidth:860,
          alignSelf:'center',paddingHorizontal:compact?19:45,
          paddingVertical:6,borderBottomWidth:1,borderColor:theme.border}}>
          <Pressable onPress={()=>{setListen(v=>!v);setChoosing(false);}}
            accessibilityRole="checkbox" accessibilityState={{checked:listen}}
            accessibilityLabel="Écouter une piste ou un enregistrement de Capture"
            style={{minHeight:39,flexDirection:'row',alignItems:'center',gap:9,
              alignSelf:'flex-start'}}>
            <Ionicons name={listen?'checkbox':'square-outline'} size={20}
              color={listen?PINK:theme.muted}/>
            <Text style={{color:theme.foreground,fontSize:13}}>
              Écouter pendant l’écriture
            </Text>
          </Pressable>
          {listen?<View style={{borderWidth:1,borderColor:theme.border,
            borderRadius:12,padding:compact?11:15,gap:9,
            backgroundColor:theme.surface}}>
            {audioChoices.length?<View style={{gap:8}}>
              <Pressable onPress={()=>setChoosing(v=>!v)}
                accessibilityRole="button" accessibilityState={{expanded:choosing}}
                accessibilityLabel="Choisir un audio ou une piste de Capture"
                style={{minHeight:35,flexDirection:'row',gap:8,alignItems:'center'}}>
                <Ionicons name="headset-outline" color={PINK} size={18}/>
                <Text numberOfLines={1} style={{flex:1,color:theme.foreground,fontSize:13}}>
                  {selectedAudio?.title||'Choisir un audio ou une piste du morceau'}
                </Text>
                <Ionicons name={choosing?'chevron-up':'chevron-down'} color={theme.muted} size={16}/>
              </Pressable>
              {choosing?<ScrollView nestedScrollEnabled
                style={{maxHeight:compact?155:185}} contentContainerStyle={{gap:3}}>
                {audioChoices.map(option=><Pressable key={option.id}
                  onPress={()=>{setAudioId(option.id);setChoosing(false);}}
                  accessibilityRole="button"
                  style={{minHeight:45,flexDirection:'row',alignItems:'center',
                    borderRadius:9,paddingHorizontal:9,gap:10,
                    backgroundColor:option.id===audioId?(theme.dark?'#35242D':'#FAEAF0'):theme.surface}}>
                  <Ionicons name={option.id===audioId?'radio-button-on':'radio-button-off'}
                    size={18} color={PINK}/>
                  <View style={{flex:1}}>
                    <Text style={{fontSize:13,color:theme.foreground}}>{option.title}</Text>
                    <Text style={{fontSize:10,color:theme.muted}}>{option.type}</Text>
                  </View>
                </Pressable>)}
              </ScrollView>:null}
              {selectedAudio?.file.localFileId?<MusicAudioPreview key={selectedAudio.id}
                source={{localAudioId:selectedAudio.file.localFileId}} transcription/>:null}
            </View>:<Text style={{fontSize:12,lineHeight:20,color:theme.muted}}>
              Aucun audio jouable. Importe ou enregistre une source dans Capture pour pouvoir l’écouter.
            </Text>}
          </View>:null}
        </View>:null}
        {tab==='translation'?<View style={{width:'100%',maxWidth:1100,alignSelf:'center',
          paddingHorizontal:compact?19:45,paddingVertical:9,gap:7,
          borderBottomWidth:1,borderColor:theme.border}}>
          <Pressable onPress={()=>setSourceOpen(v=>!v)}
            disabled={!!initialFile} accessibilityRole="button"
            accessibilityState={{expanded:sourceOpen}}
            style={{minHeight:39,flexDirection:'row',alignItems:'center',gap:9}}>
            <Ionicons name="document-text-outline" size={19} color={PINK}/>
            <Text style={{fontSize:13,color:theme.foreground,flex:1}} numberOfLines={1}>
              {selectedSource?'Original : '+selectedSource.title:'Choisir les paroles originales'}
            </Text>
            {!initialFile?<Ionicons name={sourceOpen?'chevron-up':'chevron-down'}
              color={theme.muted} size={17}/>:null}
          </Pressable>
          {sourceOpen?<ScrollView nestedScrollEnabled style={{maxHeight:180}}>
            {lyricSources.map(file=><Pressable key={file.id} onPress={()=>chooseSource(file.id)}
              accessibilityRole="button" style={{paddingVertical:12,paddingHorizontal:7,
                borderBottomWidth:1,borderColor:theme.border}}>
              <Text style={{fontSize:13,color:theme.foreground}}>{file.title}</Text>
            </Pressable>)}
          </ScrollView>:null}
          {sourceWarning?<Text style={{fontSize:12,color:'#AD3857'}}>{sourceWarning}</Text>:null}
        </View>:null}
        <ScrollView ref={bodyScrollRef} keyboardShouldPersistTaps="handled"
          style={{flex:1,minHeight:0}}
          contentContainerStyle={{width:'100%',maxWidth:tab==='translation'?1100:860,
            alignSelf:'center',paddingHorizontal:compact?19:45,
            paddingTop:compact?14:25,paddingBottom:70,flexGrow:1}}>
          <View style={{display:tab==='lyrics'||tab==='note'?'flex':'none'}}>
            <MusicWritingStudio mode={tab==='note'?'note':'lyrics'}
              onModeChange={onModeChange} showTabs={false}
              initialFile={initialFile&&!initialFile.translationOfFileId
                &&!initialFile.musicEvents?initialFile:undefined}
              sections={project.sections} canLinkSections={hasVersion}
              originalLanguage={project.originalLanguage}
              onSave={onSave} onDirtyChange={setWriterDirty} immersive/>
          </View>
          <View style={{display:tab==='score'?'flex':'none'}}>
            <MusicSketchStudio initialFile={initialFile?.musicEvents?initialFile:null}
              active={tab==='score'}
              onSave={onSaveScore} onDirtyChange={setScoreDirty}/>
          </View>
          {selectedSource?<View style={{display:tab==='translation'?'flex':'none'}}>
            <MusicWritingStudio key={'translate-'+selectedSource.id}
              mode="lyrics" onModeChange={onModeChange} showTabs={false}
              source={selectedSource} sections={project.sections}
              initialFile={initialFile?.translationOfFileId===selectedSource.id
                ?initialFile:undefined}
              originalLanguage={project.originalLanguage}
              onSave={onSave} onRequestTranslator={onRequestTranslator}
              requestedLanguages={requestedLanguages}
              onDirtyChange={setTranslationDirty} immersive/>
          </View>:tab==='translation'?<View style={{paddingVertical:36,gap:11}}>
            <Ionicons name="language-outline" size={27} color={PINK}/>
            <Text style={{color:theme.foreground,fontSize:16,fontWeight:'600'}}>
              {lyricSources.length?'Choisis les paroles à traduire':'Aucune parole enregistrée'}
            </Text>
            <Text style={{fontSize:13,color:theme.muted,lineHeight:21}}>
              {lyricSources.length
                ?'Sélectionne un document de paroles dans la barre du haut.'
                :'Conserve d’abord des paroles dans Capture pour pouvoir les traduire en gardant l’original visible.'}
            </Text>
          </View>:null}
        </ScrollView>
        {confirmExit?<View style={{position:'absolute',top:0,right:0,left:0,bottom:0,
          justifyContent:'center',alignItems:'center',padding:20,
          backgroundColor:'rgba(18,12,17,.55)'}}>
          <View style={{width:'100%',maxWidth:390,gap:16,padding:22,
            borderRadius:16,backgroundColor:theme.background}}>
            <Text style={{fontSize:17,fontWeight:'700',color:theme.foreground}}>
              Abandonner les modifications ?
            </Text>
            <Text style={{fontSize:13,lineHeight:20,color:theme.muted}}>
              La capture n’a pas encore été enregistrée.
            </Text>
            <View style={{flexDirection:'row',justifyContent:'flex-end',gap:12,flexWrap:'wrap'}}>
              <Pressable onPress={()=>setConfirmExit(false)}
                style={{minHeight:44,justifyContent:'center',paddingHorizontal:8}}>
                <Text style={{fontWeight:'600',color:theme.foreground}}>Continuer</Text>
              </Pressable>
              <Pressable onPress={onClose} style={{minHeight:44,justifyContent:'center',
                paddingHorizontal:15,borderRadius:10,backgroundColor:PINK}}>
                <Text style={{color:'#fff',fontWeight:'700'}}>Abandonner</Text>
              </Pressable>
            </View>
          </View>
        </View>:null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
