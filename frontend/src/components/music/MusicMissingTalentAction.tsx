import React,{useEffect,useState} from 'react';
import {Platform,Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {DREAM_TALENT_CHOICES} from '@/components/dream/dreamTalentCatalog';
import {TalentLevelSelector} from '@/components/talent/TalentLevelSelector';
import {TranslatorLanguageFields} from '@/components/talent/TranslatorLanguageFields';
import {MusicAudioCapture} from './MusicAudioCapture';
import {saveMusicWorkspaceFile} from '@/domain/musicLocalStorage';
import {newMusicId} from '@/domain/musicWorkspace';
import type {MusicNeed,MusicProject,MusicProjectFile} from '@/domain/musicWorkspace';

const PINK='#CB245C';
type Audience=NonNullable<MusicNeed['audience']>;
const audiences:{id:Audience;title:string;icon:keyof typeof Ionicons.glyphMap}[]=[
  {id:'private',title:'Privé',icon:'lock-closed-outline'},
  {id:'public',title:'Public',icon:'globe-outline'},
  {id:'contacts',title:'Contacts',icon:'people-outline'},
  {id:'direct',title:'Une personne',icon:'person-add-outline'},
];

/** One shared talent catalog for dreams and music. Audiences are local intentions,
 * not misleading claims of remote publication or invitation delivery. */
export function MusicMissingTalentAction({project,patch,sectionId,primary=false,
  editNeed,onFinished}:{
  project:MusicProject;patch:(change:Partial<MusicProject>)=>void;sectionId?:string;
  primary?:boolean;editNeed?:MusicNeed|null;onFinished?:()=>void;
}){
  const theme=useAppTheme();
  const [open,setOpen]=useState(false);
  const [menu,setMenu]=useState(false);
  const [talent,setTalent]=useState('');
  const [level,setLevel]=useState('Quelques notions');
  const [from,setFrom]=useState(''),[to,setTo]=useState('');
  const [description,setDescription]=useState('');
  const [audience,setAudience]=useState<Audience>('private');
  const [handle,setHandle]=useState('');
  const [referenceIds,setReferenceIds]=useState<string[]>([]);
  const [referencesOpen,setReferencesOpen]=useState(false);
  const [recordMemo,setRecordMemo]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{
    if(!editNeed)return;
    setTalent(editNeed.label);setLevel(editNeed.level||'Quelques notions');
    setFrom(editNeed.sourceLanguage||'');setTo(editNeed.targetLanguage||'');
    setDescription(editNeed.description||'');setAudience(editNeed.audience||'private');
    setHandle(editNeed.targetHandle||'');
    setReferenceIds(editNeed.referenceFileIds||[]);
    setOpen(true);setMenu(false);setError('');
  },[editNeed?.id]);
  const translator=talent.trim().toLocaleLowerCase('fr')==='traducteur';
  const canSubmit=!!talent.trim()&&
    (!translator||(!!from.trim()&&!!to.trim()))&&
    (audience!=='direct'||!!handle.trim());
  const selectedFiles=referenceIds.map(id=>project.files.find(file=>file.id===id))
    .filter((file):file is MusicProjectFile=>!!file);
  const available=project.files.filter(file=>file.kind==='audio'||
    file.kind==='score'||file.kind==='lyrics'||file.kind==='document'||
    !!file.originalFilename?.match(/\.(png|jpg|jpeg|webp|pdf)$/i));
  const field={borderWidth:1,borderColor:theme.border,backgroundColor:theme.background,
    borderRadius:11,paddingHorizontal:12,paddingVertical:11,color:theme.foreground,
    fontSize:13} as const;
  const clear=()=>{
    setTalent('');setDescription('');setFrom('');setTo('');setHandle('');
    setReferenceIds([]);setAudience('private');setOpen(false);setMenu(false);
    setRecordMemo(false);setError('');
    onFinished?.();
  };
  const submit=()=>{
    if(!canSubmit)return;
    const next:MusicNeed={
      ...(editNeed||{id:newMusicId(),kind:'talent'}),
      label:talent.trim(),level,kind:'talent',
      sectionId:editNeed?.sectionId||sectionId,
      sourceLanguage:translator?from.trim():undefined,
      targetLanguage:translator?to.trim():undefined,
      description:description.trim()||undefined,
      audience,targetHandle:audience==='direct'?handle.trim():undefined,
      referenceFileIds:referenceIds,
    };
    patch({needs:editNeed?
      project.needs.map(need=>need.id===editNeed.id?next:need):
      [...project.needs,next]});
    clear();
  };
  const attach=(file:MusicProjectFile)=>{
    setReferenceIds(old=>old.includes(file.id)?old.filter(id=>id!==file.id):
      [...old,file.id]);
  };
  const saveAttached=(file:File)=>{
    setBusy(true);setError('');
    void saveMusicWorkspaceFile(file).then(localFileId=>{
      const kind:MusicProjectFile['kind']=file.type.startsWith('audio/')?'audio':'document';
      const item:MusicProjectFile={id:newMusicId(),kind,sectionIds:[],
        title:file.name,originalFilename:file.name,mimeType:file.type,
        localFileId,createdAt:new Date().toISOString()};
      patch({files:[...project.files,item]});
      setReferenceIds(old=>[...old,item.id]);
      setReferencesOpen(false);
    }).catch(e=>setError(e instanceof Error?e.message:'Import impossible.'))
      .finally(()=>setBusy(false));
  };
  const upload=()=>{
    if(Platform.OS!=='web'||typeof document==='undefined'){
      setError('Import de mémo disponible sur navigateur web.');return;
    }
    const input=document.createElement('input');
    input.type='file';input.accept='audio/*,image/*,.pdf,.wav,.mp3,.m4a,.webm,.png,.jpg,.jpeg,.webp';
    input.onchange=()=>{const file=input.files?.[0];if(file)saveAttached(file);};
    input.click();
  };
  const onRecorded=(localFileId:string,filename:string,durationSeconds?:number,
    _offset?:number,_markers?:unknown,name?:string)=>{
    const item:MusicProjectFile={id:newMusicId(),kind:'audio',sectionIds:[],
      title:name||'Mémo vocal',originalFilename:filename,localFileId,
      mimeType:/\.wav$/i.test(filename)?'audio/wav':'audio/webm',
      durationSeconds,createdAt:new Date().toISOString()};
    patch({files:[...project.files,item]});
    setReferenceIds(old=>[...old,item.id]);setRecordMemo(false);
  };
  return <View style={{gap:9}}>
    <Pressable onPress={()=>editNeed?clear():setOpen(!open)} accessibilityRole="button"
      accessibilityState={{expanded:open}}
      style={{alignSelf:primary?'stretch':'flex-start',flexDirection:'row',
        alignItems:'center',justifyContent:primary?'center':'flex-start',gap:9,
        minHeight:primary?52:38,paddingHorizontal:primary?18:0,
        paddingVertical:primary?13:6,borderRadius:primary?14:0,
        backgroundColor:primary?PINK:'transparent'}}>
      <Ionicons name={editNeed?'create-outline':'person-add-outline'}
        size={primary?21:17} color={primary?'#fff':PINK}/>
      <Text style={{fontSize:primary?14:12,color:primary?'#fff':PINK,
        fontWeight:'700'}}>
        {editNeed?'Modifier la recherche':
          primary?'Je recherche un talent':
          sectionId?'Un talent manque pour cette partie ?':
            'Un instrument ou un talent manque ?'}
      </Text>
      <Ionicons name={open?'chevron-up':'chevron-down'}
        size={primary?17:14} color={primary?'#fff':PINK}/>
    </Pressable>
    {open?<View style={{padding:13,backgroundColor:theme.surface,
      borderWidth:1,borderColor:theme.border,borderRadius:14,gap:12}}>
      <Text style={{fontSize:13,fontWeight:'700',color:theme.foreground}}>
        Quel talent recherches-tu ?
      </Text>
      <Pressable onPress={()=>setMenu(!menu)} accessibilityRole="button"
        accessibilityLabel="Choisir un talent du catalogue"
        accessibilityState={{expanded:menu}}
        style={{...field,minHeight:45,flexDirection:'row',gap:8,alignItems:'center'}}>
        <Text style={{fontSize:13,color:talent?theme.foreground:theme.muted,
          flex:1}}>{talent||'Choisir dans les talents JenLow'}</Text>
        <Ionicons name={menu?'chevron-up':'chevron-down'} size={17} color={PINK}/>
      </Pressable>
      {menu?<ScrollView nestedScrollEnabled style={{maxHeight:200}}
        contentContainerStyle={{gap:2}}>
        {DREAM_TALENT_CHOICES.map(option=><Pressable key={option.title}
          onPress={()=>{setTalent(option.title);setMenu(false);}}
          accessibilityRole="button" style={{minHeight:40,paddingHorizontal:9,
            justifyContent:'center',flexDirection:'row',alignItems:'center',gap:9}}>
          <Ionicons name={talent===option.title?'radio-button-on':'radio-button-off'}
            color={PINK} size={17}/>
          <Text style={{fontSize:13,color:theme.foreground,flex:1}}>
            {option.title}
          </Text>
        </Pressable>)}
      </ScrollView>:null}
      <TalentLevelSelector value={level} onChange={setLevel}/>
      {translator?<TranslatorLanguageFields sourceLanguage={from} targetLanguage={to}
        onChangeSource={setFrom} onChangeTarget={setTo}/>:null}
      <Text style={{fontSize:12,fontWeight:'600',color:theme.foreground}}>
        Ce que j’attends
      </Text>
      <TextInput multiline value={description} onChangeText={setDescription}
        textAlignVertical="top" placeholder="Décris le son, le style, le passage ou ce que tu imagines…"
        placeholderTextColor={theme.muted} style={{...field,minHeight:87}}/>
      <Text style={{fontSize:12,fontWeight:'600',color:theme.foreground}}>
        Références ou mémo
      </Text>
      {selectedFiles.length?<View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
        {selectedFiles.map(file=><Pressable key={file.id} onPress={()=>attach(file)}
          accessibilityRole="button" accessibilityLabel={'Retirer '+file.title}
          style={{flexDirection:'row',alignItems:'center',gap:5,padding:9,
            borderWidth:1,borderColor:theme.border,borderRadius:10}}>
          <Ionicons name="attach-outline" size={16} color={PINK}/>
          <Text numberOfLines={1} style={{fontSize:11,color:theme.foreground,
            maxWidth:175}}>{file.title}</Text>
          <Ionicons name="close-outline" size={15} color={theme.muted}/>
        </Pressable>)}
      </View>:null}
      <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
        <Pressable onPress={()=>setReferencesOpen(!referencesOpen)}
          accessibilityRole="button" style={{flexDirection:'row',alignItems:'center',
            gap:6,minHeight:39,paddingHorizontal:9}}>
          <Ionicons name="folder-open-outline" size={18} color={PINK}/>
          <Text style={{fontSize:12,color:PINK}}>Depuis Capturer</Text>
        </Pressable>
        <Pressable onPress={upload} disabled={busy} accessibilityRole="button"
          style={{flexDirection:'row',alignItems:'center',gap:6,minHeight:39,
            paddingHorizontal:9}}>
          <Ionicons name="cloud-upload-outline" size={18} color={PINK}/>
          <Text style={{fontSize:12,color:PINK}}>Importer</Text>
        </Pressable>
        <Pressable onPress={()=>setRecordMemo(!recordMemo)}
          accessibilityRole="button"
          style={{flexDirection:'row',alignItems:'center',gap:6,minHeight:39,
            paddingHorizontal:9}}>
          <Ionicons name="mic-outline" color={PINK} size={18}/>
          <Text style={{fontSize:12,color:PINK}}>Mémo vocal</Text>
        </Pressable>
      </View>
      {referencesOpen?<ScrollView nestedScrollEnabled style={{maxHeight:170}}
        contentContainerStyle={{gap:3}}>
        {available.map(file=><Pressable key={file.id} onPress={()=>attach(file)}
          accessibilityRole="checkbox"
          accessibilityState={{checked:referenceIds.includes(file.id)}}
          style={{minHeight:40,flexDirection:'row',alignItems:'center',gap:8}}>
          <Ionicons name={referenceIds.includes(file.id)?'checkbox':'square-outline'}
            color={PINK} size={17}/>
          <Text numberOfLines={1} style={{fontSize:12,color:theme.foreground,
            flex:1}}>{file.title}</Text>
        </Pressable>)}
        {!available.length?<Text style={{fontSize:12,color:theme.muted}}>
          Ajoute d’abord un fichier dans Capturer.
        </Text>:null}
      </ScrollView>:null}
      {recordMemo?<MusicAudioCapture onSaved={onRecorded}
        suggestedTitle="Mémo pour le talent"/>:null}
      <Text style={{fontSize:12,fontWeight:'600',color:theme.foreground}}>
        Qui pourra voir cette recherche ?
      </Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
        {audiences.map(option=><Pressable key={option.id}
          onPress={()=>setAudience(option.id)}
          accessibilityRole="radio" accessibilityState={{selected:audience===option.id}}
          style={{minHeight:41,flexDirection:'row',alignItems:'center',gap:6,
            borderWidth:1,borderColor:audience===option.id?PINK:theme.border,
            paddingHorizontal:10,borderRadius:11,
            backgroundColor:audience===option.id?
              (theme.dark?'#442A35':'#FBEAF0'):'transparent'}}>
          <Ionicons name={option.icon} size={17}
            color={audience===option.id?PINK:theme.muted}/>
          <Text style={{fontSize:12,color:theme.foreground}}>
            {option.title}
          </Text>
        </Pressable>)}
      </View>
      {audience==='direct'?<TextInput value={handle}
        onChangeText={setHandle} placeholder="Identifiant du destinataire"
        placeholderTextColor={theme.muted} style={field}/>:null}
      <Text style={{fontSize:11,lineHeight:18,color:theme.muted}}>
        La demande et le choix de diffusion sont conservés localement.
        L’annonce publique, l’accès Contacts et les invitations individuelles
        ne sont pas encore connectés au serveur.
      </Text>
      {error?<Text style={{fontSize:12,color:'#B64B61'}}>{error}</Text>:null}
      <View style={{flexDirection:'row',gap:9,flexWrap:'wrap',alignItems:'center'}}>
        <Pressable onPress={submit} disabled={!canSubmit||busy}
          accessibilityRole="button"
          style={{minHeight:43,justifyContent:'center',paddingHorizontal:16,
            borderRadius:10,backgroundColor:PINK,
            opacity:canSubmit&&!busy?1:.45}}>
          <Text style={{color:'#fff',fontWeight:'700',fontSize:12}}>
            {editNeed?'Enregistrer les modifications':'Conserver la recherche'}
          </Text>
        </Pressable>
        <Pressable onPress={clear} accessibilityRole="button"
          style={{minHeight:43,justifyContent:'center',paddingHorizontal:9}}>
          <Text style={{fontSize:12,color:theme.muted}}>Annuler</Text>
        </Pressable>
      </View>
    </View>:null}
  </View>;
}
