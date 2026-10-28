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

/**
 * Shared detail shell.
 * Header stays above the gradient. The publication artwork occupies the
 * former overlapping avatar position; reactions sit beside the last panel.
 */
export function DetailLayout({item,children,featured}:{item:Publication;children:React.ReactNode;featured?:React.ReactNode}){
 const theme=useAppTheme();
 const base=item.type==='dream'?PHASE_COLORS[item.phase].background:NEUTRAL;
 const subtitle=item.type==='dream'?PHASE_LABELS[item.phase]:item.type==='music'?item.songAuthor:item.type==='talent'?item.level:'Louis Segond 1910';
 // Public community affiliation is not yet available in the demo dataset.
 const byline=item.author;
 return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
  <ScrollView contentContainerStyle={{maxWidth:680,width:'100%',alignSelf:'center',paddingBottom:50}}>
   <View style={{flexDirection:'row',alignItems:'center',minHeight:74,paddingHorizontal:17,paddingTop:11,borderBottomWidth:1,borderColor:theme.border}}>
    <Pressable onPress={()=>router.back()} accessibilityLabel="Retour" style={{width:43,alignItems:'flex-start',justifyContent:'center'}}>
     <Ionicons name="chevron-back" size={25} color={theme.foreground}/>
    </Pressable>
    <View style={{flex:1,alignItems:'center',minWidth:0,paddingHorizontal:3}}>
     <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55} style={{fontSize:17,fontWeight:'800',textAlign:'center',color:theme.foreground}}>{item.title}</Text>
     <Text numberOfLines={1} style={{fontSize:11,color:theme.muted,textAlign:'center',marginTop:3}}>{subtitle}</Text>
     <Pressable onPress={()=>router.push(personPath(item.author))} accessibilityLabel={'Voir le profil de '+item.author}>
      <Text numberOfLines={1} style={{fontSize:11,color:theme.foreground,textAlign:'center',marginTop:2}}>{byline}</Text>
     </Pressable>
    </View>
    <TopActions/>
   </View>
   <View style={{position:'relative',paddingTop:46,paddingBottom:14}}>
    <View pointerEvents="none" style={{position:'absolute',top:0,bottom:0,left:0,right:0}}>
     <Svg width="100%" height="100%">
      <Defs><SvgGradient id="detailGradient" x1="0" y1="0" x2="0" y2="1">
       <Stop offset="0%" stopColor={base}/><Stop offset="100%" stopColor={theme.background}/>
      </SvgGradient></Defs>
      <Rect width="100%" height="100%" fill="url(#detailGradient)"/>
     </Svg>
    </View>
    <View style={{width:'91%',paddingTop:item.type==='talent'?36:12,paddingBottom:13,paddingLeft:15,paddingRight:10,position:'relative'}}>
     <View pointerEvents="none" style={{position:'absolute',top:-35,right:-23,width:100,alignItems:'center',justifyContent:'center',zIndex:2}}>
      {item.type==='dream'?<View style={{height:96,justifyContent:'center',alignItems:'center'}}><DreamPhaseIcon phase={item.phase} size={70}/></View>:
       item.type==='talent'?<><TalentArt kind={item.instrument} size={94}/><TalentLevelDots level={item.level}/></>:
       <View style={{height:96,justifyContent:'center',alignItems:'center'}}><Ionicons name={item.type==='music'?'musical-notes-outline':'book-outline'} size={66} color="#3F3F3F"/></View>}
     </View>
     <View style={{flexDirection:'row',alignItems:'stretch',gap:8}}>
      <View style={{flex:1,minWidth:0}}>{featured}{children}</View>
      <View style={{width:39,justifyContent:'flex-end',alignItems:'center',paddingBottom:12}}>
       <ActionRail item={item}/>
      </View>
     </View>
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
