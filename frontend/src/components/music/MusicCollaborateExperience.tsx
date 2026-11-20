import React,{useEffect,useState} from 'react';
import {Pressable,Text,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {router} from 'expo-router';
import {MusicCollaborationRequestCard,type CollaborationDecision,type CollaborationRequest} from './MusicCollaborationRequestCard';
import {MusicMissingTalentAction} from './MusicMissingTalentAction';
import {api} from '@/lib/api/client';
import {newMusicId} from '@/domain/musicWorkspace';
import type {MusicProject} from '@/domain/musicWorkspace';

const PINK='#CB245C';
type Props={project:MusicProject;patch:(changes:Partial<MusicProject>)=>void};
type Proposal=CollaborationRequest&{trackPublicationId:string};

export function MusicCollaborateExperience({project,patch}:Props){
  const theme=useAppTheme();
  const [proposals,setProposals]=useState<Proposal[]>([]);
  const [selected,setSelected]=useState('');
  const [demoDecision,setDemoDecision]=useState<'submitted'|'accepted'|'rejected'>('submitted');
  const [demoReview,setDemoReview]=useState<'pending'|'testing'|'archived'>('pending');
  const [demoArchiveUsed,setDemoArchiveUsed]=useState(false);
  const [demoArchiveUntil,setDemoArchiveUntil]=useState('');
  const [busyRequest,setBusyRequest]=useState('');
  const [editingNeedId,setEditingNeedId]=useState('');
  const [shareOpen,setShareOpen]=useState(false);
  const [recipient,setRecipient]=useState('');
  const [shareRole,setShareRole]=useState<'participant'|'co-owner'>('participant');
  const [audioUrl,setAudioUrl]=useState('');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const linked=[project.publishedId,...project.versions.map(v=>v.publishedId)]
    .filter((x):x is string=>!!x);
  const ids=[...new Set(linked)].sort().join('|');
  useEffect(()=>{
    let live=true;
    setProposals([]);setError('');
    if(!ids)return;
    void api<{items:Proposal[]}>('/api/me/music-proposals?role=received',{auth:'required'})
      .then(value=>{
        if(live)setProposals((value.items||[]).filter(p=>linked.includes(p.trackPublicationId)));
      })
      .catch(()=>{if(live)setError('Les propositions en ligne ne sont pas accessibles actuellement.');});
    return()=>{live=false;};
  },[ids]);
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
  const handleDemo=(action:CollaborationDecision)=>{
    if(action==='accept'||action==='reject'){
      setDemoDecision(action==='accept'?'accepted':'rejected');
    }else if(action==='test'){
      setDemoReview('testing');
    }else if(!demoArchiveUsed){
      setDemoReview('archived');setDemoArchiveUsed(true);
      setDemoArchiveUntil(new Date(Date.now()+30*24*60*60*1000).toISOString());
    }
  };
  const demoRequest:CollaborationRequest={
    id:'demo-sarah',trackTitle:'Guitare · refrain',
    proposer:{displayName:'Sarah',handle:'Sarah'},
    description:'J’ai composé une petite mélodie de guitare pour ton refrain. J’aimerais te la proposer et voir si elle trouve sa place dans ton morceau.',
    status:demoDecision,reviewState:demoReview,
    canArchive:!demoArchiveUsed,archiveUntil:demoArchiveUntil,
    createdAt:'',
  };
  const needs=project.needs||[];
  const awaiting=proposals.filter(p=>p.status==='submitted'&&p.reviewState!=='archived').length;
  const orderedProposals=[...proposals].sort((a,b)=>
    Number(b.status==='submitted'&&b.reviewState!=='archived')-
      Number(a.status==='submitted'&&a.reviewState!=='archived')||
    Number(a.reviewState==='archived')-Number(b.reviewState==='archived')||
    b.createdAt.localeCompare(a.createdAt));
  return <View style={{gap:18}}>
    {!proposals.length?<View style={{gap:10}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:9,flexWrap:'wrap'}}>
        <Text style={{fontSize:16,fontWeight:'700',color:theme.foreground}}>
          Demande de collaboration · aperçu interactif
        </Text>
        <View style={{borderRadius:7,paddingHorizontal:8,paddingVertical:5,
          backgroundColor:theme.dark?'#47343A':'#F5E5EA'}}>
          <Text style={{fontSize:10,fontWeight:'700',color:PINK}}>
            EXEMPLE · NON ENVOYÉ
          </Text>
        </View>
      </View>
      <MusicCollaborationRequestCard request={demoRequest} demo
        onProfile={()=>router.push({pathname:'/member/[name]',params:{name:'Sarah'}})}
        onListen={()=>{}}
        onAction={handleDemo}/>
      {demoDecision!=='submitted'?<Pressable
        accessibilityRole="button" accessibilityLabel="Recommencer la simulation"
        onPress={()=>{setDemoDecision('submitted');setDemoReview('pending');
          setDemoArchiveUsed(false);setDemoArchiveUntil('');}}
        style={{alignSelf:'flex-start',padding:9,flexDirection:'row',gap:6}}>
        <Ionicons name="refresh-outline" color={PINK} size={17}/>
        <Text style={{fontSize:11,color:PINK}}>Recommencer l’aperçu</Text>
      </Pressable>:null}
    </View>:null}
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
    <View style={{gap:8,paddingTop:5}}>
      <Pressable onPress={()=>setShareOpen(!shareOpen)} accessibilityRole="button"
        accessibilityState={{expanded:shareOpen}}
        style={{alignSelf:'flex-start',minHeight:42,flexDirection:'row',
          alignItems:'center',gap:9}}>
        <Ionicons name="share-social-outline" size={19} color={PINK}/>
        <Text style={{fontSize:13,fontWeight:'600',color:theme.foreground}}>
          Partager le projet avec une personne
        </Text>
        <Ionicons name={shareOpen?'chevron-up':'chevron-down'} size={16}
          color={theme.muted}/>
      </Pressable>
      {shareOpen?<View style={{gap:12,padding:13,borderRadius:13,
        borderWidth:1,borderColor:theme.border,backgroundColor:theme.surface}}>
        <Text style={{fontSize:12,color:theme.muted,lineHeight:20}}>
          Prépare une invitation pour participer au projet ou devenir copropriétaire.
        </Text>
        <TextInput value={recipient} onChangeText={setRecipient}
          placeholder="Identifiant de la personne" placeholderTextColor={theme.muted}
          style={{fontSize:13,color:theme.foreground,minHeight:44,
            borderWidth:1,borderColor:theme.border,borderRadius:10,
            paddingHorizontal:12,backgroundColor:theme.background}}/>
        <View style={{flexDirection:'row',gap:7}}>
          {([{role:'participant',title:'Participant'},
            {role:'co-owner',title:'Copropriétaire'}] as const).map(option=>
            <Pressable key={option.role} onPress={()=>setShareRole(option.role)}
              accessibilityRole="radio"
              accessibilityState={{selected:shareRole===option.role}}
              style={{flex:1,minHeight:42,alignItems:'center',
                justifyContent:'center',borderRadius:10,borderWidth:1,
                borderColor:shareRole===option.role?PINK:theme.border,
                backgroundColor:shareRole===option.role?
                  (theme.dark?'#492733':'#FAEAF0'):'transparent'}}>
              <Text style={{fontSize:12,fontWeight:'600',color:theme.foreground}}>
                {option.title}
              </Text>
            </Pressable>)}
        </View>
        <Pressable onPress={()=>{
          if(!recipient.trim())return;
          patch({shareInvitations:[...(project.shareInvitations||[]),{
            id:newMusicId(),targetHandle:recipient.trim(),role:shareRole,
            status:'local-draft',createdAt:new Date().toISOString()
          }]});
          setRecipient('');setShareOpen(false);
        }} disabled={!recipient.trim()} accessibilityRole="button"
          style={{minHeight:43,backgroundColor:PINK,borderRadius:10,
            paddingHorizontal:14,alignSelf:'flex-start',justifyContent:'center',
            opacity:recipient.trim()?1:.45}}>
          <Text style={{color:'#fff',fontWeight:'700',fontSize:12}}>
            Préparer l’invitation
          </Text>
        </Pressable>
        <Text style={{fontSize:11,lineHeight:18,color:theme.muted}}>
          Brouillon local uniquement : aucun accès n’est accordé et aucune
          invitation n’est envoyée tant que les permissions serveur ne sont pas connectées.
        </Text>
      </View>:null}
      {(project.shareInvitations||[]).map(invitation=><View key={invitation.id}
        style={{flexDirection:'row',alignItems:'center',gap:9,minHeight:40}}>
        <Ionicons name="time-outline" size={16} color={theme.muted}/>
        <View style={{flex:1,gap:3}}>
          <Text style={{fontSize:12,color:theme.foreground}}>
            {invitation.targetHandle} · {invitation.role==='co-owner'?
              'Copropriétaire':'Participant'}
          </Text>
          <Text style={{fontSize:10,color:theme.muted}}>Brouillon non envoyé</Text>
        </View>
        <Pressable onPress={()=>patch({shareInvitations:
          (project.shareInvitations||[]).filter(x=>x.id!==invitation.id)})}
          accessibilityRole="button"
          accessibilityLabel={'Supprimer le brouillon pour '+invitation.targetHandle}
          style={{width:40,height:40,alignItems:'center',justifyContent:'center'}}>
          <Ionicons name="trash-outline" size={18} color={theme.muted}/>
        </Pressable>
      </View>)}
    </View>
    {error?<Text style={{fontSize:12,lineHeight:18,color:'#B64B61'}}>{error}</Text>:null}
  </View>;
}
