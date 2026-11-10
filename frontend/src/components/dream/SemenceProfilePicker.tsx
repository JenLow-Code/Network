import React, { useEffect, useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import { api } from '@/lib/api/client';

export type InspirationProfile={
 id?:string;handle:string;displayName:string;avatarUrl?:string|null;
 church?:string|null;
};
/** Member profiles are deliberately separate from Discovery publications. */
export default function SemenceProfilePicker({onSelect,onBack}:{
 onSelect:(profile:InspirationProfile)=>void;onBack:()=>void;
}){
 const theme=useAppTheme();
 const [query,setQuery]=useState('');
 const [items,setItems]=useState<InspirationProfile[]>([]);
 const [state,setState]=useState<'idle'|'loading'|'ready'|'error'>('idle');
 useEffect(()=>{
   let live=true;
   if(query.trim().length<2){setItems([]);setState('idle');return;}
   setState('loading');
   const timeout=setTimeout(()=>{
     void api<{items:InspirationProfile[]}>('/api/users?q='+encodeURIComponent(query.trim()),{
       auth:'required',
     }).then(result=>{if(live){setItems(result.items||[]);setState('ready');}})
       .catch(()=>{if(live){setItems([]);setState('error');}});
   },350);
   return ()=>{live=false;clearTimeout(timeout);};
 },[query]);
 return <View style={{gap:13}}>
   <View style={{flexDirection:'row',alignItems:'center',gap:9,paddingHorizontal:12,
     borderWidth:1,borderColor:theme.border,borderRadius:12}}>
     <Ionicons name="search-outline" size={18} color={theme.muted}/>
     <TextInput value={query} onChangeText={setQuery} autoCapitalize="none"
       accessibilityLabel="Rechercher un profil JenLow"
       placeholder="Nom ou identifiant de profil…" placeholderTextColor={theme.muted}
       style={{color:theme.foreground,minHeight:46,flex:1,fontSize:14}}/>
   </View>
   <Text style={{fontSize:11,lineHeight:18,color:theme.muted}}>
     Les profils sont des personnes JenLow, pas des publications.
     Sélectionne la personne dont tu veux conserver la référence.
   </Text>
   {items.map(person=><Pressable key={person.handle} accessibilityRole="button"
     onPress={()=>onSelect(person)}
     style={{flexDirection:'row',gap:11,alignItems:'center',
       minHeight:64,borderBottomWidth:0.5,borderColor:theme.border,paddingVertical:8}}>
     {person.avatarUrl?<Image source={{uri:person.avatarUrl}}
       style={{height:45,width:45,borderRadius:23}}/>:
       <View style={{height:45,width:45,borderRadius:23,alignItems:'center',
         justifyContent:'center',backgroundColor:theme.surface}}>
         <Ionicons name="person-outline" size={21} color={theme.muted}/>
       </View>}
     <View style={{flex:1,gap:3}}>
       <Text style={{fontSize:14,fontWeight:'700',color:theme.foreground}}>
         {person.displayName}
       </Text>
       <Text style={{fontSize:12,color:theme.muted}}>@{person.handle}</Text>
     </View>
     <Ionicons name="add-circle-outline" size={21} color="#B88962"/>
   </Pressable>)}
   {state==='loading'?<Text style={{fontSize:12,color:theme.muted}}>Recherche…</Text>:null}
   {state==='error'?<Text style={{fontSize:12,color:theme.muted}}>
     Recherche indisponible. Vérifie ta connexion JenLow.
   </Text>:null}
   {state==='ready'&&!items.length?<Text style={{fontSize:12,color:theme.muted}}>
     Aucun profil trouvé.
   </Text>:null}
   <Pressable onPress={onBack} accessibilityRole="button" style={{paddingVertical:11}}>
     <Text style={{fontSize:12,color:theme.muted,textAlign:'center'}}>Retour</Text>
   </Pressable>
 </View>;
}
