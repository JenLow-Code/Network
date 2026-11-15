import React,{useState} from 'react';
import {Platform,Pressable,Text,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {useAppTheme} from '@/theme/AppTheme';
import {MusicAudioPreview} from './MusicAudioPreview';
import {MusicAudioCapture} from './MusicAudioCapture';
import {chooseMusicFile,uploadMusicAudioFile,uploadMusicCoverFile} from '@/domain/musicMedia';
import {getDraftAudio,getDraftAttachment,saveDraftAudio} from '@/domain/musicLocalStorage';
import {fileAudioDuration,formatMusicDuration} from '@/domain/musicProjectSelectors';
import {newMusicId} from '@/domain/musicWorkspace';
import type {MusicProject,MusicVersion} from '@/domain/musicWorkspace';
import {api} from '@/lib/api/client';
const pink='#CB245C';
type Props={project:MusicProject;patch:(changes:Partial<MusicProject>)=>void;
  focusVersionId?:string;inline?:boolean;};

export function MusicVersionsSection({project,patch,focusVersionId,inline=false}:Props){
  const theme=useAppTheme();
  const [expanded,setExpanded]=useState(inline);
  const [newVersion,setNewVersion]=useState('');
  const [recordingFor,setRecordingFor]=useState<string|null>(null);
  const [error,setError]=useState('');
  const [publishing,setPublishing]=useState(false);
  const [rights,setRights]=useState(false);
  const [busy,setBusy]=useState(false);
  const versions=project.versions||[];
  const update=(id:string,change:Partial<MusicVersion>)=>patch({
    versions:versions.map(version=>version.id===id?{...version,...change}:version)});
  const add=(title:string,localAudioId?:string,durationSeconds?:number)=>patch({
    versions:[...versions,{id:newMusicId(),title,localAudioId,durationSeconds,
      createdAt:new Date().toISOString(),selectedForPublication:false}],
  });
  const importVersion=(id?:string)=>{
    if(Platform.OS!=='web')return;
    chooseMusicFile(file=>{
      setBusy(true);setError('');
      void Promise.all([saveDraftAudio(file),fileAudioDuration(file)])
        .then(([localAudioId,durationSeconds])=>{
          if(id)update(id,{localAudioId,durationSeconds,audioMediaId:undefined,audioUrl:undefined});
          else add(file.name.replace(/\.[^.]+$/,''),localAudioId,durationSeconds);
        }).catch(e=>setError(e instanceof Error?e.message:'Import impossible.'))
        .finally(()=>setBusy(false));
    });
  };
  const publish=async()=>{
    const selected=versions.filter(v=>v.selectedForPublication&&!v.publishedId);
    if(publishing||!rights||!selected.length)return;
    if(selected.some(v=>!v.localAudioId&&!v.audioMediaId&&!v.audioUrl)){
      setError('Une version cochée ne possède pas encore de mix audio final.');return;
    }
    setPublishing(true);setError('');
    let root=project.publishedId||versions.find(v=>v.publishedId)?.publishedId;
    let current=[...versions];
    let completed=0;
    try{
      let coverMediaId=project.coverMediaId;
      if(!coverMediaId&&project.coverLocalId){
        const cover=await getDraftAttachment(project.coverLocalId);
        if(!cover)throw Error('Pochette locale introuvable.');
        const suffix=cover.type==='image/jpeg'?'jpg':cover.type==='image/png'?'png':'webp';
        coverMediaId=await uploadMusicCoverFile(new File([cover],project.title+'.'+suffix,{type:cover.type}));
        patch({coverMediaId});
      }else if(!coverMediaId&&project.coverUrl?.trim()){
        const response=await api<{media:{id:string}}>('/api/media/external',{
          method:'POST',auth:'required',body:{
            url:project.coverUrl.trim(),mediaType:'image',purpose:'music_cover',
            attribution:project.ownerName+' — '+project.title,sourceName:project.title,
          }});
        coverMediaId=response.media.id;
        patch({coverMediaId});
      }
      for(const version of selected){
        let audioMediaId=version.audioMediaId;
        if(version.localAudioId){
          const blob=await getDraftAudio(version.localAudioId);
          if(!blob)throw Error('Enregistrement introuvable : '+version.title);
          const ext=blob.type.includes('mp4')?'m4a':blob.type.includes('mpeg')?'mp3':
            blob.type.includes('ogg')?'ogg':blob.type.includes('wav')?'wav':'webm';
          audioMediaId=(await uploadMusicAudioFile(new File([blob],version.title+'.'+ext,
            {type:blob.type||'audio/webm'}))).mediaId;
        }
        const result=await api<{item:{id:string}}>('/api/music',{
          method:'POST',auth:'required',body:{
            title:project.title+(version.title==='Version originale'?'':' — '+version.title),
            description:project.description,songAuthor:project.ownerName,
            audioMediaId:audioMediaId||undefined,
            externalStreamUrl:audioMediaId?undefined:version.audioUrl,
            parentPublicationId:root,coverMediaId,visibility:'public',rightsConfirmed:true,
            credits:[{displayName:project.ownerName,contribution:'Création originale · '+version.title}],
            rights:{originalCreatorName:project.ownerName,rightsHolderName:project.ownerName,
              licenseType:'own_work',attributionText:project.ownerName+' — '+project.title,
              adaptationsAllowed:true},
          },
        });
        if(!result.item?.id)throw Error('Publication non confirmée.');
        if(!root)root=result.item.id;
        current=current.map(v=>v.id===version.id?{...v,publishedId:result.item.id,
          audioMediaId:audioMediaId||v.audioMediaId,selectedForPublication:false}:v);
        completed++;patch({versions:current,publishedId:root});
      }
    }catch(e){
      setError((completed?completed+' version(s) déjà publiées. ':'')+
        (e instanceof Error?e.message:'Publication impossible.'));
    }finally{setPublishing(false);}
  };
  const btn=(label:string,onClick:()=>void,disabled=false)=><Pressable
    disabled={disabled} onPress={onClick} accessibilityRole="button"
    style={{paddingHorizontal:13,paddingVertical:10,borderRadius:9,borderWidth:1,
      borderColor:disabled?theme.border:pink,alignSelf:'flex-start'}}>
    <Text style={{fontSize:12,fontWeight:'600',color:disabled?theme.muted:pink}}>{label}</Text>
  </Pressable>;
  const input={padding:11,borderRadius:10,backgroundColor:theme.background,color:theme.foreground,
    borderColor:theme.border,borderWidth:1,fontSize:12} as const;
  return <View style={{borderWidth:inline?0:1,borderColor:theme.border,borderRadius:inline?0:16,
    backgroundColor:theme.surface,padding:inline?0:15,gap:11}}>
    {!inline?<Pressable accessibilityRole="button" onPress={()=>setExpanded(!expanded)}
      style={{flexDirection:'row',alignItems:'center',gap:11}}>
      <Ionicons name="layers-outline" size={22} color={pink}/>
      <View style={{flex:1,gap:3}}>
        <Text style={{color:theme.foreground,fontSize:16,fontWeight:'700'}}>Versions</Text>
        <Text style={{color:theme.muted,fontSize:11}}>
          {versions.length} version(s) · {versions.filter(v=>v.publishedId).length} publiée(s)
        </Text>
      </View>
      <Ionicons name={expanded?'chevron-up':'chevron-down'} color={theme.muted} size={19}/>
    </Pressable>:null}
    {expanded?<>
      {versions.filter(v=>!focusVersionId||v.id===focusVersionId).map(version=><View key={version.id} style={{
        backgroundColor:theme.background,borderRadius:12,padding:12,gap:8}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
          <Pressable accessibilityRole="checkbox" disabled={!!version.publishedId}
            accessibilityState={{checked:!!version.publishedId||version.selectedForPublication}}
            onPress={()=>update(version.id,{selectedForPublication:!version.selectedForPublication})}>
            <Ionicons name={version.publishedId?'checkmark-circle':
              version.selectedForPublication?'checkbox':'square-outline'} size={23}
              color={version.publishedId?'#267A55':pink}/>
          </Pressable>
          <View style={{flex:1}}>
            <Text style={{fontSize:13,fontWeight:'700',color:theme.foreground}}>{version.title}</Text>
            <Text style={{fontSize:10,color:theme.muted}}>
              {version.publishedId?'Publiée':'Brouillon'} · {formatMusicDuration(version.durationSeconds)}
            </Text>
          </View>
          {version.publishedId?<Pressable onPress={()=>router.push({pathname:'/music/[id]',
            params:{id:version.publishedId!,from:'music-tab'}})}>
            <Ionicons name="open-outline" size={19} color={pink}/>
          </Pressable>:null}
        </View>
        <MusicAudioPreview source={version}/>
        {!version.publishedId?<View style={{gap:8}}>
          <TextInput value={version.title} onChangeText={title=>update(version.id,{title})}
            style={input} placeholder="Nom de version" placeholderTextColor={theme.muted}/>
          <View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}>
            {Platform.OS==='web'?btn('Joindre un mix',()=>importVersion(version.id),busy):null}
            {btn(recordingFor===version.id?'Fermer micro':'Enregistrer',
              ()=>setRecordingFor(recordingFor===version.id?null:version.id))}
            {btn('Retirer',()=>patch({versions:versions.filter(v=>v.id!==version.id)}))}
          </View>
          {recordingFor===version.id?<MusicAudioCapture onSaved={(localAudioId,_filename,durationSeconds)=>{
            update(version.id,{localAudioId,durationSeconds,audioMediaId:undefined,audioUrl:undefined});
            setRecordingFor(null);
          }}/>:null}
        </View>:null}
      </View>)}
      {!inline?<><View style={{flexDirection:'row',gap:7,alignItems:'center'}}>
        <TextInput value={newVersion} onChangeText={setNewVersion}
          placeholder="Nouvelle version…" placeholderTextColor={theme.muted}
          style={{...input,flex:1}}/>
        {btn('Ajouter',()=>{if(newVersion.trim()){add(newVersion.trim());setNewVersion('');}},
          !newVersion.trim())}
      </View>
      {Platform.OS==='web'?btn('Importer une version',()=>importVersion(),busy):null}
      </>:null}
      <Pressable accessibilityRole="checkbox" accessibilityState={{checked:rights}}
        onPress={()=>setRights(!rights)} style={{flexDirection:'row',gap:8,alignItems:'flex-start'}}>
        <Ionicons name={rights?'checkbox':'square-outline'} size={20} color={pink}/>
        <Text style={{fontSize:11,color:theme.foreground,flex:1,lineHeight:18}}>
          Je confirme disposer des droits de publication des versions sélectionnées.
        </Text>
      </Pressable>
      <Pressable onPress={()=>{void publish();}} accessibilityRole="button"
        disabled={publishing||!rights||!versions.some(v=>v.selectedForPublication&&!v.publishedId)}
        style={{padding:12,borderRadius:10,backgroundColor:pink,alignItems:'center',
          opacity:publishing||!rights?0.55:1}}>
        <Text style={{color:'#fff',fontSize:12,fontWeight:'700'}}>
          {publishing?'Publication…':'Publier les versions cochées'}
        </Text>
      </Pressable>
      {error?<Text style={{color:'#B34D67',fontSize:12}}>{error}</Text>:null}
      <Text style={{fontSize:10,color:theme.muted,lineHeight:16}}>
        Il faut un mix final par version. Les pistes seules ne sont pas mixées automatiquement.
      </Text>
    </>:null}
  </View>;
}
