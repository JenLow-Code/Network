import React,{useEffect,useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {MusicAudioPreview} from './MusicAudioPreview';
import {MusicMissingTalentAction} from './MusicMissingTalentAction';
import {api} from '@/lib/api/client';
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
    <MusicMissingTalentAction project={project} patch={patch} primary/>
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
      {needs.map(need=><View key={need.id} style={{flexDirection:'row',alignItems:'center',
        minHeight:43,gap:11,borderBottomWidth:1,borderColor:theme.border,paddingBottom:7}}>
        <Ionicons name="person-outline" color={PINK} size={18}/>
        <View style={{flex:1,gap:3}}>
          <Text style={{fontSize:13,fontWeight:'600',color:theme.foreground}}>{need.label}</Text>
          <Text style={{fontSize:11,color:theme.muted}}>
            {need.sourceLanguage&&need.targetLanguage?
              need.sourceLanguage+' → '+need.targetLanguage+' · traduction humaine':
              need.level||'Talent recherché'}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={'Retirer le besoin '+need.label}
          onPress={()=>patch({needs:needs.filter(item=>item.id!==need.id)})}
          style={{padding:9}}>
          <Ionicons name="close-outline" color={theme.muted} size={19}/>
        </Pressable>
      </View>)}

    </View>:null}
    {error?<Text style={{fontSize:12,lineHeight:18,color:'#B64B61'}}>{error}</Text>:null}
  </View>;
}
