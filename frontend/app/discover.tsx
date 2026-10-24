import React,{useMemo,useState} from 'react';
import {Image,Pressable,ScrollView,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {Nav} from '@/components';
import {dreams,verseText} from '@/discoveryData';
import {colors as c} from '@/theme';
const filters=['Tout','Rêves','Bible','Musique','Images'];
export default function Discover(){
 const [filter,setFilter]=useState('Tout'),[search,setSearch]=useState(''),[saved,setSaved]=useState<string[]>([]);
 const {width}=useWindowDimensions(),desktop=width>720;
 const items=useMemo(()=>dreams.filter(d=>(filter==='Tout'||filter==='Rêves'||d.category===filter||(filter==='Bible'&&!!d.verse))&&(d.title+' '+d.author+' '+d.summary).toLowerCase().includes(search.toLowerCase())),[filter,search]);
 const toggle=(id:string)=>setSaved(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}>
  <View style={{flex:1}}>
   <ScrollView contentContainerStyle={{paddingBottom:22,paddingHorizontal:15,maxWidth:980,width:'100%',alignSelf:'center'}}>
    <Text style={{fontSize:30,fontWeight:'700',color:'#161616',marginTop:14,marginBottom:14}}>Découvrir</Text>
    <View style={{flexDirection:'row',borderWidth:1,borderColor:'#ededed',borderRadius:13,alignItems:'center',paddingHorizontal:12,height:42,marginBottom:13}}>
      <Ionicons name="search" size={20} color="#777"/><TextInput value={search} onChangeText={setSearch} placeholder="Un rêve, un talent, une inspiration…" placeholderTextColor="#aaa" style={{flex:1,paddingLeft:9,fontSize:13}}/>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:7,paddingBottom:17}}>{filters.map(name=><Pressable key={name} onPress={()=>setFilter(name)} style={{borderRadius:22,paddingHorizontal:15,paddingVertical:8,backgroundColor:filter===name?c.pink:'#f7f7f7',borderWidth:1,borderColor:filter===name?c.pink:'#eee'}}><Text style={{fontSize:12,color:filter===name?'#fff':'#555'}}>{name}</Text></Pressable>)}</ScrollView>
    <View style={{flexDirection:'row',gap:12,alignItems:'flex-start'}}>
    {[0,1].map(column=><View key={column} style={{flex:1,gap:13}}>{items.filter((_,i)=>i%2===column).map((d,i)=><View key={d.id} style={{borderWidth:1,borderColor:'#ededed',borderRadius:15,overflow:'hidden',backgroundColor:'#fff'}}>
      <Pressable onPress={()=>router.push({pathname:'/dream/[id]',params:{id:d.id}})}>
       <Image source={{uri:d.image}} resizeMode="cover" style={{width:'100%',height:desktop?225:(i%2===0?171:145),backgroundColor:'#f1f2ef'}}/>
       <View style={{padding:10,gap:5}}><Text style={{color:'#36945d',fontSize:10,fontWeight:'700'}}>🌱  RÊVE · {d.phase.toUpperCase()}</Text><Text style={{fontSize:14,fontWeight:'700',color:'#171717',lineHeight:19}}>{d.title}</Text><Text style={{fontSize:11,color:'#888'}}>{d.author}</Text></View>
      </Pressable>
      {d.verse&&<Pressable onPress={()=>router.push({pathname:'/bible/[reference]',params:{reference:'psalm-150'}})} style={{marginHorizontal:10,marginBottom:8,padding:9,backgroundColor:'#fff1f6',borderRadius:9}}><Text style={{color:'#282828',fontSize:12,fontFamily:'serif'}}>{verseText}</Text><Text style={{color:c.pink,fontSize:10,marginTop:5}}>{d.verse} · Lire le chapitre</Text></Pressable>}
      <View style={{flexDirection:'row',alignItems:'center',justifyContent:'flex-end',gap:15,paddingHorizontal:12,paddingBottom:12}}>
       <Pressable accessibilityLabel="Save inspiration" onPress={()=>toggle(d.id)}><Ionicons name={saved.includes(d.id)?'heart':'heart-outline'} size={21} color={saved.includes(d.id)?c.pink:'#222'}/></Pressable>
       <Pressable accessibilityLabel="Share" onPress={()=>router.push({pathname:'/dream/[id]',params:{id:d.id}})}><Ionicons name="share-outline" size={21}/></Pressable>
       <Pressable accessibilityLabel="Add to dream" onPress={()=>router.push({pathname:'/dream/[id]',params:{id:d.id}})}><Ionicons name="flower-outline" size={21} color={c.pink}/></Pressable>
      </View>
     </View>)}</View>)}
    </View>
    {items.length===0&&<Text style={{textAlign:'center',marginTop:40,color:'#888'}}>Aucune inspiration trouvée.</Text>}
    <Text style={{textAlign:'center',color:'#aaa',fontSize:10,marginTop:22}}>Inspirations issues de rêves · Données de démonstration</Text>
   </ScrollView>
  </View><Nav/>
 </SafeAreaView>;
}
