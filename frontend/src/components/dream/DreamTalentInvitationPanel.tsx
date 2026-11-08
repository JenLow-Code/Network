import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiRequestError } from '@/lib/api/client';
import type { DreamResource } from '@/domain/dreamWorkspace';
import { useAppTheme } from '@/theme/AppTheme';

type Candidate={id:string;handle:string;displayName:string};
type Invitation={
  id:string;needId:string;need:string;status:'pending'|'accepted'|'declined'|'removed';
  recipient:{handle:string;displayName:string};createdAt?:string;
};
export function DreamTalentInvitationPanel({
  resource,dreamServerId,editable=true,onVerified,
}:{
  resource:DreamResource;dreamServerId?:string;editable?:boolean;
  /** Only server-confirmed acceptances can update the local UI. */
  onVerified?:(confirmed:boolean)=>void;
}){
  const theme=useAppTheme();
  const [handle,setHandle]=useState('');
  const [message,setMessage]=useState('');
  const [candidates,setCandidates]=useState<Candidate[]>([]);
  const [outgoing,setOutgoing]=useState<Invitation[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const connected=!!(dreamServerId&&resource.serverNeedId);
  const verifiedRef=useRef(onVerified);
  useEffect(()=>{verifiedRef.current=onVerified;},[onVerified]);
  const load=useCallback(async()=>{
    if(!dreamServerId||!resource.serverNeedId)return;
    try{
      const r=await api<{items:Invitation[]}>(
        '/api/dreams/'+encodeURIComponent(dreamServerId)+'/need-invitations',{auth:'required'});
      const relevant=r.items.filter(item=>item.needId===resource.serverNeedId);
      setOutgoing(relevant);
      verifiedRef.current?.(relevant.some(item=>item.status==='accepted'));
    }catch(e){
      setError(e instanceof ApiRequestError && e.status===401
        ? 'Connecte-toi avec un compte JenLow Network pour gérer les demandes.'
        : 'Impossible de charger les réponses aux invitations.');
    }
  },[dreamServerId,resource.serverNeedId]);
  useEffect(()=>{void load();},[load]);
  if(!connected) return <View style={{padding:13,borderRadius:10,borderWidth:1,borderColor:theme.border,
    backgroundColor:theme.background,gap:7}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
      <Ionicons name="shield-checkmark-outline" size={18} color={theme.muted}/>
      <Text style={{color:theme.foreground,fontSize:12,fontWeight:'700'}}>Demande avec acceptation</Text>
    </View>
    <Text style={{fontSize:11,color:theme.muted,lineHeight:18}}>
      Ce besoin est encore conservé localement. Les invitations nominatives ne pourront être
      envoyées et confirmées qu'après la synchronisation de ce rêve avec JenLow Network.
      Aucune personne ne sera marquée comme trouvée sans sa réponse.
    </Text>
  </View>;
  const lookup=async()=>{
    if(handle.trim().length<2)return;
    setBusy(true);setError('');
    try{
      const r=await api<{items:Candidate[]}>('/api/users?q='+encodeURIComponent(handle.trim()),
        {auth:'required'});
      setCandidates(r.items);
    }catch(e){setError('La recherche des membres n’est pas disponible. Vérifie ta connexion.');}
    finally{setBusy(false);}
  };
  const invite=async(candidate:Candidate)=>{
    if(!resource.serverNeedId)return;
    setBusy(true);setError('');
    try{
      await api('/api/needs/'+encodeURIComponent(resource.serverNeedId)+'/invitations',
        {auth:'required',method:'POST',body:{handle:candidate.handle,message:message.trim()}});
      setHandle('');setMessage('');setCandidates([]);await load();
    }catch(e){
      setError(e instanceof ApiRequestError && e.code==='invitation_already_active'
        ? 'Une invitation est déjà en attente ou acceptée pour ce membre.'
        : 'La demande n’a pas été envoyée. Aucune personne n’a été ajoutée au rêve.');
    }finally{setBusy(false);}
  };
  const removeInvitation=async(inv:Invitation)=>{
    const go=async()=>{
      setBusy(true);setError('');
      try{
        await api('/api/need-invitations/'+encodeURIComponent(inv.id),
          {auth:'required',method:'DELETE'});
        await load();
      }catch{setError('Le retrait n’a pas été effectué. Réessaie.');}
      finally{setBusy(false);}
    };
    const question='Retirer '+inv.recipient.displayName+' de ce projet ? Une notification lui sera adressée.';
    if(Platform.OS==='web'){
      if(typeof window!=='undefined'&&window.confirm(question))void go();
    }else Alert.alert('Retirer la personne',question,[
      {text:'Annuler',style:'cancel'},
      {text:'Retirer',style:'destructive',onPress:()=>{void go();}},
    ]);
  };
  const active=outgoing.filter(item=>item.status==='pending'||item.status==='accepted');
  return <View style={{gap:12,marginTop:4}}>
    <Text style={{fontSize:14,fontWeight:'700',color:theme.foreground}}>Personnes invitées</Text>
    {active.length===0?<Text style={{fontSize:11,color:theme.muted,lineHeight:18}}>
      Aucune personne invitée pour le moment. Ce talent reste à trouver.
    </Text>:null}
    {active.map(inv=><View key={inv.id} style={{padding:12,borderWidth:1,
      borderColor:inv.status==='accepted'?'#27845B':theme.border,borderRadius:10,gap:8}}>
      <Text style={{color:theme.foreground,fontSize:12,fontWeight:'700'}}>
        {inv.recipient.displayName} (@{inv.recipient.handle})
      </Text>
      <Text style={{color:inv.status==='accepted'?'#27845B':theme.muted,fontSize:11}}>
        {inv.status==='accepted'?'Demande acceptée · talent confirmé':'Invitation envoyée · réponse attendue'}
      </Text>
      {editable?<Pressable disabled={busy} onPress={()=>void removeInvitation(inv)}
        accessibilityRole="button" style={{alignSelf:'flex-start',paddingVertical:5}}>
        <Text style={{fontSize:11,color:'#B55164',fontWeight:'700'}}>
          {inv.status==='accepted'?'Retirer cette personne du projet':'Annuler l’invitation'}
        </Text>
      </Pressable>:null}
    </View>)}
    {editable?<View style={{gap:9,paddingTop:5}}>
      <Text style={{color:theme.muted,fontSize:12}}>Inviter une personne que je connais</Text>
      <View style={{flexDirection:'row',gap:7}}>
        <TextInput value={handle} onChangeText={setHandle}
          placeholder="Nom ou identifiant JenLow"
          placeholderTextColor={theme.muted}
          style={{flex:1,minHeight:46,color:theme.foreground,borderRadius:10,
            borderWidth:1,borderColor:theme.border,paddingHorizontal:12,fontSize:12}}/>
        <Pressable disabled={busy||handle.trim().length<2} onPress={()=>void lookup()}
          accessibilityRole="button"
          style={{borderRadius:10,paddingHorizontal:14,justifyContent:'center',backgroundColor:'#242322'}}>
          <Ionicons name="search-outline" color="#FFFFFF" size={19}/>
        </Pressable>
      </View>
      {candidates.map(candidate=><Pressable key={candidate.id} disabled={busy}
        accessibilityRole="button" onPress={()=>void invite(candidate)}
        style={{padding:12,flexDirection:'row',alignItems:'center',gap:10,
          borderWidth:1,borderColor:theme.border,borderRadius:10}}>
        <Text style={{flex:1,fontSize:12,color:theme.foreground}}>
          {candidate.displayName} (@{candidate.handle})
        </Text>
        <Text style={{fontSize:11,color:'#D71D77',fontWeight:'700'}}>Inviter</Text>
      </Pressable>)}
      <TextInput value={message} onChangeText={setMessage}
        placeholder="Message facultatif accompagnant la demande…"
        placeholderTextColor={theme.muted} multiline
        style={{minHeight:66,textAlignVertical:'top',padding:12,borderRadius:10,
          borderWidth:1,borderColor:theme.border,color:theme.foreground,fontSize:12}}/>
    </View>:null}
    {busy?<ActivityIndicator color="#D71D77"/>:null}
    {!!error?<Text style={{fontSize:11,color:'#B55164'}}>{error}</Text>:null}
  </View>;
}
