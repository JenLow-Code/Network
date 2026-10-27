import {Text,TextInput} from '@/i18n/LocalizedText';
import React,{useState} from 'react';
import {Alert,Image,Pressable,ScrollView,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {useDreams} from '@/domain/dreamRepository';
import {Nav,TopActions} from '@/components';
import {pickDreamImage} from '@/pickDreamImage';
export default function NewDream(){
 const {create}=useDreams();
 const [title,setTitle]=useState(''),[summary,setSummary]=useState(''),[image,setImage]=useState('https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&q=80'),[needs,setNeeds]=useState('');
 const valid=title.trim().length>2;
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}><ScrollView style={{flex:1}} contentContainerStyle={{padding:20,paddingBottom:30}}>
  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Pressable onPress={()=>router.back()}><Ionicons name="chevron-back" size={26}/></Pressable><TopActions/></View>
  <Text style={{fontSize:30,fontWeight:'700',marginVertical:16}}>Créer un rêve</Text>
  <Text style={{fontSize:12,color:'#666',marginBottom:22}}>Commence simplement. Le titre est définitif une fois créé; tu pourras faire grandir le reste.</Text>
  <Text style={{fontWeight:'600',fontSize:13}}>Nom du rêve *</Text>
  <TextInput value={title} onChangeText={setTitle} placeholder="Un résultat concret…" style={{borderWidth:1,borderColor:'#ddd',borderRadius:8,padding:12,marginTop:7,marginBottom:17}}/>
  <Text style={{fontWeight:'600',fontSize:13}}>Mon but</Text><TextInput multiline value={summary} onChangeText={setSummary} placeholder="Qu'aimerais-tu accomplir ?" style={{borderWidth:1,borderColor:'#ddd',borderRadius:8,padding:12,minHeight:90,marginTop:7,marginBottom:17}}/>
  <Text style={{fontWeight:'600',fontSize:13,marginBottom:9}}>Image du rêve</Text>
  <Pressable onPress={()=>pickDreamImage(setImage,message=>Alert.alert('Image',message))} style={{borderWidth:1,borderColor:'#ddd',borderRadius:8,padding:12,marginBottom:10,alignItems:'center'}}><Text>Importer une image</Text></Pressable>
  <View style={{flexDirection:'row',gap:8,marginBottom:17}}>{['https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800','https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800'].map(url=><Pressable key={url} onPress={()=>setImage(url)}><Image source={{uri:url}} style={{width:95,height:67,borderRadius:8}}/></Pressable>)}</View>
  <View style={{height:185,borderRadius:12,overflow:'hidden',marginBottom:17,backgroundColor:'#eee',justifyContent:'flex-end'}}><Image source={{uri:image}} style={{position:'absolute',width:'100%',height:'100%',opacity:.72}} resizeMode="cover"/><View style={{backgroundColor:'rgba(255,255,255,.8)',padding:12}}><Text style={{fontSize:23,fontWeight:'700',color:'#222'}}>{title.trim()||'Mon rêve'}</Text><Text style={{fontSize:11,color:'#555'}}>Semence</Text></View></View>
  <Text style={{fontWeight:'600',fontSize:13}}>Talents recherchés</Text><TextInput value={needs} onChangeText={setNeeds} placeholder="Guitare, chant, photographie…" style={{borderWidth:1,borderColor:'#ddd',borderRadius:8,padding:12,marginTop:7,marginBottom:19}}/>
  <Pressable disabled={!valid} onPress={()=>{const id=create({title:title.trim(),summary:summary.trim(),image:image.trim(),needs:needs.split(',').map(x=>x.trim()).filter(Boolean)});router.replace({pathname:'/my-dream/[id]',params:{id}})}} style={{backgroundColor:valid?'#111':'#bbb',padding:15,borderRadius:10,alignItems:'center'}}><Text style={{color:'#fff'}}>Créer mon rêve</Text></Pressable>
 </ScrollView><Nav/></SafeAreaView>;
}