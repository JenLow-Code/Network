import React, { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthProvider';
import { useAppTheme } from '@/theme/AppTheme';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Nav } from '@/components/navigation/Nav';
import { Avatar } from '@/components/ui/Avatar';
import { ProfileTalentTile } from '@/components/talent/ProfileTalentTile';
import { ProfilePublicationFeed } from '@/components/publication/PublicationGallery';
import type { TalentIllustration } from '@/components/talent/TalentArt';
import { publications } from '@/mocks/publications';

type Talent = { name:string; level:number; interests:string[]; description?:string };
const levels=['Grand débutant','Quelques notions','Intermédiaire','Avancé','Professionnel'];
function art(name:string):TalentIllustration|undefined {
 const s=name.toLowerCase();
 if(s.includes('batt'))return 'drums';
 if(s.includes('chant')||s.includes('voix'))return 'singing';
 if(s.includes('piano'))return 'piano';
 if(s.includes('photo'))return 'camera';
 if(s.includes('guit'))return 'acoustic-guitar';
 if(s.includes('violon'))return 'violin';
 if(s.includes('basse'))return 'bass';
 if(s.includes('saxo'))return 'saxophone';
 if(s.includes('tromp'))return 'trumpet';
 return undefined;
}
export default function ProfilePreview() {
 const app=useApp(),auth=useAuth(),theme=useAppTheme();
 const {width}=useWindowDimensions();
 const contentWidth=Math.min(width-36,860);
 const columns=contentWidth<350?2:3;
 const tileWidth=Math.floor((contentWidth-10*(columns-1))/columns);
 const [talents,setTalents]=useState<Talent[]>([]);
 const [featuredId,setFeaturedId]=useState<string|null>(null);
 const [selectedTalent,setSelectedTalent]=useState<Talent|null>(null);
 const avatar=typeof auth.user?.user_metadata?.avatar_url==='string'?auth.user.user_metadata.avatar_url:undefined;
 const posts=publications.filter(p=>p.author===app.name);
 useEffect(()=>{
   let live=true;
   const key='jenlow.profile.talents.'+(app.email||'guest').toLowerCase();
   void AsyncStorage.getItem(key).then(raw=>{
     if(!live)return;
     try{
       const data=raw?JSON.parse(raw):[];
       setTalents(Array.isArray(data)?data.filter((x):x is Talent=>x&&typeof x.name==='string'):[]);
     }catch{setTalents([]);}
   }).catch(()=>{if(live)setTalents([]);});
   void AsyncStorage.getItem('jenlow.public-profile.featured.v1.'+app.name)
     .then(id=>{if(live)setFeaturedId(id);}).catch(()=>{});
   return()=>{live=false;};
 },[app.email,app.name]);
 return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
   <ScrollView contentContainerStyle={{paddingHorizontal:18,paddingTop:12,
     paddingBottom:85,maxWidth:900,width:'100%',alignSelf:'center'}}>
     <PageHeader onBack={()=>router.back()}/>
     <View style={{flexDirection:'row',alignItems:'center',gap:9,marginTop:14}}>
       <Ionicons name="eye-outline" size={19} color={theme.muted}/>
       <Text style={{color:theme.foreground,fontSize:20,fontWeight:'700'}}>Aperçu de mon profil</Text>
     </View>
     <Text style={{color:theme.muted,fontSize:11,lineHeight:18,marginTop:8}}>
       Aperçu de la présentation publique. Les brouillons privés ne sont pas visibles ici.
       Les publications du compte ne sont affichées que si elles sont disponibles dans ce flux.
     </Text>
     <View style={{alignItems:'center',gap:8,marginTop:29,marginBottom:25}}>
       {avatar?<Image source={{uri:avatar}} style={{width:102,height:102,borderRadius:51}}/>:<Avatar size={102}/>}
       <Text style={{color:theme.foreground,fontSize:24,fontWeight:'800'}}>{app.name}</Text>
       {!!app.bio&&<Text style={{fontSize:14,color:theme.muted,lineHeight:22,textAlign:'center',maxWidth:430}}>{app.bio}</Text>}
       {!!app.church&&<Text style={{fontSize:12,color:theme.muted}}>{app.church}</Text>}
     </View>
     <Text style={{fontWeight:'700',fontSize:18,color:theme.foreground,marginBottom:14}}>Mes talents</Text>
     <View style={{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:25}}>
       {talents.map((t,i)=><ProfileTalentTile key={i} title={t.name}
         level={levels[t.level]||'À définir'} art={art(t.name)} width={tileWidth}
         onPress={()=>setSelectedTalent(t)}/>)}
     </View>
     {talents.length===0?<Text style={{fontSize:12,color:theme.muted,marginBottom:25}}>Aucun talent enregistré.</Text>:null}
     <Text style={{fontWeight:'700',fontSize:18,color:theme.foreground,marginBottom:14}}>Mes publications</Text>
     {posts.length>0?<ProfilePublicationFeed grid items={posts} contentWidth={contentWidth} featuredId={featuredId}/>:
       <Text style={{fontSize:12,color:theme.muted,lineHeight:19}}>Aucune publication publique disponible dans cet aperçu pour le moment.</Text>}
     <Pressable onPress={()=>router.back()} accessibilityRole="button"
       style={{alignSelf:'center',padding:13,marginTop:25,borderWidth:1,borderColor:theme.border,borderRadius:10}}>
       <Text style={{color:theme.foreground,fontSize:12,fontWeight:'700'}}>Retour à la modification du profil</Text>
     </Pressable>
   </ScrollView>
   <Modal visible={selectedTalent!==null} transparent animationType="fade"
     onRequestClose={()=>setSelectedTalent(null)}>
     <View style={{flex:1,backgroundColor:'rgba(0,0,0,.57)',justifyContent:'center',padding:19}}>
       <Pressable onPress={()=>setSelectedTalent(null)} style={{position:'absolute',top:0,bottom:0,left:0,right:0}}/>
       <View style={{padding:23,borderRadius:15,backgroundColor:theme.surface,
         maxWidth:430,width:'100%',alignSelf:'center',gap:11}}>
         <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
           <Text style={{color:theme.foreground,fontSize:22,fontWeight:'700'}}>
             {selectedTalent?.name}
           </Text>
           <Pressable onPress={()=>setSelectedTalent(null)} accessibilityLabel="Fermer">
             <Ionicons name="close-outline" size={22} color={theme.foreground}/>
           </Pressable>
         </View>
         <Text style={{color:theme.muted,fontSize:12}}>
           Niveau : {selectedTalent?levels[selectedTalent.level]||'À définir':''}
         </Text>
         {!!selectedTalent?.description&&<Text style={{color:theme.foreground,fontSize:13,lineHeight:21}}>
           {selectedTalent.description}
         </Text>}
         {!!selectedTalent?.interests?.length&&<Text style={{color:theme.muted,fontSize:12}}>
           Recherche : {selectedTalent.interests.join(' · ')}
         </Text>}
       </View>
     </View>
   </Modal>
   <Nav/>
 </SafeAreaView>;
}
