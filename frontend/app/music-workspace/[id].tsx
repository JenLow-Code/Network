import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import { useAppTheme } from '@/theme/AppTheme';
import { useMusicWorkspaces, newMusicId } from '@/domain/musicWorkspace';
import { MusicSongOverview } from '@/components/music/MusicSongOverview';
import { MusicSongChat } from '@/components/music/MusicSongChat';
import { api } from '@/lib/api/client';
import { MusicSectionFocus } from '@/components/music/MusicSectionFocus';
import { MusicSongMetadata } from '@/components/music/MusicSongMetadata';
import { MusicFolderCover } from '@/components/music/MusicFolderCover';

const pink='#CB245C';

/**
 * A personal song is a rounded creative workspace.
 * The public cassette belongs exclusively to /music/[id] and Discovery.
 * Song sections are navigable sub-workspaces, never just rows in a generic form.
 */
export default function MusicWorkspace(){
  const {id,sectionId:sectionFromChat}=useLocalSearchParams<{id:string;sectionId?:string}>();
  const {items,patch,ready,error}=useMusicWorkspaces();
  const theme=useAppTheme();
  const {width}=useWindowDimensions();
  const compact=width<640;
  const project=items.find(item=>item.id===id);
  const [sectionId,setSectionId]=useState(sectionFromChat||'');
  const [chatOpen,setChatOpen]=useState(false);
  const [chatReference,setChatReference]=useState('');
  const [chatError,setChatError]=useState('');
  const section=project?.sections.find(x=>x.id===sectionId);

  useEffect(()=>{
    if(!project?.sections.some(x=>x.id===sectionId) && sectionId) setSectionId('');
  },[project?.sections,sectionId]);
  useEffect(()=>{if(sectionFromChat)setSectionId(sectionFromChat);
    else setSectionId('');setChatOpen(false);},[id,sectionFromChat]);

  if(!ready)return <SafeAreaView style={{flex:1,backgroundColor:theme.background,
    alignItems:'center',justifyContent:'center'}}>
    <ActivityIndicator color={pink}/><Nav/>
  </SafeAreaView>;

  if(!project)return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
    <View style={{padding:21,gap:15}}>
      <PageHeader onBack={()=>router.replace('/music-hub')}/>
      <Text style={{color:theme.foreground,fontSize:17,fontWeight:'700'}}>Morceau introuvable</Text>
      <Text style={{color:theme.muted,fontSize:12,lineHeight:20}}>
        Les dossiers de création sont conservés localement. Ouvre le même navigateur pour retrouver ce projet.
      </Text>
      <Pressable onPress={()=>router.replace('/music-hub')}>
        <Text style={{color:pink}}>Retour à Musique</Text>
      </Pressable>
    </View><Nav/>
  </SafeAreaView>;

  const update=(change:Partial<typeof project>)=>patch(project.id,change);
  const chooseSection=(selected:string)=>{setChatOpen(false);setSectionId(selected);};
  const openSongChat=async(fromSection?:string)=>{
    if(project.publishedId){
      setChatError('');
      try {
        const result=await api<{conversationId:string}>('/api/music/'+
          encodeURIComponent(project.publishedId)+'/conversation',{auth:'required'});
        const source=project.sections.find(s=>s.id===fromSection);
        router.push({pathname:'/chat/[id]',params:{
          id:result.conversationId,
          ...(source?{sectionId:source.id,sectionTitle:source.title,projectId:project.id}:{}),
        }});
      } catch (e) {
        setChatError(e instanceof Error?e.message:'Le chat partagé est indisponible.');
      }
    } else {
      setChatReference(fromSection||'');setChatOpen(true);
    }
  };
  const newPart=()=>{
    const sectionId=newMusicId();
    update({sections:[...project.sections,{id:sectionId,title:'Nouvelle partie'}]});
    setSectionId(sectionId);
  };
  return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
    <ScrollView keyboardShouldPersistTaps="handled" style={{flex:1}}
      contentContainerStyle={{width:'100%',maxWidth:890,alignSelf:'center',
        paddingHorizontal:compact?17:30,paddingTop:12,paddingBottom:110,gap:19}}>
      <PageHeader onBack={()=>router.replace('/music-hub')} title="Atelier musical"/>
      {chatError?<Text style={{color:'#B34D67',fontSize:12}}>{chatError}</Text>:null}
      <View style={{flexDirection:'row',gap:16,alignItems:'center'}}>
        <MusicFolderCover project={project} size={compact?78:102}/>
        <View style={{flex:1,gap:7}}>
          <Text numberOfLines={2} style={{color:theme.foreground,fontSize:compact?23:29,
            lineHeight:compact?30:36,fontWeight:'700'}}>{project.title}</Text>
          {project.description?.trim()?<Text style={{color:theme.muted,fontSize:12,lineHeight:18}}
            numberOfLines={2}>{project.description}</Text>:null}
          <Text style={{fontSize:11,color:project.publishedId?pink:theme.muted}}>
            {project.publishedId?'Dossier de création · versions publiques liées':'Espace de création · privé'}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Chat du morceau"
          onPress={()=>{void openSongChat();}}
          style={{width:43,height:43,borderRadius:12,borderWidth:1,borderColor:theme.border,
            alignItems:'center',justifyContent:'center',backgroundColor:theme.surface}}>
          <Ionicons name="chatbubbles-outline" size={22} color={pink}/>
        </Pressable>
      </View>
      {error?<View style={{backgroundColor:theme.dark?'#3D292F':'#FCECEE',
        borderWidth:1,borderColor:'#E2A2B0',padding:11,borderRadius:12}}>
        <Text style={{color:theme.dark?'#F7B7C3':'#A83C55',fontSize:12}}>{error}</Text>
      </View>:null}

      <MusicSongMetadata project={project} patch={update}/>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{gap:8,paddingBottom:6}}>
        <Pressable accessibilityRole="tab" accessibilityState={{selected:!sectionId&&!chatOpen}}
          onPress={()=>{setChatOpen(false);setSectionId('');}}
          style={{minHeight:46,paddingHorizontal:16,borderRadius:13,flexDirection:'row',
            gap:8,alignItems:'center',borderWidth:1,
            borderColor:!sectionId&&!chatOpen?pink:theme.border,
            backgroundColor:!sectionId&&!chatOpen?(theme.dark?'#422938':'#F8E6EE'):theme.surface}}>
          <Ionicons name="musical-notes-outline" color={!sectionId&&!chatOpen?pink:theme.muted} size={17}/>
          <Text style={{fontSize:13,fontWeight:!sectionId&&!chatOpen?'700':'500',
            color:!sectionId&&!chatOpen?pink:theme.foreground}}>Chant entier</Text>
        </Pressable>
        {project.sections.map((part,index)=><Pressable key={part.id}
          accessibilityRole="tab" accessibilityState={{selected:sectionId===part.id}}
          onPress={()=>chooseSection(part.id)}
          style={{minHeight:46,paddingHorizontal:14,borderRadius:13,
            flexDirection:'row',gap:8,alignItems:'center',borderWidth:1,
            borderColor:sectionId===part.id?pink:theme.border,
            backgroundColor:sectionId===part.id?(theme.dark?'#422938':'#F8E6EE'):theme.surface}}>
          <Text style={{color:sectionId===part.id?pink:theme.muted,fontSize:10,fontWeight:'700'}}>
            {String(index+1).padStart(2,'0')}
          </Text>
          <Text style={{fontSize:13,color:sectionId===part.id?pink:theme.foreground,
            fontWeight:sectionId===part.id?'700':'500'}}>{part.title}</Text>
        </Pressable>)}
        <Pressable accessibilityLabel="Créer une nouvelle partie" onPress={newPart}
          style={{minWidth:46,minHeight:46,borderRadius:13,borderWidth:1,borderColor:theme.border,
            backgroundColor:theme.surface,justifyContent:'center',alignItems:'center'}}>
          <Ionicons name="add" color={pink} size={22}/>
        </Pressable>
      </ScrollView>

      {chatOpen?<MusicSongChat key={chatReference||'whole'} project={project} patch={update}
        referenceId={chatReference} openSection={chooseSection}/>:
        section?<MusicSectionFocus key={section.id} project={project} section={section}
          patch={update} onOpenChat={(source)=>{void openSongChat(source);}}/>:
        <MusicSongOverview project={project} patch={update} openSection={chooseSection}
          openChat={()=>{void openSongChat();}}/>}

    </ScrollView>
    <Nav/>
  </SafeAreaView>;
}
