import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Nav } from '@/components/navigation/Nav';
import { api, ApiRequestError } from '@/lib/api/client';
import { useAppTheme } from '@/theme/AppTheme';

type Notification={
  id:string;type:string;category?:string;
  title:string;body:string;read:boolean;createdAt:string;
  deepLink?:string|null;
};
export default function Notifications(){
  const theme=useAppTheme();
  const [items,setItems]=useState<Notification[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const refresh=useCallback(async()=>{
    try{
      const response=await api<{items:Notification[]}>('/api/notifications',{auth:'required'});
      setItems(response.items);setError('');
    }catch(e){
      setError(e instanceof ApiRequestError&&e.status===401
        ? 'Connecte-toi à JenLow Network pour consulter tes notifications.'
        : 'Les notifications ne sont pas disponibles pour le moment.');
    }finally{setLoading(false);}
  },[]);
  useEffect(()=>{void refresh();},[refresh]);
  const read=async(n:Notification)=>{
    try{
      if(!n.read)await api('/api/notifications/'+encodeURIComponent(n.id)+'/read',
        {auth:'required',method:'POST'});
      setItems(prev=>prev.map(item=>item.id===n.id?{...item,read:true}:item));
    }catch{return;}
    const path=n.deepLink;
    if(path && /^\/(my-space|talent-invitations|my-dream|space)(\/|$)/.test(path)){
      router.push(path as '/my-space');
    }
  };
  return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
    <ScrollView style={{flex:1}} contentContainerStyle={{maxWidth:720,width:'100%',
      alignSelf:'center',paddingHorizontal:18,paddingTop:12,paddingBottom:92}}>
      <PageHeader onBack={()=>router.back()}/>
      <Text style={{fontFamily:'serif',fontSize:29,color:theme.foreground,marginTop:16,marginBottom:6}}>
        Notifications
      </Text>
      <Text style={{fontSize:12,color:theme.muted,lineHeight:20,marginBottom:19}}>
        Invitations, acceptations, retraits et nouvelles de tes projets.
      </Text>
      {loading?<ActivityIndicator color="#D71D77" style={{marginTop:22}}/>:null}
      {!!error?<View style={{padding:17,borderWidth:1,borderColor:theme.border,borderRadius:11,gap:9}}>
        <Text style={{color:theme.foreground,fontSize:12,lineHeight:19}}>{error}</Text>
        <Pressable accessibilityRole="button" onPress={()=>void refresh()}>
          <Text style={{color:'#D71D77',fontWeight:'700',fontSize:12}}>Réessayer</Text>
        </Pressable>
      </View>:null}
      {!loading&&!error&&items.length===0?<Text style={{paddingVertical:18,color:theme.muted,fontSize:13}}>
        Aucune notification pour le moment.
      </Text>:null}
      <View style={{gap:9}}>
        {items.map(n=><Pressable key={n.id} accessibilityRole="button"
          onPress={()=>void read(n)}
          style={{padding:15,borderWidth:1,borderColor:n.read?theme.border:'#D71D77',
            backgroundColor:theme.surface,borderRadius:11,gap:8}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
            <Ionicons name={n.category==='collaboration'?'people-outline':'notifications-outline'}
              size={18} color={n.read?theme.muted:'#D71D77'}/>
            <Text style={{color:theme.foreground,fontSize:14,fontWeight:'700',flex:1}}>
              {n.title}
            </Text>
            {!n.read?<View style={{width:7,height:7,borderRadius:4,backgroundColor:'#D71D77'}}/>:null}
          </View>
          <Text style={{fontSize:12,color:theme.foreground,lineHeight:19}}>{n.body}</Text>
          <Text style={{fontSize:10,color:theme.muted}}>
            {n.createdAt ? new Date(n.createdAt).toLocaleDateString('fr-FR',
              {day:'numeric',month:'short',year:'numeric'}) : ''}
          </Text>
        </Pressable>)}
      </View>
    </ScrollView>
    <Nav/>
  </SafeAreaView>;
}
