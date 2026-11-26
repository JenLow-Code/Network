import React,{useEffect,useMemo,useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,Text,View,useWindowDimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router,useLocalSearchParams} from 'expo-router';
import {DetailAuthorHeader} from '@/components/detail/DetailAuthorHeader';
import {DetailInfoSection} from '@/components/detail/DetailMoreDrawer';
import {MusicListeningDetail,type BrowsableSong} from '@/components/music/MusicListeningDetail';
import {useAppTheme} from '@/theme/AppTheme';
import {workspaceCanvas,workspaceLayout} from '@/theme/workspaceLayout';
import {useDiscovery,usePublication} from '@/lib/api/hooks';
import {api,ApiRequestError} from '@/lib/api/client';
import {isRealProposal} from '@/lib/api/realRecords';
import type {MusicPublication} from '@/domain/publication';

type SentProposal={
  id:string;trackPublicationId:string;trackTitle:string;
  description?:string;status:string;
  publisher?:{displayName:string};
};

/**
 * A focused, navigable song detail page reached FROM the Pour moi cassette
 * shelf. It uses the Discovery author header, compact listening presentation,
 * full song details and a related-project carousel.
 *
 * Unlike the former inline panel, direct URLs and refreshes can independently
 * load their song. No unpublished project is presented as a public release.
 */
export default function MusicListenPage(){
  const {id}=useLocalSearchParams<{id:string;from?:string}>();
  const theme=useAppTheme();
  const {width}=useWindowDimensions();
  const ws=workspaceLayout(width);
  const contentWidth=Math.max(0,Math.min(width,ws.maxWidth||width)-ws.contentGutter-ws.gutter);
  const discovery=useDiscovery({type:'music'});
  const remote=usePublication(id);
  const [sent,setSent]=useState<SentProposal[]>([]);
  const [contactBusy,setContactBusy]=useState(false);
  const [contactError,setContactError]=useState('');

  useEffect(()=>{
    let active=true;
    // Pending proposals stay private to the authenticated sender.
    void api<{items:SentProposal[]}>('/api/me/music-proposals?role=sent',
      {auth:'required'})
      .then(data=>{if(active)setSent((data.items||[]).filter(isRealProposal));})
      .catch(()=>{if(active)setSent([]);});
    return()=>{active=false;};
  },[]);

  const queue=useMemo(()=>{
    const seen=new Set<string>();
    const items:BrowsableSong[]=[];
    const candidates=[
      ...discovery.items.filter((value):value is MusicPublication=>value.type==='music'),
    ];
    for(const item of candidates){
      if(!seen.has(item.id)){
        seen.add(item.id);
        items.push(item);
      }
    }
    if(remote.item?.type==='music'&&!seen.has(remote.item.id)){
      items.push(remote.item);
    }
    return items;
  },[discovery.items,remote.item]);

  const song=queue.find(item=>item.id===id);
  const pending=sent.find(item=>item.trackPublicationId===id&&
    (item.status==='draft'||item.status==='submitted'));
  const loading=!song&&!pending&&(
    discovery.state==='loading'||remote.state==='loading');

  const select=(nextId:string)=>{
    setContactError('');
    router.replace({pathname:'/music-listen/[id]',
      params:{id:nextId,from:'music-tab'}});
  };
  const contact=async(handle:string)=>{
    if(contactBusy)return;
    setContactBusy(true);setContactError('');
    try{
      const data=await api<{conversationId:string}>('/api/conversations',{
        method:'POST',auth:'required',body:{handle},
      });
      router.push({pathname:'/chat/[id]',params:{id:data.conversationId}});
    }catch(e){
      const code=e instanceof ApiRequestError?e.code:'';
      setContactError(code==='contact_required'
        ?'La discussion directe est réservée aux contacts ou aux membres de ton Circle.'
        :code==='not_authenticated'
        ?'Connecte-toi pour contacter cette personne.'
        :'Impossible d’ouvrir la conversation actuellement.');
    }finally{setContactBusy(false);}
  };

  return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
    <ScrollView key={id} keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        ...workspaceCanvas(width),
        paddingTop:width>=1100?12:0,paddingBottom:105,
      }}>
      {song?<View style={{width:'100%',maxWidth:960,alignSelf:'center'}}>
        <DetailAuthorHeader item={song} previewOnly={!!song.isDemo||song.source!=='api'}/>
        <MusicListeningDetail song={song} queue={queue}
          contentWidth={Math.min(contentWidth,960)}
          onSelect={select} onContact={handle=>{void contact(handle);}}
          contactBusy={contactBusy} contactError={contactError}/>
      </View>:pending?<View style={{maxWidth:800,width:'100%',alignSelf:'center',gap:19}}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour à Musique"
          onPress={()=>router.replace('/music-hub')}
          style={{paddingVertical:14}}>
          <Text style={{color:theme.foreground,fontSize:14}}>← Retour à Musique</Text>
        </Pressable>
        <Text style={{color:theme.foreground,fontSize:25,fontWeight:'700'}}>
          {pending.trackTitle}
        </Text>
        <Text style={{color:theme.muted,fontSize:12}}>
          {pending.publisher?.displayName||'Auteur du morceau'}
        </Text>
        <DetailInfoSection title="Proposition en cours"
          text={pending.description||'Aucune autre information disponible.'}/>
        <Text style={{color:'#CB245C',fontSize:12,fontWeight:'700'}}>
          {pending.status==='submitted'
            ?'Proposition envoyée · réponse en attente'
            :'Proposition en brouillon'}
        </Text>
      </View>:<View style={{width:'100%',maxWidth:760,
        alignSelf:'center',gap:16,paddingVertical:40}}>
        {loading?<ActivityIndicator color="#CB245C"/>:<>
          <Text style={{color:theme.foreground,fontSize:18,fontWeight:'700'}}>
            Ce morceau n’est pas disponible.
          </Text>
          <Text style={{color:theme.muted,fontSize:13,lineHeight:20}}>
            Nous n’avons pas pu retrouver cette publication dans les morceaux
            accessibles. Aucune information de projet privé n’est affichée.
          </Text>
          <Pressable onPress={()=>router.replace('/music-hub')}
            accessibilityRole="button"
            style={{alignSelf:'flex-start',paddingVertical:12}}>
            <Text style={{color:'#CB245C',fontWeight:'700'}}>
              Retour à Musique
            </Text>
          </Pressable>
        </>}
      </View>}
    </ScrollView>
  </SafeAreaView>;
}
