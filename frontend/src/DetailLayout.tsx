import React from 'react';
import {Pressable,ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import Svg,{Defs,LinearGradient as SvgGradient,Stop,Rect} from 'react-native-svg';
import {Publication,PHASE_COLORS,PHASE_LABELS,publications,personPublications} from './discoveryData';
import {DreamPhaseIcon} from './DreamPhaseIcon';
import {TalentArt} from './TalentArt';
import {TalentLevelDots} from './TalentLevelDots';
import {ActionRail} from './ActionRail';
import {Nav,TopActions} from './components';
import {personPath} from './people';
import {PublicationGallery} from './PublicationGallery';
import {useAppTheme} from './AppTheme';

const NEUTRAL='#E1E0DE';
export function DetailLayout({item,children,featured}:{item:Publication;children:React.ReactNode;featured?:React.ReactNode}){
 const theme=useAppTheme();
 const base=item.type==='dream'?PHASE_COLORS[item.phase].background:NEUTRAL;
 const subtitle=item.type==='dream'?PHASE_LABELS[item.phase]:item.type==='music'?item.songAuthor:item.type==='talent'?item.level:'Louis Segond 1910';
 // Community will be included here once members have a verified public affiliation.
 const byline=item.author;
 return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
  <ScrollView contentContainerStyle={{maxWidth:680,width:'100%',alignSelf:'center',paddingBottom:50}}>
   <View style={{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingTop:10,minHeight:44}}>
    <Pressable onPress={()=>router.back()} accessibilityLabel="Retour" style={{width:44}}><Ionicons name="chevron-back" size={25} color={theme.foreground}/></Pressable>
    <View style={{flex:1}}/>
    <TopActions/>
   </View>
   <View style={{paddingHorizontal:19,paddingTop:12,paddingBottom:36,minHeight:330,position:'relative'}}><View pointerEvents="none" style={{position:'absolute',top:0,bottom:0,left:0,right:0}}><Svg width="100%" height="100%"><Defs><SvgGradient id="detailGradient" x1="0" y1="0" x2="0" y2="1"><Stop offset="0%" stopColor={base}/><Stop offset="100%" stopColor={theme.background}/></SvgGradient></Defs><Rect width="100%" height="100%" fill="url(#detailGradient)"/></Svg></View>
    <View style={{alignItems:'center',gap:4,paddingHorizontal:14}}>
     <Text style={{fontSize:21,fontWeight:'800',textAlign:'center',color:theme.foreground}}>{item.title}</Text>
     <Text style={{fontSize:12,color:theme.muted}}>{subtitle}</Text>
     <Pressable onPress={()=>router.push(personPath(item.author))}><Text style={{fontSize:12,color:theme.foreground,textAlign:'center',marginTop:2}}>{byline}</Text></Pressable>
    </View>
    <View style={{alignItems:'center',justifyContent:'center',minHeight:104,marginTop:13,marginBottom:13}}>
     {item.type==='dream'?<DreamPhaseIcon phase={item.phase} size={76}/>:item.type==='talent'?<><TalentArt kind={item.instrument} size={110}/><TalentLevelDots level={item.level}/></>:<Ionicons name={item.type==='music'?'musical-notes-outline':'book-outline'} color="#3F3F3F" size={58}/>}
    </View>
    <View style={{flexDirection:'row',gap:8,alignItems:'flex-start'}}>
     <View style={{flex:1,minWidth:0}}>{featured}{children}</View>
     <View style={{width:42,alignItems:'center',justifyContent:'flex-end',paddingTop:6}}><ActionRail item={item}/></View>
    </View>
   </View>
   <View style={{paddingHorizontal:19}}>
    <Text style={{fontSize:18,fontWeight:'700',color:theme.foreground,marginTop:18,marginBottom:14}}>Continuer l’inspiration</Text>
    <PublicationGallery items={[...publications,...personPublications].filter(p=>p.id!==item.id)}/>
   </View>
  </ScrollView>
  <Nav/>
 </SafeAreaView>;
}
