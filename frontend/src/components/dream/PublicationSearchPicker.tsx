import React, { useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
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
     {discovery.items.slice(0,18).map((item,index)=>
       <Pressable key={item.id} onPress={()=>onSelect(item)}
         accessibilityRole="button" accessibilityLabel={'Sélectionner '+item.title}
         style={{width:'48.5%',borderRadius:11,overflow:'hidden',
           backgroundColor:item.type==='dream'?'#606260':'#68646A',
           height:175,justifyContent:'flex-end'}}>
         {(item.type==='talent'?item.avatar:item.image)?<Image source={{uri:(item.type==='talent'?item.avatar:item.image)!}}
           resizeMode="cover" style={{position:'absolute',left:0,right:0,
             top:0,bottom:0,width:'100%',height:'100%'}}/>:null}
         <Svg pointerEvents="none" width="100%" height="100%"
           style={{position:'absolute',top:0,left:0,right:0,bottom:0}}>
           <Defs>
             <LinearGradient id={'pub-pick-'+index} x1="0%" y1="0%" x2="0%" y2="100%">
               <Stop offset="0%" stopColor="#080808" stopOpacity={0.04}/>
               <Stop offset="48%" stopColor="#080808" stopOpacity={0.30}/>
               <Stop offset="100%" stopColor="#080808" stopOpacity={0.86}/>
             </LinearGradient>
           </Defs>
           <Rect width="100%" height="100%" fill={'url(#pub-pick-'+index+')'}/>
         </Svg>
         <View style={{padding:12,gap:5}}>
           <Text numberOfLines={1} style={{fontSize:9,fontWeight:'700',
             letterSpacing:1,color:'#ECE5E3'}}>
             {item.type==='dream'?'RÊVE':item.type==='music'?'MUSIQUE':
               item.type==='bible'?'BIBLE':'TALENT'}
           </Text>
           <Text numberOfLines={3} style={{fontSize:14,fontWeight:'700',
             lineHeight:19,color:'#FFFFFF'}}>{item.title}</Text>
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
