import React,{useEffect,useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {MusicAudioPreview} from './MusicAudioPreview';
import {MusicMissingTalentAction} from './MusicMissingTalentAction';
import {api} from '@/lib/api/client';
import type {MusicProject} from '@/domain/musicWorkspace';
const pink='#CB245C';
type Proposal={id:string;trackPublicationId:string;trackTitle:string;
  description:string;status:string;createdAt:string;
  proposer?:{displayName?:string}};
export function MusicCollaborationV3({project,patch}:{project:MusicProject;
  patch:(change:Partial<MusicProject>)=>void}){
  const theme=useAppTheme();
  const [proposals,setProposals]=useState<Proposal[]>([]);
  const [selected,setSelected]=useState('');
  const [audio,setAudio]=useState('');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [showNeed,setShowNeed]=useState(false);
  const ids=[project.publishedId,...project.versions.map(v=>v.publishedId)]
    .filter((x):x is string=>!!x);
  const key=[...new Set(ids)].sort().join('|');
  useEffect(()=>{
    let live=true;
    if(!key){setProposals([]);return;}
    void api<{items:Proposal[]}>('/api/me/music-proposals?role=received',{
      auth:'required',
    }).then(result=>{
      if(live)setProposals((result.items||[]).filter(x=>ids.includes(x.trackPublicationId)));
    }).catch(e=>{if(live)setError(e instanceof Error?e.message:
      'Les contributions ne sont pas accessibles pour le moment.');});
    return()=>{live=false;};
  },[key]);
  const open=async(p:Proposal)=>{
    if(p.id===selected){setSelected('');setAudio('');return;}
    setSelected(p.id);setAudio('');setLoading(true);setError('');
    try{
      const result=await api<{url:string|null}>('/api/music-proposals/'+
        encodeURIComponent(p.id)+'/playback',{auth:'required'});
      if(result.url)setAudio(result.url);
      else setError('Aucun enregistrement écoutable dans cette proposition.');
    }catch(e){setError(e instanceof Error?e.message:'Impossible d’ouvrir la proposition.');}
    finally{setLoading(false);}
  };
  return <View style={{gap:20}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
      <View style={{flex:1,gap:5}}>
        <Text style={{fontSize:21,fontWeight:'700',color:theme.foreground}}>Créer ensemble</Text>
        <Text style={{fontSize:12,color:theme.muted,lineHeight:19}}>
          Les contributions restent indépendantes jusqu’à ce que tu décides de les utiliser.
        </Text>
      </View>
    </View>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',
      gap:10}}>
      <Text style={{fontSize:15,color:theme.foreground,fontWeight:'700'}}>
        Propositions reçues
      </Text>
      {proposals.length?<Text style={{fontSize:12,color:theme.muted}}>
        {proposals.length}
      </Text>:null}
    </View>
    {proposals.map(p=><View key={p.id}
      style={{borderWidth:1,borderColor:theme.border,
        backgroundColor:theme.surface,borderRadius:17,overflow:'hidden'}}>
      <Pressable onPress={()=>{void open(p);}} accessibilityRole="button"
        accessibilityState={{expanded:selected===p.id}}
        style={{paddingHorizontal:15,paddingVertical:17,
          flexDirection:'row',alignItems:'center',gap:12}}>
        <View style={{width:42,height:42,borderRadius:21,
          justifyContent:'center',alignItems:'center',
          backgroundColor:theme.dark?'#402C36':'#F9EDF1'}}>
          <Ionicons name="person-outline" size={20} color={pink}/>
        </View>
        <View style={{flex:1,gap:5}}>
          <Text style={{fontSize:13,fontWeight:'700',color:theme.foreground}}>
            {p.proposer?.displayName||'Un musicien'}
          </Text>
          <Text style={{fontSize:11,color:theme.muted}} numberOfLines={1}>
            Une proposition pour {p.trackTitle}
          </Text>
        </View>
        <Ionicons name={selected===p.id?'chevron-up':'chevron-forward'}
          size={19} color={theme.muted}/>
      </Pressable>
      {selected===p.id?<View style={{padding:16,paddingTop:0,gap:15}}>
        {p.description?<Text style={{fontSize:13,lineHeight:21,color:theme.foreground}}>
          {p.description}
        </Text>:null}
        {loading?<Text style={{fontSize:11,color:theme.muted}}>Ouverture…</Text>:null}
        {audio?<MusicAudioPreview source={{audioUrl:audio}}/>:null}
        <Text style={{fontSize:11,color:theme.muted,lineHeight:18}}>
          La comparaison musicale et l’intégration sélective nécessitent encore le moteur
          de collaboration. Rien n’est ajouté à ta version automatiquement.
        </Text>
      </View>:null}
    </View>)}
    {!proposals.length&&!error?<View style={{paddingVertical:25,gap:12,
      alignItems:'center',borderTopWidth:1,borderColor:theme.border}}>
      <Ionicons name="people-outline" size={29} color={pink}/>
      <Text style={{fontSize:13,color:theme.muted,textAlign:'center',lineHeight:20}}>
        {key?'Aucune proposition pour le moment.':
          'Les contributions apparaîtront ici lorsqu’un musicien répondra à une version partagée.'}
      </Text>
    </View>:null}
    {error?<Text style={{fontSize:12,color:'#B34D67'}}>{error}</Text>:null}
    <View style={{paddingTop:7,gap:12,borderTopWidth:1,borderColor:theme.border}}>
      <Pressable onPress={()=>setShowNeed(!showNeed)}
        accessibilityRole="button" accessibilityState={{expanded:showNeed}}
        style={{flexDirection:'row',alignItems:'center',gap:11,
          minHeight:47}}>
        <Ionicons name="person-add-outline" size={20} color={pink}/>
        <Text style={{fontSize:13,fontWeight:'600',flex:1,color:theme.foreground}}>
          Il me manque un musicien
        </Text>
        <Ionicons name={showNeed?'chevron-up':'chevron-down'}
          size={18} color={theme.muted}/>
      </Pressable>
      {showNeed?<MusicMissingTalentAction project={project} patch={patch}/>:null}
    </View>
  </View>;
}
