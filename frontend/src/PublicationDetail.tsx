import React,{useState} from 'react';
import {Image,Pressable,ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {Nav,TopActions} from './components';
import {ActionRail} from './ActionRail';
import {Publication,PHASE_COLORS} from './discoveryData';
import {PublicationGallery} from './PublicationGallery';
import {publications} from './discoveryData';
import {personPath} from './people';
import {useAppTheme} from './AppTheme';

export function DetailPanel({title,children,foldable=false,defaultOpen=true}:{title:string;children:React.ReactNode;foldable?:boolean;defaultOpen?:boolean}){
 const [open,setOpen]=useState(defaultOpen);
 return <View style={{backgroundColor:'#FFFDF9',borderRadius:11,padding:12,marginBottom:7}}>
  <Pressable disabled={!foldable} onPress={()=>setOpen(v=>!v)} style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:5}}>
   <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={{fontFamily:'Caveat_700Bold',fontSize:21,color:'#262626',flexShrink:1}}>{title}</Text>
   {foldable?<Ionicons name={open?'chevron-up':'chevron-down'} size={17} color="#333"/>:null}
  </Pressable>
  {open?<View style={{marginTop:5}}>{children}</View>:null}
 </View>;
}
/** Shared visual shell for Bible, Music and Talents, matching the Dream layout. */
export function PublicationDetail({item,children,media}:{item:Publication;children:React.ReactNode;media?:React.ReactNode;onImageDoubleTap?:()=>void}){
 const theme=useAppTheme();
 const color=item.type==='bible'?PHASE_COLORS.Témoignage.background:item.type==='talent'?'#EEE9E2':'#E8E3DD';
 const subtitle=item.type==='bible'?'Louis Segond 1910':item.author;
 const avatar=item.author==='Sarah'?'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=220&q=80':'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=220&q=80';
 return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
  <ScrollView contentContainerStyle={{paddingHorizontal:17,paddingTop:11,paddingBottom:54,maxWidth:650,width:'100%',alignSelf:'center'}}>
   <View style={{flexDirection:'row',alignItems:'center',minHeight:63,borderBottomWidth:1,borderColor:theme.border}}>
    <Pressable onPress={()=>router.back()} accessibilityLabel="Retour" style={{width:43}}><Ionicons name="chevron-back" size={25} color={theme.foreground}/></Pressable>
    <View style={{flex:1,alignItems:'center'}}><Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7} style={{fontWeight:'800',fontSize:17,color:theme.foreground,textAlign:'center'}}>{item.title}</Text><Text style={{fontSize:11,color:theme.muted,marginTop:3}}>{subtitle}</Text></View>
    <TopActions/>
   </View>
   <View style={{paddingTop:45,paddingBottom:12}}>
    <View style={{width:'91%',borderRadius:12,backgroundColor:color,paddingTop:16,paddingBottom:12,paddingLeft:15,paddingRight:9}}>
     <Pressable onPress={()=>router.push(personPath(item.author))} accessibilityLabel={'Profil de '+item.author} style={{position:'absolute',top:-34,right:-24,zIndex:4}}>
      <Image source={{uri:avatar}} style={{width:95,height:95,borderRadius:48}}/>
     </Pressable>
     <View style={{flexDirection:'row',gap:7}}>
      <View style={{flex:1,minWidth:0}}>
       {media?<View style={{marginBottom:8,paddingTop:14}}>{media}</View>:null}
       {children}
      </View>
      <View style={{width:39,justifyContent:'flex-end',alignItems:'center',paddingBottom:11}}><ActionRail item={item}/></View>
     </View>
    </View>
   </View>
   <Text style={{fontSize:18,fontWeight:'800',color:theme.foreground,marginTop:22,marginBottom:14}}>Continuer l’inspiration</Text>
   <PublicationGallery items={publications.filter(p=>p.id!==item.id)}/>
  </ScrollView><Nav/>
 </SafeAreaView>;
}
