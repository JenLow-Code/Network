import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Nav } from '@/components/navigation/Nav';
import { useAppTheme } from '@/theme/AppTheme';
import { useMusicWorkspaces, newMusicId } from '@/domain/musicWorkspace';
import { chooseMusicFile } from '@/domain/musicMedia';
import { saveDraftAudio } from '@/domain/musicLocalStorage';
import { MusicAudioCapture } from '@/components/music/MusicAudioCapture';

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
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const field={borderWidth:1,borderColor:theme.border,backgroundColor:theme.surface,
    borderRadius:11,color:theme.foreground,fontSize:14,paddingHorizontal:13,paddingVertical:11} as const;
  const chooseAudio=()=>{
    if(Platform.OS!=='web'){setError('L’import nécessite actuellement le navigateur web.');return;}
    chooseMusicFile(file=>{
      setBusy(true);setError('');
      void saveDraftAudio(file).then(localId=>{setAudioId(localId);setFileName(file.name);})
        .catch(e=>setError(e instanceof Error?e.message:'Import audio impossible.'))
        .finally(()=>setBusy(false));
    });
  };
  const save=()=>{
    if(!ready||busy||!title.trim()||!language.trim())return;
    const id=create({title,description,originalLanguage:language});
    if(!id){setError('Création impossible sur cet appareil.');return;}
    if(audioId)patch(id,{versions:[{
      id:newMusicId(),title:'Version originale',localAudioId:audioId,
      createdAt:new Date().toISOString(),selectedForPublication:false,
    }]});
    router.replace({pathname:'/music-workspace/[id]',params:{id}});
  };
  const modes:{id:StartMode;icon:keyof typeof Ionicons.glyphMap;label:string}[]=[
    {id:'blank',icon:'pencil-outline',label:'Une idée'},
    {id:'upload',icon:'cloud-upload-outline',label:'Importer'},
    {id:'record',icon:'mic-outline',label:'Enregistrer'},
  ];
  return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{
      maxWidth:730,width:'100%',alignSelf:'center',
      paddingHorizontal:compact?18:30,paddingTop:8,paddingBottom:95,gap:17}}>
      <PageHeader onBack={()=>router.replace('/music-hub')} title="Musique"/>
      <Text style={{color:theme.foreground,fontSize:compact?27:32,fontWeight:'700'}}>
        Un nouveau morceau
      </Text>
      <View style={{gap:7}}>
        <Text style={{color:theme.foreground,fontSize:12,fontWeight:'700'}}>Titre du morceau</Text>
        <TextInput autoFocus value={title} onChangeText={setTitle} maxLength={120}
          placeholder="Un titre, même provisoire…" placeholderTextColor={theme.muted} style={field}/>
      </View>
      <View style={{gap:7}}>
        <Text style={{color:theme.foreground,fontSize:12,fontWeight:'700'}}>Description</Text>
        <TextInput value={description} onChangeText={setDescription} multiline maxLength={2000}
          textAlignVertical="top" placeholder="L’idée, le sens, l’inspiration de ce chant…"
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
        <View style={{flexDirection:'row',gap:7}}>
          {modes.map(item=><Pressable key={item.id} onPress={()=>{setMode(item.id);setError('');}}
            accessibilityRole="radio" accessibilityState={{checked:mode===item.id}}
            style={{flex:1,borderWidth:1,borderColor:mode===item.id?pink:theme.border,
              borderRadius:12,minHeight:64,paddingVertical:10,paddingHorizontal:6,
              justifyContent:'center',alignItems:'center',gap:5,
              backgroundColor:mode===item.id?(theme.dark?'#412735':'#FBEAF1'):theme.surface}}>
            <Ionicons name={item.icon} size={21} color={mode===item.id?pink:theme.foreground}/>
            <Text style={{color:mode===item.id?pink:theme.foreground,fontSize:11,fontWeight:'600'}}>
              {item.label}
            </Text>
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
        {mode==='record'?<MusicAudioCapture onSaved={(id,filename)=>{setAudioId(id);setFileName(filename);}}/>:null}
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
