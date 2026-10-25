import React,{useState} from 'react';
import {Pressable,Text,View,useWindowDimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router} from 'expo-router';
import {Nav} from '@/components';
import {FireHeader} from '@/FireHeader';
import {Ionicons} from '@expo/vector-icons';
import {DREAM_PHASES,PHASE_COLORS,DreamPhase} from '@/discoveryData';

const descriptions:Record<DreamPhase,string>={
 'Rêve':'Des idées à faire naître',
 'Initiation':'Rassembler les talents',
 'Croissance':'Les rêves prennent forme',
 'Témoignage':'Partager les fruits',
};
export default function MyDreams(){
 const [area,setArea]=useState({width:0,height:0});
 const gap=10;
 const w=Math.max(120,(area.width-gap)/2),h=Math.max(125,(area.height-gap)/2);
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}>
   <View style={{flex:1,paddingHorizontal:13,paddingTop:9,paddingBottom:12}}>
    <View style={{paddingHorizontal:4,paddingBottom:13}}><View style={{position:'absolute',right:5,top:4,zIndex:5,flexDirection:'row',alignItems:'center',gap:7}}><Pressable accessibilityLabel="Créer un rêve" onPress={()=>router.push('/my-dream/new')} style={{padding:6}}><Ionicons name="add-circle-outline" color="#D71D77" size={26}/></Pressable><FireHeader/></View>
     <Text style={{fontFamily:'Caveat_700Bold',fontSize:36,color:'#171717'}}>Mes rêves</Text>
     <Text style={{fontSize:12,color:'#888'}}>Un espace pour faire grandir tes rêves.</Text>
    </View>
    <View onLayout={e=>setArea({width:e.nativeEvent.layout.width,height:e.nativeEvent.layout.height})} style={{flex:1}}>
     {area.width>0&&area.height>0?
      <View style={{flex:1,gap}}>
       {[0,1].map(row=><View key={row} style={{flex:1,flexDirection:'row',gap}}>
        {DREAM_PHASES.slice(row*2,row*2+2).map((phase,i)=>{
          const index=row*2+i;
          return <Pressable key={phase} accessibilityRole="button" onPress={()=>router.push({pathname:'/my-dreams/[phase]',params:{phase}})} style={{flex:1,backgroundColor:PHASE_COLORS[phase].background,borderRadius:13,padding:15,justifyContent:'space-between'}}>
           <Ionicons name={index===0?'ellipse-outline':index===1?'leaf-outline':index===2?'trending-up-outline':'sunny-outline'} size={27} color={PHASE_COLORS[phase].foreground}/>
           <View><Text style={{fontSize:18,fontWeight:'700',color:'#202020'}}>{phase}</Text><Text style={{fontSize:12,lineHeight:17,color:'#555',marginTop:8}}>{descriptions[phase]}</Text></View>
          </Pressable>;
        })}
       </View>)}
      </View>:null}
    </View>
   </View>
   <Nav/>
 </SafeAreaView>;
}
