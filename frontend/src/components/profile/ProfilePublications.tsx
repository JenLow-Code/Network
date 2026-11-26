import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useApp } from '@/context/AppContext';
import { useAppTheme } from '@/theme/AppTheme';
import { ProfilePublicationFeed } from '@/components/publication/PublicationGallery';
import SemenceSharesFeed from '@/components/dream/SemenceSharesFeed';
import { api } from '@/lib/api/client';
import { toPublications, type ApiFeedItem } from '@/lib/api/adapters';
import type { Publication } from '@/domain/publication';

export function ProfilePublications({contentWidth}: {contentWidth:number}) {
  const app=useApp(),theme=useAppTheme();
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const [serverPublications, setServerPublications] = useState<Publication[]>([]);
  const [semenceCount,setSemenceCount]=useState(0);
  const [loadError,setLoadError]=useState(false);
  useEffect(()=>{
    let active=true;
    setServerPublications([]);setLoadError(false);
    void api<{items:ApiFeedItem[]}>('/api/me/publications?limit=100',{auth:'required'})
      .then(result=>{if(active)setServerPublications(toPublications(
         (result.items||[]).filter(item=>item.visibility==='public')));})
      .catch(()=>{if(active)setLoadError(true);});
    return ()=>{active=false;};
  },[app.email]);
  useEffect(()=>{
    let active=true;setFeaturedId(null);
    void api<{item?:{id:string}|null}>('/api/me/featured-post',{auth:'required'})
      .then(result=>{if(active)setFeaturedId(result.item?.id??null);}).catch(()=>{});
    return ()=>{active=false;};
  },[app.email]);
  const feature=(id:string|null)=>{
    void (id?api('/api/me/featured-post',{method:'PUT',body:{publicationId:id},auth:'required'}):
      api('/api/me/featured-post',{method:'DELETE',auth:'required'}))
      .then(()=>setFeaturedId(id)).catch(()=>setLoadError(true));
  };
  const myPublicPosts=serverPublications;
  return <View style={{gap:12}}>
        <Text style={{fontSize:12,color:theme.muted}}>Les moments et les créations que j’ai choisi de partager.</Text>
        <SemenceSharesFeed mine roundedCards onCountChange={setSemenceCount}/>
        {loadError?<Text accessibilityRole="alert" style={{color:theme.muted,fontSize:12}}>Publications indisponibles actuellement.</Text>:null}
        {myPublicPosts.length
          ?<ProfilePublicationFeed grid items={myPublicPosts} contentWidth={contentWidth}
            roundedCards featuredId={featuredId} onFeature={feature}/>
          :!loadError&&semenceCount===0?<View style={{paddingVertical:13,paddingHorizontal:14,gap:5,borderRadius:10,borderWidth:1,borderStyle:'dashed',borderColor:theme.border,backgroundColor:theme.background}}>
             <Text style={{color:theme.foreground,fontSize:14,fontWeight:'600'}}>Ton histoire se construit.</Text>
             <Text style={{color:theme.muted,fontSize:13}}>Tes publications apparaîtront ici quand tu partageras quelque chose.</Text>
           </View>:null}
  </View>;
}
