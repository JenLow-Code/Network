import React,{useEffect,useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import {MusicAudioPreview} from './MusicAudioPreview';
import {MusicMissingTalentAction} from './MusicMissingTalentAction';
import {api} from '@/lib/api/client';
import type {MusicProject} from '@/domain/musicWorkspace';

const pink='#CB245C';
type Proposed={id:string;trackTitle:string;trackPublicationId:string;description:string;
  status:string;createdAt:string;proposer?:{displayName?:string}};
type Props={project:MusicProject;patch:(change:Partial<MusicProject>)=>void};
export function MusicCollaborateNext({project,patch}:Props) {
  const theme=useAppTheme();
  const [items,setItems]=useState<Proposed[]>([]);
  const [opened,setOpened]=useState('');
  const [uri,setUri]=useState('');
  const [loading,setLoading]=useState('');
  const [error,setError]=useState('');
  const ids=[project.publishedId,...project.versions.map(v=>v.publishedId)]
    .filter((x):x is string=>!!x);
  const key=[...new Set(ids)].sort().join('|');
  useEffect(()=>{
    let live=true;setItems([]);setError('');
    if(!key)return;
    void api<{items:Proposed[]}>('/api/me/music-proposals?role=received',{
      auth:'required',
    }).then(data=>{if(live)setItems((data.items||[]).filter(x=>
      key.split('|').includes(x.trackPublicationId)));})
      .catch(e=>{if(live)setError(e instanceof Error?e.message:
        'Impossible de charger les contributions.');});
    return()=>{live=false;};
  },[key]);
  const open=async(item:Proposed)=>{
    if(opened===item.id){setOpened('');setUri('');return;}
    setOpened(item.id);setLoading(item.id);setUri('');setError('');
    try{
      const data=await api<{url:string|null}>('/api/music-proposals/'+
        encodeURIComponent(item.id)+'/playback',{auth:'required'});
      if(!data.url)throw Error('Cet audio ne peut pas être écouté.');
      setUri(data.url);
    }catch(e){setError(e instanceof Error?e.message:'Audio indisponible.');}
    finally{setLoading('');}
  };
  return <View style={{gap:17}}>
    <View style={{gap:5}}>
      <Text style={{fontSize:18,fontWeight:'700',color:theme.foreground}}>
        Collaborations
      </Text>
      <Text style={{fontSize:12,lineHeight:19,color:theme.muted}}>
        Écoute les propositions reçues pour tes versions publiées. Chaque contribution
        reste liée à la version dont elle est issue.
      </Text>
    </View>
    <MusicMissingTalentAction project={project} patch={patch}/>
    <View style={{gap:5}}>
      <Text style={{fontSize:15,color:theme.foreground,fontWeight:'700'}}>
        Propositions reçues
      </Text>
      <Text style={{fontSize:11,color:theme.muted}}>
        {items.length} proposition{items.length!==1?'s':''}
      </Text>
    </View>
    {!key?<View style={{padding:17,borderRadius:14,
      borderWidth:1,borderColor:theme.border,gap:7}}>
      <Ionicons name="people-outline" color={pink} size={24}/>
      <Text style={{color:theme.muted,fontSize:12,lineHeight:20}}>
        Tu pourras recevoir des propositions ici quand une version aura été partagée
        publiquement. Pour l'instant, tu peux continuer de créer librement.
      </Text>
    </View>:null}
    {!!key&&!items.length&&!error?<View style={{padding:16,
      borderWidth:1,borderColor:theme.border,borderRadius:13}}>
      <Text style={{fontSize:12,color:theme.muted}}>
        Aucune proposition reçue pour le moment.
      </Text>
    </View>:null}
    {items.map(item=><View key={item.id} style={{paddingVertical:11,gap:10,
      borderBottomWidth:1,borderColor:theme.border}}>
      <Pressable accessibilityRole="button" onPress={()=>{void open(item);}}
        accessibilityState={{expanded:opened===item.id}}
        style={{flexDirection:'row',alignItems:'center',gap:11}}>
        <View style={{width:42,height:42,backgroundColor:theme.surface,
          borderRadius:21,borderWidth:1,borderColor:theme.border,
          alignItems:'center',justifyContent:'center'}}>
          <Ionicons name="person-outline" color={pink} size={20}/>
        </View>
        <View style={{flex:1,gap:4}}>
          <Text style={{fontSize:13,fontWeight:'700',color:theme.foreground}}>
            {item.proposer?.displayName||'Un musicien'} a proposé une version
          </Text>
          <Text style={{fontSize:11,color:theme.muted}}>
            {item.trackTitle} · {item.status}
          </Text>
        </View>
        <Ionicons name={opened===item.id?'chevron-up':'chevron-down'}
          size={18} color={theme.muted}/>
      </Pressable>
      {opened===item.id?<View style={{gap:11,paddingLeft:9}}>
        <Text style={{fontSize:12,color:theme.foreground,lineHeight:20}}>
          {item.description}
        </Text>
        {loading===item.id?<Text style={{fontSize:11,color:theme.muted}}>
          Préparation de l’écoute…
        </Text>:null}
        {uri?<MusicAudioPreview source={{audioUrl:uri}}/>:null}
        <Text style={{fontSize:11,color:theme.muted,lineHeight:17}}>
          L’intégration sélective des pistes, passages et modifications sera reliée au
          nouvel atelier lors de la prochaine étape technique. Cette proposition reste
          intacte et aucune modification n’est acceptée automatiquement.
        </Text>
      </View>:null}
    </View>)}
    {error?<Text style={{color:'#B34D67',fontSize:12}}>{error}</Text>:null}
  </View>;
}
