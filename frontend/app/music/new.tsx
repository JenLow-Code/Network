import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Nav } from '@/components/navigation/Nav';
import { useAppTheme } from '@/theme/AppTheme';
import {workspaceCanvas,WORKSPACE_TITLE_GAP} from '@/theme/workspaceLayout';
import { useMusicWorkspaces, newMusicId } from '@/domain/musicWorkspace';
import { chooseMusicFile } from '@/domain/musicMedia';
import { saveDraftAudio, saveDraftAttachment } from '@/domain/musicLocalStorage';
import { fileAudioDuration } from '@/domain/musicProjectSelectors';
import { MusicAudioCapture } from '@/components/music/MusicAudioCapture';
import type { MusicAudioMarker } from '@/domain/musicWorkspace';

type StartMode='blank'|'upload'|'record';
const pink='#CB245C';
const languages=['Français','Português','English','Deutsch','Español','Italiano'];

export default function NewMusic(){
  const theme=useAppTheme();
  const {create,patch,ready,error:storageError}=useMusicWorkspaces();
  const {width}=useWindowDimensions();
  const compact=width<580;
  const [title,setTitle]=useState('');
  const [description,setDescription]=useState('');
  const [language,setLanguage]=useState('Français');
  const [showLanguages,setShowLanguages]=useState(false);
  const [otherLanguage,setOtherLanguage]=useState(false);
  const [mode,setMode]=useState<StartMode>('blank');
  const [fileName,setFileName]=useState('');
  const [audioId,setAudioId]=useState('');
  const [audioTitle,setAudioTitle]=useState('');
  const [audioDuration,setAudioDuration]=useState<number|undefined>();
  const [audioMarkers,setAudioMarkers]=useState<MusicAudioMarker[]>([]);
  const [coverLocalId,setCoverLocalId]=useState('');
  const [coverPreview,setCoverPreview]=useState('');
  const [coverBusy,setCoverBusy]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>()=>{if(coverPreview&&Platform.OS==='web')URL.revokeObjectURL(coverPreview);},[coverPreview]);
  const selectCover=()=>{
    if(Platform.OS!=='web'||typeof document==='undefined'){
      setError('La pochette peut actuellement être importée depuis la version web.');return;
    }
    const input=document.createElement('input');input.type='file';input.accept='.jpg,.jpeg,.png,.webp';
    input.onchange=()=>{
      const file=input.files?.[0];if(!file)return;
      if(file.size>8*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type)){
        setError('Choisis une image JPG, PNG ou WebP de 8 Mo maximum.');return;
      }
      setCoverBusy(true);setError('');
      void saveDraftAttachment(file).then(id=>{
        setCoverLocalId(id);setCoverPreview(URL.createObjectURL(file));
      }).catch(e=>setError(e instanceof Error?e.message:'Impossible de conserver la pochette.'))
        .finally(()=>setCoverBusy(false));
    };
    input.click();
  };
  const field={borderWidth:1,borderColor:theme.border,backgroundColor:theme.surface,
    borderRadius:11,color:theme.foreground,fontSize:14,paddingHorizontal:13,paddingVertical:11} as const;
  const chooseAudio=()=>{
    if(Platform.OS!=='web'){setError('L’import nécessite actuellement le navigateur web.');return;}
    chooseMusicFile(file=>{
      setBusy(true);setError('');
      void Promise.all([saveDraftAudio(file),fileAudioDuration(file)]).then(([localId,duration])=>{
        setAudioId(localId);setFileName(file.name);setAudioDuration(duration);setAudioMarkers([]);
         setAudioTitle(file.name.replace(/\.[^.]+$/,''));})
        .catch(e=>setError(e instanceof Error?e.message:'Import audio impossible.'))
        .finally(()=>setBusy(false));
    });
  };
  const save=()=>{
    if(!ready||busy||!title.trim()||!language.trim())return;
    const id=create({title,description,originalLanguage:language});
    if(!id){setError('Création impossible sur cet appareil.');return;}
    patch(id,{
      ...(coverLocalId?{coverLocalId}:{}),
      ...(audioId?{files:[{
        id:newMusicId(),title:audioTitle.trim()||fileName.replace(/\.[^.]+$/,'')||'Première prise',
        kind:'audio' as const,localFileId:audioId,originalFilename:fileName,
        mimeType:/\.wav$/i.test(fileName)?'audio/wav':/\.m4a$/i.test(fileName)?'audio/mp4':/\.ogg$/i.test(fileName)?'audio/ogg':'audio/webm',
        sectionIds:[],durationSeconds:audioDuration,markers:audioMarkers,createdAt:new Date().toISOString(),
      }]}:{}),
    });
    router.replace({pathname:'/music-workspace/[id]',params:{id}});
  };
  const modes:{id:StartMode;icon:keyof typeof Ionicons.glyphMap;label:string;detail:string}[]=[
    {id:'blank',icon:'create-outline',label:"Partir d'une idée",
      detail:'Paroles et structure, à ton rythme.'},
    {id:'upload',icon:'cloud-upload-outline',label:'Importer un morceau',
      detail:'Ajoute une démo ou un mix déjà enregistré.'},
    {id:'record',icon:'mic-outline',label:'Enregistrer maintenant',
      detail:'Commence avec ton microphone.'},
  ];
  return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{
      ...workspaceCanvas(width),paddingTop:12,paddingBottom:95,gap:17}}>
      <PageHeader onBack={()=>router.replace('/music-hub')} title="Musique"/>
      <Text style={{color:theme.foreground,fontSize:compact?27:32,fontWeight:'700',
        marginTop:WORKSPACE_TITLE_GAP}}>
        Un nouveau morceau
      </Text>
      <Pressable onPress={selectCover} disabled={coverBusy} accessibilityRole="button"
        accessibilityLabel={coverLocalId?'Changer la pochette':'Ajouter une pochette'}
        style={{flexDirection:'row',gap:13,alignItems:'center',paddingVertical:4}}>
        <View style={{width:92,height:92,borderRadius:16,overflow:'hidden',
          backgroundColor:theme.dark?'#3D3039':'#F5E8ED',justifyContent:'center',alignItems:'center'}}>
          {coverPreview?<Image source={{uri:coverPreview}} style={{width:'100%',height:'100%'}}
            resizeMode="cover"/>:<Ionicons name="image-outline" color={pink} size={28}/>}
        </View>
        <View style={{flex:1,gap:5}}>
          <Text style={{color:theme.foreground,fontSize:13,fontWeight:'700'}}>
            {coverLocalId?'Changer la pochette':'Ajouter une pochette'}
          </Text>
          <Text style={{color:theme.muted,fontSize:11,lineHeight:18}}>
            {coverBusy?'Enregistrement de l’image…':'Facultatif · JPG, PNG ou WebP'}
          </Text>
        </View>
        <Ionicons name="add-circle-outline" color={pink} size={22}/>
      </Pressable>
      <View style={{gap:7}}>
        <Text style={{color:theme.foreground,fontSize:12,fontWeight:'700'}}>Titre du morceau</Text>
        <TextInput autoFocus value={title} onChangeText={setTitle} maxLength={120}
          placeholder="Un titre, même provisoire…" placeholderTextColor={theme.muted} style={field}/>
      </View>
      <View style={{gap:7}}>
        <Text style={{color:theme.foreground,fontSize:12,fontWeight:'700'}}>Description</Text>
        <TextInput value={description} onChangeText={setDescription} multiline maxLength={2000}
          textAlignVertical="top" placeholder="Notes sur ce morceau (facultatif)"
          placeholderTextColor={theme.muted} style={{...field,minHeight:72}}/>
      </View>
      <View style={{gap:7}}>
        <Text style={{color:theme.foreground,fontSize:12,fontWeight:'700'}}>Langue originale</Text>
        <Pressable accessibilityRole="button" accessibilityState={{expanded:showLanguages}}
          onPress={()=>setShowLanguages(!showLanguages)}
          style={{...field,minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
          <Text style={{color:theme.foreground,fontSize:13}}>{language||'Choisir une langue'}</Text>
          <Ionicons name={showLanguages?'chevron-up':'chevron-down'} color={theme.muted} size={18}/>
        </Pressable>
        {showLanguages?<View style={{flexDirection:'row',flexWrap:'wrap',gap:7,
          backgroundColor:theme.surface,borderRadius:12,padding:10,borderWidth:1,borderColor:theme.border}}>
          {languages.map(value=><Pressable key={value}
            onPress={()=>{setLanguage(value);setOtherLanguage(false);setShowLanguages(false);}}
            style={{paddingHorizontal:12,paddingVertical:10,borderRadius:9,borderWidth:1,
              borderColor:language===value?pink:theme.border}}>
            <Text style={{color:language===value?pink:theme.foreground,fontSize:12}}>{value}</Text>
          </Pressable>)}
          <Pressable onPress={()=>{setLanguage('');setOtherLanguage(true);setShowLanguages(false);}}
            style={{padding:10,borderRadius:9,borderWidth:1,borderColor:theme.border}}>
            <Text style={{color:theme.foreground,fontSize:12}}>Autre…</Text>
          </Pressable>
        </View>:null}
        {otherLanguage?<TextInput value={language} onChangeText={setLanguage}
          placeholder="Langue du chant" placeholderTextColor={theme.muted} style={field}/>:null}
      </View>
      <View style={{gap:8}}>
        <Text style={{color:theme.foreground,fontSize:12,fontWeight:'700'}}>Commencer avec</Text>
        <View style={{gap:9}}>
          {modes.map(item=><Pressable key={item.id} onPress={()=>{setMode(item.id);setError('');}}
            accessibilityRole="radio" accessibilityState={{checked:mode===item.id}}
            style={{borderWidth:1,borderColor:mode===item.id?pink:theme.border,
              borderRadius:16,minHeight:105,paddingVertical:14,paddingHorizontal:15,
              backgroundColor:mode===item.id?theme.surface:theme.surface,gap:8}}>
            <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
              <Ionicons name={item.icon} size={25} color={mode===item.id?pink:theme.foreground}/>
              <Ionicons name={mode===item.id?'radio-button-on':'radio-button-off'} size={19}
                color={mode===item.id?pink:theme.muted}/>
            </View>
            <Text style={{color:theme.foreground,fontSize:14,fontWeight:'700'}}>{item.label}</Text>
            <Text style={{color:theme.muted,fontSize:11,lineHeight:17}}>{item.detail}</Text>
          </Pressable>)}
        </View>
        {mode==='upload'?<View style={{gap:9}}>
          <Pressable disabled={busy} onPress={chooseAudio}
            style={{minHeight:43,borderRadius:10,borderWidth:1,borderColor:pink,
              justifyContent:'center',alignItems:'center'}}>
            <Text style={{fontSize:12,fontWeight:'700',color:pink}}>
              {busy?'Import en cours…':'Choisir un fichier audio'}
            </Text>
          </Pressable>
          {audioId?<Text style={{fontSize:11,color:theme.foreground}} numberOfLines={1}>
            <Ionicons name="checkmark-circle" size={15} color="#237B56"/> {fileName}
          </Text>:null}
        </View>:null}
        {mode==='record'?<MusicAudioCapture onSaved={(id,filename,duration,_offset,markers,name)=>{
          setAudioId(id);setFileName(filename);setAudioDuration(duration);
          setAudioMarkers(markers||[]);setAudioTitle(name?.trim()||'Première prise');}}/>:null}
      </View>
      {storageError?<Text style={{fontSize:12,color:'#B34D67'}}>{storageError}</Text>:null}
      {error?<Text style={{fontSize:12,color:'#B34D67'}}>{error}</Text>:null}
      <Pressable onPress={save} disabled={!ready||busy||!title.trim()||!language.trim()}
        style={{borderRadius:11,minHeight:48,alignItems:'center',justifyContent:'center',
          backgroundColor:ready&&!busy&&title.trim()&&language.trim()?pink:theme.border,
          flexDirection:'row',gap:8}}>
        {!ready?<ActivityIndicator color="#fff"/>:
          <><Text style={{fontSize:13,fontWeight:'700',color:'#fff'}}>Créer mon morceau</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff"/></>}
      </Pressable>
    </ScrollView>
    <Nav/>
  </SafeAreaView>;
}
