import React,{useMemo,useState} from 'react';
import {Linking,Platform,Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {MusicAudioCapture} from './MusicAudioCapture';
import {MusicAudioPreview} from './MusicAudioPreview';
import {MusicVersionsSection} from './MusicVersionsSection';
import {MusicOwnerProposals} from './MusicOwnerProposals';
import {TalentLevelSelector} from '@/components/talent/TalentLevelSelector';
import {TranslatorLanguageFields} from '@/components/talent/TranslatorLanguageFields';
import {chooseMusicFile} from '@/domain/musicMedia';
import {saveDraftAudio,saveDraftAttachment,getDraftAttachment} from '@/domain/musicLocalStorage';
import {fileAudioDuration,formatMusicDuration} from '@/domain/musicProjectSelectors';
import {newMusicId} from '@/domain/musicWorkspace';
import type {
  MusicProject,MusicProjectFile,MusicNeed,MusicSuggestion,MusicLyric,
} from '@/domain/musicWorkspace';

type Kind=MusicProjectFile['kind']|'version'|'proposal'|'talent'|'style';
type Element = {key:string;id:string;kind:Kind;name:string;subtitle:string;
  scopeIds:string[];origin:'file'|'version'|'need'|'suggestion'|'layer'|'lyric'|'score'|'note'|'remote'};
type Props={project:MusicProject;patch:(change:Partial<MusicProject>)=>void;
  sectionId?:string;openSection:(id:string)=>void};
const pink='#CB245C';
const types:{kind:Kind;label:string;icon:keyof typeof Ionicons.glyphMap}[]=[
  {kind:'version',label:'Version',icon:'layers-outline'},
  {kind:'lyrics',label:'Paroles',icon:'document-text-outline'},
  {kind:'audio',label:'Audio',icon:'musical-note-outline'},
  {kind:'score',label:'Partition',icon:'document-outline'},
  {kind:'note',label:'Note',icon:'reader-outline'},
  {kind:'idea',label:'Idée',icon:'bulb-outline'},
  {kind:'proposal',label:'Proposition',icon:'git-branch-outline'},
  {kind:'talent',label:'Talent recherché',icon:'person-add-outline'},
  {kind:'document',label:'Document',icon:'document-attach-outline'},
];
const nameOf=(kind:Kind)=>types.find(t=>t.kind===kind)?.label||'Élément';
const iconOf=(kind:Kind)=>types.find(t=>t.kind===kind)?.icon||'document-outline';

/** One single song element list. A version, score, lyric, request or proposal is an item,
 * not a separate permanent panel or module. Never re-upload local data to mock a publish. */
export function MusicSongElements({project,patch,sectionId,openSection}:Props) {
  const theme=useAppTheme();
  const files=project.files||[];
  const [adding,setAdding]=useState(false);
  const [kind,setKind]=useState<Kind>('lyrics');
  const [title,setTitle]=useState('');
  const [body,setBody]=useState('');
  const [language,setLanguage]=useState(project.originalLanguage||'Français');
  const [instrument,setInstrument]=useState('');
  const [level,setLevel]=useState('Quelques notions');
  const [sourceLang,setSourceLang]=useState('');
  const [targetLang,setTargetLang]=useState('');
  const [chosenSections,setChosenSections]=useState<string[]>(sectionId?[sectionId]:[]);
  const [expanded,setExpanded]=useState<string|null>(null);
  const [uploading,setUploading]=useState(false);
  const [error,setError]=useState('');
  const inputStyle={borderWidth:1,borderColor:theme.border,borderRadius:10,
    paddingVertical:10,paddingHorizontal:11,fontSize:13,
    color:theme.foreground,backgroundColor:theme.background} as const;
  const scopeName=(id:string)=>project.sections.find(s=>s.id===id)?.title||'Partie supprimée';
  const scopeLabel=(ids:string[])=>ids.length?ids.map(scopeName).join(', '):'Chant entier';
  const cardBg=theme.dark?'#332B31':'#F8F5F2';

  const elements=useMemo<Element[]>(()=>{
    const result:Element[]=[
      ...project.versions.map(v=>({key:'v:'+v.id,id:v.id,origin:'version' as const,
        kind:'version' as const,name:v.title,
        subtitle:(v.publishedId?'Publiée':'Brouillon')+' · '+formatMusicDuration(v.durationSeconds),
        scopeIds:[]})),
      ...files.map(f=>({key:'f:'+f.id,id:f.id,origin:'file' as const,kind:f.kind,
        name:f.title,subtitle:f.language||f.instrument||formatMusicDuration(f.durationSeconds),
        scopeIds:f.sectionIds||[]})),
      ...project.layers.map(l=>({key:'l:'+l.id,id:l.id,origin:'layer' as const,
        kind:'audio' as const,name:l.title,subtitle:l.role||'Piste',
        scopeIds:l.sectionId?[l.sectionId]:[]})),
      ...project.lyrics.map(l=>({key:'y:'+l.id,id:l.id,origin:'lyric' as const,
        kind:'lyrics' as const,name:l.sectionId?'Paroles · '+scopeName(l.sectionId):'Paroles du chant',
        subtitle:l.language,scopeIds:l.sectionId?[l.sectionId]:[]})),
      ...project.suggestions.map(s=>({key:'p:'+s.id,id:s.id,origin:'suggestion' as const,
        kind:'proposal' as const,name:s.title,
        subtitle:s.status==='pending'?'En attente':s.status==='integrated'?'Retenue':'Archivée',
        scopeIds:s.sectionId?[s.sectionId]:[]})),
      ...project.needs.map(n=>({key:'t:'+n.id,id:n.id,origin:'need' as const,
        kind:n.kind==='talent'?'talent' as const:'style' as const,name:n.label,
        subtitle:n.sourceLanguage&&n.targetLanguage?n.sourceLanguage+' → '+n.targetLanguage:n.level||'',
        scopeIds:n.sectionId?[n.sectionId]:[]})),
      ...project.sections.filter(s=>s.scoreLocalId||s.scoreUrl)
        .map(s=>({key:'sc:'+s.id,id:s.id,origin:'score' as const,kind:'score' as const,
          name:s.scoreFileName||'Partition',subtitle:'Partition de '+s.title,scopeIds:[s.id]})),
      ...project.sections.filter(s=>s.notes?.trim())
        .map(s=>({key:'no:'+s.id,id:s.id,origin:'note' as const,kind:'note' as const,
          name:'Notes · '+s.title,subtitle:'Note de la partie',scopeIds:[s.id]})),
    ];
    if(project.publishedId)result.push({
      key:'remote',id:'remote',origin:'remote',kind:'proposal',
      name:'Contributions reçues',subtitle:'Propositions en ligne',scopeIds:[],
    });
    return result.filter(e=>!sectionId||e.scopeIds.includes(sectionId));
  },[project,files,sectionId]);

  const clearForm=()=>{setAdding(false);setTitle('');setBody('');setInstrument('');
    setChosenSections(sectionId?[sectionId]:[]);setError('');};
  const saveNew=()=>{
    const name=title.trim();
    if(!name)return;
    if(kind==='version'){
      patch({versions:[...project.versions,{id:newMusicId(),title:name,
        createdAt:new Date().toISOString(),selectedForPublication:false}]});
    } else if(kind==='talent'){
      const translator=name.toLowerCase()==='traducteur';
      if(translator&&(!sourceLang.trim()||!targetLang.trim())){
        setError('Indique les deux langues du traducteur.');return;
      }
      const request:MusicNeed={id:newMusicId(),kind:'talent',label:name,level,
        sectionId:chosenSections[0],
        sourceLanguage:translator?sourceLang.trim():undefined,
        targetLanguage:translator?targetLang.trim():undefined};
      patch({needs:[...project.needs,request]});
    } else if(kind==='proposal'){
      const suggestion:MusicSuggestion={id:newMusicId(),title:name,note:body.trim(),
        kind:'section',sectionId:chosenSections[0],status:'pending',
        createdAt:new Date().toISOString()};
      patch({suggestions:[...project.suggestions,suggestion]});
    } else {
      const file:MusicProjectFile={id:newMusicId(),title:name,kind,
        sectionIds:[...chosenSections],text:body,language:kind==='lyrics'?language.trim():undefined,
        instrument:kind==='audio'?instrument.trim():undefined,
        createdAt:new Date().toISOString()};
      patch({files:[...files,file]});
    }
    clearForm();
  };

  const importFor=(id?:string)=>{
    if(Platform.OS!=='web'||typeof document==='undefined') {
      setError('Import de fichier disponible depuis le navigateur.');return;
    }
    if(id){
      const item=files.find(f=>f.id===id);
      if(!item)return;
      const picker=document.createElement('input');
      picker.type='file';
      picker.accept=item.kind==='audio'?'audio/*,.mp3,.wav,.m4a,.webm,.ogg':
        '.txt,.md,.pdf,.png,.jpeg,.jpg,.webp';
      picker.onchange=()=>{
        const file=picker.files?.[0];if(!file)return;
        setUploading(true);setError('');
        void (async()=>{
          const audio=file.type.startsWith('audio/');
          const text=/\.(txt|md)$/i.test(file.name);
          const localFileId=audio?await saveDraftAudio(file):
            text?undefined:await saveDraftAttachment(file);
          const durationSeconds=audio?await fileAudioDuration(file):undefined;
          patch({files:files.map(f=>f.id===id?{...f,
            localFileId,text:text?await file.text():f.text,
            durationSeconds:audio?durationSeconds:f.durationSeconds}:f)});
        })().catch(e=>setError(e instanceof Error?e.message:'Import impossible.'))
          .finally(()=>setUploading(false));
      };
      picker.click();return;
    }
    const picker=document.createElement('input');
    picker.type='file';
    picker.accept='.txt,.md,.pdf,.png,.jpg,.jpeg,.webp,.wav,.mp3,.m4a,.ogg,.webm,.aac';
    picker.onchange=()=>{
      const file=picker.files?.[0];if(!file)return;
      const audio=file.type.startsWith('audio/')||/\.(wav|mp3|m4a|ogg|webm|aac)$/i.test(file.name);
      const text=/\.(txt|md)$/i.test(file.name);
      const detected:MusicProjectFile['kind']=audio?'audio':
        text?(kind==='lyrics'?'lyrics':'note'):'score';
      setUploading(true);setError('');
      void (async()=>{
        const localFileId=audio?await saveDraftAudio(file):
          text?undefined:await saveDraftAttachment(file);
        const item:MusicProjectFile={id:newMusicId(),title:file.name,kind:detected,
          sectionIds:[...chosenSections],localFileId,
          text:text?await file.text():undefined,
          language:detected==='lyrics'?language.trim()||project.originalLanguage:undefined,
          instrument:detected==='audio'?instrument.trim():undefined,
          durationSeconds:audio?await fileAudioDuration(file):undefined,
          createdAt:new Date().toISOString()};
        patch({files:[...files,item]});
        clearForm();
      })().catch(e=>setError(e instanceof Error?e.message:'Import impossible.'))
        .finally(()=>setUploading(false));
    };
    picker.click();
  };

  const selectScope=(ids:string[],onChange:(next:string[])=>void)=>
    <View style={{flexDirection:'row',gap:6,flexWrap:'wrap'}}>
      {project.sections.map(s=><Pressable key={s.id}
        onPress={()=>onChange(ids.includes(s.id)?ids.filter(x=>x!==s.id):[...ids,s.id])}
        style={{paddingHorizontal:9,paddingVertical:8,borderWidth:1,
          borderRadius:8,borderColor:ids.includes(s.id)?pink:theme.border}}>
        <Text style={{fontSize:11,color:ids.includes(s.id)?pink:theme.foreground}}>{s.title}</Text>
      </Pressable>)}
      {!project.sections.length?<Text style={{color:theme.muted,fontSize:11}}>
        Aucune partie créée pour l’instant.
      </Text>:null}
    </View>;
  const updateFile=(id:string,changes:Partial<MusicProjectFile>)=>
    patch({files:files.map(f=>f.id===id?{...f,...changes}:f)});
  const openAttachment=async(item:MusicProjectFile)=>{
    if(item.externalUrl&&/^https:\/\//i.test(item.externalUrl)){
      await Linking.openURL(item.externalUrl);return;
    }
    if(!item.localFileId||typeof document==='undefined')return;
    const blob=await getDraftAttachment(item.localFileId);
    if(!blob)throw Error('Pièce jointe introuvable sur cet appareil.');
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';
    a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
  };
  const smallAction=(text:string,fn:()=>void)=><Pressable accessibilityRole="button"
    onPress={fn} style={{paddingVertical:9,paddingHorizontal:11,borderWidth:1,
      borderColor:theme.border,borderRadius:9,alignSelf:'flex-start'}}>
    <Text style={{color:theme.foreground,fontSize:11,fontWeight:'600'}}>{text}</Text>
  </Pressable>;

  const editor=(item:Element):React.ReactNode=>{
    if(item.origin==='version'){
      return <MusicVersionsSection project={project} patch={patch}
        focusVersionId={item.id} inline/>;
    }
    if(item.origin==='remote'){
      return <MusicOwnerProposals project={project} patch={patch}/>;
    }
    if(item.origin==='file'){
      const f=files.find(x=>x.id===item.id);if(!f)return null;
      return <View style={{gap:10}}>
        <TextInput style={inputStyle} value={f.title} placeholder="Nom de l'élément"
          onChangeText={title=>updateFile(f.id,{title})}/>
        <Text style={{color:theme.muted,fontSize:11}}>Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:7}}>
          {types.filter(t=>!['version','proposal','talent'].includes(t.kind))
            .map(t=><Pressable key={t.kind} onPress={()=>updateFile(f.id,{kind:t.kind as MusicProjectFile['kind']})}
              style={{borderWidth:1,borderRadius:8,padding:8,
                borderColor:f.kind===t.kind?pink:theme.border}}>
              <Text style={{color:f.kind===t.kind?pink:theme.foreground,fontSize:11}}>{t.label}</Text>
            </Pressable>)}
        </ScrollView>
        <Text style={{fontSize:11,color:theme.muted}}>Parties concernées</Text>
        {selectScope(f.sectionIds||[],sectionIds=>updateFile(f.id,{sectionIds}))}
        {f.kind==='lyrics'?<TextInput style={inputStyle} value={f.language||''}
          onChangeText={language=>updateFile(f.id,{language})} placeholder="Langue des paroles"
          placeholderTextColor={theme.muted}/>:null}
        {f.kind==='audio'?<TextInput style={inputStyle} value={f.instrument||''}
          onChangeText={instrument=>updateFile(f.id,{instrument})} placeholder="Instrument / rôle"
          placeholderTextColor={theme.muted}/>:null}
        {['lyrics','note','idea','document','score'].includes(f.kind)?<TextInput
          multiline textAlignVertical="top" value={f.text||''}
          onChangeText={text=>updateFile(f.id,{text})} style={{...inputStyle,minHeight:110}}
          placeholder="Contenu" placeholderTextColor={theme.muted}/>:null}
        {f.kind==='audio'?<MusicAudioPreview source={{localAudioId:f.localFileId,
          audioUrl:f.externalUrl}}/>:null}
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
          {Platform.OS==='web'?smallAction(uploading?'Import…':'Joindre un fichier',()=>importFor(f.id)):null}
          {(f.localFileId||f.externalUrl)&&f.kind!=='audio'?smallAction('Ouvrir la pièce jointe',
            ()=>{void openAttachment(f).catch(e=>setError(e instanceof Error?e.message:'Ouverture impossible.'));}):null}
          {smallAction('Retirer',()=>patch({files:files.filter(x=>x.id!==f.id)}))}
        </View>
        {f.kind==='audio'?<MusicAudioCapture onSaved={(localFileId,_name,durationSeconds)=>
          updateFile(f.id,{localFileId,durationSeconds})}/>:null}
      </View>;
    }
    if(item.origin==='need'){
      const n=project.needs.find(x=>x.id===item.id);if(!n)return null;
      const update=(changes:Partial<MusicNeed>)=>patch({needs:project.needs.map(x=>x.id===n.id?{...x,...changes}:x)});
      return <View style={{gap:9}}>
        <TextInput value={n.label} onChangeText={label=>update({label})} style={inputStyle}/>
        {n.kind==='talent'?<TalentLevelSelector value={n.level||'Quelques notions'}
          onChange={level=>update({level})}/>:null}
        {n.kind==='talent'&&n.label.trim().toLowerCase()==='traducteur'?
          <TranslatorLanguageFields sourceLanguage={n.sourceLanguage||''}
            targetLanguage={n.targetLanguage||''}
            onChangeSource={sourceLanguage=>update({sourceLanguage})}
            onChangeTarget={targetLanguage=>update({targetLanguage})}/>:null}
        <Text style={{color:theme.muted,fontSize:11}}>Partie concernée</Text>
        {selectScope(n.sectionId?[n.sectionId]:[],ids=>update({sectionId:ids[0]}))}
        {smallAction('Retirer',()=>patch({needs:project.needs.filter(x=>x.id!==n.id)}))}
        <Text style={{color:theme.muted,fontSize:10}}>
          Demande enregistrée dans le dossier local ; pas encore envoyée publiquement.
        </Text>
      </View>;
    }
    if(item.origin==='suggestion'){
      const p=project.suggestions.find(x=>x.id===item.id);if(!p)return null;
      const update=(changes:Partial<MusicSuggestion>)=>patch({suggestions:project.suggestions.map(x=>x.id===p.id?{...x,...changes}:x)});
      return <View style={{gap:9}}>
        <TextInput value={p.title} onChangeText={title=>update({title})} style={inputStyle}/>
        <TextInput value={p.note} onChangeText={note=>update({note})}
          style={{...inputStyle,minHeight:100}} multiline textAlignVertical="top"/>
        <Text style={{fontSize:11,color:theme.muted}}>Partie concernée</Text>
        {selectScope(p.sectionId?[p.sectionId]:[],ids=>update({sectionId:ids[0]}))}
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
          {smallAction('Retenir',()=>update({status:'integrated'}))}
          {smallAction(p.status==='archived'?'Réactiver':'Archiver',()=>
            update({status:p.status==='archived'?'pending':'archived'}))}
          {smallAction('Retirer',()=>patch({suggestions:project.suggestions.filter(x=>x.id!==p.id)}))}
        </View>
        <Text style={{color:theme.muted,fontSize:10}}>Note de travail privée, non envoyée.</Text>
      </View>;
    }
    if(item.origin==='layer'){
      const layer=project.layers.find(x=>x.id===item.id);if(!layer)return null;
      return <View style={{gap:9}}>
        <MusicAudioPreview source={layer}/>
        {smallAction('Retrouver cette piste dans sa partie',()=>openSection(layer.sectionId||''))}
      </View>;
    }
    if(item.origin==='lyric'){
      const l=project.lyrics.find(x=>x.id===item.id);if(!l)return null;
      return <View style={{gap:9}}>
        <Text style={{fontSize:11,color:theme.muted}}>{l.language}</Text>
        <TextInput multiline value={l.text} textAlignVertical="top" style={{...inputStyle,minHeight:110}}
          onChangeText={text=>patch({lyrics:project.lyrics.map(x=>x.id===l.id?
            {...x,text,updatedAt:new Date().toISOString()}:x)})}/>
        {smallAction('Ouvrir la partie',()=>openSection(l.sectionId||''))}
      </View>;
    }
    if(item.origin==='score'||item.origin==='note')
      return smallAction('Ouvrir dans la partie',()=>openSection(item.id));
    return null;
  };

  return <View style={{gap:10}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:9}}>
      <View style={{flex:1,gap:2}}>
        <Text style={{fontSize:16,fontWeight:'700',color:theme.foreground}}>
          {sectionId?'Éléments · '+scopeName(sectionId):'Éléments du morceau'}
        </Text>
        <Text style={{fontSize:11,color:theme.muted}}>
          {elements.length} élément{elements.length>1?'s':''}
        </Text>
      </View>
      <Pressable onPress={()=>{setAdding(!adding);setChosenSections(sectionId?[sectionId]:[]);}}
        accessibilityRole="button" style={{flexDirection:'row',alignItems:'center',gap:5,
          paddingHorizontal:12,paddingVertical:10,borderRadius:10,backgroundColor:pink}}>
        <Ionicons name={adding?'close':'add'} size={17} color="#fff"/>
        <Text style={{color:'#fff',fontSize:12,fontWeight:'700'}}>{adding?'Fermer':'Ajouter'}</Text>
      </Pressable>
    </View>
    {adding?<View style={{backgroundColor:theme.surface,borderRadius:14,
      borderWidth:1,borderColor:theme.border,padding:13,gap:10}}>
      <Text style={{color:theme.foreground,fontSize:13,fontWeight:'700'}}>Nouvel élément</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
        {types.filter(x=>!sectionId||x.kind!=='version').map(t=>
          <Pressable key={t.kind} onPress={()=>{setKind(t.kind);setError('');}}
            style={{borderWidth:1,borderColor:kind===t.kind?pink:theme.border,
              borderRadius:9,paddingHorizontal:10,paddingVertical:8}}>
            <Text style={{color:kind===t.kind?pink:theme.foreground,fontSize:11}}>{t.label}</Text>
          </Pressable>)}
      </View>
      <TextInput value={title} onChangeText={setTitle} style={inputStyle}
        placeholder="Nom de l’élément…" placeholderTextColor={theme.muted}/>
      {kind==='lyrics'?<TextInput value={language} onChangeText={setLanguage}
        placeholder="Langue" placeholderTextColor={theme.muted} style={inputStyle}/>:null}
      {kind==='audio'?<TextInput value={instrument} onChangeText={setInstrument}
        placeholder="Instrument (facultatif)" placeholderTextColor={theme.muted} style={inputStyle}/>:null}
      {kind==='talent'?<>
        <TalentLevelSelector value={level} onChange={setLevel}/>
        {title.trim().toLowerCase()==='traducteur'?
          <TranslatorLanguageFields sourceLanguage={sourceLang} targetLanguage={targetLang}
            onChangeSource={setSourceLang} onChangeTarget={setTargetLang}/>:null}
      </>:null}
      {!sectionId&&kind!=='version'?<>
        <Text style={{color:theme.muted,fontSize:11}}>Parties concernées (facultatif)</Text>
        {selectScope(chosenSections,setChosenSections)}
      </>:null}
      {['lyrics','note','idea','document','proposal'].includes(kind)?
        <TextInput value={body} onChangeText={setBody} multiline textAlignVertical="top"
          style={{...inputStyle,minHeight:88}} placeholder="Contenu, idée ou proposition…"
          placeholderTextColor={theme.muted}/>:null}
      <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
        <Pressable disabled={!title.trim()} onPress={saveNew} accessibilityRole="button"
          style={{paddingVertical:10,paddingHorizontal:14,borderRadius:9,
            backgroundColor:title.trim()?pink:theme.border}}>
          <Text style={{fontSize:12,color:'#fff',fontWeight:'700'}}>Créer l’élément</Text>
        </Pressable>
        {Platform.OS==='web'?smallAction(uploading?'Import en cours…':'Importer un fichier',()=>importFor()):null}
      </View>
      {kind==='audio'?<MusicAudioCapture onSaved={(localFileId,filename,durationSeconds)=>{
        patch({files:[...files,{id:newMusicId(),title:title.trim()||filename,kind:'audio',
          sectionIds:[...chosenSections],instrument:instrument||undefined,localFileId,
          durationSeconds,createdAt:new Date().toISOString()}]});
        clearForm();
      }}/>:null}
    </View>:null}
    <View style={{borderTopWidth:elements.length?1:0,borderColor:theme.border}}>
      {elements.map((element,i)=><View key={element.key}>
        {i>0?<View style={{height:1,backgroundColor:theme.border}}/>:null}
        <Pressable onPress={()=>setExpanded(expanded===element.key?null:element.key)}
          accessibilityRole="button"
          style={{flexDirection:'row',alignItems:'center',gap:11,minHeight:65,paddingVertical:9}}>
          <View style={{backgroundColor:cardBg,borderRadius:11,width:40,height:40,
            justifyContent:'center',alignItems:'center'}}>
            <Ionicons name={iconOf(element.kind)} size={19} color={theme.muted}/>
          </View>
          <View style={{flex:1,gap:4}}>
            <Text numberOfLines={1} style={{color:theme.foreground,fontWeight:'600',fontSize:13}}>
              {element.name}
            </Text>
            <Text numberOfLines={2} style={{color:theme.muted,fontSize:11}}>
              {nameOf(element.kind)} · {scopeLabel(element.scopeIds)}
              {element.subtitle?' · '+element.subtitle:''}
            </Text>
          </View>
          <Ionicons name={expanded===element.key?'chevron-up':'chevron-forward'}
            size={18} color={theme.muted}/>
        </Pressable>
        {expanded===element.key?<View style={{paddingBottom:15,paddingLeft:6,gap:11}}>
          {editor(element)}
        </View>:null}
      </View>)}
    </View>
    {!elements.length?<View style={{paddingVertical:26,alignItems:'center',gap:7}}>
      <Ionicons name="folder-open-outline" size={27} color={pink}/>
      <Text style={{fontSize:12,color:theme.muted,textAlign:'center',lineHeight:20}}>
        Aucun élément pour le moment. Ajoute une idée, des paroles, une piste ou une version.
      </Text>
    </View>:null}
    {error?<Text style={{color:'#B34D67',fontSize:12}}>{error}</Text>:null}
  </View>;
}
