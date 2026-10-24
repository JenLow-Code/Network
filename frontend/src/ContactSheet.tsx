import React,{useRef,useState} from 'react';
import {Animated,Dimensions,PanResponder,Pressable,StyleSheet,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {Avatar} from './components';
type Status='online'|'busy'|'offline';
const contacts:{id:string;name:string;subtitle:string;status:Status}[]=[
 {id:'elynn',name:'Elynn Lee',subtitle:'email@fakedomain.net',status:'online'},
 {id:'helena',name:'Helena Hills',subtitle:'Active 11m ago',status:'online'},
 {id:'nebul',name:'nebulanomad',subtitle:'Offline',status:'offline'},
 {id:'shadow',name:'shadowlynx',subtitle:'Busy',status:'busy'}
];
const statusColor:{[K in Status]:string}={online:'#26C768',busy:'#F16B70',offline:'#B6B6B6'};
export function ContactSheet(){
 const expandedHeight=Math.min(Dimensions.get('window').height*.64,490);
 const translate=useRef(new Animated.Value(0)).current;
 const [open,setOpen]=useState(false);const openRef=useRef(false);
 function go(next:boolean){openRef.current=next;setOpen(next);Animated.spring(translate,{toValue:next?1:0,useNativeDriver:false,tension:65,friction:12}).start();}
 const pan=useRef(PanResponder.create({onStartShouldSetPanResponder:()=>true,onMoveShouldSetPanResponder:(_,g)=>Math.abs(g.dy)>6,onPanResponderRelease:(_,g)=>{if(g.dy<-24)go(true);else if(g.dy>24)go(false);else go(!openRef.current);}})).current;
 const height=translate.interpolate({inputRange:[0,1],outputRange:[105,expandedHeight]});
 return <Animated.View style={[styles.shell,{height}]}>
 <View {...pan.panHandlers} style={styles.handleArea}><View style={styles.handle}/><View style={styles.titleRow}><Text style={styles.heading}>Mes contacts</Text><Ionicons name={open?'chevron-down':'chevron-up'} size={16} color="#9a9a9a"/></View></View>
 <View style={{flex:1,overflow:'hidden'}}>{contacts.map((person,i)=><Pressable key={person.id} onPress={()=>router.push('/chat/helena')} style={[styles.contact,{borderBottomWidth:i===contacts.length-1?0:1}]}>
 <View style={styles.avatar}><Avatar size={32}/><View style={[styles.dot,{backgroundColor:statusColor[person.status]}]}/></View>
 <View style={{flex:1}}><Text style={styles.name}>{person.name}</Text><Text style={styles.subtitle}>{person.subtitle}</Text></View>
 <Ionicons name="chatbubble-ellipses-outline" color="#888" size={20}/>
 </Pressable>)}</View>
 </Animated.View>
}
const styles=StyleSheet.create({shell:{position:'absolute',left:8,right:8,bottom:67,zIndex:5,backgroundColor:'#fff',borderWidth:1,borderColor:'#e6e6e6',borderTopLeftRadius:13,borderTopRightRadius:13,overflow:'hidden',shadowColor:'#000',shadowOffset:{width:0,height:-2},shadowOpacity:.06,shadowRadius:10,elevation:4},handleArea:{height:50,justifyContent:'center',paddingHorizontal:15},handle:{alignSelf:'center',height:4,width:42,borderRadius:4,backgroundColor:'#d5d5d5',marginBottom:8},titleRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},heading:{fontWeight:'700',fontSize:13,color:'#111'},contact:{height:61,marginHorizontal:12,borderColor:'#f3f3f3',flexDirection:'row',alignItems:'center',gap:11},avatar:{position:'relative'},dot:{width:9,height:9,borderRadius:5,borderWidth:1.4,borderColor:'#fff',position:'absolute',bottom:0,right:-2},name:{fontWeight:'600',fontSize:12,color:'#202020'},subtitle:{fontSize:10,color:'#999',marginTop:2}});
