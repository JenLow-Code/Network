import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api, ApiRequestError } from '@/lib/api/client';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Nav } from '@/components/navigation/Nav';
import { useAppTheme } from '@/theme/AppTheme';

type Invitation={
  id:string;need:string;needId:string;dreamId:string;dreamTitle:string;
  status:'pending'|'accepted';message?:string|null;
  from:{handle:string;displayName:string};createdAt?:string;
};
export default function TalentInvitations(){
  const theme=useAppTheme();
  const [items,setItems]=useState<Invitation[]>([]);
  const [loading,setLoading]=useState(true);
  const [pending,setPending]=useState<string|null>(null);
  const [error,setError]=useState('');
  const reload=useCallback(async()=>{
    try{
      const response=await api<{items:Invitation[]}>('/api/me/need-invitations',{auth:'required'});
      setItems(response.items);setError('');
    }catch(e){
      setError(e instanceof ApiRequestError && e.status===401
        ? 'Connecte-toi à JenLow Network pour recevoir et répondre à tes invitations.'
        : 'Impossible de charger les invitations. Vérifie ta connexion au service.');
    }finally{setLoading(false);}
  },[]);
  useEffect(()=>{void reload();},[reload]);
  const respond=async(invitation:Invitation,accept:boolean)=>{
    setPending(invitation.id);
    try{
      await api('/api/need-invitations/'+encodeURIComponent(invitation.id)+'/respond',
        {method:'POST',auth:'required',body:{accept}});
      await reload();
    }catch(e){
      setError('Cette invitation ne peut plus être validée. Elle a peut-être été retirée ou le besoin est complet.');
    }finally{setPending(null);}
  };
  return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
    <ScrollView style={{flex:1}} contentContainerStyle={{paddingHorizontal:18,paddingTop:12,paddingBottom:95,
      maxWidth:710,width:'100%',alignSelf:'center',gap:13}}>
      <PageHeader onBack={()=>router.back()}/>
      <Text style={{color:theme.foreground,fontFamily:'serif',fontSize:28,marginTop:15}}>Mes invitations</Text>
      <Text style={{color:theme.muted,fontSize:12,lineHeight:19}}>
        Un talent n'est confirmé que si tu acceptes explicitement de participer au rêve.
      </Text>
      {loading?<ActivityIndicator color="#D71D77" style={{marginTop:35}}/>:null}
      {!!error?<View style={{padding:15,borderRadius:11,borderWidth:1,borderColor:theme.border,gap:9}}>
        <Text style={{color:theme.foreground,fontSize:12,lineHeight:18}}>{error}</Text>
        <Pressable onPress={()=>void reload()} accessibilityRole="button" style={{padding:9,alignSelf:'flex-start'}}>
          <Text style={{color:'#D71D77',fontWeight:'700'}}>Réessayer</Text>
        </Pressable>
      </View>:null}
      {!loading&&!error&&items.length===0?<View style={{padding:20,borderWidth:1,
        borderColor:theme.border,borderRadius:12,alignItems:'center',gap:9}}>
        <Ionicons name="people-outline" size={25} color={theme.muted}/>
        <Text style={{color:theme.muted,fontSize:12}}>Aucune invitation pour le moment.</Text>
      </View>:null}
      {items.map(inv=><View key={inv.id} style={{backgroundColor:theme.surface,
        borderColor:theme.border,borderWidth:1,borderRadius:12,padding:16,gap:9}}>
        <Text style={{color:'#27845B',fontSize:10,letterSpacing:1,fontWeight:'700'}}>
          {inv.status==='accepted'?'PARTICIPATION ACCEPTÉE':'INVITATION À COLLABORER'}
        </Text>
        <Text style={{fontSize:17,color:theme.foreground,fontWeight:'700'}}>{inv.dreamTitle}</Text>
        <Text style={{fontSize:13,color:theme.foreground}}>Talent : {inv.need}</Text>
        <Text style={{fontSize:12,color:theme.muted}}>
          Invitation de {inv.from.displayName} (@{inv.from.handle})
        </Text>
        {!!inv.message?<Text style={{fontSize:12,color:theme.foreground,lineHeight:19}}>{inv.message}</Text>:null}
        {inv.status==='pending'?<View style={{flexDirection:'row',gap:9,marginTop:7}}>
          <Pressable disabled={!!pending} accessibilityRole="button"
            onPress={()=>void respond(inv,false)}
            style={{flex:1,borderWidth:1,borderColor:theme.border,borderRadius:10,
              minHeight:46,justifyContent:'center',alignItems:'center'}}>
            <Text style={{fontSize:12,color:theme.foreground,fontWeight:'700'}}>Refuser</Text>
          </Pressable>
          <Pressable disabled={!!pending} accessibilityRole="button"
            onPress={()=>void respond(inv,true)}
            style={{flex:1,backgroundColor:'#225D42',borderRadius:10,
              minHeight:46,justifyContent:'center',alignItems:'center'}}>
            <Text style={{fontSize:12,color:'#FFFFFF',fontWeight:'700'}}>Accepter</Text>
          </Pressable>
        </View>:null}
      </View>)}
    </ScrollView>
    <Nav/>
  </SafeAreaView>;
}
