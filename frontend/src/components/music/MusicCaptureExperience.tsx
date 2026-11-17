import React, { useState } from 'react';
import { Platform, Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import { MusicAudioCapture } from './MusicAudioCapture';
import { MusicAudioPreview } from './MusicAudioPreview';
import { MusicAudioPeaks } from './MusicAudioPeaksNext';
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
type Writing='lyrics'|'note'|'translation';
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
  const [writing,setWriting]=useState<Writing>('lyrics');
  const [draft,setDraft]=useState('');
  const [language,setLanguage]=useState(project.originalLanguage||'Français');
  const [selected,setSelected]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const selectedFile=files.find(f=>f.id===selected)||null;
  const changeFile=(id:string,change:Partial<MusicProjectFile>)=>
    patch({files:files.map(file=>file.id===id?{...file,...change}:file)});
  const addWritten=()=>{
    if(!draft.trim())return;
    const translated=writing==='translation';
    const lyrics=writing!=='note';
    const item:MusicProjectFile={
      id:newMusicId(),kind:lyrics?'lyrics':'note',sectionIds:[],
      title:translated?'Traduction · '+(language||'à préciser'):
        lyrics?'Paroles':draft.trim().split('\n')[0].slice(0,52),
      text:draft.trim(),lyricSegments:lyrics?lyricStanzas(draft.trim()):undefined,
      language:lyrics?(language.trim()||project.originalLanguage):undefined,
      createdAt:new Date().toISOString(),
    };
    patch({files:[...files,item]});
    setDraft('');setComposer('none');setSelected(item.id);
  };
  const addRecorded=(id:string,filename:string,durationSeconds?:number,
    _offset?:number,markers?:MusicAudioMarker[])=>{
    const item:MusicProjectFile={
      id:newMusicId(),title:'Prise '+(files.filter(isAudio).length+1),
      kind:'audio',sectionIds:[],localFileId:id,originalFilename:filename,
      mimeType:/\.m4a$/i.test(filename)?'audio/mp4':'audio/webm',
      durationSeconds,markers:markers||[],createdAt:new Date().toISOString(),
    };
    patch({files:[...files,item]});setComposer('none');setSelected(item.id);
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
      {action('Enregistrer','mic-outline',()=>setComposer(composer==='record'?'none':'record'),true)}
      {action('Écrire','pencil-outline',()=>setComposer(composer==='write'?'none':'write'))}
      {action(busy?'Import…':'Importer','add-outline',pickFiles)}
    </View>
    {composer!=='none'?<View style={{gap:16,padding:compact?16:22,
      borderWidth:1,borderColor:theme.border,borderRadius:18,backgroundColor:theme.surface}}>
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
        <Text style={{fontSize:16,fontWeight:'700',color:theme.foreground}}>
          {composer==='record'?'Enregistrement audio':'Écrire'}
        </Text>
        <Pressable onPress={()=>setComposer('none')} accessibilityLabel="Fermer" style={{padding:6}}>
          <Ionicons name="close" size={20} color={theme.muted}/>
        </Pressable>
      </View>
      {composer==='record' ? <MusicAudioCapture onSaved={addRecorded}/> :
        <View style={{gap:13}}>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
            {([
              {key:'lyrics' as Writing,text:'Paroles'},
              {key:'note' as Writing,text:'Note'},
              {key:'translation' as Writing,text:'Traduction humaine'}
            ]).map(item=><Pressable key={item.key} onPress={()=>setWriting(item.key)}
              accessibilityRole="radio" accessibilityState={{checked:writing===item.key}}
              style={{minHeight:36,paddingHorizontal:12,justifyContent:'center',
                borderRadius:19,borderWidth:1,
                borderColor:writing===item.key?PINK:theme.border,
                backgroundColor:writing===item.key?(theme.dark?'#382530':'#F9EBF0'):theme.background}}>
              <Text style={{fontSize:12,color:writing===item.key?PINK:theme.foreground}}>{item.text}</Text>
            </Pressable>)}
          </View>
          {writing!=='note'?<TextInput value={language} onChangeText={setLanguage}
            placeholder="Langue de ces paroles" placeholderTextColor={theme.muted}
            accessibilityLabel="Langue des paroles" style={{...field,fontSize:13,minHeight:43,lineHeight:18}}/>:null}
          <TextInput multiline autoFocus textAlignVertical="top" value={draft} onChangeText={setDraft}
            placeholder={writing==='translation'?'Écris ta traduction ici…':
              writing==='note'?'Une pensée, une inspiration…':'Quelques mots, un refrain…'}
            placeholderTextColor={theme.muted} style={{...field,minHeight:compact?165:220,
              fontSize:writing==='note'?15:19,lineHeight:writing==='note'?24:30}}/>
          {writing==='translation'?<Text style={{fontSize:11,lineHeight:18,color:theme.muted}}>
            Traduction écrite par une personne. Aucune parole n'est générée automatiquement.
          </Text>:null}
          <View style={{alignSelf:'flex-end'}}>
            <Pressable disabled={!draft.trim()} onPress={addWritten}
              accessibilityRole="button" style={{paddingHorizontal:18,minHeight:43,borderRadius:11,
                backgroundColor:draft.trim()?PINK:theme.border,justifyContent:'center'}}>
              <Text style={{color:'#fff',fontWeight:'700',fontSize:12}}>Conserver</Text>
            </Pressable>
          </View>
        </View>}
    </View>:null}
    {error?<Text style={{fontSize:12,color:'#B64A60'}}>{error}</Text>:null}
    <View style={{gap:11}}>
      <View style={{flexDirection:'row',alignItems:'baseline',gap:9}}>
        <Text style={{color:theme.foreground,fontSize:17,fontWeight:'700'}}>Dans cette chanson</Text>
        {files.length ? <Text style={{fontSize:12,color:theme.muted}}>{files.length}</Text> : null}
      </View>
      {!files.length ? <View style={{borderTopWidth:1,borderColor:theme.border,
        minHeight:160,alignItems:'center',justifyContent:'center',gap:12}}>
        <Ionicons name="leaf-outline" size={30} color={PINK}/>
        <Text style={{fontSize:13,color:theme.muted,textAlign:'center',lineHeight:21,maxWidth:280}}>
          Aucun élément. Enregistre, écris ou importe pour commencer.
        </Text>
      </View> : null}
      {files.map(file=>{
        const image=isImage(file), sound=isAudio(file), text=content(file).trim();
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
          {text ? <Text numberOfLines={file.kind==='lyrics'?6:4}
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
            <MusicAudioPeaks file={file}/>
          </View>:null}
          {!image&&!sound&&!text?<View style={{flexDirection:'row',gap:10,alignItems:'center'}}>
            <Ionicons name="document-outline" color={theme.muted} size={20}/>
            <Text numberOfLines={2} style={{color:theme.foreground,fontSize:14}}>{file.title}</Text>
          </View>:null}
          {isMusicTrackCandidate(file)?<Text style={{fontSize:11,color:theme.muted}}>
            Disponible pour une version · ouvrir pour choisir
          </Text>:null}
          </Pressable>
          {sound&&file.localFileId?<MusicAudioPreview source={{localAudioId:file.localFileId}}/>:null}
        </View>;
      })}
    </View>
    <MusicMaterialViewer key={selectedFile?.id||'closed'} visible={!!selectedFile}
      file={selectedFile} project={project} onClose={()=>setSelected('')}
      onUpdate={changeFile} onChangeType={(id,kind)=>{
        const item=files.find(f=>f.id===id);
        if(item)changeFile(id,classifySongFile(item,kind));
      }} onSection={associate} onNewSection={newSection}
      onStartVersion={onStartVersion} onUseFile={onUseFile} hasVersion={hasVersion}/>
  </View>;
}
