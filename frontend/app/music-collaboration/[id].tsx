import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { api, ApiRequestError } from '@/lib/api/client';
import { useAuth } from '@/context/AuthProvider';
import {fetchDemoMusicPreview} from '@/lib/api/musicPreview';
import { useAppTheme } from '@/theme/AppTheme';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Nav } from '@/components/navigation/Nav';
import type { MusicWorkspaceSpace } from '@/components/music/MusicWorkspaceTabs';
import { MusicWorkspaceScreen } from '@/components/music/MusicWorkspaceScreen';
import type { MusicProject, MusicProjectFile } from '@/domain/musicWorkspace';
import { useSharedMusicNavigation } from '@/domain/sharedMusicNavigation';

const PINK='#CB245C';
type Proposal = {
  id:string;description:string;status:string;trackTitle:string;
  createdAt?:string;proposer?:{displayName?:string};
};
type MusicDetail = {item?:{
  title?:string;description?:string;updatedAt?:string;
  author?:{displayName?:string};
  lyrics?:{time:number;text:string}[];
}};
type Collaborator = {
  id:string;role:'owner'|'collaborator';displayName:string;
  handle?:string|null;avatarUrl?:string|null;
};

/**
 * An accepted contributor enters the same three-space music workshop as its
 * original author, not a public cassette detail. Backend data is intentionally
 * limited to published materials and permitted proposals: the author's private
 * device-only recordings are never presented as synced or editable.
 */
/**
 * Defense in depth beyond Expo's Stack.Protected: never mount the workspace,
 * start its API requests or draw its tab navigation before a verified Supabase
 * user exists. The API may separately refuse a logged-in user until its identity
 * bridge is deployed; that is NOT equivalent to having no app login.
 */
export default function SharedMusicFolder(){
  const {initialized,user,validationError}=useAuth();
  const theme=useAppTheme();
  useEffect(()=>{
    if(initialized&&!user&&!validationError)router.replace('/login');
  },[initialized,user,validationError]);
  if(!initialized||!user)return <SafeAreaView style={{flex:1,
    backgroundColor:theme.background,alignItems:'center',justifyContent:'center'}}>
    <ActivityIndicator color={PINK}/>
  </SafeAreaView>;
  return <AuthorizedSharedMusicFolder/>;
}

type WorkspaceFailure={kind:'api_session'|'permission'|'unavailable';message:string};
function asWorkspaceFailure(e:unknown):WorkspaceFailure {
  if(e instanceof ApiRequestError){
    if(e.status===401||e.code==='not_authenticated')return {
      kind:'api_session',
      message:'Votre connexion JenLow Network est active, mais le serveur de collaboration ne reconnaît pas encore cette session. Vos droits sur le morceau n’ont donc pas pu être vérifiés.',
    };
    if(e.status===403||e.status===404)return {
      kind:'permission',
      message:'Ce morceau est introuvable ou votre compte n’a pas accès à cette collaboration.',
    };
  }
  return {kind:'unavailable',
    message:'Impossible de charger cet espace partagé actuellement. Réessayez ou revenez à Musique.'};
}

function AuthorizedSharedMusicFolder(){
  const {id,tab}=useLocalSearchParams<{id:string;tab?:MusicWorkspaceSpace}>();
  const theme=useAppTheme();
  const demoId=!!id&&/^demo-music-publication-\d{2}$/.test(id);
  const {setProject:publishNavigationProject}=useSharedMusicNavigation();
  const [music,setMusic]=useState<MusicDetail['item']>();
  const [conversationId,setConversationId]=useState<string|null>(null);
  const [proposals,setProposals]=useState<Proposal[]>([]);
  const [collaborators,setCollaborators]=useState<Collaborator[]>([]);
  const [rosterError,setRosterError]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<WorkspaceFailure|null>(null);
  const [retryCount,setRetryCount]=useState(0);
  useEffect(()=>{
    if(!id)return;
    let live=true;
    const resource=encodeURIComponent(id);
    setLoading(true);setError(null);setConversationId(null);
    setCollaborators([]);setProposals([]);setMusic(undefined);
    setRosterError(false);
    // Fictional collaboration examples are intentionally read-only, but must
    // enter the exact same Capturer / Créer / Collaborer interface as a real
    // accepted collaboration. They never receive real API permissions.
    if(demoId){
      void fetchDemoMusicPreview()
        .then(preview=>{
          if(!live)return;
          const match=preview.collaborations.find(p=>p.trackPublicationId===id);
          if(!match){setError({kind:'unavailable',
            message:'Exemple de collaboration introuvable.'});return;}
          const publication=preview.catalog.find(s=>s.id===id);
          setMusic({
            title:match.trackTitle,
            description:publication?.description||match.description,
          });
          setProposals([{
            id:match.id,status:match.status,trackTitle:match.trackTitle,
            description:match.description,proposer:match.proposer,
          }]);
          setCollaborators([
            {id:'demo-author',role:'owner',
              displayName:match.publisher.displayName},
            {id:'demo-contributor',role:'collaborator',
              displayName:match.proposer.displayName},
          ]);
        })
        .catch(()=>{if(live)setError({kind:'unavailable',
          message:'Cet exemple est temporairement indisponible.'});})
        .finally(()=>{if(live)setLoading(false);});
      return ()=>{live=false;};
    }
    void Promise.all([
      api<{conversationId:string}>('/api/music/'+resource+'/conversation',{auth:'required'}),
      api<MusicDetail>('/api/music/'+resource,{auth:'required'}),
      api<{items:Proposal[]}>('/api/music/'+resource+'/proposals',{auth:'required'}),
    ]).then(([chat,detail,contributions])=>{
      if(!live)return;
      setConversationId(chat.conversationId);
      setMusic(detail.item);
      setProposals(contributions.items||[]);
      void api<{members:Collaborator[]}>('/api/music/'+resource+'/collaborators',
        {auth:'required'})
        .then(roster=>{if(live)setCollaborators(roster.members||[]);})
        .catch(()=>{if(live)setRosterError(true);});
    }).catch(e=>{if(live)setError(asWorkspaceFailure(e));})
      .finally(()=>{if(live)setLoading(false);});
    return ()=>{live=false;};
  },[id,demoId,retryCount]);

  // A stale or unauthorized link must not leave an inaccessible project on screen.
  // The API remains the authority; never grant access or substitute another song.
  useEffect(()=>{
    if(!loading&&error?.kind==='permission')router.replace('/music-hub');
  },[loading,error?.kind]);

  // Adapt only the content returned after membership verification. No private
  // owner-device files, fake tracks, or second editable project are created.
  const project=useMemo<MusicProject|null>(()=>{
    if(!id||loading||error||(!conversationId&&!demoId)||!music)return null;
    const author=collaborators.find(person=>person.role==='owner')?.displayName||
      music.author?.displayName||'Auteur du morceau';
    const date=music.updatedAt||'';
    const files:MusicProjectFile[]=[
      ...(music.lyrics?.length?[{id:id+'-published-lyrics',kind:'lyrics' as const,title:'Paroles publiées',
        text:music.lyrics.map(part=>part.text).join('\n'),sectionIds:[],createdAt:date,editedBy:author}]:[]),
      ...proposals.filter(p=>p.status==='accepted'||p.status==='published').map(p=>({
        id:p.id,kind:'note' as const,title:p.trackTitle||'Contribution acceptée',
        text:p.description,sectionIds:[],createdAt:p.createdAt||'',editedBy:p.proposer?.displayName||'Non renseigné',
      })),
    ];
    return {id,ownerEmail:'',ownerName:author,title:music.title||'Morceau partagé',
      description:music.description||'',originalLanguage:'',instruments:[],versions:[],files,
      sections:[],lyrics:[],layers:[],needs:[],suggestions:[],messages:[],
      publishedId:demoId?undefined:id,createdAt:date,updatedAt:date};
  },[id,loading,error,conversationId,demoId,music,collaborators,proposals]);
  useEffect(()=>{
    publishNavigationProject(project);
    return()=>publishNavigationProject(null);
  },[project,publishNavigationProject]);
  if(loading||error?.kind==='permission')return <SafeAreaView style={{flex:1,
    backgroundColor:theme.background,alignItems:'center',justifyContent:'center'}}>
    <ActivityIndicator color={PINK}/>
  </SafeAreaView>;
  if(error||!project)return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
    <View style={{padding:24,gap:14}}>
      <PageHeader onBack={()=>router.replace('/music-hub')}/>
      <Text style={{fontSize:20,fontWeight:'700',color:theme.foreground}}>Espace partagé indisponible</Text>
      <Text style={{fontSize:13,lineHeight:21,color:theme.muted}}>{error?.message||'Impossible de charger le morceau.'}</Text>
      <Pressable accessibilityRole="button" onPress={()=>router.replace('/music-hub')}><Text style={{color:theme.foreground}}>Retour à Musique</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={()=>setRetryCount(n=>n+1)}><Text style={{color:PINK}}>Réessayer</Text></Pressable>
    </View><Nav/>
  </SafeAreaView>;
  return <MusicWorkspaceScreen key={project.id} project={project} tab={tab} update={()=>{}}
    shared={{members:collaborators,demo:demoId,conversationId,rosterUnavailable:rosterError}}/>;
}
