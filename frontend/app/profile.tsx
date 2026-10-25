import {Text,TextInput} from '@/i18n/LocalizedText';
import React,{useState} from 'react';
import {Pressable,ScrollView,View,StyleSheet,useWindowDimensions,Image} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {Avatar,Nav} from '@/components';
import {ContactSheet} from '@/ContactSheet';
import {StoneDeck} from '@/StoneDeck';
import {useApp} from '@/context';
import {colors as c} from '@/theme';
import {dreams} from '@/discoveryData';
type Field='bio'|'city'|'church';
const levels=[{name:'Absolute beginner',color:'#12663c'},{name:'Curious beginner',color:'#45b96f'},{name:'Intermediate',color:'#efc448'},{name:'Used to',color:'#df6660'},{name:'Professional',color:'#cb1e66'}];
const talents=[{title:'Batterie',icon:'musical-notes' as const,level:2,detail:'Tandem | Professeur'},{title:'Chant',icon:'mic' as const,level:1,detail:'Tandem | Apprentissage'},{title:'Piano',icon:'musical-note' as const,level:3,detail:'Tandem | Professeur'}];
function Gallery({kind}:{kind:'talent'|'dream'}){
 const {width}=useWindowDimensions();
 const data=kind==='talent'?talents:dreams.slice(0,3);
 const [current,setCurrent]=useState(0),[expanded,setExpanded]=useState(false);
 const item=data[current] as any,desktop=width>=740;
 const next=(direction:number)=>setCurrent(i=>(i+direction+data.length)%data.length);
 const preview=(i:number)=>{
  const selected=data[i] as any;
  return <Pressable key={i} onPress={()=>{setCurrent(i);setExpanded(true)}} style={s.card}>
   {kind==='talent'?<><Text style={{fontFamily:'Caveat_700Bold',fontSize:16,color:'#111'}}>{selected.title}</Text><View style={s.talentCircle}><Ionicons name={selected.icon} color="#111" size={28}/></View><View style={{flexDirection:'row',gap:5}}>{levels.map((l,n)=><View key={n} style={{width:6,height:6,borderRadius:3,backgroundColor:n===selected.level?l.color:'#e9e9e9'}}/>)}</View><Text numberOfLines={1} style={s.cardCaption}>{selected.detail}</Text></>:
   <Image source={{uri:selected.image}} style={{width:'100%',height:'100%',borderRadius:6}} resizeMode="cover"/>}
  </Pressable>;
 };
 return <View style={{flex:1,minWidth:0,alignItems:'center'}}>
   <Text style={s.title}>{kind==='talent'?'Mes talents':'Mes rêves'}</Text>
   {desktop?<ScrollView horizontal showsHorizontalScrollIndicator={false} style={{maxWidth:'100%'}}><View style={{flexDirection:'row',gap:8}}>{data.map((_,i)=>preview(i))}</View></ScrollView>:<View style={{width:147,alignItems:'center'}}>{preview(current)}</View>}
   {expanded&&<View style={s.overlay}><View style={s.detail}>
     <Pressable onPress={()=>setExpanded(false)} style={{alignSelf:'flex-end',padding:7}}><Ionicons name="close" size={22}/></Pressable>
     {kind==='dream'?<Image source={{uri:item.image}} style={s.detailImage}/>:<View style={[s.talentCircle,{width:94,height:94,borderRadius:47}]}><Ionicons name={item.icon} size={47}/></View>}
     <Text style={s.detailTitle}>{item.title}</Text>
     <Text style={s.detailDescription}>{kind==='talent'?item.detail:item.summary}</Text>
     {kind==='talent'?<Text style={{marginTop:11,color:levels[item.level].color}}>{levels[item.level].name}</Text>:<Pressable onPress={()=>{setExpanded(false);router.push({pathname:'/dream/[id]',params:{id:item.id}})}}><Text style={{color:c.pink,marginTop:12}}>Découvrir ce rêve</Text></Pressable>}
     <View style={s.detailNav}><Pressable onPress={()=>next(-1)}><Ionicons name="chevron-back" size={25}/></Pressable><Text>{current+1} / {data.length}</Text><Pressable onPress={()=>next(1)}><Ionicons name="chevron-forward" size={25}/></Pressable></View>
   </View></View>}
 </View>;
}
export default function Profile(){
 const app=useApp();
 const [active,setActive]=useState<Field|null>(null);
 const [draft,setDraft]=useState('');
 const value=(k:Field)=>k==='bio'?app.bio:k==='city'?app.city:app.church;
 const cancel=()=>{setActive(null);setDraft('')};
 const start=(k:Field)=>{if(active===k){cancel();return;}setActive(k);setDraft(value(k))};
 const save=()=>{if(active)app.edit({[active]:draft});cancel()};
 function field(k:Field){
  const editing=active===k;
  return <View style={[s.fieldRow,{width:k==='bio'?'100%':'auto',minWidth:k==='bio'?0:155,justifyContent:k==='bio'?'flex-start':'center'}]}>
   {editing?<View style={s.editInside}><TextInput value={draft} onChangeText={setDraft} autoFocus selectTextOnFocus multiline={k==='bio'} style={[s.editInput,{fontStyle:k==='bio'?'italic':'normal',textAlign:k==='bio'?'left':'center'}]}/><Pressable accessibilityLabel="Save changes" onPress={save} style={s.check}><Ionicons name="checkmark" color="#999" size={15}/></Pressable></View>:
   <><Text style={[s.value,{fontStyle:k==='bio'?'italic':'normal',flexShrink:1}]}>{value(k)}</Text><Pressable accessibilityLabel={'Edit '+k} onPress={()=>start(k)} style={{paddingLeft:6,paddingVertical:5}}><Ionicons name="pencil" color={c.pink} size={12}/></Pressable></>}
  </View>;
 }
 return <SafeAreaView style={s.safe}><View style={{flex:1}}>
   <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <Pressable onPress={cancel} style={{alignItems:'center'}}><Avatar size={164}/><Text style={s.name}>{app.name}</Text></Pressable>
    <View style={s.bio}>{field('bio')}</View>
    <Pressable onPress={cancel}><Text style={s.label}>Lieu</Text></Pressable>{field('city')}
    <Pressable onPress={cancel} style={{marginTop:14}}><Text style={s.label}>Eglise</Text></Pressable>{field('church')}
    <View style={s.galleries}><Gallery kind="talent"/><Gallery kind="dream"/></View>
    <Pressable onPress={cancel}><Text style={[s.title,{marginTop:14,marginBottom:9}]}>Mes pierres</Text></Pressable>
    <StoneDeck/>
    <Pressable onPress={()=>{cancel();app.logout();router.replace('/login')}} style={{marginTop:18}}><Text style={{color:'#999',fontSize:11}}>Se déconnecter</Text></Pressable>
   </ScrollView>
   <ContactSheet/>
 </View><Nav/></SafeAreaView>;
}
const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:'#fff'},content:{paddingTop:22,paddingBottom:120,alignItems:'center'},
 name:{fontSize:25,fontWeight:'700',color:c.pink,marginTop:9},bio:{marginHorizontal:36,alignSelf:'stretch',marginTop:7,marginBottom:22},
 label:{fontSize:14,fontWeight:'600',color:'#161616',textAlign:'center'},value:{fontSize:13,color:'#777',lineHeight:17},
 fieldRow:{flexDirection:'row',alignItems:'center',minHeight:26},
 editInside:{flexDirection:'row',alignItems:'center',flex:1,minHeight:30,borderBottomWidth:StyleSheet.hairlineWidth,borderColor:'#c6c6c6',position:'relative'},
 editInput:{flex:1,paddingVertical:3,paddingHorizontal:5,paddingRight:28,color:'#333',fontSize:13,minWidth:95},
 check:{position:'absolute',right:1,bottom:3,width:24,height:24,alignItems:'center',justifyContent:'center'},
 galleries:{width:'100%',paddingHorizontal:19,marginTop:25,flexDirection:'row',gap:12},
 title:{fontSize:15,fontWeight:'700',color:'#111'},
 card:{width:145,height:130,borderWidth:1,borderColor:'#e1e1e1',borderRadius:10,padding:7,alignItems:'center',justifyContent:'space-between',backgroundColor:'#fff'},
 talentCircle:{width:59,height:59,borderRadius:30,backgroundColor:c.pink,alignItems:'center',justifyContent:'center'},
 levelLine:{height:3,width:40,borderRadius:4},
 cardCaption:{fontSize:10,color:'#888'},
 dreamPhoto:{height:'100%',width:'100%',borderRadius:7},
 arrows:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',width:145,marginTop:5},
 pager:{color:'#aaa',fontSize:10},
 overlay:{position:'absolute',left:0,right:0,top:0,bottom:-230,zIndex:20,justifyContent:'center',alignItems:'center',backgroundColor:'rgba(255,255,255,.96)',borderRadius:16},
 detail:{borderWidth:1,borderColor:'#eee',borderRadius:15,backgroundColor:'#fff',padding:12,width:260,minHeight:320,alignItems:'center'},
 detailImage:{width:205,height:150,borderRadius:8},
 detailTitle:{fontSize:19,fontWeight:'700',textAlign:'center',marginTop:15},
 detailDescription:{fontSize:13,lineHeight:20,color:'#666',textAlign:'center',marginTop:10},
 detailNav:{width:'95%',flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:20}
});
