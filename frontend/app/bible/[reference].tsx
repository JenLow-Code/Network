import React,{useRef,useState} from 'react';
import {ScrollView,Text,View,type ScrollViewInstance} from 'react-native';
import {useLocalSearchParams} from 'expo-router';
import {psalm150,biblePosts} from '@/discoveryData';
import {PublicationDetail} from '@/PublicationDetail';
const READER_HEIGHT=340;
export default function Bible(){
 const {verse}=useLocalSearchParams<{reference:string;verse?:string}>();
 const focus=Math.max(1,Math.min(psalm150.length,Number(verse||6)||6));
 const post=biblePosts.find(p=>p.highlightedVerse===focus)||biblePosts[0];
 const inner=useRef<ScrollViewInstance>(null);
 const positions=useRef<Record<number,{y:number;height:number}>>({});
 const [ready,setReady]=useState(false);
 const centre=()=>{const pos=positions.current[focus];if(pos)inner.current?.scrollTo({y:Math.max(0,pos.y+pos.height/2-READER_HEIGHT/2),animated:false})};
 return <PublicationDetail item={post}>
  <ScrollView ref={inner} nestedScrollEnabled showsVerticalScrollIndicator style={{height:READER_HEIGHT,backgroundColor:'#FAFAFA',borderRadius:10}} contentContainerStyle={{gap:5,padding:8,paddingBottom:16}} onContentSizeChange={()=>{if(!ready){centre();setReady(true)}}}>
   {psalm150.map((v,i)=><View key={i} onLayout={e=>{positions.current[i+1]=e.nativeEvent.layout;if(i===psalm150.length-1)requestAnimationFrame(centre)}} style={{flexDirection:'row',gap:9,borderRadius:7,padding:10,backgroundColor:i+1===focus?'#F7E9F0':'#fff'}}>
    <Text style={{fontSize:11,color:i+1===focus?'#CB245C':'#777'}}>{i+1}</Text>
    <Text style={{flex:1,fontSize:15,lineHeight:21,color:'#333',fontWeight:i+1===focus?'700':'400'}}>{v}</Text>
   </View>)}
  </ScrollView>
 </PublicationDetail>;
}
