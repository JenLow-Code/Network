import React,{useState} from 'react';
import {Linking,Platform,Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {MusicAudioPreview} from './MusicAudioPreview';
import {getDraftAttachment} from '@/domain/musicLocalStorage';
import {classifySongFile,lyricStanzas,lyricsForMusicSection} from '@/domain/musicImportedFiles';
import {formatMusicDuration} from '@/domain/musicProjectSelectors';
import type {MusicProject,MusicProjectFile} from '@/domain/musicWorkspace';
import {newMusicId} from '@/domain/musicWorkspace';

const pink='#CB245C';
type Props={file:MusicProjectFile;project:MusicProject;sectionId?:string;
  onUpdate:(change:Partial<MusicProjectFile>)=>void;
  onClassify:(kind:MusicProjectFile['kind']|'version')=>void;
  onRemove:()=>void;};
const tagChoices:{id:MusicProjectFile['kind']|'version';title:string}[]=[
  {id:'document',title:'Document'},{id:'lyrics',title:'Paroles'},
  {id:'track',title:'Piste'},{id:'audio',title:'Audio'},
  {id:'version',title:'Version'},{id:'score',title:'Partition'},
  {id:'note',title:'Note'},{id:'idea',title:'Idée'},
];
const label=(kind:string)=>tagChoices.find(x=>x.id===kind)?.title||'Document';
const isPlayable=(f:MusicProjectFile)=>
  !!f.mimeType?.startsWith('audio/')||/\.(wav|mp3|m4a|webm|ogg|aac)$/i.test(f.originalFilename||'');
const isMidi=(f:MusicProjectFile)=>/\.(mid|midi)$/i.test(f.originalFilename||'');

export function MusicFileViewer({file,project,sectionId,onUpdate,onClassify,onRemove}:Props){
  const theme=useAppTheme();
  const [tagsOpen,setTagsOpen]=useState(false);
  const [editingTitle,setEditingTitle]=useState(false);
  const [editingText,setEditingText]=useState(file.kind==='note'&&!file.text?.trim());
  const [editingStanza,setEditingStanza]=useState<string|null>(null);
  const [assignStanza,setAssignStanza]=useState<string|null>(null);
  const [assignFile,setAssignFile]=useState(false);
  const [showRegion,setShowRegion]=useState(false);
  const [regionPart,setRegionPart]=useState(sectionId||'');
  const [start,setStart]=useState('');
  const [end,setEnd]=useState('');
  const [error,setError]=useState('');
  const field={borderWidth:1,borderColor:theme.border,borderRadius:10,
    backgroundColor:theme.background,color:theme.foreground,
    paddingHorizontal:11,paddingVertical:10,fontSize:13} as const;
  const sections=project.sections||[];
  const parts=(ids:string[])=>ids.map(id=>sections.find(s=>s.id===id)?.title||'Partie supprimée').join(', ');
  const patchStanza=(id:string,change:{text?:string;sectionIds?:string[]})=>
    onUpdate({lyricSegments:(file.lyricSegments||[]).map(x=>x.id===id?{...x,...change}:x)});
  const selectPart=(ids:string[],id:string)=>ids.includes(id)?ids.filter(x=>x!==id):[...ids,id];
  const time=(raw:string):number|undefined=>{
    if(!/^(?:\d+:)?\d+(?:\.\d+)?$/.test(raw.trim()))return undefined;
    const p=raw.split(':').map(Number);
    if(p.length===2&&p[1]>=60)return undefined;
    const v=p.length===2?p[0]*60+p[1]:p[0];
    return Number.isFinite(v)&&v>=0?v:undefined;
  };
  const addRegion=()=>{
    const begin=time(start),finish=time(end);
    if(!regionPart||begin===undefined||finish===undefined||finish<=begin||
      (file.durationSeconds!==undefined&&finish>file.durationSeconds)){
      setError('Choisis une partie et un intervalle valide, par exemple 2:50 à 3:14.');
      return;
    }
    onUpdate({regions:[...(file.regions||[]),{
      id:newMusicId(),sectionId:regionPart,startSeconds:begin,endSeconds:finish}]});
    setStart('');setEnd('');setError('');setShowRegion(false);
  };
  const openOriginal=async()=>{
    setError('');
    try{
      if(file.externalUrl&&/^https:\/\//i.test(file.externalUrl)){
        await Linking.openURL(file.externalUrl);return;
      }
      if(!file.localFileId||typeof document==='undefined')throw Error('Fichier indisponible.');
      const blob=await getDraftAttachment(file.localFileId);
      if(!blob)throw Error('Fichier introuvable dans ce navigateur.');
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.rel='noopener noreferrer';
      a.target='_blank';a.download=file.originalFilename||file.title;
      a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
    }catch(e){setError(e instanceof Error?e.message:'Impossible d’ouvrir le fichier.');}
  };
  const small=(title:string,fn:()=>void)=><Pressable onPress={fn}
    accessibilityRole="button" style={{flexDirection:'row',alignItems:'center',gap:5,
      paddingHorizontal:10,paddingVertical:8,borderRadius:9,borderWidth:1,
      borderColor:theme.border,alignSelf:'flex-start'}}>
    <Text style={{fontSize:11,color:theme.foreground,fontWeight:'600'}}>{title}</Text>
  </Pressable>;

  return <View style={{gap:12}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
      <View style={{flex:1}}>
        {editingTitle?<TextInput autoFocus value={file.title}
          onChangeText={title=>onUpdate({title})}
          onBlur={()=>setEditingTitle(false)} style={field}/>:
          <Pressable onPress={()=>setEditingTitle(true)} style={{paddingVertical:4}}>
            <Text style={{fontWeight:'600',fontSize:14,color:theme.foreground}}>
              {file.title} <Ionicons name="pencil-outline" size={12} color={theme.muted}/>
            </Text>
          </Pressable>}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Changer le tag du fichier"
        accessibilityState={{expanded:tagsOpen}}
        onPress={()=>setTagsOpen(!tagsOpen)}
        style={{borderRadius:18,borderWidth:1,borderColor:pink,
          paddingHorizontal:11,paddingVertical:7,flexDirection:'row',gap:6,alignItems:'center'}}>
        <Text style={{color:pink,fontSize:11,fontWeight:'700'}}>{label(file.kind)}</Text>
        <Ionicons name={tagsOpen?'chevron-up':'chevron-down'} size={13} color={pink}/>
      </Pressable>
    </View>
    {tagsOpen?<ScrollView horizontal showsHorizontalScrollIndicator={false}
      contentContainerStyle={{gap:7}}>
      {tagChoices.filter(t=>t.id!=='version'||isPlayable(file))
        .map(t=><Pressable key={t.id}
          accessibilityRole="button" onPress={()=>{onClassify(t.id);setTagsOpen(false);}}
          style={{borderRadius:17,borderWidth:1,paddingHorizontal:11,paddingVertical:8,
            borderColor:t.id===file.kind?pink:theme.border}}>
          <Text style={{fontSize:11,color:t.id===file.kind?pink:theme.foreground}}>{t.title}</Text>
        </Pressable>)}
    </ScrollView>:null}

    {file.kind==='lyrics'?<View style={{gap:12}}>
      <Text style={{fontSize:12,color:theme.muted}}>
        Paroles · {file.language||project.originalLanguage}
      </Text>
      {file.conversionWarning?<Text style={{color:'#B34D67',fontSize:11}}>
        {file.conversionWarning}
      </Text>:null}
      {file.text?.trim()&&!file.lyricSegments?.length?
        small('Présenter en strophes',()=>onUpdate({lyricSegments:lyricStanzas(file.text||'')})):null}
      {(file.lyricSegments||[])
        .filter(s=>!sectionId||s.sectionIds.includes(sectionId)||
          file.sectionIds.includes(sectionId))
        .map((s,i)=><View key={s.id} style={{gap:5,paddingVertical:8,
          borderBottomWidth:1,borderColor:theme.border}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
            <Text style={{color:theme.muted,fontSize:11,flex:1}}>
              {s.sectionIds.length?parts(s.sectionIds):'Strophe '+(i+1)}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Modifier les paroles de cette strophe"
              onPress={()=>setEditingStanza(editingStanza===s.id?null:s.id)}>
              <Ionicons name="pencil-outline" size={17} color={theme.muted}/>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Associer cette strophe"
              onPress={()=>setAssignStanza(assignStanza===s.id?null:s.id)}>
              <Ionicons name="ellipsis-horizontal" size={21} color={theme.muted}/>
            </Pressable>
          </View>
          {editingStanza===s.id?<TextInput multiline autoFocus value={s.text}
            onChangeText={text=>patchStanza(s.id,{text})}
            textAlignVertical="top" style={{...field,minHeight:95,lineHeight:23}}/>:
            <Text selectable style={{fontSize:16,lineHeight:27,color:theme.foreground}}>
              {s.text||'Strophe vide'}
            </Text>}
          {assignStanza===s.id?<View style={{gap:8,padding:9,borderRadius:10,
            backgroundColor:theme.dark?'#332B30':'#F6F2F0'}}>
            <Text style={{fontSize:11,color:theme.muted}}>Cette strophe appartient à… (facultatif)</Text>
            <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
              {sections.map(part=><Pressable key={part.id}
                onPress={()=>patchStanza(s.id,{
                  sectionIds:selectPart(s.sectionIds,part.id)})}
                style={{borderWidth:1,borderColor:s.sectionIds.includes(part.id)?pink:theme.border,
                  borderRadius:8,paddingHorizontal:10,paddingVertical:7}}>
                <Text style={{fontSize:11,color:s.sectionIds.includes(part.id)?pink:theme.foreground}}>
                  {part.title}
                </Text>
              </Pressable>)}
            </View>
            {small('Terminé',()=>setAssignStanza(null))}
          </View>:null}
        </View>)}
      {!sectionId?small('Ajouter une strophe',()=>
        onUpdate({lyricSegments:[...(file.lyricSegments||[]),{
          id:newMusicId(),text:'',sectionIds:[],
        }]})):null}
      {!file.lyricSegments?.length&&!file.text?.trim()?
        <Text style={{fontSize:12,color:theme.muted}}>Aucune parole extraite de ce document.</Text>:null}
    </View>:null}
    {(file.kind==='audio'||file.kind==='track')?<View style={{gap:11}}>
      {isPlayable(file)?<MusicAudioPreview source={{localAudioId:file.localFileId,
        audioUrl:file.externalUrl}}/>:
        <Text style={{fontSize:12,color:theme.muted}}>
          {isMidi(file)?'Fichier MIDI conservé. La lecture MIDI n’est pas encore intégrée.':
            'Ce format ne possède pas de lecture audio intégrée.'}
        </Text>}
      {file.kind==='track'?<View style={{gap:6}}>
        <Text style={{color:theme.muted,fontSize:11}}>Instrument</Text>
        <TextInput value={file.instrument||''} onChangeText={instrument=>onUpdate({instrument})}
          placeholder="Ex. basse, piano, voix…" placeholderTextColor={theme.muted}
          style={field}/>
      </View>:null}
      {(file.regions||[]).map(r=><View key={r.id}
        style={{flexDirection:'row',alignItems:'center',gap:8}}>
        <Text style={{fontSize:11,color:theme.muted,flex:1}}>
          {parts([r.sectionId])} · {formatMusicDuration(r.startSeconds)} – {formatMusicDuration(r.endSeconds)}
        </Text>
        <Pressable onPress={()=>onUpdate({regions:(file.regions||[]).filter(x=>x.id!==r.id)})}>
          <Ionicons name="close" size={17} color={theme.muted}/>
        </Pressable>
      </View>)}
      {small(showRegion?'Fermer les repères':'Associer un passage…',()=>setShowRegion(!showRegion))}
      {showRegion?<View style={{gap:9}}>
        <View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}>
          {sections.map(s=><Pressable key={s.id} onPress={()=>setRegionPart(s.id)}
            style={{borderRadius:9,borderWidth:1,padding:9,
              borderColor:regionPart===s.id?pink:theme.border}}>
            <Text style={{fontSize:11,color:regionPart===s.id?pink:theme.foreground}}>{s.title}</Text>
          </Pressable>)}
        </View>
        <View style={{flexDirection:'row',gap:7}}>
          <TextInput value={start} onChangeText={setStart} style={{...field,flex:1}}
            placeholder="Début 2:50" placeholderTextColor={theme.muted}/>
          <TextInput value={end} onChangeText={setEnd} style={{...field,flex:1}}
            placeholder="Fin 3:14" placeholderTextColor={theme.muted}/>
          {small('Associer',addRegion)}
        </View>
      </View>:null}
    </View>:null}
    {['document','note','idea'].includes(file.kind)?<View style={{gap:8}}>
      {editingText?<TextInput multiline autoFocus value={file.text||''}
        onChangeText={text=>onUpdate({text})} textAlignVertical="top"
        placeholderTextColor={theme.muted} placeholder="Écris une note…"
        style={{...field,minHeight:130}}/>:
        <Text selectable style={{fontSize:14,color:theme.foreground,lineHeight:22}}>
          {file.text||file.conversionWarning||'Document joint — ouvre le fichier original pour consulter son contenu.'}
        </Text>}
      {small(editingText?'Terminer':'Modifier le texte',()=>setEditingText(!editingText))}
    </View>:null}
    {file.kind==='score'?<Text style={{fontSize:12,color:theme.muted}}>
      Partition jointe au morceau. Ouvre le fichier original pour la consulter.
    </Text>:null}
    {file.kind!=='lyrics'&&file.kind!=='track'&&file.kind!=='audio'?
      <View style={{gap:8}}>
        {small(assignFile?'Masquer les associations':'Associer à une partie…',
          ()=>setAssignFile(!assignFile))}
        {assignFile?<View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
          {sections.map(s=><Pressable key={s.id}
            onPress={()=>onUpdate({sectionIds:selectPart(file.sectionIds,s.id)})}
            style={{borderRadius:9,borderWidth:1,padding:9,
              borderColor:file.sectionIds.includes(s.id)?pink:theme.border}}>
            <Text style={{color:file.sectionIds.includes(s.id)?pink:theme.foreground,fontSize:11}}>
              {s.title}
            </Text>
          </Pressable>)}
        </View>:null}
      </View>:null}
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
      {(file.localFileId||file.externalUrl)?
        small('Fichier original',()=>{void openOriginal();}):null}
      {small('Retirer',onRemove)}
    </View>
    {!!error?<Text style={{color:'#B34D67',fontSize:12}}>{error}</Text>:null}
  </View>;
}
