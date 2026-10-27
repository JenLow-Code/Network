import React from 'react';
import {Image,Platform,Pressable,ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {SeedIcon} from './SeedIcon';
import Svg,{Defs,RadialGradient,Stop,Rect} from 'react-native-svg';
import {router} from 'expo-router';
import {Nav,TopActions,Avatar} from './components';
import {ActionRail} from './ActionRail';
import {Publication,PHASE_LABELS,PHASE_COLORS,PHASE_SYMBOLS} from './discoveryData';
import {PublicationGallery} from './PublicationGallery';
import {publications} from './discoveryData';
import {personPath} from './people';

/** Single detail-page shell shared by Dream, Music, and Bible posts. */
export function PublicationDetail({item,children,media}:{item:Publication;children:React.ReactNode;media?:React.ReactNode}){
 const phase=item.type==='dream'?item.phase:null;
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}>
  <ScrollView style={{flex:1}} contentContainerStyle={{paddingHorizontal:16,paddingTop:10,paddingBottom:56,maxWidth:840,width:'100%',alignSelf:'center'}}>
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:0}}>
    <Pressable onPress={()=>router.back()} accessibilityLabel="Retour" style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><Ionicons name="chevron-back" size={24} color="#222"/></Pressable>
    <View style={{flex:1,minWidth:0,overflow:'hidden',marginHorizontal:6}}><Text numberOfLines={1} ellipsizeMode="tail" adjustsFontSizeToFit minimumFontScale={0.5} style={[{fontSize:17,lineHeight:21,fontWeight:'700',color:'#171717'},Platform.OS==='web'?({whiteSpace:'nowrap',textOverflow:'ellipsis',overflow:'hidden',display:'block'} as any):null]}>{item.title}</Text></View>
    <TopActions/>
   </View>
   {phase?<View style={{flexDirection:'row',alignItems:'center',gap:6,marginTop:-9,marginBottom:3,paddingLeft:50,justifyContent:'flex-start'}}><Text style={{fontSize:11,color:PHASE_COLORS[phase].foreground}}>{'Rêve en '+PHASE_LABELS[phase].toLowerCase()}</Text></View>:null}
   <View style={{borderWidth:1,borderColor:'#E8E8E8',borderRadius:16,padding:13,backgroundColor:'#fff'}}>
    <View style={{flexDirection:'row',alignItems:'stretch',gap:7}}>
     <View style={{flex:1,minWidth:0,position:'relative'}}>
      {media??<Image source={{uri:item.image}} resizeMode="cover" style={{width:'100%',height:item.type==='bible'?280:230,borderRadius:10,backgroundColor:'#f3f3f3'}}/>}
      {phase?<View pointerEvents="none" style={{position:'absolute',left:0,right:0,top:0,bottom:0,alignItems:'center',justifyContent:'center',borderRadius:10,overflow:'hidden'}}><Svg width="100%" height="100%" style={{position:'absolute'}}><Defs><RadialGradient id="shade" cx="50%" cy="50%" rx="72%" ry="72%"><Stop offset="0%" stopColor="#fff" stopOpacity="0.2"/><Stop offset="100%" stopColor="#000" stopOpacity="0.55"/></RadialGradient></Defs><Rect width="100%" height="100%" fill="url(#shade)"/></Svg>{phase==='Rêve'?<SeedIcon size={75}/>:<Text style={{fontSize:58}}>{PHASE_SYMBOLS[phase]}</Text>}</View>:null}
     </View>
     <View style={{width:48,alignItems:'center',justifyContent:'space-between'}}><Pressable accessibilityLabel={'Voir le profil de '+item.author} onPress={()=>router.push(personPath(item.author))} style={{alignItems:'center',gap:3}}><Avatar size={27}/><Text numberOfLines={1} style={{fontSize:10,color:'#555',maxWidth:48,textAlign:'center'}}>{item.author}</Text></Pressable>{item.type!=='talent'?<ActionRail item={item}/>:null}</View>
    </View>
    <View style={{paddingTop:14}}>{children}</View>
   </View>
   <Text style={{fontSize:18,fontWeight:'700',color:'#202020',marginTop:25,marginBottom:13}}>Continuer l’inspiration</Text>
   <PublicationGallery items={publications.filter(p=>p.id!==item.id)}/>
  </ScrollView>
  <Nav/>
 </SafeAreaView>;
}
