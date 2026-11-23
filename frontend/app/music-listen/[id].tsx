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
import {fetchDemoMusicPreview,type DemoMusicPreview} from '@/lib/api/musicPreview';
import {api,ApiRequestError} from '@/lib/api/client';
import type {MusicPublication} from '@/domain/publication';

type SentProposal={
  id:string;trackPublicationId:string;trackTitle:string;
  description?:string;status:string;
  publisher?:{displayName:string};
};
const isFictional=(id:string)=>/^demo-music-publication-\d{2}$/.test(id);

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
  const discovery=useDiscovery({type:'music'});
  const isDemo=!!id&&isFictional(id);
  const remote=usePublication(isDemo?undefined:id);
  const [preview,setPreview]=useState<DemoMusicPreview|null>(null);
  const [previewLoading,setPreviewLoading]=useState(true);
  const [sent,setSent]=useState<SentProposal[]>([]);
  const [contactBusy,setContactBusy]=useState(false);
  const [contactError,setContactError]=useState('');

  useEffect(()=>{
    let active=true;
    // These are existing, explicitly fictional read-only song records, not
    // invented public users. Fetch also on direct demo URLs.
    if(process.env.EXPO_PUBLIC_DISCOVERY_SOURCE==='unified'&&!isDemo){
      setPreviewLoading(false);return;
    }
    setPreviewLoading(true);
    void fetchDemoMusicPreview()
      .then(data=>{if(active)setPreview(data);})
      .catch(()=>{if(active)setPreview(null);})
      .finally(()=>{if(active)setPreviewLoading(false);});
    return()=>{active=false;};
  },[isDemo]);

  useEffect(()=>{
    let active=true;
    // Pending proposals stay private to the authenticated sender.
    void api<{items:SentProposal[]}>('/api/me/music-proposals?role=sent',
      {auth:'required'})
      .then(data=>{if(active)setSent(data.items||[]);})
      .catch(()=>{if(active)setSent([]);});
    return()=>{active=false;};
  },[]);

  const queue=useMemo(()=>{
    const seen=new Set<string>();
    const items:BrowsableSong[]=[];
    const candidates=[
      ...discovery.items.filter((value):value is MusicPublication=>value.type==='music'),
      ...(preview?.catalog||[]),
    ];
    for(const item of candidates){
      if(!seen.has(item.id)){
        seen.add(item.id);
        // Demo catalog is explicitly read-only. Existing local editorial
        // mock songs are also examples, not real members.
        items.push(item);
      }
    }
    if(remote.item?.type==='music'&&!seen.has(remote.item.id)){
      items.push(remote.item);
    }
    return items;
  },[discovery.items,preview,remote.item]);

  const song=queue.find(item=>item.id===id);
  const pending=sent.find(item=>item.trackPublicationId===id&&
    (item.status==='draft'||item.status==='submitted'));
  const loading=!song&&!pending&&(
    discovery.state==='loading'||previewLoading||(!isDemo&&remote.state==='loading'));

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
          contentWidth={Math.max(0,Math.min(width,960)-36)}
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
