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

type StartMode = 'blank'|'upload'|'record';
const pink = '#CB245C';
const LANGUAGES = ['Français','Português','English','Deutsch','Español','Italiano'];

export default function NewMusic() {
  const theme=useAppTheme();
  const {create,patch,ready,error:storageError}=useMusicWorkspaces();
  const {width}=useWindowDimensions();
  const compact=width<620;
  const [title,setTitle]=useState('');
  const [originalLanguage,setOriginalLanguage]=useState('Français');
  const [customLanguage,setCustomLanguage]=useState(false);
  const [mode,setMode]=useState<StartMode>('blank');
  const [fileName,setFileName]=useState('');
  const [audioId,setAudioId]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  const onSaved=(localAudioId:string,filename:string)=>{
    setAudioId(localAudioId);setFileName(filename);setError('');
  };
  const importAudio=()=>{
    if (Platform.OS!=='web') {setError('Cet import est actuellement disponible dans le navigateur.');return;}
    chooseMusicFile(file=>{
      setBusy(true);setError('');
      void saveDraftAudio(file).then(id=>onSaved(id,file.name))
        .catch(e=>setError(e instanceof Error?e.message:'Import impossible.'))
        .finally(()=>setBusy(false));
    });
  };
  const createSong=()=>{
    if(!title.trim()||!originalLanguage.trim()||!ready||busy)return;
    const id=create({title:title.trim(),originalLanguage:originalLanguage.trim()});
    if(!id){setError('Création impossible pour le moment.');return;}
    if(audioId) patch(id,{versions:[{
      id:newMusicId(),title:'Version originale',localAudioId:audioId,
      createdAt:new Date().toISOString(),selectedForPublication:false,
    }]});
    router.replace({pathname:'/music-workspace/[id]',params:{id}});
  };
  const choices:{id:StartMode;icon:keyof typeof Ionicons.glyphMap;title:string;description:string}[]=[
    {id:'blank',icon:'create-outline',title:'Partir d’une idée',description:'Paroles et structure, à ton rythme.'},
    {id:'upload',icon:'cloud-upload-outline',title:'Importer un morceau',description:'Ajoute une démo ou un mix déjà enregistré.'},
    {id:'record',icon:'mic-outline',title:'Enregistrer maintenant',description:'Commence avec ton microphone.'},
  ];
  return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{maxWidth:790,width:'100%',
      alignSelf:'center',paddingHorizontal:compact?19:29,paddingTop:14,paddingBottom:110,gap:23}}>
      <PageHeader onBack={()=>router.replace('/music-hub')} title="Musique"/>
      <View style={{gap:10}}>
        <Text style={{fontSize:compact?29:34,fontWeight:'700',color:theme.foreground}}>
          Un nouveau morceau
        </Text>
        <Text style={{fontSize:13,lineHeight:21,color:theme.muted,maxWidth:550}}>
          Tout commence par une idée. Tu peux écrire, enregistrer une prise ou importer un morceau existant.
        </Text>
      </View>
      <View style={{gap:9}}>
        <Text style={{fontSize:12,fontWeight:'700',color:theme.foreground}}>Titre du morceau</Text>
        <TextInput value={title} onChangeText={setTitle} maxLength={120}
          placeholder="Un titre, même provisoire…" placeholderTextColor={theme.muted}
          style={{backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,
            borderRadius:13,paddingHorizontal:16,paddingVertical:14,
            fontSize:16,color:theme.foreground}}/>
      </View>
      <View style={{gap:12}}>
        <Text style={{fontSize:15,fontWeight:'700',color:theme.foreground}}>Langue originale</Text>
        <Text style={{fontSize:12,color:theme.muted,lineHeight:18}}>
          C'est la langue dans laquelle le chant est écrit. Tu pourras ajouter d'autres langues et traductions ensuite.
        </Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
          {LANGUAGES.map(language=><Pressable key={language}
            onPress={()=>{setCustomLanguage(false);setOriginalLanguage(language);}}
            style={{borderRadius:10,paddingHorizontal:14,paddingVertical:11,borderWidth:1,
              borderColor:originalLanguage===language&&!customLanguage?pink:theme.border,
              backgroundColor:originalLanguage===language&&!customLanguage?
                (theme.dark?'#472C3D':'#FBE8F0'):theme.surface}}>
            <Text style={{fontSize:12,fontWeight:originalLanguage===language?'700':'400',
              color:originalLanguage===language&&!customLanguage?pink:theme.foreground}}>{language}</Text>
          </Pressable>)}
          <Pressable onPress={()=>{setCustomLanguage(true);setOriginalLanguage('');}}
            style={{borderRadius:10,paddingHorizontal:14,paddingVertical:11,borderWidth:1,
              borderColor:customLanguage?pink:theme.border,backgroundColor:theme.surface}}>
            <Text style={{fontSize:12,color:theme.foreground}}>Autre langue…</Text>
          </Pressable>
        </View>
        {customLanguage?<TextInput value={originalLanguage} onChangeText={setOriginalLanguage}
          placeholder="Langue du chant" placeholderTextColor={theme.muted}
          style={{borderRadius:10,borderWidth:1,borderColor:theme.border,
            color:theme.foreground,padding:12,fontSize:13}}/>:null}
      </View>
      <View style={{gap:13}}>
        <Text style={{fontSize:15,fontWeight:'700',color:theme.foreground}}>Comment veux-tu commencer ?</Text>
        <View style={{flexDirection:compact?'column':'row',gap:10}}>
          {choices.map(choice=><Pressable key={choice.id} accessibilityRole="button"
            accessibilityState={{selected:mode===choice.id}}
            onPress={()=>{setMode(choice.id);setError('');}}
            style={{flex:1,backgroundColor:theme.surface,borderWidth:1.5,
              borderColor:mode===choice.id?pink:theme.border,borderRadius:16,
              padding:16,minHeight:140,gap:9}}>
            <View style={{flexDirection:'row',justifyContent:'space-between'}}>
              <Ionicons name={choice.icon} size={27} color={mode===choice.id?pink:theme.foreground}/>
              <Ionicons name={mode===choice.id?'radio-button-on':'ellipse-outline'} size={19}
                color={mode===choice.id?pink:theme.muted}/>
            </View>
            <Text style={{color:theme.foreground,fontSize:14,fontWeight:'700'}}>{choice.title}</Text>
            <Text style={{color:theme.muted,fontSize:11,lineHeight:17}}>{choice.description}</Text>
          </Pressable>)}
        </View>
        {mode==='upload'?<View style={{padding:17,borderRadius:15,borderWidth:1,
          borderColor:theme.border,backgroundColor:theme.surface,gap:12}}>
          <Pressable onPress={importAudio} disabled={busy} accessibilityRole="button"
            style={{borderRadius:11,minHeight:46,padding:12,alignItems:'center',
              borderWidth:1,borderColor:pink,justifyContent:'center'}}>
            <Text style={{color:pink,fontSize:13,fontWeight:'700'}}>
              {busy?'Import en cours…':'Choisir un fichier audio'}
            </Text>
          </Pressable>
          {audioId?<Text style={{color:theme.foreground,fontSize:12}}>
            <Ionicons name="checkmark-circle-outline" size={15} color="#287D58"/> {fileName} · enregistré dans ce navigateur
          </Text>:null}
          <Text style={{fontSize:11,lineHeight:17,color:theme.muted}}>
            Le fichier est gardé en privé sur cet appareil. Rien n'est publié automatiquement.
          </Text>
        </View>:null}
        {mode==='record'?<View style={{padding:17,borderRadius:15,borderWidth:1,
          borderColor:theme.border,backgroundColor:theme.surface,gap:11}}>
          <MusicAudioCapture onSaved={onSaved}/>
          {audioId?<Text style={{color:'#287D58',fontSize:12}}>
            Prise conservée · {fileName}
          </Text>:null}
        </View>:null}
      </View>
      {storageError?<Text style={{color:'#B44F63',fontSize:12}}>{storageError}</Text>:null}
      {error?<Text style={{color:'#B44F63',fontSize:12}}>{error}</Text>:null}
      <Pressable accessibilityRole="button" disabled={!title.trim()||!originalLanguage.trim()||!ready||busy}
        onPress={createSong}
        style={{borderRadius:12,minHeight:50,paddingHorizontal:20,
          backgroundColor:title.trim()&&originalLanguage.trim()&&ready&&!busy?pink:theme.border,
          flexDirection:'row',justifyContent:'center',alignItems:'center',gap:9}}>
        {!ready?<ActivityIndicator color="#fff"/>:<>
          <Text style={{color:'#fff',fontWeight:'700',fontSize:14}}>Créer mon morceau</Text>
          <Ionicons name="arrow-forward-outline" size={18} color="#fff"/>
        </>}
      </Pressable>
      <Text style={{fontSize:11,color:theme.muted,lineHeight:18}}>
        Ton espace de travail se crée automatiquement. Tu n’as pas à choisir ou organiser un dossier technique.
      </Text>
    </ScrollView>
    <Nav/>
  </SafeAreaView>;
}
