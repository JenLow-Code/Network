import React,{useState} from 'react';
import {Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router,useLocalSearchParams} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {Nav} from '@/components';
import {useDreams} from '@/domain/dreamRepository';
export default function FlowerPreparation(){
 const {id}=useLocalSearchParams<{id:string}>();
 const {items,complete}=useDreams();
 const dream=items.find(d=>d.id===id);
 const [story,setStory]=useState(''),[media,setMedia]=useState(''),[finished,setFinished]=useState(false);
 if(!dream)return <SafeAreaView><Text>Rêve introuvable</Text></SafeAreaView>;
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}><ScrollView contentContainerStyle={{padding:20,gap:14}}>
  <Pressable onPress={()=>router.back()}><Ionicons name="chevron-back" size={25}/></Pressable>
  <Text style={{fontSize:26,fontWeight:'700'}}>Floraison</Text>
  <Text style={{color:'#666'}}>Raconter ce que cette plante a produit · {dream.title}</Text>
  <Text style={{fontWeight:'700'}}>Mon témoignage</Text><TextInput multiline value={story} onChangeText={setStory} placeholder="Comment mon rêve a fleuri…" style={{borderWidth:1,borderColor:'#ddd',borderRadius:10,padding:12,minHeight:140,textAlignVertical:'top'}}/>
  <Text style={{fontWeight:'700'}}>Photos, vidéos, sons et documents</Text>
  <Text style={{fontSize:12,color:'#888'}}>Zone de préparation. Le stockage et l'envoi de médias réels ne sont pas encore disponibles.</Text>
  <TextInput value={media} onChangeText={setMedia} placeholder="Lien facultatif de démonstration" style={{borderWidth:1,borderColor:'#ddd',borderRadius:10,padding:12}}/>
  <Pressable onPress={()=>setFinished(v=>!v)} style={{flexDirection:'row',gap:10,alignItems:'center',padding:12}}><Ionicons name={finished?'checkbox':'square-outline'} size={24} color={finished?'#CB245C':'#444'}/><Text>Ma floraison est prête à être partagée</Text></Pressable>
  <Pressable disabled={!finished||!story.trim()} onPress={()=>{complete(dream.id,story.trim(),media.trim()?'photo':'text',media.trim());router.replace('/my-space')}} style={{padding:15,backgroundColor:finished&&story.trim()?'#222':'#bbb',borderRadius:10,alignItems:'center'}}><Text style={{color:'#fff',fontWeight:'700'}}>Publier ma floraison</Text></Pressable>
  <Text style={{color:'#888',fontSize:11}}>Cette publication est un état local de démonstration. Les rappels, fruits et médias multiples seront ajoutés plus tard.</Text>
 </ScrollView><Nav/></SafeAreaView>;
}
