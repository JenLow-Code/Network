import React,{useState} from 'react';
import {Linking,Platform,Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {MusicAudioCapture} from './MusicAudioCapture';
import {MusicAudioPreview} from './MusicAudioPreview';
import {chooseMusicFile} from '@/domain/musicMedia';
import {saveDraftAudio,saveDraftAttachment,getDraftAttachment} from '@/domain/musicLocalStorage';
import {fileAudioDuration,formatMusicDuration} from '@/domain/musicProjectSelectors';
import {newMusicId} from '@/domain/musicWorkspace';
import type {MusicProject,MusicProjectFile} from '@/domain/musicWorkspace';

type Props={
  project:MusicProject;
  patch:(changes:Partial<MusicProject>)=>void;
  openSection:(id:string)=>void;
};
type FileKind=MusicProjectFile['kind'];
const pink='#CB245C';
const kinds:{id:FileKind;label:string;icon:keyof typeof Ionicons.glyphMap}[]=[
  {id:'lyrics',label:'Paroles',icon:'text-outline'},
  {id:'audio',label:'Audio',icon:'musical-note-outline'},
  {id:'note',label:'Note',icon:'reader-outline'},
  {id:'idea',label:'Idée',icon:'bulb-outline'},
  {id:'score',label:'Partition',icon:'document-text-outline'},
  {id:'document',label:'Document',icon:'document-attach-outline'},
];

export function MusicProjectFiles({project,patch,openSection}:Props){
  const theme=useAppTheme();
  const [adding,setAdding]=useState(false);
  const [kind,setKind]=useState<FileKind>('lyrics');
  const [title,setTitle]=useState('');
  const [content,setContent]=useState('');
  const [language,setLanguage]=useState(project.originalLanguage||'Français');
  const [instrument,setInstrument]=useState('');
  const [sectionIds,setSectionIds]=useState<string[]>([]);
  const [expanded,setExpanded]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [filter,setFilter]=useState<'all'|FileKind>('all');
  const files=project.files||[];
  const field={backgroundColor:theme.background,borderWidth:1,borderColor:theme.border,
    borderRadius:10,paddingHorizontal:11,paddingVertical:10,color:theme.foreground,fontSize:13} as const;
  const card={borderRadius:16,borderWidth:1,borderColor:theme.border,
    backgroundColor:theme.surface,padding:15,gap:13} as const;
  const labelOf=(v:FileKind)=>kinds.find(k=>k.id===v)?.label||'Fichier';
  const iconOf=(v:FileKind)=>kinds.find(k=>k.id===v)?.icon||'document-outline';
  const select=(id:string)=>setSectionIds(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);
  const patchFile=(id:string,change:Partial<MusicProjectFile>)=>
    patch({files:files.map(file=>file.id===id?{...file,...change}:file)});
  const addText=()=>{
    if(!title.trim())return;
    patch({files:[...files,{id:newMusicId(),title:title.trim(),kind,
      language:kind==='lyrics'?language.trim()||project.originalLanguage:undefined,
      instrument:kind==='audio'?instrument.trim():undefined,sectionIds,
      text:content,createdAt:new Date().toISOString()}]});
    setTitle('');setContent('');setSectionIds([]);setInstrument('');setAdding(false);setError('');
  };
  const importFile=()=>{
    if(Platform.OS!=='web'||typeof document==='undefined'){
      setError('L’import est disponible depuis le navigateur.');return;
    }
    const picker=document.createElement('input');
    picker.type='file';picker.accept='.txt,.md,.pdf,.png,.jpg,.jpeg,.webp,.wav,.mp3,.m4a,.ogg,.webm,.aac';
    picker.onchange=()=>{
      const file=picker.files?.[0];if(!file)return;
      const textFile=/\.(txt|md)$/i.test(file.name);
      const audioFile=file.type.startsWith('audio/')||/\.(wav|mp3|m4a|ogg|webm|aac)$/i.test(file.name);
      const nextKind:FileKind=audioFile?'audio':textFile?(kind==='lyrics'?'lyrics':kind==='idea'?'idea':'note'):
        kind==='document'?'document':'score';
      setBusy(true);setError('');
      void (async()=>{
        const saved=audioFile?await saveDraftAudio(file):
          textFile?undefined:await saveDraftAttachment(file);
        const raw=textFile?await file.text():undefined;
        const duration=audioFile?await fileAudioDuration(file):undefined;
        const item:MusicProjectFile={
          id:newMusicId(),title:file.name,kind:nextKind,sectionIds:[...sectionIds],
          language:nextKind==='lyrics'?language.trim()||project.originalLanguage:undefined,
          instrument:nextKind==='audio'?instrument.trim()||undefined:undefined,
          text:raw,localFileId:saved,durationSeconds:duration,
          createdAt:new Date().toISOString(),
        };
        patch({files:[...files,item]});
        setAdding(false);setSectionIds([]);setContent('');setTitle('');
      })().catch(e=>setError(e instanceof Error?e.message:'Fichier non conservé.'))
        .finally(()=>setBusy(false));
    };
    picker.click();
  };
  const openAttached=async(file:MusicProjectFile)=>{
    if(file.externalUrl && /^https:\/\//i.test(file.externalUrl)){
      await Linking.openURL(file.externalUrl);return;
    }
    if(!file.localFileId)return;
    const blob=await getDraftAttachment(file.localFileId);
    if(!blob){setError('Fichier introuvable sur cet appareil.');return;}
    if(Platform.OS!=='web')return;
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.target='_blank';a.rel='noopener noreferrer';
    a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
  };
  const row=(key:string,titleText:string,k:FileKind,where:string,summary:string,
    onClick:()=>void,extra?:React.ReactNode)=>(
    <View key={key} style={{borderBottomWidth:1,borderColor:theme.border}}>
      <Pressable onPress={onClick} accessibilityRole="button"
        style={{flexDirection:'row',gap:11,alignItems:'center',paddingVertical:12}}>
        <View style={{width:37,height:37,borderRadius:10,
          backgroundColor:theme.dark?'#3D2B36':'#F8E8EF',alignItems:'center',justifyContent:'center'}}>
          <Ionicons name={iconOf(k)} size={19} color={pink}/>
        </View>
        <View style={{flex:1,gap:3}}>
          <Text numberOfLines={1} style={{fontSize:13,fontWeight:'700',color:theme.foreground}}>{titleText}</Text>
          <Text numberOfLines={1} style={{fontSize:11,color:theme.muted}}>
            {labelOf(k)} · {where}{summary?' · '+summary:''}
          </Text>
        </View>
        <Ionicons name={expanded===key?'chevron-up':'chevron-down'} size={17} color={theme.muted}/>
      </Pressable>
      {expanded===key?<View style={{paddingBottom:13,paddingLeft:48,gap:10}}>{extra}</View>:null}
    </View>
  );
  const sectionName=(id:string)=>project.sections.find(x=>x.id===id)?.title||'Partie supprimée';
  const show=(k:FileKind)=>filter==='all'||filter===k;

  return <View style={card}>
    <View style={{flexDirection:'row',gap:8,alignItems:'center',justifyContent:'space-between'}}>
      <View style={{flex:1,gap:4}}>
        <Text style={{fontSize:18,fontWeight:'700',color:theme.foreground}}>Fichiers du morceau</Text>
        <Text style={{fontSize:11,color:theme.muted}}>Enregistrements, paroles, notes, partitions et idées</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={()=>setAdding(!adding)}
        style={{borderRadius:10,backgroundColor:pink,paddingHorizontal:12,paddingVertical:10,
          flexDirection:'row',gap:5,alignItems:'center'}}>
        <Ionicons name={adding?'close':'add'} size={17} color="#fff"/>
        <Text style={{fontSize:12,color:'#fff',fontWeight:'700'}}>{adding?'Fermer':'Ajouter'}</Text>
      </Pressable>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6}}>
      {(['all',...kinds.map(x=>x.id)] as ('all'|FileKind)[]).map(k=><Pressable key={k}
        onPress={()=>setFilter(k)} style={{borderRadius:8,borderWidth:1,paddingHorizontal:10,
          paddingVertical:7,borderColor:filter===k?pink:theme.border}}>
        <Text style={{fontSize:11,color:filter===k?pink:theme.foreground}}>
          {k==='all'?'Tous':labelOf(k)}
        </Text>
      </Pressable>)}
    </ScrollView>
    {adding?<View style={{borderRadius:13,backgroundColor:theme.background,padding:13,gap:10}}>
      <Text style={{fontWeight:'700',fontSize:13,color:theme.foreground}}>Nouveau fichier</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
        {kinds.map(k=><Pressable key={k.id} onPress={()=>setKind(k.id)}
          style={{borderRadius:9,borderWidth:1,padding:8,borderColor:k.id===kind?pink:theme.border,
            backgroundColor:k.id===kind?(theme.dark?'#3D2733':'#FAEAF0'):theme.surface}}>
          <Text style={{color:k.id===kind?pink:theme.foreground,fontSize:11}}>{k.label}</Text>
        </Pressable>)}
      </View>
      <TextInput value={title} onChangeText={setTitle} style={field} placeholderTextColor={theme.muted}
        placeholder={kind==='lyrics'?'Paroles originales':'Nom du fichier / de l’idée'}/>
      {kind==='lyrics'?<TextInput style={field} value={language} onChangeText={setLanguage}
        placeholder="Langue" placeholderTextColor={theme.muted}/>:null}
      {kind==='audio'?<TextInput style={field} value={instrument} onChangeText={setInstrument}
        placeholder="Instrument / voix (facultatif)" placeholderTextColor={theme.muted}/>:null}
      <Text style={{fontSize:11,color:theme.muted}}>Associer à des parties (facultatif)</Text>
      <View style={{flexDirection:'row',gap:6,flexWrap:'wrap'}}>
        {project.sections.map(section=><Pressable key={section.id} onPress={()=>select(section.id)}
          style={{borderWidth:1,borderRadius:9,padding:8,
            borderColor:sectionIds.includes(section.id)?pink:theme.border}}>
          <Text style={{fontSize:11,color:sectionIds.includes(section.id)?pink:theme.foreground}}>
            {section.title}
          </Text>
        </Pressable>)}
        {!project.sections.length?<Text style={{fontSize:11,color:theme.muted}}>
          Ajoute d’abord des parties si tu veux lier ce fichier à un couplet ou refrain.
        </Text>:null}
      </View>
      {['lyrics','note','idea','document'].includes(kind)?<TextInput multiline
        value={content} onChangeText={setContent} textAlignVertical="top"
        style={{...field,minHeight:85}} placeholderTextColor={theme.muted}
        placeholder="Contenu ou première idée…"/>:null}
      <View style={{flexDirection:'row',gap:9,flexWrap:'wrap'}}>
        <Pressable onPress={addText} disabled={!title.trim()}
          style={{borderRadius:9,backgroundColor:title.trim()?pink:theme.border,padding:11}}>
          <Text style={{fontSize:12,fontWeight:'700',color:'#fff'}}>Créer</Text>
        </Pressable>
        <Pressable onPress={importFile} disabled={busy}
          style={{borderRadius:9,borderWidth:1,borderColor:pink,padding:10}}>
          <Text style={{fontSize:12,fontWeight:'700',color:pink}}>
            {busy?'Import…':'Importer un fichier'}
          </Text>
        </Pressable>
      </View>
      {kind==='audio'?<MusicAudioCapture onSaved={(localId,filename)=>
        {patch({files:[...files,{id:newMusicId(),title:filename,kind:'audio',
          sectionIds:[...sectionIds],localFileId:localId,instrument:instrument||undefined,
          createdAt:new Date().toISOString()}]});setAdding(false);setSectionIds([]);}}/>:null}
    </View>:null}
    <View>
      {files.filter(f=>show(f.kind)).map(file=>row('file-'+file.id,file.title,file.kind,
        file.sectionIds.length?file.sectionIds.map(sectionName).join(', '):'Chant entier',
        file.language||file.instrument||formatMusicDuration(file.durationSeconds),
        ()=>setExpanded(expanded==='file-'+file.id?null:'file-'+file.id),
        <>
          <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
            {kinds.map(k=><Pressable key={k.id}
              onPress={()=>patchFile(file.id,{kind:k.id})}
              style={{padding:7,borderRadius:8,borderWidth:1,
                borderColor:file.kind===k.id?pink:theme.border}}>
              <Text style={{fontSize:10,color:file.kind===k.id?pink:theme.foreground}}>
                {k.label}
              </Text>
            </Pressable>)}
          </View>
          <Text style={{fontSize:11,color:theme.muted}}>Lier ce fichier aux parties :</Text>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
            {project.sections.map(section=><Pressable key={section.id}
              onPress={()=>patchFile(file.id,{sectionIds:file.sectionIds.includes(section.id)
                ?file.sectionIds.filter(id=>id!==section.id):[...file.sectionIds,section.id]})}
              style={{borderWidth:1,borderColor:file.sectionIds.includes(section.id)?pink:theme.border,
                borderRadius:8,padding:8}}>
              <Text style={{fontSize:11,color:theme.foreground}}>{section.title}</Text>
            </Pressable>)}
          </View>
          {file.kind==='lyrics'?<TextInput value={file.language||project.originalLanguage}
            onChangeText={language=>patchFile(file.id,{language})} style={field}/>:null}
          {file.kind==='audio'?<TextInput value={file.instrument||''} onChangeText={instrument=>
            patchFile(file.id,{instrument})} placeholder="Instrument" placeholderTextColor={theme.muted}
            style={field}/>:null}
          {(file.kind==='lyrics'||file.kind==='note'||file.kind==='idea'||file.kind==='document')?
            <TextInput multiline value={file.text||''} onChangeText={text=>patchFile(file.id,{text})}
              style={{...field,minHeight:90}} textAlignVertical="top"
              placeholder="Contenu de ce fichier" placeholderTextColor={theme.muted}/>:null}
          {file.kind==='audio'?<MusicAudioPreview source={{localAudioId:file.localFileId,
            audioUrl:file.externalUrl}}/>:null}
          {file.localFileId && file.kind!=='audio'?<Pressable onPress={()=>{void openAttached(file)
            .catch(()=>setError('Impossible d’ouvrir le fichier.'));}}>
            <Text style={{color:pink,fontSize:12}}>Ouvrir le fichier joint</Text>
          </Pressable>:null}
          <Pressable onPress={()=>patch({files:files.filter(x=>x.id!==file.id)})}>
            <Text style={{color:'#B34D67',fontSize:12}}>Retirer du dossier</Text>
          </Pressable>
        </>))}
      {show('audio') && project.versions.map(v=>row('version-'+v.id,v.title,'audio',
        'Chant entier','Version'+(v.publishedId?' · publiée':''),
        ()=>setExpanded(expanded==='version-'+v.id?null:'version-'+v.id),
        <MusicAudioPreview source={v}/>))}
      {show('audio') && project.layers.map(l=>row('layer-'+l.id,l.title,'audio',
        l.sectionId?sectionName(l.sectionId):'Chant entier',l.role,
        ()=>setExpanded(expanded==='layer-'+l.id?null:'layer-'+l.id),
        <MusicAudioPreview source={l}/>))}
      {show('lyrics') && project.lyrics.map(l=>row('lyric-'+l.id,
        l.sectionId?('Paroles · '+sectionName(l.sectionId)):'Paroles · chant entier',
        'lyrics',l.sectionId?sectionName(l.sectionId):'Chant entier',l.language,
        ()=>setExpanded(expanded==='lyric-'+l.id?null:'lyric-'+l.id),
        <Text style={{color:theme.foreground,fontSize:12,lineHeight:19}}>{l.text||'Paroles vides'}</Text>))}
      {show('score') && project.sections.filter(s=>s.scoreFileName||s.scoreUrl).map(s=>
        row('score-'+s.id,s.scoreFileName||'Partition','score',s.title,'',
          ()=>setExpanded(expanded==='score-'+s.id?null:'score-'+s.id),
          <Pressable onPress={()=>openSection(s.id)}>
            <Text style={{color:pink,fontSize:12}}>Voir dans {s.title}</Text>
          </Pressable>))}
      {show('note') && project.sections.filter(s=>!!s.notes?.trim()).map(s=>
        row('note-'+s.id,'Notes · '+s.title,'note',s.title,'',
          ()=>setExpanded(expanded==='note-'+s.id?null:'note-'+s.id),
          <Text style={{color:theme.foreground,fontSize:12}}>{s.notes}</Text>))}
    </View>
    {files.length+project.layers.length+project.lyrics.length+project.versions.length===0?
      <View style={{padding:19,alignItems:'center',gap:8}}>
        <Ionicons name="folder-open-outline" size={29} color={pink}/>
        <Text style={{fontSize:13,color:theme.muted,textAlign:'center'}}>
          Ton morceau est encore une idée. Ajoute les premiers fichiers quand tu le souhaites.
        </Text>
      </View>:null}
    {error?<Text style={{fontSize:12,color:'#B34D67'}}>{error}</Text>:null}
  </View>;
}
