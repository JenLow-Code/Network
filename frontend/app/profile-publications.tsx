import React, { useEffect, useState } from 'react';
import { ScrollView, Text, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import { useApp } from '@/context/AppContext';
import { useAppTheme } from '@/theme/AppTheme';
import { workspaceCanvas, workspaceLayout } from '@/theme/workspaceLayout';
import { ProfilePublicationFeed } from '@/components/publication/PublicationGallery';
import SemenceSharesFeed from '@/components/dream/SemenceSharesFeed';
import { publications } from '@/mocks/publications';
import { api } from '@/lib/api/client';
import { toPublications, type ApiFeedItem } from '@/lib/api/adapters';
import type { Publication } from '@/domain/publication';

export default function ProfilePublications() {
  const app=useApp(),theme=useAppTheme();
  const {width}=useWindowDimensions();
  const ws=workspaceLayout(width);
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
  // Tiles use the exact width inside the shared workspace canvas,
  // including the desktop back-arrow rail and right navigation column.
  const canvasWidth=Math.max(0,Math.min(ws.maxWidth??width,width-(ws.desktop?236:0)));
  const areaWidth=Math.max(0,canvasWidth-ws.contentGutter-ws.gutter);
  const myPublicPosts=[
    ...serverPublications,
    ...publications.filter(p=>p.author===app.name &&
      !serverPublications.some(remote=>remote.id===p.id)),
  ];
  return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
    <ScrollView contentContainerStyle={{...workspaceCanvas(width),
      paddingTop:12,paddingBottom:80}}>
      <PageHeader title="Mes publications" onBack={()=>router.replace('/profile')}/>
      <Text style={{fontSize:13,color:theme.muted,marginTop:ws.desktop?30:22,
        marginBottom:20}}>Retrouve les contenus que tu partages.</Text>
        <SemenceSharesFeed mine roundedCards onCountChange={setSemenceCount}/>
        {myPublicPosts.length
          ?<ProfilePublicationFeed grid items={myPublicPosts} contentWidth={areaWidth}
            roundedCards featuredId={featuredId} onFeature={feature}/>
          :semenceCount===0?<Text style={{color:theme.muted,fontSize:13}}>
             Aucune publication pour le moment.
           </Text>:null}
    </ScrollView>
    <Nav/>
  </SafeAreaView>;
}
