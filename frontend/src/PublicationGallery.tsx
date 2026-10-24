import React from 'react';
import {ImageBackground,Pressable,Share,StyleSheet,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {Publication} from './discoveryData';
import {colors as c} from './theme';
import {useApp} from './context';
import {ActionRail} from './ActionRail';

export const publicationPath=(p:Publication)=>
 p.type==='dream'?({pathname:'/dream/[id]',params:{id:p.id}} as const):
 p.type==='music'?({pathname:'/music/[id]',params:{id:p.id}} as const):
 ({pathname:'/bible/[reference]',params:{reference:p.referenceId,verse:String(p.highlightedVerse)}} as const);

function Action({icon,label,onPress}:{icon:keyof typeof Ionicons.glyphMap,label:string,onPress:()=>void}){
 return <Pressable accessibilityLabel={label} onPress={onPress} hitSlop={7} style={s.action}>
  <Ionicons name={icon} size={19} color="#fff"/>
 </Pressable>;
}

export function PublicationTile({item,compact=false}:{item:Publication,compact?:boolean}){
 const height=compact?203:item.type==='bible'?214:item.type==='music'?250:285;
 const open=()=>router.push(publicationPath(item) as any);
 const share=()=>{void Share.share({message:item.title+' — JenLow Network'});};
 const typeLabel=item.type==='dream'?'RÊVE':item.type==='music'?'MUSIQUE':'BIBLE';
 return <View style={[s.outer,{height}]}>
  <Pressable onPress={open} style={{flex:1}} accessibilityLabel={'Read '+item.title}>
   <ImageBackground source={{uri:item.image}} accessibilityLabel={item.imageAlt} resizeMode="cover" imageStyle={{borderRadius:11}} style={s.image}>
    <View style={s.shade}/>
    <View style={s.top}><Text style={s.type}>{typeLabel}</Text>{item.type==='music'?<Ionicons name="play-circle" size={35} color="#fff"/>:null}</View>
    <View style={s.bottom}>
     {item.type==='dream'?<View style={{alignSelf:'flex-start',borderRadius:5,backgroundColor:item.phase==='Rêve'?'#e6e6e6':item.phase==='Initiation'?'#e0f1e4':item.phase==='En route'?'#fff0c8':'#f2e5ef',paddingHorizontal:7,paddingVertical:4}}><Text style={{fontSize:9,color:'#333',fontWeight:'700'}}>{item.phase.toUpperCase()}</Text></View>:null}
     <Text style={s.title} numberOfLines={3}>{item.title}</Text>
     <Text style={s.author}>{item.author}</Text>
    </View>
   </ImageBackground>
  </Pressable>
  <View style={s.buttons}><ActionRail item={item}/></View>
 </View>;
}

export function PublicationGallery({items}:{items:Publication[]}){
 return <View style={s.gallery}>
  {[0,1].map(column=><View key={column} style={{flex:1,gap:11}}>
   {items.filter((_,i)=>i%2===column).map(item=><PublicationTile item={item} key={item.id}/>)}
  </View>)}
 </View>;
}
const s=StyleSheet.create({
 gallery:{flexDirection:'row',gap:11,alignItems:'flex-start'},
 outer:{borderRadius:11,overflow:'hidden',backgroundColor:'#eee',position:'relative'},
 image:{width:'100%',height:'100%',justifyContent:'space-between'},
 shade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(0,0,0,.38)',borderRadius:11},
 top:{padding:10,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
 type:{fontSize:9,letterSpacing:.7,color:'#fff',fontWeight:'700'},
 bottom:{paddingLeft:11,paddingRight:33,paddingBottom:12,gap:5},
 meta:{color:'#d4edda',fontSize:9,fontWeight:'700',letterSpacing:.4},
 title:{fontSize:15,fontWeight:'700',color:'#fff',lineHeight:19},
 author:{fontSize:11,color:'#f2f2f2'},
 buttons:{position:'absolute',right:6,bottom:8,gap:5},
 action:{backgroundColor:'rgba(0,0,0,.40)',borderRadius:20,width:28,height:28,alignItems:'center',justifyContent:'center'},
});
