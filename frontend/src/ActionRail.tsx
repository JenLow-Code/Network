import React from 'react';
import {Alert,Pressable,Share,StyleSheet,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {useApp} from './context';
import {dreams,Publication} from './discoveryData';
import {colors as c} from './theme';
export function ActionRail({item,vertical=true}:{item:Publication,vertical?:boolean}){
 const {isOnFire,toggleFire,addToDream}=useApp();
 const fire=isOnFire(item.id);
 function share(){void Share.share({message:item.title+' — JenLow Network'});}
 function chooseDream(){
  const choices=dreams.map(d=>({text:d.title,onPress:()=>{addToDream(d.id,item.id);Alert.alert('Inspiration ajoutée', 'Ajoutée à « '+d.title+' ».')}}));
  Alert.alert('Ajouter à mon rêve','Choisis un rêve :', [...choices,{text:'Annuler',style:'cancel'}]);
 }
 function contact(){router.push('/chat/helena');}
 const act=(icon:keyof typeof Ionicons.glyphMap,label:string,onPress:()=>void,active=false)=><Pressable key={label} accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={[s.button,active&&s.active]}><Ionicons name={icon} size={24} color={active?c.pink:'#222'}/></Pressable>;
 return <View style={[s.rail,{flexDirection:vertical?'column':'row'}]}>
  {act(fire?'flame':'flame-outline',fire?'Remove from Fire list':'Save to Fire list',()=>toggleFire(item.id),fire)}
  {act('person-circle-outline','Contact or share with a person',contact)}
  {act('add-circle-outline','Add to my dream',chooseDream)}
  {item.type==='music'?act('play-circle-outline','Open music player',()=>router.push({pathname:'/music/[id]',params:{id:item.id}})):null}
 </View>;
}
const s=StyleSheet.create({rail:{gap:8,alignItems:'center'},button:{width:37,height:37,alignItems:'center',justifyContent:'center',borderRadius:22,backgroundColor:'#fff'},active:{backgroundColor:'#f9ecf2'}});
