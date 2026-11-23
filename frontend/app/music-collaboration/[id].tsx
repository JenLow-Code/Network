import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { api } from '@/lib/api/client';
import {fetchDemoMusicPreview} from '@/lib/api/musicPreview';
import { useAppTheme } from '@/theme/AppTheme';
import { workspaceLayout, PAGE_TITLE_FONT_SIZE, PAGE_TITLE_LINE_HEIGHT } from '@/theme/workspaceLayout';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Nav } from '@/components/navigation/Nav';
import { MusicWorkspaceTabs, type MusicWorkspaceSpace } from '@/components/music/MusicWorkspaceTabs';

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
const displayDate=(value?:string)=> {
  if(!value)return '—';
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'—':
    date.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'});
};

/**
 * An accepted contributor enters the same three-space music workshop as its
 * original author, not a public cassette detail. Backend data is intentionally
 * limited to published materials and permitted proposals: the author's private
 * device-only recordings are never presented as synced or editable.
 */
export default function SharedMusicFolder(){
  const {id,tab}=useLocalSearchParams<{id:string;tab?:MusicWorkspaceSpace}>();
  const theme=useAppTheme();
  const demoId=!!id&&/^demo-music-publication-\\d{2}$/.test(id);
  const {width}=useWindowDimensions();
  const ws=workspaceLayout(width);
  const compact=width<600;
  const desktop=Platform.OS==='web'&&ws.desktop;
  const [space,setSpace]=useState<MusicWorkspaceSpace>(
    tab==='create'||tab==='collaborate'?tab:'capture');
  const [music,setMusic]=useState<MusicDetail['item']>();
  const [conversationId,setConversationId]=useState<string|null>(null);
  const [proposals,setProposals]=useState<Proposal[]>([]);
  const [collaborators,setCollaborators]=useState<Collaborator[]>([]);
  const [rosterError,setRosterError]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  useEffect(()=>{
    if(tab==='capture'||tab==='create'||tab==='collaborate')setSpace(tab);
  },[tab]);
  useEffect(()=>{
    if(!id)return;
    let live=true;
    const resource=encodeURIComponent(id);
    setLoading(true);setError('');setConversationId(null);
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
          if(!match){setError('Exemple de collaboration introuvable.');return;}
          const publication=preview.songs.find(s=>s.id===id);
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
        .catch(()=>{if(live)setError('Cet exemple est temporairement indisponible.');})
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
    }).catch(e=>{if(live)setError(e instanceof Error?e.message:'Accès refusé.');})
      .finally(()=>{if(live)setLoading(false);});
    return ()=>{live=false;};
  },[id,demoId]);

  const title=music?.title||'Morceau partagé';
  const author=collaborators.find(person=>person.role==='owner')?.displayName||
    music?.author?.displayName||'Auteur du morceau';
  const accepted=proposals.filter(p=>p.status==='accepted'||p.status==='published');
  const header=<View style={{gap:4}}>
    <Text style={{fontSize:PAGE_TITLE_FONT_SIZE,lineHeight:PAGE_TITLE_LINE_HEIGHT,
      fontWeight:'700',color:theme.foreground}} numberOfLines={2}>{title}</Text>
    <Text style={{fontSize:12,color:theme.muted}}>Espace de travail partagé · {author}</Text>
  </View>;
  const section=(children:React.ReactNode)=><View style={{
    backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,
    borderRadius:14,padding:compact?13:18,gap:12,
  }}>{children}</View>;
  const heading=(label:string)=><Text style={{
    fontSize:17,fontWeight:'700',color:theme.foreground,
  }}>{label}</Text>;
  const button=(label:string,onPress:()=>void,outline=false)=>
    <Pressable onPress={onPress} accessibilityRole="button"
      style={{alignSelf:'flex-start',minHeight:43,flexDirection:'row',
        alignItems:'center',paddingHorizontal:15,borderRadius:10,borderWidth:outline?1:0,
        borderColor:PINK,backgroundColor:outline?'transparent':PINK}}>
      <Text style={{color:outline?PINK:'#FFFFFF',fontSize:12,fontWeight:'700'}}>
        {label}
      </Text>
    </Pressable>;
  const captureRows=[
    ...(music?.lyrics?.length ? [{
      id:'published-lyrics',name:'Paroles publiées',
      editor:author,date:displayDate(music.updatedAt),
      detail:music.lyrics.map(part=>part.text).join('\n'),
    }]:[]),
    ...accepted.map(p=>({
      id:p.id,name:p.description||'Proposition acceptée',
      editor:p.proposer?.displayName||'Non renseigné',
      date:displayDate(p.createdAt),detail:'',
    })),
  ];
  const openPublication=()=>router.push({pathname:'/music/[id]',
    params:{id:id!,from:'music-tab'}});
  const propose=()=>router.push({pathname:'/music-proposal/[id]',
    params:{id:id!}});
  return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{
      width:'100%',maxWidth:ws.maxWidth,alignSelf:'center',
      paddingHorizontal:ws.gutter,paddingTop:12,
      paddingBottom:desktop?56:120,gap:compact?18:desktop?20:25,
    }}>
      <PageHeader onBack={()=>router.replace('/music-hub')} center={
        <MusicWorkspaceTabs space={space} desktop={desktop} compact={compact}
          onChange={next=>{
            setSpace(next);
            router.replace({pathname:'/music-collaboration/[id]',
              params:{id:id!,tab:next}});
          }}/>
      }/>
      {loading?<ActivityIndicator color={PINK}/>:null}
      {!!error?section(<>
        {heading('Espace partagé indisponible')}
        <Text style={{color:theme.muted,fontSize:12,lineHeight:19}}>
          {error}. Une candidature ne donne pas accès au projet avant acceptation
          de son auteur.
        </Text>
      </>):null}
      {(!!conversationId||demoId)&&!loading&&!error?<>
        {header}
        {demoId?<Text style={{fontSize:11,color:theme.muted}}>
          Exemple de collaboration · données fictives, aucune action réelle
        </Text>:null}
        {space==='capture'?<>
          {section(<>
            <View style={{flexDirection:'row',alignItems:'baseline',gap:8}}>
              {heading('Capturer')}
              <Text style={{fontSize:12,color:theme.muted}}>{captureRows.length}</Text>
            </View>
            <Text style={{fontSize:12,color:theme.muted,lineHeight:19}}>
              Ressources disponibles dans cet espace partagé, avec leur attribution.
            </Text>
            {captureRows.length>0?<View style={{gap:0}}>
              {desktop?<View style={{flexDirection:'row',gap:12,
                paddingVertical:9,borderBottomWidth:1,borderColor:theme.border}}>
                <Text style={{flex:1,color:theme.muted,fontSize:11}}>Élément</Text>
                <Text style={{width:115,color:theme.muted,fontSize:11}}>Date</Text>
                <Text style={{width:150,color:theme.muted,fontSize:11}}>Modifié par</Text>
              </View>:null}
              {captureRows.map(row=><View key={row.id} style={{
                gap:7,paddingVertical:13,borderBottomWidth:1,
                borderColor:theme.border,
              }}>
                <View style={{flexDirection:desktop?'row':'column',
                  gap:desktop?12:4,alignItems:desktop?'center':'stretch'}}>
                  <Text numberOfLines={2} style={{flex:desktop?1:undefined,
                    fontSize:13,fontWeight:'600',color:theme.foreground}}>
                    {row.name}
                  </Text>
                  <Text style={{width:desktop?115:undefined,fontSize:11,
                    color:theme.muted}}>{row.date}</Text>
                  <Text numberOfLines={1} style={{width:desktop?150:undefined,
                    fontSize:11,color:theme.foreground}}>
                    {compact?'Modifié par · ':''}{row.editor}
                  </Text>
                </View>
                {!!row.detail?<Text selectable style={{
                  fontSize:13,lineHeight:22,color:theme.muted,marginTop:2,
                }}>{row.detail}</Text>:null}
              </View>)}
            </View>:<Text style={{fontSize:12,color:theme.muted}}>
              Aucun élément partagé pour le moment.
            </Text>}
          </>)}
          <Text style={{fontSize:11,lineHeight:18,color:theme.muted}}>
            Les enregistrements et brouillons conservés uniquement sur l’appareil
            de l’auteur ne sont pas encore synchronisés avec le dossier partagé.
          </Text>
        </>:null}
        {space==='create'?<>
          {section(<>
            {heading('Créer')}
            <Text style={{fontSize:13,lineHeight:21,color:theme.foreground}}>
              {music?.description||'Construis ta contribution à ce morceau avec les autres musiciens.'}
            </Text>
            <Text style={{fontSize:12,lineHeight:20,color:theme.muted}}>
              Les pistes et versions de travail privées ne sont pas encore
              synchronisées dans un éditeur multipiste commun. Tu peux déjà
              soumettre une contribution à l’auteur.
            </Text>
            {demoId?<Text style={{fontSize:12,color:theme.muted}}>
              Dans un vrai projet, les contributeurs peuvent proposer leurs prises
              et travailler avec l’auteur depuis cet espace.
            </Text>:button('Proposer une contribution',propose)}
          </>)}
          {accepted.length?section(<>
            {heading('Contributions acceptées')}
            {accepted.map(p=><View key={p.id} style={{
              paddingVertical:8,borderBottomWidth:1,borderColor:theme.border,gap:4,
            }}>
              <Text style={{color:theme.foreground,fontSize:13}}>{p.description}</Text>
              <Text style={{color:PINK,fontSize:11}}>
                {p.status==='published'?'Publiée':'Acceptée'}
              </Text>
            </View>)}
          </>):null}
        </>:null}
        {space==='collaborate'?<>
          {section(<>
            <View style={{flexDirection:'row',gap:9,alignItems:'baseline'}}>
              {heading('Collaborateurs')}
              <Text style={{color:theme.muted,fontSize:12}}>
                {collaborators.length||''}
              </Text>
            </View>
            {collaborators.map(person=><View key={person.id} style={{
              flexDirection:'row',alignItems:'center',gap:12,
              paddingVertical:9,borderBottomWidth:1,borderColor:theme.border,
            }}>
              {person.avatarUrl?<Image source={{uri:person.avatarUrl}}
                style={{width:39,height:39,borderRadius:20}}/>:
                <View style={{width:39,height:39,borderRadius:20,
                  backgroundColor:theme.dark?'#52323F':'#F5E2EA',
                  alignItems:'center',justifyContent:'center'}}>
                  <Text style={{fontWeight:'700',color:PINK}}>
                    {person.displayName.slice(0,1).toLocaleUpperCase('fr')}
                  </Text>
                </View>}
              <View style={{flex:1,gap:3}}>
                <Text style={{fontSize:13,fontWeight:'700',color:theme.foreground}}>
                  {person.displayName}
                </Text>
                <Text style={{fontSize:11,color:theme.muted}}>
                  {person.role==='owner'?'Auteur du morceau':'Collaborateur'}
                  {person.handle?' · @'+person.handle:''}
                </Text>
                {person.role==='collaborator'&&accepted.some(p=>
                  p.proposer?.displayName===person.displayName)?
                  <Text style={{fontSize:11,lineHeight:17,color:theme.muted}}
                    numberOfLines={2}>
                    {accepted.find(p=>p.proposer?.displayName===person.displayName)?.description}
                  </Text>:null}
              </View>
              {person.handle&&!demoId?<Pressable accessibilityRole="button"
                accessibilityLabel={'Voir le profil de '+person.displayName}
                onPress={()=>router.push({pathname:'/member/[name]',
                  params:{name:person.handle!}})}>
                <Ionicons name="chevron-forward-outline" size={18}
                  color={theme.muted}/>
              </Pressable>:null}
            </View>)}
            {rosterError?<Text style={{color:theme.muted,fontSize:12,lineHeight:19}}>
              La liste complète sera disponible lorsque la nouvelle API
              de collaboration sera déployée.
            </Text>:null}
            {demoId?<Text style={{fontSize:12,color:theme.muted}}>
              Discussion réservée aux collaborateurs d’un vrai projet.
            </Text>:button('Ouvrir la discussion du morceau',()=>router.push({
              pathname:'/chat/[id]',params:{id:conversationId!},
            }))}
          </>)}
          {section(<>
            {heading('Mes contributions')}
            {proposals.map(p=><View key={p.id} style={{
              borderBottomWidth:1,borderColor:theme.border,paddingVertical:8,gap:4,
            }}>
              <Text style={{fontSize:13,color:theme.foreground}}>{p.description}</Text>
              <Text style={{fontSize:11,color:PINK}}>Statut : {p.status}</Text>
            </View>)}
            {!proposals.length?<Text style={{fontSize:12,color:theme.muted}}>
              Aucune proposition visible pour le moment.
            </Text>:null}
            {!demoId?button('Proposer une autre contribution',propose,true):null}
          </>)}
        </>:null}
        {!demoId&&space!=='create'
          ?button('Voir le morceau publié',openPublication,true):null}
      </>:null}
    </ScrollView>
    <Nav/>
  </SafeAreaView>;
}
