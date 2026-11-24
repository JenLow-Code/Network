import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '@/context/AppContext';
import { useAppTheme } from '@/theme/AppTheme';
import { ProfilePublicationFeed } from '@/components/publication/PublicationGallery';
import SemenceSharesFeed from '@/components/dream/SemenceSharesFeed';
import { publications } from '@/mocks/publications';
import { api } from '@/lib/api/client';
import { toPublications, type ApiFeedItem } from '@/lib/api/adapters';
import type { Publication } from '@/domain/publication';

export function ProfilePublications({contentWidth}: {contentWidth:number}) {
  const app=useApp(),theme=useAppTheme();
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const [serverPublications, setServerPublications] = useState<Publication[]>([]);
  const [semenceCount,setSemenceCount]=useState(0);
  useEffect(()=>{
    let active=true;
    setServerPublications([]);
    void api<{items:ApiFeedItem[]}>('/api/me/publications?limit=100',{auth:'required'})
      .then(result=>{if(active)setServerPublications(toPublications(
         (result.items||[]).filter(item=>item.visibility==='public')));})
      .catch(()=>{ /* Keep existing locally visible profile items when API is disconnected. */ });
    return ()=>{active=false;};
  },[app.email]);
  const pinKey='jenlow.public-profile.featured.v1.'+app.name;
  useEffect(()=>{let active=true;void AsyncStorage.getItem(pinKey).then(x=>{if(active)setFeaturedId(x);}).catch(()=>{});return ()=>{active=false;};},[pinKey]);
  const feature=(id:string|null)=>{setFeaturedId(id);if(id)void AsyncStorage.setItem(pinKey,id).catch(()=>{});else void AsyncStorage.removeItem(pinKey).catch(()=>{});};
  const myPublicPosts=[
    ...serverPublications,
    ...publications.filter(p=>p.author===app.name &&
      !serverPublications.some(remote=>remote.id===p.id)),
  ];
  return <View style={{gap:12}}>
        <Text style={{fontSize:12,color:theme.muted}}>Les moments et les créations que j’ai choisi de partager.</Text>
        <SemenceSharesFeed mine roundedCards onCountChange={setSemenceCount}/>
        {myPublicPosts.length
          ?<ProfilePublicationFeed grid items={myPublicPosts} contentWidth={contentWidth}
            roundedCards featuredId={featuredId} onFeature={feature}/>
          :semenceCount===0?<View style={{paddingVertical:13,paddingHorizontal:14,gap:5,borderRadius:10,borderWidth:1,borderStyle:'dashed',borderColor:theme.border,backgroundColor:theme.background}}>
             <Text style={{color:theme.foreground,fontSize:14,fontWeight:'600'}}>Ton histoire se construit.</Text>
             <Text style={{color:theme.muted,fontSize:13}}>Tes publications apparaîtront ici quand tu partageras quelque chose.</Text>
           </View>:null}
  </View>;
}
