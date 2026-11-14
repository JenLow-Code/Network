import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '@/lib/api/client';
import { useAppTheme } from '@/theme/AppTheme';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Nav } from '@/components/navigation/Nav';

type Proposal = { id:string; description:string; status:string; trackTitle:string };
type MusicDetail = { item?: { title?:string; lyrics?:{time:number;text:string}[] } };

/** Collaboration access is checked server-side. Never treat a sent proposal as membership. */
export default function SharedMusicFolder() {
  const {id} = useLocalSearchParams<{id:string}>();
  const theme=useAppTheme();
  const [title,setTitle]=useState('Morceau partagé');
  const [conversationId,setConversationId]=useState<string|null>(null);
  const [proposals,setProposals]=useState<Proposal[]>([]);
  const [lyrics,setLyrics]=useState<{time:number;text:string}[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  useEffect(()=>{
    if(!id)return;
    let active=true;
    setLoading(true);setError('');setConversationId(null);
    void Promise.all([
      api<{conversationId:string}>('/api/music/'+encodeURIComponent(id)+'/conversation',{auth:'required'}),
      api<MusicDetail>('/api/music/'+encodeURIComponent(id),{auth:'required'}),
      api<{items:Proposal[]}>('/api/music/'+encodeURIComponent(id)+'/proposals',{auth:'required'}),
    ]).then(([chat,music,contributions])=>{
      if(!active)return;
      setConversationId(chat.conversationId);
      setTitle(music.item?.title||'Morceau partagé');
      setLyrics(music.item?.lyrics||[]);
      setProposals(contributions.items||[]);
    }).catch(e=>{if(active)setError(e instanceof Error?e.message:'Accès refusé.');})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[id]);
  const card={borderWidth:1,borderColor:theme.border,borderRadius:16,
    padding:17,backgroundColor:theme.surface,gap:11} as const;
  const go=(label:string,onPress:()=>void,outlined=false)=><Pressable onPress={onPress}
    accessibilityRole="button" style={{borderRadius:11,minHeight:44,padding:12,
      borderWidth:outlined?1:0,borderColor:'#CB245C',
      backgroundColor:outlined?'transparent':'#CB245C',justifyContent:'center',alignItems:'center'}}>
    <Text style={{color:outlined?'#CB245C':'#fff',fontWeight:'700',fontSize:13}}>{label}</Text>
  </Pressable>;
  return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
    <ScrollView style={{flex:1}} contentContainerStyle={{paddingHorizontal:20,paddingTop:12,
      paddingBottom:100,width:'100%',maxWidth:800,alignSelf:'center',gap:19}}>
      <PageHeader onBack={()=>router.replace('/music-hub')} title="Collaboration"/>
      {loading?<ActivityIndicator color="#CB245C"/>:null}
      {error?<View style={card}>
        <Text style={{color:theme.foreground,fontWeight:'700'}}>Dossier partagé indisponible</Text>
        <Text style={{color:theme.muted,fontSize:12,lineHeight:20}}>
          {error}. Une proposition envoyée ne donne pas automatiquement accès à l’espace de collaboration.
          L’auteur doit d’abord accepter la contribution.
        </Text>
      </View>:null}
      {!!conversationId&&!loading?<>
        <View style={{flexDirection:'row',gap:15,alignItems:'center'}}>
          <View style={{width:82,height:82,borderRadius:17,backgroundColor:theme.dark?'#352638':'#F7E7EF',
            alignItems:'center',justifyContent:'center'}}>
            <Ionicons name="musical-notes-outline" size={34} color="#CB245C"/>
          </View>
          <View style={{flex:1,gap:6}}>
            <Text style={{color:theme.foreground,fontSize:24,fontWeight:'700'}}>{title}</Text>
            <Text style={{color:theme.muted,fontSize:12}}>Espace de collaboration</Text>
          </View>
        </View>
        <View style={card}>
          <Text style={{color:theme.foreground,fontWeight:'700',fontSize:17}}>Discussion du morceau</Text>
          <Text style={{color:theme.muted,fontSize:12,lineHeight:19}}>
            Échange directement avec les membres de ce morceau. Le chat est enregistré dans JenLow et
            réservé aux collaborateurs autorisés.
          </Text>
          {go('Ouvrir la discussion',()=>router.push({pathname:'/chat/[id]',params:{id:conversationId}}))}
        </View>
        <View style={card}>
          <Text style={{color:theme.foreground,fontSize:17,fontWeight:'700'}}>Tes contributions</Text>
          {proposals.map(p=><View key={p.id} style={{borderBottomWidth:1,borderColor:theme.border,
            paddingBottom:11,gap:5}}>
            <Text style={{color:theme.foreground,fontSize:13}}>{p.description}</Text>
            <Text style={{color:'#CB245C',fontSize:11}}>Statut : {p.status}</Text>
          </View>)}
          {!proposals.length?<Text style={{color:theme.muted,fontSize:12}}>
            Aucune proposition visible pour le moment.
          </Text>:null}
          {id?go('Proposer une autre contribution',()=>router.push({
            pathname:'/music-proposal/[id]',params:{id},
          }),true):null}
        </View>
        {lyrics.length?<View style={card}>
          <Text style={{color:theme.foreground,fontSize:17,fontWeight:'700'}}>Paroles publiées</Text>
          <Text selectable style={{color:theme.foreground,lineHeight:25,fontSize:14}}>
            {lyrics.map(x=>x.text).join('\n')}
          </Text>
        </View>:null}
        <View style={card}>
          <Text style={{color:theme.foreground,fontSize:17,fontWeight:'700'}}>Écouter la publication</Text>
          <Text style={{color:theme.muted,fontSize:12,lineHeight:19}}>
            La cassette appartient à la présentation publique. Ici, tu restes dans ton espace de travail partagé.
          </Text>
          {id?go('Voir le morceau publié',()=>router.push({pathname:'/music/[id]',params:{id,from:'music-tab'}}),true):null}
        </View>
        <Text style={{color:theme.muted,fontSize:11,lineHeight:19}}>
          Les paroles multilingues, les pistes individuelles et la structure complète des dossiers privés
          seront partagées ici après la synchronisation de ces données sur le serveur.
        </Text>
      </>:null}
    </ScrollView>
    <Nav/>
  </SafeAreaView>;
}
