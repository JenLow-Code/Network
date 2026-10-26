import React from 'react';
import {Image,Pressable,ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {Nav,TopActions,Avatar} from './components';
import {ActionRail} from './ActionRail';
import {Publication,PHASE_LABELS,PHASE_COLORS} from './discoveryData';
import {PublicationGallery} from './PublicationGallery';
import {publications} from './discoveryData';

/** Single detail-page shell shared by Dream, Music, and Bible posts. */
export function PublicationDetail({item,children,media}:{item:Publication;children:React.ReactNode;media?:React.ReactNode}){
 const phase=item.type==='dream'?item.phase:null;
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}>
  <ScrollView style={{flex:1}} contentContainerStyle={{paddingHorizontal:16,paddingTop:10,paddingBottom:56,maxWidth:840,width:'100%',alignSelf:'center'}}>
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:13}}>
    <Pressable onPress={()=>router.back()} accessibilityLabel="Retour" style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><Ionicons name="chevron-back" size={24} color="#222"/></Pressable>
    <TopActions/>
   </View>
   <View style={{borderWidth:1,borderColor:'#E8E8E8',borderRadius:16,padding:13,backgroundColor:'#fff'}}>
    <View style={{flexDirection:'row',alignItems:'flex-start',justifyContent:'space-between',gap:12,marginBottom:13}}>
     <Text style={{flex:1,fontSize:22,lineHeight:27,fontWeight:'700',color:'#171717'}}>{item.title}</Text>
     <View style={{flexDirection:'row',alignItems:'center',gap:6}}><Avatar size={28}/><Text style={{fontSize:12,color:'#555'}}>{item.author}</Text></View>
    </View>
    <View style={{flexDirection:'row',alignItems:'center',gap:7}}>
     <View style={{flex:1,minWidth:0}}>
      {media??<Image source={{uri:item.image}} resizeMode="cover" style={{width:'100%',height:item.type==='bible'?280:230,borderRadius:10,backgroundColor:'#f3f3f3'}}/>}
      {phase?<View style={{position:'absolute',left:10,top:10,paddingHorizontal:10,paddingVertical:5,borderRadius:8,backgroundColor:PHASE_COLORS[phase].background}}><Text style={{fontSize:11,fontWeight:'700',color:PHASE_COLORS[phase].foreground}}>{PHASE_LABELS[phase]}</Text></View>:null}
     </View>
     <View style={{width:44,alignItems:'center',justifyContent:'center'}}><ActionRail item={item}/></View>
    </View>
    <View style={{paddingTop:14}}>{children}</View>
   </View>
   <Text style={{fontSize:18,fontWeight:'700',color:'#202020',marginTop:25,marginBottom:13}}>Continuer l’inspiration</Text>
   <PublicationGallery items={publications.filter(p=>p.id!==item.id)}/>
  </ScrollView>
  <Nav/>
 </SafeAreaView>;
}
