import React,{useId,useState} from 'react';
import {Pressable,ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import Svg,{Defs,LinearGradient as SvgGradient,Stop,Rect} from 'react-native-svg';
import {Publication,PHASE_COLORS,PHASE_LABELS,publications,personPublications,publicationColor} from './discoveryData';
import {ActionRail} from './ActionRail';
import {PublicationImageFade,DETAIL_FADE_HEIGHT} from './PublicationImageFade';
import {Nav,TopActions} from './components';
import {personPath} from './people';
import {PublicationGallery} from './PublicationGallery';
import {useAppTheme} from './AppTheme';


/**
 * Shared detail shell.
 * Header stays above the gradient. The publication artwork occupies the
 * former overlapping avatar position; reactions sit beside the last panel.
 */
export function DetailLayout({item,children,featured,headerIcon}:{item:Publication;children:React.ReactNode;featured?:React.ReactNode;headerIcon?:React.ReactNode}){
 const theme=useAppTheme();
 const base=publicationColor(item);
 const gradientId=useId().replace(/[^a-zA-Z0-9_-]/g,'');
 const [headerWidth,setHeaderWidth]=useState(250);
 // React Native Web does not consistently implement adjustsFontSizeToFit.
 // Estimate glyph widths against the measured header space to keep the full title on one line.
 const textUnits=Array.from(item.title).reduce((sum,char)=>sum+(/[mwMW@#]/.test(char)?0.84:/[ilI!.,'’]/.test(char)?0.31:/\s/.test(char)?0.34:/[A-Z]/.test(char)?0.68:0.57),0);
 const titleSize=Math.min(17,Math.max(7,Math.floor((headerWidth-8)/(Math.max(1,textUnits)*1.09))));
 const subtitle=item.type==='dream'?PHASE_LABELS[item.phase]:item.type==='music'?item.songAuthor:item.type==='talent'?item.level:'Louis Segond 1910';
 // Public community affiliation is not yet available in the demo dataset.
 const byline=item.church?`${item.author} · ${item.church}`:item.author;
 const subtitleColor=item.type==='dream'?PHASE_COLORS[item.phase].foreground:theme.muted;
 return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
  <ScrollView contentContainerStyle={{maxWidth:680,width:'100%',alignSelf:'center',paddingBottom:50}}>
   <View style={{flexDirection:'row',alignItems:'center',minHeight:74,paddingHorizontal:17,paddingTop:11,borderBottomWidth:1,borderColor:theme.border}}>
    <Pressable onPress={()=>router.back()} accessibilityLabel="Retour" style={{width:43,alignItems:'flex-start',justifyContent:'center'}}>
     <Ionicons name="chevron-back" size={25} color={theme.foreground}/>
    </Pressable>
    <View onLayout={e=>{const w=Math.round(e.nativeEvent.layout.width);if(w>0&&w!==headerWidth)setHeaderWidth(w)}} style={{flex:1,alignItems:'center',minWidth:0,paddingHorizontal:3}}>
     <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4} style={{width:'100%',fontSize:titleSize,fontWeight:'800',textAlign:'center',color:theme.foreground,letterSpacing:-0.2}}>{item.title}</Text>
     <Text numberOfLines={1} style={{fontSize:11,color:subtitleColor,textAlign:'center',marginTop:3,fontWeight:item.type==='dream'?'700':'400'}}>{subtitle}</Text>
     <Pressable onPress={()=>router.push(personPath(item.author))} accessibilityLabel={'Voir le profil de '+item.author}>
      <Text numberOfLines={1} style={{fontSize:11,color:theme.foreground,textAlign:'center',marginTop:2}}>{byline}</Text>
     </Pressable>
    </View>
    <TopActions/>
   </View>
   <View style={{position:'relative',minHeight:DETAIL_FADE_HEIGHT,paddingTop:item.type==='dream'||item.type==='talent'?8:item.type==='bible'?20:24,paddingBottom:14}}>
    {/* Fixed-height fade: expanding panels must not stretch the gradient. */}
    <View pointerEvents="none" style={{position:'absolute',top:0,height:DETAIL_FADE_HEIGHT,left:0,right:0}}>
     <Svg width="100%" height="100%">
      <Defs><SvgGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
       <Stop offset="0%" stopColor={base}/><Stop offset="100%" stopColor={theme.background}/>
      </SvgGradient></Defs>
      <Rect width="100%" height="100%" fill={`url(#${gradientId})`}/>
     </Svg>
    </View>
    {(item.type==='dream'||item.type==='music')&&item.image?.trim()?<PublicationImageFade key={item.id} uri={item.image} background={theme.background}/>:null}
    {/* Music alone keeps the interactive Play/Pause control in its upper-left slot.
         Dream and Talent artwork now sits beside the featured heading below. */}
    {item.type==='music'&&headerIcon?<View pointerEvents="box-none"
      style={{position:'absolute',top:0,left:19,width:104,minHeight:96,alignItems:'center',justifyContent:'center',zIndex:3}}>
      {headerIcon}
    </View>:null}
    <View style={{width:'100%',paddingTop:12,paddingBottom:13,paddingLeft:19,paddingRight:19,position:'relative'}}> 
     <View style={{flexDirection:'row',alignItems:'stretch',gap:8}}>
      <View style={{flex:1,minWidth:0}}>{featured}{children}</View>
      <View style={{width:48,justifyContent:'flex-end',alignItems:'center',paddingBottom:5}}>
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
