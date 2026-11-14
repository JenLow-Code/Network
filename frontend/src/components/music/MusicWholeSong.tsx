import React, { useEffect, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppTheme } from '@/theme/AppTheme';
import { TalentLevelSelector } from '@/components/talent/TalentLevelSelector';
import { TranslatorLanguageFields } from '@/components/talent/TranslatorLanguageFields';
import { useApp } from '@/context/AppContext';
import { MusicAudioCapture } from './MusicAudioCapture';
import { MusicAudioPreview } from './MusicAudioPreview';
import { chooseMusicFile, uploadMusicAudioFile, uploadMusicCoverFile } from '@/domain/musicMedia';
import { getDraftAudio, getDraftAttachment, saveDraftAudio, saveDraftAttachment } from '@/domain/musicLocalStorage';
import { newMusicId } from '@/domain/musicWorkspace';
import type { MusicProject, MusicVersion, MusicNeed, MusicSuggestion } from '@/domain/musicWorkspace';
import { api } from '@/lib/api/client';

const pink='#CB245C';
type Props = {
  project:MusicProject;
  patch:(change:Partial<MusicProject>)=>void;
  selectSection:(id:string)=>void;
};
type ServerProposal = {
  id:string; status:string; description:string;
  proposer?:{displayName?:string}; credits?:{displayName:string;contribution:string}[];
};
const keys=['Do','Do♯ / Ré♭','Ré','Ré♯ / Mi♭','Mi','Fa','Fa♯ / Sol♭',
  'Sol','Sol♯ / La♭','La','La♯ / Si♭','Si'];
const signatures=['2/4','3/4','4/4','5/4','6/8','7/8','9/8','12/8'];

export function MusicWholeSong({project,patch,selectSection}:Props){
  const theme=useAppTheme();
  const user=useApp();
  const [editInfo,setEditInfo]=useState(false);
  const [newInstrument,setNewInstrument]=useState('');
  const [newSection,setNewSection]=useState('');
  const [newVersion,setNewVersion]=useState('');
  const [importError,setImportError]=useState('');
  const [addingAudio,setAddingAudio]=useState(false);
  const [coverError,setCoverError]=useState('');
  const [savingCover,setSavingCover]=useState(false);
  const [rights,setRights]=useState(false);
  const [publishing,setPublishing]=useState(false);
  const [publishError,setPublishError]=useState('');
  const [needType,setNeedType]=useState<MusicNeed['kind']>('talent');
  const [needName,setNeedName]=useState('');
  const [needLevel,setNeedLevel]=useState('Quelques notions');
  const [sourceLang,setSourceLang]=useState('');
  const [targetLang,setTargetLang]=useState('');
  const [suggestTitle,setSuggestTitle]=useState('');
  const [suggestNote,setSuggestNote]=useState('');
  const [remote,setRemote]=useState<ServerProposal[]>([]);
  const [remoteError,setRemoteError]=useState('');
  const [inFlight,setInFlight]=useState<string|null>(null);
  const [note,setNote]=useState('');
  const [chatLoading,setChatLoading]=useState(false);
  const [chatError,setChatError]=useState('');

  const card={backgroundColor:theme.surface,borderRadius:18,borderWidth:1,
    borderColor:theme.border,padding:18,gap:13} as const;
  const label=(value:string)=><Text style={{color:theme.muted,fontSize:11,fontWeight:'600'}}>{value}</Text>;
  const input={fontSize:13,color:theme.foreground,backgroundColor:theme.background,
    borderColor:theme.border,borderWidth:1,borderRadius:10,paddingHorizontal:12,paddingVertical:11} as const;
  const pill=(text:string,onPress:()=>void,selected=false)=><Pressable
    accessibilityRole="button" accessibilityState={{selected}}
    onPress={onPress} style={{borderWidth:1,borderColor:selected?pink:theme.border,
      backgroundColor:selected?(theme.dark?'#412334':'#F9E9F0'):theme.surface,
      paddingHorizontal:12,paddingVertical:9,borderRadius:10}}>
    <Text style={{color:selected?pink:theme.foreground,fontSize:12,fontWeight:selected?'700':'400'}}>{text}</Text>
  </Pressable>;
  const button=(text:string,onPress:()=>void,outline=false,disabled=false)=>
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
      style={{borderRadius:11,paddingHorizontal:15,paddingVertical:11,minHeight:43,
        borderWidth:outline?1:0,borderColor:pink,
        backgroundColor:disabled?theme.border:outline?'transparent':pink,
        justifyContent:'center',alignItems:'center',alignSelf:'flex-start'}}>
      <Text style={{color:outline?pink:'#fff',fontWeight:'700',fontSize:12}}>{text}</Text>
    </Pressable>;
  const updateVersion=(id:string,updates:Partial<MusicVersion>)=>
    patch({versions:project.versions.map(v=>v.id===id?{...v,...updates}:v)});
  const addVersion=(title:string,localAudioId?:string)=>
    patch({versions:[...project.versions,{id:newMusicId(),title:title.trim()||'Nouvelle version',
      localAudioId,createdAt:new Date().toISOString(),selectedForPublication:false}]});
  const chooseCover=()=>{
    if(Platform.OS!=='web'||typeof document==='undefined')return;
    const input=document.createElement('input');
    input.type='file';input.accept='.jpg,.jpeg,.png,.webp,image/*';
    input.onchange=()=>{
      const file=input.files?.[0];if(!file)return;
      setSavingCover(true);setCoverError('');
      void saveDraftAttachment(file).then(coverLocalId=>patch({
        coverLocalId,coverMediaId:undefined,coverUrl:undefined,
      })).catch(e=>setCoverError(e instanceof Error?e.message:'Image indisponible.'))
        .finally(()=>setSavingCover(false));
    };
    input.click();
  };
  const addFile=()=>{if(Platform.OS!=='web')return;
    chooseMusicFile(file=>{
      setAddingAudio(true);setImportError('');
      void saveDraftAudio(file).then(id=>addVersion(file.name.replace(/\.[^.]+$/,''),id))
        .catch(e=>setImportError(e instanceof Error?e.message:'Import impossible.'))
        .finally(()=>setAddingAudio(false));
    });
  };
  const addNeed=()=>{
    if(!needName.trim())return;
    const translator=needType==='talent'&&needName.trim().toLowerCase()==='traducteur';
    if(translator&&(!sourceLang.trim()||!targetLang.trim()))return;
    patch({needs:[...project.needs,{id:newMusicId(),kind:needType,label:needName.trim(),
      level:needType==='talent'?needLevel:undefined,
      sourceLanguage:translator?sourceLang.trim():undefined,
      targetLanguage:translator?targetLang.trim():undefined}]});
    setNeedName('');setSourceLang('');setTargetLang('');
  };
  const addIdea=()=>{
    if(!suggestTitle.trim()||!suggestNote.trim())return;
    const idea:MusicSuggestion={id:newMusicId(),title:suggestTitle.trim(),note:suggestNote.trim(),
      kind:'style',status:'pending',createdAt:new Date().toISOString()};
    patch({suggestions:[...project.suggestions,idea]});
    setSuggestTitle('');setSuggestNote('');
  };

  useEffect(()=>{
    if(!project.publishedId)return;
    let live=true;
    void api<{items:ServerProposal[]}>('/api/music/'+encodeURIComponent(project.publishedId)+'/proposals',
      {auth:'required'}).then(result=>{if(live)setRemote(result.items||[]);})
      .catch(e=>{if(live)setRemoteError(e instanceof Error?e.message:'Impossible de charger les propositions.');});
    return()=>{live=false;};
  },[project.publishedId]);
  const serverDecision=async(id:string,operation:'accept'|'reject'|'publish')=>{
    setInFlight(id);setRemoteError('');
    try{
      await api('/api/music-proposals/'+encodeURIComponent(id)+'/'+operation,
        {method:'POST',auth:'required',body:{}});
      const status=operation==='accept'?'accepted':operation==='reject'?'rejected':'published';
      setRemote(old=>old.map(x=>x.id===id?{...x,status}:x));
    }catch(e){setRemoteError(e instanceof Error?e.message:'Échec de l’action.');}
    finally{setInFlight(null);}
  };
  const openChat=async()=>{
    if(!project.publishedId)return;
    setChatLoading(true);setChatError('');
    try{
      const result=await api<{conversationId:string}>('/api/music/'+encodeURIComponent(project.publishedId)+
        '/conversation',{auth:'required'});
      router.push({pathname:'/chat/[id]',params:{id:result.conversationId}});
    }catch(e){setChatError(e instanceof Error?e.message:'Discussion partagée inaccessible.');}
    finally{setChatLoading(false);}
  };

  const publishSelected=async()=>{
    if(publishing)return;
    const selected=project.versions.filter(v=>v.selectedForPublication&&!v.publishedId);
    if(!rights||!selected.length){setPublishError('Sélectionne au moins une version et confirme tes droits.');return;}
    if(selected.some(v=>!v.localAudioId&&!v.audioMediaId&&!v.audioUrl)){
      setPublishError('Chaque version cochée doit contenir un mix audio final.');return;
    }
    setPublishing(true);setPublishError('');
    let rootId=project.publishedId||project.versions.find(v=>v.publishedId)?.publishedId;
    let current=[...project.versions];
    let count=0;
    try{
      let coverMediaId=project.coverMediaId;
      if(!coverMediaId && project.coverLocalId){
        const blob=await getDraftAttachment(project.coverLocalId);
        if(!blob)throw new Error('La pochette privée du morceau est introuvable.');
        const mime=blob.type;
        const ext=mime==='image/jpeg'?'jpg':mime==='image/png'?'png':'webp';
        coverMediaId=await uploadMusicCoverFile(new File([blob],project.title+'.'+ext,{type:mime}));
        patch({coverMediaId});
      } else if(!coverMediaId && project.coverUrl?.trim()){
        const response=await api<{media:{id:string}}>('/api/media/external',{
          method:'POST',auth:'required',body:{
            url:project.coverUrl.trim(),mediaType:'image',purpose:'music_cover',
            attribution:project.ownerName+' — pochette du morceau',
            sourceName:project.title,
          },
        });
        coverMediaId=response.media.id;
        patch({coverMediaId});
      }
      for(const version of selected){
        let mediaId=version.audioMediaId;
        if(version.localAudioId){
          const blob=await getDraftAudio(version.localAudioId);
          if(!blob)throw new Error('Enregistrement local de « '+version.title+' » introuvable.');
          const ext=blob.type.includes('mp4')?'m4a':blob.type.includes('mpeg')?'mp3':
            blob.type.includes('ogg')?'ogg':blob.type.includes('wav')?'wav':'webm';
          const file=new File([blob],version.title+'.'+ext,{type:blob.type||'audio/webm'});
          const uploaded=await uploadMusicAudioFile(file,'music_audio');
          mediaId=uploaded.mediaId;
        }
        const result=await api<{item:{id:string}}>('/api/music',{
          method:'POST',auth:'required',body:{
            title:project.title+(version.title==='Version originale'?'':' — '+version.title),
            songAuthor:project.ownerName,description:project.description,
            audioMediaId:mediaId||undefined,
            externalStreamUrl:mediaId?undefined:version.audioUrl,
            parentPublicationId:rootId,
            coverMediaId,
            visibility:'public',rightsConfirmed:true,
            credits:[{displayName:project.ownerName,contribution:'Création et arrangement · '+version.title}],
            rights:{originalCreatorName:project.ownerName,rightsHolderName:project.ownerName,
              licenseType:'own_work',attributionText:project.ownerName+' — '+project.title,
              adaptationsAllowed:true},
          },
        });
        if(!result.item?.id)throw new Error('Publication non confirmée.');
        if(!rootId)rootId=result.item.id;
        count++;
        current=current.map(v=>v.id===version.id?{...v,publishedId:result.item.id,
          selectedForPublication:false,audioMediaId:mediaId||v.audioMediaId}:v);
        patch({versions:current,publishedId:rootId});
      }
    }catch(e){setPublishError((count?'Déjà publiées : '+count+'. ':'')+
      (e instanceof Error?e.message:'Erreur de publication.'));}
    finally{setPublishing(false);}
  };

  return <View style={{gap:16}}>
    {/* Song identity — displayed as musical metadata, not an admin form. */}
    <View style={card}>
      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12}}>
        <Text style={{color:theme.foreground,fontSize:17,fontWeight:'700'}}>Identité musicale</Text>
        <Pressable onPress={()=>setEditInfo(!editInfo)} accessibilityLabel="Modifier les informations">
          <Ionicons name={editInfo?'checkmark-outline':'pencil-outline'} size={20} color={pink}/>
        </Pressable>
      </View>
      {!editInfo?<View style={{gap:13}}>
        <Text style={{fontSize:13,color:theme.muted,lineHeight:20}}>
          {project.description||'Ajoute quelques mots sur ton morceau, son inspiration ou l’arrangement.'}
        </Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:9}}>
          {[['Langue',project.originalLanguage||'Français'],
            ['Tempo',project.bpm?project.bpm+' BPM':'À définir'],
            ['Tonalité',project.musicalKey||'À définir'],
            ['Mesure',project.timeSignature||'4/4']].map(([key,value])=>
            <View key={key} style={{backgroundColor:theme.background,borderRadius:12,
              paddingHorizontal:12,paddingVertical:10,minWidth:110,gap:5}}>
              <Text style={{color:theme.muted,fontSize:10}}>{key}</Text>
              <Text style={{color:theme.foreground,fontSize:13,fontWeight:'700'}}>{value}</Text>
            </View>)}
        </View>
      </View>:<View style={{gap:13}}>
        {label('Titre')}
        <TextInput value={project.title} onChangeText={title=>patch({title})}
          placeholderTextColor={theme.muted} style={input}/>
        {label('Description')}
        <TextInput multiline value={project.description} onChangeText={description=>patch({description})}
          placeholder="De quoi parle ce chant ?" placeholderTextColor={theme.muted}
          style={{...input,minHeight:76}}/>
        {label('Langue originale')}
        <TextInput value={project.originalLanguage} onChangeText={originalLanguage=>patch({originalLanguage})}
          placeholder="Langue d’origine" placeholderTextColor={theme.muted} style={input}/>
        <View style={{flexDirection:'row',gap:9,flexWrap:'wrap'}}>
          <View style={{flex:1,minWidth:110,gap:5}}>
            {label('BPM')}
            <TextInput keyboardType="numeric" value={project.bpm?String(project.bpm):''}
              placeholder="Ex. 86" placeholderTextColor={theme.muted}
              onChangeText={value=>{
                const bpm=Number(value);
                if(!value.trim())patch({bpm:undefined});
                else if(Number.isInteger(bpm)&&bpm>=20&&bpm<=300)patch({bpm});
              }} style={input}/>
          </View>
          <View style={{flex:1,minWidth:150,gap:5}}>
            {label('Tonalité')}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{gap:6}}>
              {keys.map(key=><View key={key} style={{gap:4}}>
                {pill(key,()=>patch({musicalKey:key}),project.musicalKey===key)}
              </View>)}
            </ScrollView>
          </View>
        </View>
        {label('Signature rythmique')}
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
          {signatures.map(sig=><View key={sig}>
            {pill(sig,()=>patch({timeSignature:sig}),project.timeSignature===sig)}
          </View>)}
        </View>
        {label('Pochette du morceau')}
        {Platform.OS==='web'?button(savingCover?'Import en cours…':'Choisir une image',
          chooseCover,true,savingCover):null}
        {project.coverLocalId?<Text style={{color:theme.muted,fontSize:11}}>
          Pochette personnelle ajoutée · visible dans ton dossier, et publiée avec les versions sélectionnées.
        </Text>:null}
        {label('Ou adresse HTTPS de l’image')}
        <TextInput value={project.coverUrl||''} onChangeText={coverUrl=>patch({
          coverUrl,coverLocalId:undefined,coverMediaId:undefined,
        })} placeholder="https://…" placeholderTextColor={theme.muted} style={input}/>
        {coverError?<Text style={{color:'#B34D67',fontSize:12}}>{coverError}</Text>:null}
      </View>}
      {label('Instruments du morceau')}
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
        {project.instruments.map(instrument=><Pressable key={instrument}
          onPress={()=>patch({instruments:project.instruments.filter(x=>x!==instrument)})}
          style={{backgroundColor:theme.dark?'#413140':'#F9E9F0',borderRadius:9,
            paddingHorizontal:10,paddingVertical:8,flexDirection:'row',gap:7}}>
          <Text style={{color:theme.foreground,fontSize:12}}>{instrument}</Text>
          <Ionicons name="close-outline" size={15} color={pink}/>
        </Pressable>)}
        {!project.instruments.length?<Text style={{color:theme.muted,fontSize:12}}>Aucun instrument défini</Text>:null}
      </View>
      <View style={{flexDirection:'row',alignItems:'center',gap:9}}>
        <TextInput value={newInstrument} onChangeText={setNewInstrument}
          placeholder="Piano, batterie, guitare…" placeholderTextColor={theme.muted}
          style={{...input,flex:1}}/>
        <Pressable onPress={()=>{const item=newInstrument.trim();if(!item)return;
          if(!project.instruments.some(x=>x.toLowerCase()===item.toLowerCase()))
            patch({instruments:[...project.instruments,item]});
          setNewInstrument('');
        }} accessibilityLabel="Ajouter un instrument" style={{padding:10}}>
          <Ionicons name="add-circle-outline" size={27} color={pink}/>
        </Pressable>
      </View>
    </View>
    {/* Version selection and real media: nothing is publicly published by selecting a checkbox. */}
    <View style={card}>
      <Text style={{fontSize:18,fontWeight:'700',color:theme.foreground}}>Versions du morceau</Text>
      <Text style={{fontSize:12,lineHeight:20,color:theme.muted}}>
        Démo, acoustique, live, arrangement… Chaque version conserve son propre audio.
        Coche celles que tu veux publier ; ton dossier original ne sera pas remplacé.
      </Text>
      {project.versions.map((version,index)=><View key={version.id}
        style={{backgroundColor:theme.background,borderRadius:13,padding:13,gap:11,
          borderWidth:1,borderColor:theme.border}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
          <Pressable disabled={!!version.publishedId}
            accessibilityRole="checkbox" accessibilityState={{checked:version.selectedForPublication}}
            onPress={()=>updateVersion(version.id,{selectedForPublication:!version.selectedForPublication})}>
            <Ionicons name={version.publishedId?'checkmark-circle':
              version.selectedForPublication?'checkbox':'square-outline'}
              size={24} color={version.publishedId?'#2A8B59':pink}/>
          </Pressable>
          <View style={{flex:1,gap:3}}>
            <Text style={{color:theme.foreground,fontSize:14,fontWeight:'700'}}>
              {version.title||'Version '+(index+1)}
            </Text>
            <Text style={{fontSize:11,color:version.publishedId?'#2A8B59':theme.muted}}>
              {version.publishedId?'Publiée':'Brouillon · '+(version.localAudioId||version.audioMediaId||version.audioUrl?'audio joint':'audio à ajouter')}
            </Text>
          </View>
          {!version.publishedId?<Pressable accessibilityLabel="Retirer la version du dossier"
            onPress={()=>patch({versions:project.versions.filter(x=>x.id!==version.id)})}>
            <Ionicons name="close-outline" size={19} color={theme.muted}/>
          </Pressable>:<Pressable onPress={()=>router.push({pathname:'/music/[id]',
            params:{id:version.publishedId!,from:'music-tab'}})}>
            <Ionicons name="open-outline" size={19} color={pink}/>
          </Pressable>}
        </View>
        <MusicAudioPreview source={version}/>
        {!version.publishedId?<TextInput value={version.title}
          onChangeText={title=>updateVersion(version.id,{title})}
          placeholder="Nom de la version" placeholderTextColor={theme.muted}
          style={{...input,backgroundColor:theme.surface}}/>:null}
      </View>)}
      <View style={{gap:8}}>
        {label('Ajouter une version')}
        <View style={{flexDirection:'row',gap:9}}>
          <TextInput value={newVersion} onChangeText={setNewVersion}
            placeholder="Ex. Version piano-voix…" placeholderTextColor={theme.muted}
            style={{...input,flex:1}}/>
          {button('Ajouter',()=>{if(!newVersion.trim())return;
            addVersion(newVersion);setNewVersion('');},true,!newVersion.trim())}
        </View>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
          {Platform.OS==='web'?button(addingAudio?'Import en cours…':'Importer une version',
            addFile,true,addingAudio):null}
        </View>
        <MusicAudioCapture onSaved={(localId,filename)=>addVersion(
          filename.replace(/\.[^.]+$/,''),localId)}/>
        {importError?<Text style={{color:'#B34D67',fontSize:12}}>{importError}</Text>:null}
      </View>
      <View style={{borderTopWidth:1,borderColor:theme.border,paddingTop:14,gap:12}}>
        <Text style={{fontSize:14,fontWeight:'700',color:theme.foreground}}>Publication des versions</Text>
        <Pressable accessibilityRole="checkbox" accessibilityState={{checked:rights}}
          onPress={()=>setRights(!rights)} style={{flexDirection:'row',gap:10,alignItems:'flex-start'}}>
          <Ionicons name={rights?'checkbox':'square-outline'} size={21} color={pink}/>
          <Text style={{fontSize:12,lineHeight:19,color:theme.foreground,flex:1}}>
            Je confirme disposer des droits de publication sur les versions sélectionnées et leurs contributions.
          </Text>
        </Pressable>
        {button(publishing?'Publication en cours…':'Publier les versions cochées',
          ()=>{void publishSelected();},false,publishing||!rights||
            !project.versions.some(x=>x.selectedForPublication&&!x.publishedId))}
        {publishError?<Text style={{color:'#B34D67',fontSize:12}}>{publishError}</Text>:null}
        <Text style={{fontSize:11,color:theme.muted,lineHeight:19}}>
          La publication demande un mix final par version. Une sélection de pistes séparées n’est pas mixée
          automatiquement. Les autres données du dossier restent privées sur cet appareil.
        </Text>
      </View>
    </View>
    {/* Sections — these are the real navigation destinations, not loose rows. */}
    <View style={card}>
      <Text style={{fontSize:18,fontWeight:'700',color:theme.foreground}}>Structure du chant</Text>
      <Text style={{fontSize:12,lineHeight:19,color:theme.muted}}>
        Chaque partie a son propre espace : paroles, pistes, partitions, notes et discussion.
      </Text>
      {project.sections.map((section,index)=><View key={section.id}
        style={{flexDirection:'row',alignItems:'center',gap:9,paddingVertical:8,
          borderBottomWidth:1,borderColor:theme.border}}>
        <Pressable onPress={()=>selectSection(section.id)} style={{flex:1,flexDirection:'row',alignItems:'center',gap:12}}>
          <View style={{borderRadius:10,width:35,height:35,
            alignItems:'center',justifyContent:'center',
            backgroundColor:theme.dark?'#42303A':'#F9EAF0'}}>
            <Text style={{fontSize:12,color:pink,fontWeight:'700'}}>{index+1}</Text>
          </View>
          <View style={{flex:1,gap:3}}>
            <Text style={{color:theme.foreground,fontSize:14,fontWeight:'600'}}>{section.title}</Text>
            <Text style={{color:theme.muted,fontSize:10}}>
              {project.layers.filter(x=>x.sectionId===section.id).length} piste(s)
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color={pink}/>
        </Pressable>
        <Pressable accessibilityLabel="Monter la section" disabled={index===0}
          onPress={()=>{const next=[...project.sections];[next[index],next[index-1]]=[next[index-1],next[index]];
            patch({sections:next});}}>
          <Ionicons name="arrow-up-outline" size={18} color={index===0?theme.border:theme.muted}/>
        </Pressable>
        <Pressable accessibilityLabel="Descendre la section" disabled={index===project.sections.length-1}
          onPress={()=>{const next=[...project.sections];[next[index],next[index+1]]=[next[index+1],next[index]];
            patch({sections:next});}}>
          <Ionicons name="arrow-down-outline" size={18} color={index===project.sections.length-1?theme.border:theme.muted}/>
        </Pressable>
        <Pressable accessibilityLabel="Retirer la section"
          onPress={()=>patch({sections:project.sections.filter(x=>x.id!==section.id)})}>
          <Ionicons name="close-outline" size={19} color={theme.muted}/>
        </Pressable>
      </View>)}
      <View style={{flexDirection:'row',gap:8,alignItems:'center'}}>
        <TextInput value={newSection} onChangeText={setNewSection}
          placeholder="Nouveau couplet, pont, solo…" placeholderTextColor={theme.muted}
          style={{...input,flex:1}}/>
        {button('Ajouter',()=>{const title=newSection.trim();if(!title)return;
          patch({sections:[...project.sections,{id:newMusicId(),title}]});setNewSection('');},
          true,!newSection.trim())}
      </View>
    </View>
    <View style={card}>
      <Text style={{fontSize:18,fontWeight:'700',color:theme.foreground}}>Talents et styles recherchés</Text>
      <Text style={{fontSize:12,lineHeight:19,color:theme.muted}}>
        Demande une compétence précise ou propose une direction musicale pour le morceau.
      </Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
        {project.needs.map(need=><Pressable key={need.id}
          onPress={()=>patch({needs:project.needs.filter(x=>x.id!==need.id)})}
          style={{borderRadius:9,borderWidth:1,borderColor:need.kind==='talent'?pink:theme.border,
            backgroundColor:theme.dark?'#312831':'#FBEFF3',
            paddingHorizontal:11,paddingVertical:9,flexDirection:'row',alignItems:'center',gap:6}}>
          <Text style={{fontSize:12,color:theme.foreground}}>{need.label}
            {need.sourceLanguage&&need.targetLanguage?' · '+need.sourceLanguage+' → '+need.targetLanguage:''}</Text>
          <Ionicons name="close" color={pink} size={14}/>
        </Pressable>)}
      </View>
      <View style={{flexDirection:'row',gap:8}}>
        {pill('Talent',()=>setNeedType('talent'),needType==='talent')}
        {pill('Style musical',()=>setNeedType('style'),needType==='style')}
      </View>
      <TextInput value={needName} onChangeText={setNeedName}
        placeholder={needType==='talent'?'Batteur, Traducteur, Saxophoniste…':'Neo-soul, Jazz fusion…'}
        placeholderTextColor={theme.muted} style={input}/>
      {needType==='talent'?<View style={{gap:8}}>
        {label('Niveau recherché')}<TalentLevelSelector value={needLevel} onChange={setNeedLevel}/>
      </View>:null}
      {needType==='talent'&&needName.trim().toLowerCase()==='traducteur'?
        <TranslatorLanguageFields sourceLanguage={sourceLang} targetLanguage={targetLang}
          onChangeSource={setSourceLang} onChangeTarget={setTargetLang}/>:null}
      {button('Ajouter le besoin',addNeed,true,!needName.trim()||
        (needType==='talent'&&needName.trim().toLowerCase()==='traducteur'&&
          (!sourceLang.trim()||!targetLang.trim())))}
      <Text style={{color:theme.muted,fontSize:11,lineHeight:17}}>
        Ces invitations restent dans le dossier jusqu’à leur synchronisation avec JenLow.
      </Text>
    </View>
    <View style={card}>
      <Text style={{color:theme.foreground,fontSize:18,fontWeight:'700'}}>Collaborations proposées</Text>
      {project.suggestions.filter(x=>!x.sectionId).map(s=><View key={s.id}
        style={{borderBottomWidth:1,borderColor:theme.border,paddingVertical:11,gap:6}}>
        <Text style={{fontWeight:'700',fontSize:13,color:theme.foreground}}>{s.title}</Text>
        <Text style={{color:theme.muted,fontSize:12}}>{s.note}</Text>
        <Text style={{color:pink,fontSize:11}}>
          {s.status==='pending'?'En attente':s.status==='integrated'?'Retenue dans le dossier':'Archivée'}
        </Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
          {button('Retenir',()=>patch({suggestions:project.suggestions.map(x=>
            x.id===s.id?{...x,status:'integrated'}:x)}),true)}
          {button(s.status==='archived'?'Réactiver':'Archiver',()=>patch({
            suggestions:project.suggestions.map(x=>x.id===s.id?{...x,
              status:s.status==='archived'?'pending':'archived'}:x)}),true)}
        </View>
      </View>)}
      <TextInput value={suggestTitle} onChangeText={setSuggestTitle}
        placeholder="Nouvelle idée pour le morceau" placeholderTextColor={theme.muted} style={input}/>
      <TextInput value={suggestNote} onChangeText={setSuggestNote} multiline
        placeholder="Arrangement, style, retour, proposition…" placeholderTextColor={theme.muted}
        style={{...input,minHeight:70}}/>
      {button('Conserver cette idée',addIdea,true,!suggestTitle.trim()||!suggestNote.trim())}
      {project.publishedId?<View style={{borderTopWidth:1,borderColor:theme.border,paddingTop:13,gap:10}}>
        <Text style={{fontSize:15,fontWeight:'700',color:theme.foreground}}>Propositions reçues en ligne</Text>
        {remoteError?<Text style={{fontSize:12,color:'#B34D67'}}>{remoteError}</Text>:null}
        {remote.filter(x=>!(project.archivedRemoteProposals||[]).includes(x.id))
          .map(proposal=><View key={proposal.id} style={{gap:6,paddingVertical:8}}>
          <Text style={{color:theme.foreground,fontSize:13,fontWeight:'700'}}>
            {proposal.proposer?.displayName||'Musicien'} · {proposal.status}
          </Text>
          <Text style={{color:theme.muted,fontSize:12}}>{proposal.description}</Text>
          <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
            {proposal.status==='submitted'?<>
              {button('Accepter',()=>{void serverDecision(proposal.id,'accept');},false,inFlight===proposal.id)}
              {button('Refuser',()=>{void serverDecision(proposal.id,'reject');},true,inFlight===proposal.id)}
            </>:null}
            {proposal.status==='accepted'?button('Publier son mix',
              ()=>{void serverDecision(proposal.id,'publish');},false,inFlight===proposal.id):null}
            {button('Archiver',()=>patch({
              archivedRemoteProposals:[...(project.archivedRemoteProposals||[]),proposal.id]}),true)}
          </View>
        </View>)}
      </View>:null}
    </View>
    <View style={card}>
      <Text style={{fontSize:18,fontWeight:'700',color:theme.foreground}}>Discussion du chant</Text>
      <Text style={{fontSize:11,color:theme.muted,lineHeight:18}}>
        Notes privées du dossier sur cet appareil. Les collaborateurs acceptés disposent d'une discussion
        partagée distincte dès qu'une version est publiée.
      </Text>
      {project.messages.filter(msg=>!msg.sectionId).map(msg=><View key={msg.id}
        style={{borderRadius:11,padding:11,backgroundColor:theme.dark?'#332936':'#F9EAF0',gap:4}}>
        <Text style={{color:pink,fontSize:11,fontWeight:'700'}}>{msg.author}</Text>
        <Text style={{fontSize:13,color:theme.foreground,lineHeight:19}}>{msg.text}</Text>
      </View>)}
      <TextInput multiline value={note} onChangeText={setNote} style={{...input,minHeight:64}}
        placeholder="Une idée pour tout le morceau…" placeholderTextColor={theme.muted}/>
      {button('Ajouter ma note',()=>{if(!note.trim())return;patch({messages:[
        ...project.messages,{id:newMusicId(),text:note.trim(),author:user.name,
          createdAt:new Date().toISOString()}]});setNote('');},true,!note.trim())}
      {project.publishedId?button(chatLoading?'Ouverture…':'Ouvrir le chat partagé',
        ()=>{void openChat();},false,chatLoading):null}
      {chatError?<Text style={{color:'#B34D67',fontSize:12}}>{chatError}</Text>:null}
    </View>
  </View>;
}
