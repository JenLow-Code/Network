import React,{useEffect,useState} from 'react';
import {Pressable,Text,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {MusicAudioPreview} from './MusicAudioPreview';
import {MusicMissingTalentAction} from './MusicMissingTalentAction';
import {api} from '@/lib/api/client';
import {newMusicId} from '@/domain/musicWorkspace';
import type {MusicProject} from '@/domain/musicWorkspace';

const PINK='#CB245C';
type Props={project:MusicProject;patch:(changes:Partial<MusicProject>)=>void};
type Proposal={
  id:string;trackPublicationId:string;trackTitle:string;
  description:string;status:string;createdAt:string;
  proposer?:{displayName?:string};
};

export function MusicCollaborateExperience({project,patch}:Props){
  const theme=useAppTheme();
  const [proposals,setProposals]=useState<Proposal[]>([]);
  const [selected,setSelected]=useState('');
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
  const needs=project.needs||[];
  return <View style={{gap:18}}>
    <MusicMissingTalentAction project={project} patch={patch} primary
      editNeed={needs.find(need=>need.id===editingNeedId)||null}
      onFinished={()=>setEditingNeedId('')}/>
    {proposals.length?<View style={{gap:12}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
        <Text style={{fontSize:17,fontWeight:'700',color:theme.foreground}}>
          Propositions reçues
        </Text>
        <Text style={{fontSize:12,color:theme.muted}}>{proposals.length}</Text>
      </View>
      {proposals.map(proposal=>{
        const opened=selected===proposal.id;
        const contributor=proposal.proposer?.displayName||'Un musicien';
        return <View key={proposal.id} style={{borderTopWidth:1,borderColor:theme.border,
          paddingTop:18,gap:14}}>
          <Pressable accessibilityRole="button"
            accessibilityState={{expanded:opened}}
            onPress={()=>{void open(proposal);}}
            style={{flexDirection:'row',gap:13,alignItems:'center'}}>
            <View style={{width:45,height:45,borderRadius:23,
              justifyContent:'center',alignItems:'center',
              backgroundColor:theme.dark?'#3B2B34':'#F5E7EB'}}>
              <Ionicons name="person-outline" size={21} color={PINK}/>
            </View>
            <View style={{gap:5,flex:1}}>
              <Text style={{fontSize:14,fontWeight:'700',color:theme.foreground}}>{contributor}</Text>
              <Text numberOfLines={2} style={{fontSize:12,lineHeight:18,color:theme.muted}}>
                A proposé une variation de « {proposal.trackTitle} »
              </Text>
            </View>
            <Ionicons name={opened?'chevron-up':'chevron-down'} size={19} color={theme.muted}/>
          </Pressable>
          {proposal.description?<Text style={{fontSize:13,lineHeight:22,
            color:theme.foreground,paddingLeft:4}}>{proposal.description}</Text>:null}
          {opened?<View style={{padding:14,gap:15,
            borderWidth:1,borderColor:theme.border,borderRadius:16,
            backgroundColor:theme.surface}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
              <Ionicons name="headset-outline" size={17} color={PINK}/>
              <Text style={{fontSize:13,fontWeight:'600',color:theme.foreground}}>
                Écouter la proposition
              </Text>
            </View>
            {loading?<Text style={{fontSize:12,color:theme.muted}}>Chargement de la prise…</Text>:null}
            {audioUrl?<MusicAudioPreview source={{audioUrl}}/>:null}
            <Text style={{fontSize:11,color:theme.muted,lineHeight:19}}>
              Cette proposition reste distincte de tes versions. L’intégration sélective
              de passages nécessitera le moteur de comparaison musicale.
            </Text>
          </View>:null}
        </View>;
      })}

    </View>:null}
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
