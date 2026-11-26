import React,{useEffect,useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {router} from 'expo-router';
import {MusicCollaborationRequestCard,type CollaborationDecision,type CollaborationRequest} from './MusicCollaborationRequestCard';
import {MusicMissingTalentAction} from './MusicMissingTalentAction';
import {api} from '@/lib/api/client';
import type {MusicProject} from '@/domain/musicWorkspace';
import {MusicMemberLink} from './MusicMemberLink';

const PINK='#CB245C';
type Props={project:MusicProject;patch:(changes:Partial<MusicProject>)=>void;
  shared?:SharedWorkspaceAccess};
export type MusicWorkspaceRole='owner'|'co-owner'|'active'|'passive'|'collaborator';
export const musicWorkspaceRoleLabel=(role:MusicWorkspaceRole):string=>({
  owner:'Propriétaire',
  'co-owner':'Co-propriétaire',
  active:'Participant actif',
  passive:'Participant passif',
  collaborator:'Collaborateur',
})[role];
export type SharedWorkspaceAccess={members:WorkspaceCollaborator[];conversationId?:string|null;rosterUnavailable?:boolean;
  viewerRole?:MusicWorkspaceRole|null;
  proposals?:{id:string;description:string;status:string;createdAt?:string|null;proposer?:{displayName?:string}}[]};
type Proposal=CollaborationRequest&{trackPublicationId:string};
export type WorkspaceCollaborator={id:string;role:MusicWorkspaceRole;
  displayName:string;handle?:string|null;avatarUrl?:string|null};

export function MusicCollaborateExperience({project,patch,shared}:Props){
  const theme=useAppTheme();
  const [proposals,setProposals]=useState<Proposal[]>([]);
  const [fetchedCollaborators,setCollaborators]=useState<WorkspaceCollaborator[]>([]);
  const collaborators=shared?shared.members:fetchedCollaborators;
  const [rosterUnavailable,setRosterUnavailable]=useState(false);
  const [selected,setSelected]=useState('');
  const [busyRequest,setBusyRequest]=useState('');
  const [editingNeedId,setEditingNeedId]=useState('');
  const [audioUrl,setAudioUrl]=useState('');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const linked=[project.publishedId,...project.versions.map(v=>v.publishedId)]
    .filter((x):x is string=>!!x);
  const ids=[...new Set(linked)].sort().join('|');
  const firstPublication=linked[0];
  useEffect(()=>{
    let live=true;
    setCollaborators([]);setRosterUnavailable(false);
    if(shared||!firstPublication)return;
    void api<{members:WorkspaceCollaborator[]}>('/api/music/'+
      encodeURIComponent(firstPublication)+'/collaborators',{auth:'required'})
      .then(answer=>{if(live)setCollaborators(answer.members||[]);})
      .catch(()=>{if(live)setRosterUnavailable(true);});
    return()=>{live=false;};
  },[firstPublication,!!shared]);
  useEffect(()=>{
    let live=true;
    setProposals([]);setError('');
    if(shared||!ids)return;
    void api<{items:Proposal[]}>('/api/me/music-proposals?role=received',{auth:'required'})
      .then(value=>{
        if(live)setProposals((value.items||[]).filter(p=>linked.includes(p.trackPublicationId)));
      })
      .catch(()=>{if(live)setError('Les propositions en ligne ne sont pas accessibles actuellement.');});
    return()=>{live=false;};
  },[ids,!!shared]);
  const open=async(p:Proposal)=>{
    if(p.id===selected){setSelected('');setAudioUrl('');return;}
    setSelected(p.id);setAudioUrl('');setLoading(true);setError('');
    try{
      const answer=await api<{url:string|null}>('/api/music-proposals/'+
        encodeURIComponent(p.id)+'/playback',{auth:'required'});
      if(answer.url)setAudioUrl(answer.url);
      else setError('Aucun enregistrement joint à cette proposition.');
    }catch{setError('Impossible de charger la proposition pour cette session.');}
    finally{setLoading(false);}
  };
  const decide=async(proposal:Proposal,action:CollaborationDecision)=>{
    if(busyRequest)return;
    setBusyRequest(proposal.id);setError('');
    try{
      const route=action==='test'||action==='archive'?'review':
        action==='accept'?'accept':'reject';
      const result=await api<{proposal:{
        id:string;status:string;reviewState?:string;archiveUntil?:string|null;
        canArchive?:boolean;}}>(
          '/api/music-proposals/'+encodeURIComponent(proposal.id)+'/'+route,{
            auth:'required',method:'POST',
            body:route==='review'?{action}: {},
          });
      setProposals(items=>items.map(item=>item.id===proposal.id?{
        ...item,status:result.proposal.status,
        reviewState:result.proposal.reviewState??item.reviewState,
        archiveUntil:result.proposal.archiveUntil??item.archiveUntil,
        canArchive:result.proposal.canArchive??item.canArchive,
      }:item));
      if(action==='test'&&selected!==proposal.id)await open(proposal);
    }catch(e){
      setError(e instanceof Error?e.message:'Impossible de traiter cette demande.');
    }finally{setBusyRequest('');}
  };
  const needs=project.needs||[];
  const awaiting=proposals.filter(p=>p.status==='submitted'&&p.reviewState!=='archived').length;
  const orderedProposals=[...proposals].sort((a,b)=>
    Number(b.status==='submitted'&&b.reviewState!=='archived')-
      Number(a.status==='submitted'&&a.reviewState!=='archived')||
    Number(a.reviewState==='archived')-Number(b.reviewState==='archived')||
    b.createdAt.localeCompare(a.createdAt));
  return <View style={{gap:18}}>
    <View style={{gap:11}}>
      <View style={{flexDirection:'row',alignItems:'baseline',gap:9}}>
        <Text style={{fontSize:17,fontWeight:'700',color:theme.foreground}}>
          Collaborateurs
        </Text>
        <Text style={{fontSize:12,color:theme.muted}}>
          {collaborators.length}
        </Text>
      </View>
      {collaborators.map(person=><View key={person.id} style={{minHeight:50,borderBottomWidth:1,borderColor:theme.border,justifyContent:'center'}}>
        <MusicMemberLink size={36} person={{displayName:person.displayName,handle:person.handle,avatarUrl:person.avatarUrl,self:false}} subtitle={person.role==='owner'?'Auteur du morceau':musicWorkspaceRoleLabel(person.role)}/>
      </View>)}
      {(shared?.rosterUnavailable||rosterUnavailable)?<Text style={{fontSize:11,color:theme.muted}}>
        Liste complète indisponible jusqu’à la mise à jour de l’API.
      </Text>:null}
    </View>
    {shared? <>{shared.proposals?.length?<View style={{gap:10}}>
      <Text style={{fontSize:17,fontWeight:'700',color:theme.foreground}}>Contributions acceptées</Text>
      {shared.proposals.map(proposal=><View key={proposal.id} style={{gap:5,paddingVertical:9,borderBottomWidth:1,borderColor:theme.border}}>
        <Text style={{fontSize:13,fontWeight:'700',color:theme.foreground}}>{proposal.proposer?.displayName||'Collaborateur'}</Text>
        <Text style={{fontSize:12,color:theme.foreground}}>{proposal.description}</Text>
        {proposal.createdAt?<Text style={{fontSize:11,color:theme.muted}}>{new Date(proposal.createdAt).toLocaleDateString('fr-FR')}</Text>:null}
      </View>)}
    </View>:null}{shared.conversationId?<Pressable accessibilityRole="button" onPress={()=>router.push({pathname:'/chat/[id]',params:{id:shared.conversationId!}})} style={{alignSelf:'flex-start',paddingVertical:10}}><Text style={{fontSize:13,fontWeight:'700',color:PINK}}>Ouvrir la discussion du morceau</Text></Pressable>:null}</>:<>
    {!proposals.length&&!error?<Text style={{fontSize:12,color:theme.muted}}>Aucune demande de collaboration reçue.</Text>:null}
    {proposals.length?<View style={{gap:12}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
        <Text style={{fontSize:17,fontWeight:'700',color:theme.foreground}}>
          Demandes reçues
        </Text>
        {awaiting>0?<View style={{borderRadius:9,paddingHorizontal:8,
          paddingVertical:5,backgroundColor:theme.dark?'#4A2D39':'#FAE7EF'}}>
          <Text style={{fontSize:11,fontWeight:'700',color:PINK}}>
            {awaiting} en attente de réponse
          </Text>
        </View>:<Text style={{fontSize:12,color:theme.muted}}>
          {proposals.length}
        </Text>}
      </View>
      {orderedProposals.map(proposal=>
        <MusicCollaborationRequestCard key={proposal.id}
          request={proposal}
          audioOpen={selected===proposal.id}
          audioUrl={selected===proposal.id?audioUrl:''}
          loading={selected===proposal.id&&loading}
          busy={busyRequest===proposal.id}
          onListen={()=>{void open(proposal);}}
          onAction={action=>{void decide(proposal,action);}}
          onProfile={()=>{
            if(proposal.proposer?.handle)router.push({
              pathname:'/member/[name]',
              params:{name:proposal.proposer.handle},
            });
          }}/>
      )}
    </View>:null}
    <MusicMissingTalentAction project={project} patch={patch} primary
      editNeed={needs.find(need=>need.id===editingNeedId)||null}
      onFinished={()=>setEditingNeedId('')}/>
    {needs.length?<View style={{gap:12,paddingTop:4}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
        <Text style={{fontSize:15,fontWeight:'700',color:theme.foreground}}>
          Talents recherchés
        </Text>
        <Text style={{fontSize:12,color:theme.muted}}>{needs.length}</Text>
      </View>
      {needs.map(need=><View key={need.id}
        style={{borderBottomWidth:1,borderColor:theme.border,paddingVertical:11,
          gap:7}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
          <Ionicons name="person-outline" color={PINK} size={18}/>
          <View style={{flex:1,gap:4}}>
            <Text style={{fontSize:13,fontWeight:'700',color:theme.foreground}}>
              {need.label}
            </Text>
            <Text style={{fontSize:11,color:theme.muted}}>
              {need.level||'Talent recherché'} · {
                need.audience==='public'?'Public · à diffuser':
                need.audience==='contacts'?'Contacts · à diffuser':
                need.audience==='direct'?'Destinataire · en attente':
                'Privé'}
            </Text>
          </View>
          <Pressable accessibilityRole="button"
            accessibilityLabel={'Modifier '+need.label}
            onPress={()=>setEditingNeedId(need.id)}
            style={{width:42,height:42,alignItems:'center',justifyContent:'center'}}>
            <Ionicons name="create-outline" color={PINK} size={19}/>
          </Pressable>
          <Pressable accessibilityRole="button"
            accessibilityLabel={'Retirer '+need.label}
            onPress={()=>patch({needs:needs.filter(item=>item.id!==need.id)})}
            style={{width:40,height:40,alignItems:'center',justifyContent:'center'}}>
            <Ionicons name="trash-outline" color={theme.muted} size={18}/>
          </Pressable>
        </View>
        {need.description?<Text style={{fontSize:12,lineHeight:19,
          color:theme.foreground,paddingLeft:28}}>
          {need.description}
        </Text>:null}
        {need.referenceFileIds?.length?<View style={{flexDirection:'row',
          gap:7,flexWrap:'wrap',paddingLeft:28}}>
          {need.referenceFileIds.map(id=>{
            const file=project.files.find(source=>source.id===id);
            return file?<View key={id} style={{flexDirection:'row',alignItems:'center',
              gap:4,paddingHorizontal:8,paddingVertical:6,
              borderRadius:9,backgroundColor:theme.surface}}>
              <Ionicons name="attach-outline" color={PINK} size={15}/>
              <Text numberOfLines={1} style={{fontSize:11,color:theme.muted,
                maxWidth:170}}>{file.title}</Text>
            </View>:null;
          })}
        </View>:null}
      </View>)}

    </View>:null}
    <View style={{gap:8,paddingTop:5}}><Text style={{fontSize:12,color:theme.muted}}>Les invitations à ce projet seront disponibles lorsque le service serveur sera connecté.</Text></View>
    {error?<Text style={{fontSize:12,lineHeight:18,color:'#B64B61'}}>{error}</Text>:null}
    </>}
  </View>;
}
