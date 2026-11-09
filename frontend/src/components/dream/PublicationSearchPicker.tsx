import React, { useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import { useDiscovery } from '@/lib/api/hooks';
import type { Publication } from '@/domain/publication';

/** Discovery-like selection, mounted only when a publication is being added. */
export default function PublicationSearchPicker({selectedId,onSelect,onManual,onDone}:{
 selectedId:string;
 onSelect:(p:Publication)=>void;
 onManual:(id:string)=>void;
 onDone:()=>void;
}){
 const theme=useAppTheme();
 const [search,setSearch]=useState('');
 const discovery=useDiscovery({q:search.trim()});
 return <View style={{gap:11}}>
   <View style={{flexDirection:'row',alignItems:'center',gap:8,
     borderWidth:1,borderColor:theme.border,borderRadius:10,
     paddingHorizontal:11,backgroundColor:theme.background}}>
     <Ionicons name="search-outline" size={18} color={theme.muted}/>
     <TextInput value={search} onChangeText={setSearch}
       accessibilityLabel="Rechercher les publications JenLow"
       placeholder="Rechercher comme dans Découverte…"
       placeholderTextColor={theme.muted}
       style={{color:theme.foreground,flex:1,minHeight:46,
         paddingVertical:10,fontSize:13}}/>
   </View>
   <Text style={{fontSize:11,lineHeight:18,color:theme.muted}}>
     Choisis une publication dans les résultats, ou saisis son identifiant.
   </Text>
   <View style={{flexDirection:'row',flexWrap:'wrap',
     justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
     {discovery.items.slice(0,18).map(item=>
       <Pressable key={item.id} onPress={()=>onSelect(item)}
         accessibilityRole="button" accessibilityLabel={'Sélectionner '+item.title}
         style={{width:'48.5%',borderRadius:11,overflow:'hidden',
           backgroundColor:theme.dark?'#303238':'#F3F0EC',minHeight:143}}>
         {item.image?<Image source={{uri:item.image}}
           resizeMode="cover" style={{height:91,width:'100%'}}/>:
           <View style={{height:91,alignItems:'center',justifyContent:'center'}}>
             <Ionicons name="albums-outline" color={theme.muted} size={22}/>
           </View>}
         <View style={{padding:9,gap:3}}>
           <Text numberOfLines={2} style={{fontSize:12,fontWeight:'700',
             color:theme.foreground}}>{item.title}</Text>
           <Text numberOfLines={1} style={{fontSize:10,color:theme.muted}}>
             {item.type==='dream'?'Rêve':item.type==='music'?'Musique':
               item.type==='bible'?'Bible':'Talent'}
           </Text>
         </View>
       </Pressable>)}
   </View>
   {discovery.state==='loading'?<Text style={{fontSize:12,color:theme.muted}}>
     Recherche en cours…
   </Text>:null}
   {discovery.state==='error'?<Text style={{fontSize:12,color:theme.muted}}>
     Impossible de charger les publications. Utilise leur ID.
   </Text>:null}
   {!discovery.items.length&&discovery.state==='ready'?
     <Text style={{fontSize:12,color:theme.muted}}>Aucune publication trouvée.</Text>:null}
   <TextInput value={selectedId} onChangeText={onManual}
     placeholder="Ou saisir l’ID exact de la publication"
     placeholderTextColor={theme.muted} accessibilityLabel="ID de publication"
     autoCapitalize="none"
     style={{color:theme.foreground,borderWidth:1,borderColor:theme.border,
       borderRadius:10,padding:12,fontSize:13}}/>
   <Pressable accessibilityRole="button"
     onPress={onDone}
     style={{backgroundColor:theme.foreground,borderRadius:10,padding:13,alignItems:'center'}}>
     <Text style={{color:theme.background,fontWeight:'700',fontSize:13}}>
       Continuer
     </Text>
   </Pressable>
 </View>;
}
