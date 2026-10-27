import React,{useState} from 'react';
import {Image,Pressable,ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {DreamPublication,PHASE_COLORS,PHASE_LABELS,publications} from './discoveryData';
import {Avatar,Nav} from './components';
import {ActionRail} from './ActionRail';
import {DreamPhaseIcon} from './DreamPhaseIcon';
import {PublicationGallery} from './PublicationGallery';
import {personPath} from './people';
import {useApp} from './context';
import {useAppTheme} from './AppTheme';

function Panel({title,children,initiallyOpen=true,minHeight=0,collapsible=true}:{title:string;children:React.ReactNode;initiallyOpen?:boolean;minHeight?:number;collapsible?:boolean}){
 const [open,setOpen]=useState(initiallyOpen);
 return <View style={{backgroundColor:'#FFFDF9',borderRadius:11,paddingHorizontal:11,paddingVertical:10,marginBottom:11,minHeight:open?minHeight:0}}>
  <Pressable disabled={!collapsible} onPress={()=>setOpen(v=>!v)} accessibilityRole="button" accessibilityLabel={title} style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',minHeight:24}}>
   <Text style={{fontWeight:'800',fontSize:14,color:'#171717'}}>{title}</Text>
   {collapsible?<Ionicons name={open?'chevron-up':'chevron-down'} size={16} color="#333"/>:null}
  </Pressable>
  {open?<View style={{marginTop:3}}>{children}</View>:null}
 </View>;
}

export function DreamReferenceLayout({item}:{item:DreamPublication}){
 const theme=useAppTheme();const app=useApp();
 const phase=PHASE_COLORS[item.phase];
 const sameDream=()=>app.joinDream(item.id);
 return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
  <ScrollView style={{flex:1}} contentContainerStyle={{paddingHorizontal:17,paddingTop:11,paddingBottom:50,maxWidth:650,width:'100%',alignSelf:'center'}}>
   <View style={{flexDirection:'row',alignItems:'center',minHeight:63,borderBottomWidth:1,borderColor:theme.border}}>
    <Pressable onPress={()=>router.back()} accessibilityLabel="Retour" style={{width:43,alignItems:'flex-start',justifyContent:'center'}}><Ionicons name="chevron-back" size={25} color={theme.foreground}/></Pressable>
    <View style={{flex:1,alignItems:'center',paddingRight:43}}>
     <Text numberOfLines={2} style={{fontWeight:'800',fontSize:17,textAlign:'center',color:theme.foreground}}>{item.title}</Text>
     <Pressable onPress={()=>router.push(personPath(item.author))}><Text style={{fontSize:11,color:theme.muted,textAlign:'center',marginTop:3}}>{item.author} · {PHASE_LABELS[item.phase]}</Text></Pressable>
    </View>
   </View>
   <View style={{paddingTop:46,paddingBottom:13}}>
    <View style={{backgroundColor:phase.background,borderRadius:12,paddingTop:30,paddingBottom:13,paddingLeft:15,paddingRight:10,width:'91%',alignSelf:'flex-start',position:'relative'}}>
     <Pressable onPress={()=>router.push(personPath(item.author))} accessibilityLabel={'Profil de '+item.author} style={{position:'absolute',top:-35,right:-23,width:96,height:96,borderRadius:48,borderWidth:4,borderColor:theme.background,backgroundColor:theme.background,zIndex:3,alignItems:'center',justifyContent:'center'}}>
      <Image source={{uri:item.author==='Gustav'?'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&q=80':'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&q=80'}} style={{width:87,height:87,borderRadius:44}} resizeMode="cover"/>
     </Pressable>
     <View style={{flexDirection:'row',alignItems:'stretch',gap:8}}>
      <View style={{flex:1,paddingTop:0}}>
       <Panel title="Mon but" collapsible={false} minHeight={96}><Text style={{fontSize:13,lineHeight:19,color:'#333'}}>{item.summary}</Text></Panel>
       <View style={{alignItems:'flex-end',marginTop:-19,marginRight:11,marginBottom:6,zIndex:2}} pointerEvents="none"><DreamPhaseIcon phase={item.phase} size={25}/></View>
       <Panel title="Ma motivation" minHeight={134}><Text style={{fontSize:13,lineHeight:20,color:'#333'}}>{item.motivation||'Ce rêve me tient à cœur.'}</Text></Panel>
       <Panel title="Les talents nécessaires" minHeight={155}>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:6,marginBottom:8}}>
         {item.needs.map((n,i)=><View key={n} style={{alignItems:'center',gap:4}}><View style={{width:31,height:31,borderRadius:16,backgroundColor:'#D71D77'}}/><Text style={{fontSize:9,color:'#666',maxWidth:65,textAlign:'center'}}>{n}</Text></View>)}
        </View>
        <Text style={{fontSize:12,color:'#555'}}>Propose ton aide pour faire grandir ce rêve.</Text>
       </Panel>
       {item.phase==='Initiation'&&<Panel title="Date objectif"><Text style={{fontSize:12,color:'#444'}}>{item.goalDate||'À définir'}</Text></Panel>}
       {item.phase==='Croissance'&&<Panel title="Journal de croissance">{(item.logs||[]).map((log,i)=><View key={i} style={{flexDirection:'row',gap:7,marginTop:7}}><Ionicons name="leaf-outline" size={17} color="#378968"/><Text style={{fontSize:12,color:'#444',flex:1}}>{log}</Text></View>)}</Panel>}
      </View>
      <View style={{width:39,justifyContent:'flex-end',alignItems:'center',paddingBottom:12}}><ActionRail item={item}/></View>
     </View>
     {item.phase==='Rêve'?<Pressable onPress={sameDream} style={{alignSelf:'center',borderRadius:18,borderWidth:1,borderColor:'#fff',backgroundColor:'#FFFDF9',paddingHorizontal:18,paddingVertical:8,marginTop:10}}><Text style={{fontSize:12,color:'#252525'}}>{app.myDreamIds.includes(item.id)?'Moi aussi ✓':'Moi aussi'}</Text></Pressable>:null}
    </View>
   </View>
   <Text style={{fontSize:18,fontWeight:'800',color:theme.foreground,marginTop:24,marginBottom:14}}>Continuer l’inspiration</Text>
   <PublicationGallery items={publications.filter(p=>p.id!==item.id)}/>
  </ScrollView>
  <Nav/>
 </SafeAreaView>;
}
