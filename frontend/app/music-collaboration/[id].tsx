import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { api, ApiRequestError } from '@/lib/api/client';
import { useAuth } from '@/context/AuthProvider';
import { useAppTheme } from '@/theme/AppTheme';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Nav } from '@/components/navigation/Nav';
import type { MusicWorkspaceSpace } from '@/components/music/MusicWorkspaceTabs';
import { MusicWorkspaceScreen } from '@/components/music/MusicWorkspaceScreen';
import type { WorkspaceCollaborator, MusicWorkspaceRole } from '@/components/music/MusicCollaborateExperience';
import type { MusicProject, MusicProjectFile } from '@/domain/musicWorkspace';
import { useSharedMusicNavigation } from '@/domain/sharedMusicNavigation';

const PINK='#CB245C';
type Proposal = {
  id:string;description:string;status:string;trackTitle:string;
  createdAt?:string|null;proposer?:{displayName?:string;handle?:string;avatarUrl?:string|null};
  credits?:{displayName:string;contribution:string}[];
  contribution?:string|null;audioAsset?:string|null;mimeType?:string|null;audioUrl?:string;
};
type MusicDetail = {item?:{
  title?:string;description?:string;updatedAt?:string;
  author?:{displayName?:string;handle?:string;avatarUrl?:string|null};
  lyrics?:{time:number;text:string}[];
}};
type Collaborator = WorkspaceCollaborator;

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
  const {setProject:publishNavigationProject}=useSharedMusicNavigation();
  const [music,setMusic]=useState<MusicDetail['item']>();
  const [conversationId,setConversationId]=useState<string|null>(null);
  const [proposals,setProposals]=useState<Proposal[]>([]);
  const [collaborators,setCollaborators]=useState<Collaborator[]>([]);
  const [viewerRole,setViewerRole]=useState<MusicWorkspaceRole|null>(null);
  const [rosterError,setRosterError]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<WorkspaceFailure|null>(null);
  const [retryCount,setRetryCount]=useState(0);
  useEffect(()=>{
    if(!id)return;
    let live=true;
    const resource=encodeURIComponent(id);
    setLoading(true);setError(null);setConversationId(null);
    setCollaborators([]);setViewerRole(null);setProposals([]);setMusic(undefined);
    setRosterError(false);
    void Promise.all([
      api<{conversationId:string}>('/api/music/'+resource+'/conversation',{auth:'required'}),
      api<MusicDetail>('/api/music/'+resource,{auth:'required'}),
      api<{items:Proposal[]}>('/api/music/'+resource+'/proposals',{auth:'required'}),
    ]).then(async ([chat,detail,contributions])=>{
      if(!live)return;
      setConversationId(chat.conversationId);
      setMusic(detail.item);
      const permitted=await Promise.all((contributions.items||[]).map(async proposal=>{
        if(proposal.status!=='accepted'&&proposal.status!=='published')return proposal;
        try{
          const playback=await api<{url:string|null}>('/api/music-proposals/'+encodeURIComponent(proposal.id)+'/playback',{auth:'required'});
          return {...proposal,audioUrl:playback.url||undefined};
        }catch{return proposal;}
      }));
      if(!live)return;
      setProposals(permitted);
      void api<{members:Collaborator[]}>('/api/music/'+resource+'/collaborators',
        {auth:'required'})
        .then(roster=>{
          if(!live)return;
          const members=roster.members||[];
          setCollaborators(members);
          // The Supabase UUID is NOT the JenLow D1 user ID. Only the
          // verified Worker /me identity may be matched against the roster.
          void api<{user?:{id?:string}}>('/v1/auth/me',{auth:'required'})
            .then(me=>{
              if(!live)return;
              const membership=members.find(person=>person.id===me.user?.id);
              setViewerRole(membership?.role||null);
            })
            .catch(()=>{if(live)setViewerRole(null);});
        })
        .catch(()=>{if(live)setRosterError(true);});
    }).catch(e=>{if(live)setError(asWorkspaceFailure(e));})
      .finally(()=>{if(live)setLoading(false);});
    return ()=>{live=false;};
  },[id,retryCount]);

  // A stale or unauthorized link must not leave an inaccessible project on screen.
  // The API remains the authority; never grant access or substitute another song.
  useEffect(()=>{
    if(!loading&&error?.kind==='permission')router.replace('/music-hub');
  },[loading,error?.kind]);

  // Adapt only the content returned after membership verification. No private
  // owner-device files, fake tracks, or second editable project are created.
  const project=useMemo<MusicProject|null>(()=>{
    if(!id||loading||error||!conversationId||!music)return null;
    const author=collaborators.find(person=>person.role==='owner')?.displayName||
      music.author?.displayName||'Auteur du morceau';
    const owner=collaborators.find(person=>person.role==='owner')||music.author;
    const date=music.updatedAt||'';
    const files:MusicProjectFile[]=[
      ...(music.lyrics?.length?[{id:id+'-published-lyrics',kind:'lyrics' as const,title:'Paroles publiées',
        text:music.lyrics.map(part=>part.text).join('\n'),sectionIds:[],createdAt:date,editedBy:author,editedByHandle:owner?.handle||undefined,editedByAvatarUrl:owner?.avatarUrl||undefined,editedByDemo:false}]:[]),
      ...proposals.filter(p=>p.status==='accepted'||p.status==='published').map(p=>({
        id:p.id,kind:'audio' as const,
        title:p.contribution||p.credits?.find(c=>c.displayName===p.proposer?.displayName)?.contribution||
          p.credits?.[0]?.contribution||'Contribution audio',
        sectionIds:[],createdAt:p.createdAt||'',editedBy:p.proposer?.displayName||'Non renseigné',
        editedByHandle:p.proposer?.handle||undefined,editedByAvatarUrl:p.proposer?.avatarUrl||undefined,editedByDemo:false,
        externalUrl:p.audioUrl, 
        mimeType:p.mimeType||undefined,
      })),
    ];
    return {id,ownerEmail:'',ownerName:author,title:music.title||'Morceau partagé',
      description:music.description||'',originalLanguage:'',instruments:[],versions:[],files,
      sections:[],lyrics:[],layers:[],needs:[],suggestions:[],messages:[],
      publishedId:id,createdAt:date,updatedAt:date};
  },[id,loading,error,conversationId,music,collaborators,proposals]);
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
    shared={{members:collaborators,conversationId,viewerRole,
      rosterUnavailable:rosterError,proposals:proposals.filter(p=>p.status==='accepted'||p.status==='published')}}/>;
}
