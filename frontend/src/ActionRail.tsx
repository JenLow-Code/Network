import React,{useState} from 'react';
import {Modal,Pressable,StyleSheet,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useApp} from './context';
import {router} from 'expo-router';
import {dreams,Publication} from './discoveryData';
import {colors as c} from './theme';
export function ActionRail({item}:{item:Publication}){
 const app=useApp();
 const [choosing,setChoosing]=useState(false);
 const fire=app.isOnFire(item.id);
 const praying=app.isPraying(item.id);
 const seeded=Object.values(app.dreamInspirations).some(ids=>ids.includes(item.id));
 const button=(name:keyof typeof Ionicons.glyphMap,label:string,action:()=>void,active=false)=>
  <Pressable key={label} accessibilityLabel={label} accessibilityRole="button" onPress={action} style={[s.button,active&&s.active]}>
   <Ionicons name={name} size={24} color={active?c.pink:'#252525'}/>
  </Pressable>;
 return <View style={s.rail}>
  {button(fire?'flame':'flame-outline','Save to Fire list',()=>app.toggleFire(item.id),fire)}
  {button('chatbubble-outline','Share with someone',()=>router.push({pathname:'/share/[id]',params:{id:item.id}}))}
  {button(seeded?'leaf':'add-circle-outline','Add to one of my Dreams',()=>setChoosing(true),seeded)}
  {item.type!=='dream'?button(praying?'checkmark-circle':'heart-outline','Save to today’s prayer list',()=>app.togglePrayer(item.id),praying):null}
  <Modal visible={choosing} transparent animationType="fade" onRequestClose={()=>setChoosing(false)}>
   <View style={s.modalBackdrop}><View style={s.modal}>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
     <Text style={{fontWeight:'700',fontSize:17}}>Ajouter à mon rêve</Text>
     <Pressable onPress={()=>setChoosing(false)} accessibilityLabel="Close"><Ionicons name="close" size={23}/></Pressable>
    </View>
    <Text style={{fontSize:12,color:'#777',marginBottom:12}}>Choisis le rêve auquel associer cette inspiration.</Text>
    {dreams.map(d=><Pressable key={d.id} style={s.choice} onPress={()=>{app.addToDream(d.id,item.id);setChoosing(false)}}>
     <Ionicons name="leaf-outline" size={18} color="#777"/>
     <Text style={{fontSize:13,color:'#222',flex:1}}>{d.title}</Text>
     {app.dreamInspirations[d.id]?.includes(item.id)?<Ionicons name="checkmark" color={c.pink} size={17}/>:null}
    </Pressable>)}
    <Text style={{fontSize:10,color:'#999',marginTop:14}}>Les rêves proposés sont des exemples tant que ton compte n’est pas connecté au backend.</Text>
   </View></View>
  </Modal>
 </View>;
}
const s=StyleSheet.create({
 rail:{gap:3,alignItems:'center'},
 button:{width:36,height:36,justifyContent:'center',alignItems:'center',borderRadius:20,backgroundColor:'#fff'},
 active:{backgroundColor:'#f6e8ef'},
 modalBackdrop:{flex:1,backgroundColor:'rgba(0,0,0,.40)',alignItems:'center',justifyContent:'center',padding:20},
 modal:{backgroundColor:'#fff',width:'100%',maxWidth:390,padding:20,borderRadius:16},
 choice:{flexDirection:'row',alignItems:'center',padding:11,gap:10,borderBottomWidth:1,borderColor:'#eee'}
});
