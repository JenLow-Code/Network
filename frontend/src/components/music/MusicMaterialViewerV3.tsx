import React,{useEffect,useState} from 'react';
import {Modal,Platform,Pressable,ScrollView,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {MusicLocalArt} from './MusicLocalArtNext';
import {MusicAudioTake} from './MusicAudioTake';
import {MusicLyricSelection} from './MusicLyricSelection';
import {MusicNotePreview,MusicWritingStudio,type MusicWritingResult} from './MusicWritingStudio';
import {MusicScoreView} from './MusicSketchStudio';
import {downloadMusicMidi} from '@/domain/musicNotation';
import {getDraftAttachment} from '@/domain/musicLocalStorage';
import {newMusicId} from '@/domain/musicWorkspace';
import {isMusicTrackCandidate} from '@/domain/musicNext';
import type {MusicProject,MusicProjectFile,MusicSection} from '@/domain/musicWorkspace';

const pink='#CB245C';
const palette={
  lyrics:'Paroles',audio:'Audio',track:'Piste',score:'Partition',note:'Note',
  idea:'Idée',document:'Document',
} as const;
const types:MusicProjectFile['kind'][]=['lyrics','audio','track','score','note','idea','document'];
const isArtwork=(file:MusicProjectFile)=>/\.(png|jpg|jpeg|webp)$/i.test(file.originalFilename||'');
const isAudio=(file:MusicProjectFile)=>/\.(mp3|wav|m4a|webm|ogg|aac)$/i.test(file.originalFilename||'')||
  !!file.mimeType?.startsWith('audio/');
const formats=(s:string)=>s.replace(/\r\n?/g,'\n').trim();
const textOf=(file:MusicProjectFile)=>
  file.lyricSegments?.length&&file.kind==='lyrics'
    ?file.lyricSegments.map(segment=>segment.text).join('\n\n')
    :file.text||'';
type Props={
  visible:boolean;file:MusicProjectFile|null;project:MusicProject;
  onClose:()=>void;onUpdate:(id:string,change:Partial<MusicProjectFile>)=>void;
  onChangeType:(id:string,kind:MusicProjectFile['kind'])=>void;
  onSection:(file:MusicProjectFile,section:MusicSection)=>void;
  onNewSection:(file:MusicProjectFile,name:string,stanzaId?:string)=>void;
  onStartVersion:(file:MusicProjectFile)=>void;onUseFile:(file:MusicProjectFile)=>void;
  onTranslate?:(file:MusicProjectFile)=>void;
  onEdit?:(file:MusicProjectFile)=>void;
  onOpenFile?:(id:string)=>void;
  hasVersion:boolean;
};
export function MusicMaterialViewer({visible,file,project,onClose,onUpdate,onChangeType,
  onSection,onNewSection,onStartVersion,onUseFile,onTranslate,onEdit,onOpenFile,hasVersion}:Props){
  const theme=useAppTheme();
  const {width,height}=useWindowDimensions();
  const compact=width<650;
  const [menu,setMenu]=useState<'none'|'type'|'section'|'rename'|'excerpt'>('none');
  const [editing,setEditing]=useState(false);
  const [selecting,setSelecting]=useState(false);
  const [draft,setDraft]=useState('');
  const [sectionName,setSectionName]=useState('');
  const [stanzaId,setStanzaId]=useState('');
  const [error,setError]=useState('');
  useEffect(()=>{
    setMenu('none');setEditing(false);setDraft(file?textOf(file):'');
    setStanzaId('');setSectionName('');setError('');setSelecting(false);
  },[file?.id,visible]);
  if(!file)return null;
  const original=file.translationOfFileId
    ?project.files.find(candidate=>candidate.id===file.translationOfFileId):undefined;
  const translations=project.files.filter(candidate=>candidate.translationOfFileId===file.id);
  const selectedNames=(file.sectionIds||[]).map(id=>project.sections.find(x=>x.id===id)?.title)
    .filter((s):s is string=>!!s);
  const updateStanza=(id:string,part:MusicSection)=>{
    const segments=file.lyricSegments||[];
    onUpdate(file.id,{lyricSegments:segments.map(s=>s.id===id?{
      ...s,sectionIds:s.sectionIds.includes(part.id)?
        s.sectionIds.filter(x=>x!==part.id):[...s.sectionIds,part.id],
    }:s)});
  };
  const selectPart=(part:MusicSection)=>{
    if(stanzaId){updateStanza(stanzaId,part);setStanzaId('');return;}
    onSection(file,part);
  };
  const createPart=()=>{
    const name=sectionName.trim();
    if(!name)return;
    onNewSection(file,name,stanzaId||undefined);
    setSectionName('');setStanzaId('');setMenu('none');
  };
  const save=()=>{
    const content=formats(draft);
    if(file.kind==='lyrics'){
      const chunks=content.split(/\n\s*\n/).filter(Boolean);
      onUpdate(file.id,{text:content,lyricSegments:chunks.map((chunk,i)=>({
        id:file.lyricSegments?.[i]?.id||newMusicId(),text:chunk,
        sectionIds:file.lyricSegments?.[i]?.sectionIds||[],
      }))});
    }else onUpdate(file.id,{text:content});
    setEditing(false);
  };
  const saveStructured=(result:MusicWritingResult)=>{
    const content=formats(result.text);
    const title=result.title.trim()||file.title;
    if(file.kind==='lyrics'){
      const chunks=content.split(/\n\s*\n/).filter(Boolean);
      onUpdate(file.id,{title,text:content,language:result.language,
        lyricSegments:chunks.map((chunk,i)=>({
          id:file.lyricSegments?.[i]?.id||newMusicId(),text:chunk,
          sectionIds:file.lyricSegments?.[i]?.sectionIds||[],
        }))});
    }else{
      onUpdate(file.id,{title,text:content});
    }
    setEditing(false);
  };
  const download=async()=>{
    setError('');
    if(typeof document==='undefined'||!file.localFileId){
      setError('Ce fichier ne peut pas être ouvert sur cet appareil.');return;
    }
    const blob=await getDraftAttachment(file.localFileId);
    if(!blob){setError('Le fichier original est introuvable dans ce navigateur.');return;}
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=file.originalFilename||file.title;
    a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
  };
  const row=(icon:keyof typeof Ionicons.glyphMap,label:string,fn:()=>void,
    detail?:string)=> <Pressable onPress={fn} accessibilityRole="button"
      style={{minHeight:49,flexDirection:'row',gap:12,alignItems:'center',
        paddingVertical:9,borderBottomColor:theme.border,borderBottomWidth:1}}>
      <Ionicons name={icon} size={18} color={pink}/>
      <View style={{flex:1,gap:4}}>
        <Text style={{fontSize:13,color:theme.foreground,fontWeight:'500'}}>{label}</Text>
        {detail?<Text style={{fontSize:11,color:theme.muted}}>{detail}</Text>:null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.muted}/>
    </Pressable>;
  const cardWidth=compact?'100%':Math.min(width-100,original?960:700);
  const field={borderWidth:1,borderColor:theme.border,
    borderRadius:12,paddingHorizontal:12,paddingVertical:10,
    color:theme.foreground,backgroundColor:theme.surface,fontSize:14} as const;
  return <Modal visible={visible} transparent animationType="fade"
    onRequestClose={onClose}>
    <View style={{flex:1,backgroundColor:'rgba(18,12,17,.50)',
      justifyContent:compact?'flex-end':'center',alignItems:'center'}}>
      <Pressable onPress={onClose} style={{position:'absolute',top:0,bottom:0,left:0,right:0}}
        accessibilityLabel="Fermer la lecture"/>
      <View style={{width:cardWidth,maxHeight:compact?height-35:Math.min(height-70,850),
        backgroundColor:theme.background,borderTopLeftRadius:compact?26:18,
        borderTopRightRadius:compact?26:18,
        borderBottomLeftRadius:compact?0:18,borderBottomRightRadius:compact?0:18,
        overflow:'hidden',paddingTop:compact?14:22}}>
        <View style={{flexDirection:'row',alignItems:'center',
          paddingHorizontal:compact?19:26,paddingBottom:14,gap:10}}>
          <View style={{flex:1}}>
            <Text style={{fontSize:11,color:theme.muted}}>
              {original?'Traduction · '+(file.language||''):palette[file.kind]}
            </Text>
          </View>
          {editing?<Pressable accessibilityLabel="Enregistrer les modifications"
            onPress={save} style={{paddingHorizontal:11,paddingVertical:9,
              borderRadius:10,backgroundColor:pink}}>
            <Text style={{color:'#fff',fontSize:12,fontWeight:'700'}}>Terminer</Text>
          </Pressable>:
          <Pressable accessibilityRole="button" accessibilityLabel="Actions de cet élément"
            onPress={()=>setMenu(menu==='none'?'type':'none')}
            style={{width:38,height:38,alignItems:'center',justifyContent:'center'}}>
            <Ionicons name="ellipsis-horizontal" size={22} color={theme.foreground}/>
          </Pressable>}
          <Pressable onPress={onClose} accessibilityRole="button"
            accessibilityLabel="Fermer" style={{width:38,height:38,
              alignItems:'center',justifyContent:'center'}}>
            <Ionicons name="close" size={23} color={theme.foreground}/>
          </Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled"
          contentContainerStyle={{paddingHorizontal:compact?20:30,
            paddingBottom:compact?55:35,gap:19}}>
          {menu==='rename'?<TextInput autoFocus value={file.title}
            onChangeText={title=>onUpdate(file.id,{title})}
            onSubmitEditing={()=>setMenu('none')} style={field}/>:
            !(editing&&(file.kind==='lyrics'||file.kind==='note'))?
              <Text style={{fontSize:compact?24:29,lineHeight:compact?31:37,
                fontWeight:'700',color:theme.foreground}}>{file.title}</Text>:null}
          {selectedNames.length?<Text style={{fontSize:12,color:theme.muted}}>
            {selectedNames.join(' · ')}
          </Text>:null}
          {menu!=='none'?<View style={{padding:12,borderRadius:14,
            backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,gap:6}}>
            <Pressable onPress={()=>setMenu('none')} style={{flexDirection:'row',
              gap:8,alignItems:'center',alignSelf:'flex-start',paddingVertical:7}}>
              <Ionicons name="arrow-back" size={16} color={theme.muted}/>
              <Text style={{fontSize:12,color:theme.muted}}>Retour à l’élément</Text>
            </Pressable>
            {menu==='type'?<>
              {file.kind!=='audio'?row('create-outline','Modifier le contenu',()=>{
                if(onEdit){onClose();onEdit(file);}
                else{setDraft(textOf(file));setEditing(true);setMenu('none');}
              }):null}
              {row('text-outline','Renommer',()=>setMenu('rename'))}
              {file.kind!=='lyrics'&&project.sections.length>0?
                row('musical-notes-outline','Associer à une partie existante',
                  ()=>setMenu('section'),selectedNames.length?selectedNames.join(', '):undefined):null}
              {row('pricetag-outline','Définir le type',()=>setMenu('excerpt'))}
              {isMusicTrackCandidate(file)?row('add-circle-outline',
                hasVersion?'Utiliser dans la version active':'Commencer Version 1',()=>{
                  if(hasVersion)onUseFile(file);else onStartVersion(file);
                  onClose();
                }):null}
              {file.localFileId?row('download-outline','Fichier original',
                ()=>{void download();}):null}
            </>:null}
            {menu==='excerpt'?types.map(t=><Pressable key={t}
              onPress={()=>{onChangeType(file.id,t);setMenu('none');}}
              style={{padding:11,flexDirection:'row',alignItems:'center',gap:10}}>
              <Ionicons name={file.kind===t?'radio-button-on':'radio-button-off'}
                size={18} color={file.kind===t?pink:theme.muted}/>
              <Text style={{fontSize:13,color:theme.foreground}}>{palette[t]}</Text>
            </Pressable>):null}
            {menu==='section'?<>
              <Text style={{fontSize:12,color:theme.muted}}>
                {stanzaId?'Associer cette strophe':'Associer cet élément'} (facultatif)
              </Text>
              {project.sections.map(part=><Pressable key={part.id}
                onPress={()=>{selectPart(part);setMenu('none');}}
                style={{paddingVertical:11,borderBottomWidth:1,borderColor:theme.border,
                  flexDirection:'row',alignItems:'center',gap:9}}>
                <Ionicons name={(stanzaId?
                  file.lyricSegments?.find(s=>s.id===stanzaId)?.sectionIds||[]:
                  file.sectionIds).includes(part.id)?'checkmark-circle':'ellipse-outline'}
                  color={pink} size={18}/>
                <Text style={{fontSize:13,color:theme.foreground}}>{part.title}</Text>
              </Pressable>)}
            </>:null}
          </View>:null}
          {isArtwork(file)?<MusicLocalArt file={file} size={compact?270:360}/>:null}
          {file.musicEvents?.length?<View style={{gap:12}}>
            <Text style={{fontSize:12,color:theme.muted}}>
              {file.musicEvents.length} notes / frappes · {file.tempoBpm||100} BPM
            </Text>
            <MusicScoreView events={file.musicEvents} compact={compact}/>
            <Pressable accessibilityRole="button"
              onPress={()=>{
                try{
                  downloadMusicMidi(file.musicEvents||[],file.tempoBpm||100,file.title);
                  setError('');
                }catch(e){setError(e instanceof Error?e.message:'Export MIDI impossible.');}
              }} style={{minHeight:42,flexDirection:'row',alignItems:'center',
                alignSelf:'flex-start',gap:9,paddingHorizontal:9}}>
              <Ionicons name="download-outline" size={18} color={pink}/>
              <Text style={{fontSize:13,fontWeight:'600',color:pink}}>Exporter en MIDI (.mid)</Text>
            </Pressable>
          </View>:null}
          {isAudio(file)&&file.localFileId?
            <MusicAudioTake key={file.id} file={file} editable
              onUpdate={changes=>onUpdate(file.id,changes)}/>:null}
          {!editing&&file.kind==='lyrics'&&project.sections.length>0?
            <Pressable onPress={()=>setSelecting(!selecting)}
              accessibilityRole="button"
              style={{alignSelf:'flex-start',flexDirection:'row',
                alignItems:'center',gap:8,paddingVertical:9}}>
              <Ionicons name={selecting?'close-outline':'link-outline'} size={17} color={pink}/>
              <Text style={{color:pink,fontSize:12,fontWeight:'600'}}>
                {selecting?'Annuler la sélection':'Associer un extrait'}
              </Text>
            </Pressable>:null}
          {editing&&(file.kind==='lyrics'||file.kind==='note')?
            <MusicWritingStudio key={file.id} mode={file.kind==='note'?'note':'lyrics'}
              onModeChange={()=>{}} initialFile={file} source={original}
              originalLanguage={project.originalLanguage}
              onSave={saveStructured} onDirtyChange={()=>{}}/>:
            editing?<TextInput value={draft} onChangeText={setDraft}
            multiline autoFocus textAlignVertical="top"
            placeholder="Écris librement…" placeholderTextColor={theme.muted}
            style={{...field,minHeight:235,fontSize:16,lineHeight:26,
              padding:15}}/>:
            selecting&&file.kind==='lyrics'&&project.sections.length>0?
              <MusicLyricSelection lyrics={textOf(file)}
                sections={project.sections} references={file.lyricReferences||[]}
                onChange={references=>onUpdate(file.id,{lyricReferences:references})}
                onClose={()=>setSelecting(false)}/>:
            original?<View style={{flexDirection:compact?'column':'row',gap:20}}>
              <View style={{flex:1,minWidth:0,gap:12}}>
                <Text style={{fontSize:11,color:pink,fontWeight:'700'}}>TRADUCTION · {file.language}</Text>
                <Text selectable style={{fontSize:17,lineHeight:29,
                  fontFamily:'Georgia',color:theme.foreground}}>{textOf(file)}</Text>
              </View>
              <View style={{flex:1,minWidth:0,gap:11,
                backgroundColor:theme.dark?'#292326':'#F7F4F1',padding:compact?14:20,
                borderRadius:13}}>
                <Text style={{fontSize:11,color:theme.muted,fontWeight:'700'}}>
                  ORIGINAL · {original.language||project.originalLanguage}
                </Text>
                <Text style={{fontSize:14,color:theme.foreground,fontWeight:'700'}}>
                  {original.title}
                </Text>
                <Text selectable style={{fontFamily:'Georgia',fontSize:16,
                  lineHeight:27,color:theme.foreground}}>{textOf(original)}</Text>
              </View>
            </View>:
            textOf(file).trim()&&file.kind==='note'?
              <MusicNotePreview text={textOf(file)} color={theme.foreground}/>:
            textOf(file).trim()?<Text selectable
              style={{fontSize:file.kind==='lyrics'?17:15,
                lineHeight:file.kind==='lyrics'?29:25,
                fontFamily:file.kind==='lyrics'?'Georgia':undefined,
                color:theme.foreground}}>
              {textOf(file)}
            </Text>:null}
          {!editing&&file.kind==='lyrics'&&project.sections.length>0?<>
            {(file.lyricReferences||[]).length>0?<View style={{gap:10}}>
              <Text style={{fontSize:12,fontWeight:'700',color:theme.foreground}}>
                Extraits associés
              </Text>
              {(file.lyricReferences||[]).map(ref=>{
                const part=project.sections.find(s=>s.id===ref.sectionId);
                const actual=textOf(file).slice(ref.start,ref.end);
                const stale=actual!==ref.text;
                return <View key={ref.id} style={{flexDirection:'row',
                  alignItems:'center',gap:10,borderTopWidth:1,
                  borderColor:theme.border,paddingTop:9}}>
                  <View style={{flex:1,gap:4}}>
                    <Text style={{fontSize:11,color:pink,fontWeight:'700'}}>
                      {part?.title||'Partie supprimée'}{stale?' · texte modifié':''}
                    </Text>
                    <Text style={{fontSize:13,color:theme.foreground,lineHeight:21}}>
                      {ref.text}
                    </Text>
                  </View>
                  <Pressable onPress={()=>onUpdate(file.id,{lyricReferences:
                    (file.lyricReferences||[]).filter(r=>r.id!==ref.id)})}
                    accessibilityRole="button" accessibilityLabel="Retirer l’association"
                    style={{padding:9}}>
                    <Ionicons name="close-outline" size={19} color={theme.muted}/>
                  </Pressable>
                </View>;
              })}
            </View>:null}
          </>:null}
          {!editing&&file.kind==='lyrics'&&!file.translationOfFileId?<>
            {translations.length?<View style={{gap:9}}>
              <Text style={{fontSize:12,color:theme.muted,fontWeight:'700'}}>Traductions</Text>
              {translations.map(trans=><Pressable key={trans.id}
                onPress={()=>onOpenFile?.(trans.id)} disabled={!onOpenFile} accessibilityRole="button"
                style={{minHeight:43,flexDirection:'row',gap:10,
                  alignItems:'center',borderBottomWidth:1,borderColor:theme.border}}>
                <Ionicons name="language-outline" size={17} color={pink}/>
                <Text style={{color:theme.foreground,fontSize:13,flex:1}}>{trans.title}</Text>
                <Text style={{color:theme.muted,fontSize:11}}>{trans.language}</Text>
                <Ionicons name="chevron-forward" color={theme.muted} size={16}/>
              </Pressable>)}
            </View>:null}
          </>:null}
          {!editing&&!textOf(file).trim()&&!isArtwork(file)&&!isAudio(file)&&!file.musicEvents?.length?
            <Text style={{color:theme.muted,fontSize:13}}>
              Le fichier est conservé. Ouvre son original ou écris une note associée.
            </Text>:null}
          {file.conversionWarning?<Text style={{fontSize:11,color:theme.muted}}>
            {file.conversionWarning}
          </Text>:null}
          {error?<Text style={{color:'#B34D67',fontSize:12}}>{error}</Text>:null}
          {!editing?<View style={{flexDirection:'row',gap:12,flexWrap:'wrap',
            borderTopWidth:1,borderColor:theme.border,paddingTop:15}}>
            {!isAudio(file)?<Pressable onPress={()=>{
              if(onEdit){onClose();onEdit(file);}
              else{setDraft(textOf(file));setEditing(true);setMenu('none');}
            }}
              style={{flexDirection:'row',alignItems:'center',gap:7,paddingVertical:9}}>
              <Ionicons name="pencil-outline" size={16} color={pink}/>
              <Text style={{color:pink,fontSize:12,fontWeight:'600'}}>Modifier</Text>
            </Pressable>:null}
            {file.kind==='lyrics'&&!file.translationOfFileId&&onTranslate?
              <Pressable onPress={()=>{onClose();onTranslate(file);}}
                accessibilityRole="button"
                style={{flexDirection:'row',alignItems:'center',gap:7,paddingVertical:9}}>
                <Ionicons name="language-outline" size={16} color={pink}/>
                <Text style={{color:pink,fontSize:12,fontWeight:'600'}}>Traduire</Text>
              </Pressable>:null}
            {file.localFileId?<Pressable onPress={()=>{void download();}}
              style={{flexDirection:'row',alignItems:'center',gap:7,paddingVertical:9}}>
              <Ionicons name="download-outline" size={16} color={theme.muted}/>
              <Text style={{color:theme.muted,fontSize:12}}>Original</Text>
            </Pressable>:null}
          </View>:null}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
