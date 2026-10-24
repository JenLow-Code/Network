import React from 'react';
import {Alert,Pressable,Share,StyleSheet,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {useApp} from './context';
import {dreams,Publication} from './discoveryData';
import {colors as c} from './theme';
export function ActionRail({item}:{item:Publication}){
 const app=useApp(),fire=app.isOnFire(item.id),praying=app.isPraying(item.id),seeded=Object.values(app.dreamInspirations).some(ids=>ids.includes(item.id));
 const button=(name:keyof typeof Ionicons.glyphMap,description:string,action:()=>void,active=false)=><Pressable key={description} accessibilityLabel={description} onPress={action} style={[s.button,active&&{backgroundColor:'#f6e8ef'}]}><Ionicons name={name} size={25} color={active?c.pink:'#252525'}/></Pressable>;
 function chooseDream(){
  const options=dreams.map(d=>({text:d.title,onPress:()=>app.addToDream(d.id,item.id)}));
  Alert.alert('Ajouter à un rêve','Choisis un de tes rêves',options.concat([{text:'Annuler',onPress:()=>{}}]));
 }
 const share=()=>{void Share.share({message:item.title+' — JenLow Network'});};
 return <View style={s.rail}>
  {button(fire?'flame':'flame-outline','Fire list',()=>app.toggleFire(item.id),fire)}
  {button('chatbubble-outline','Partager à quelqu’un',share)}
  {button(seeded?'leaf':'add-circle-outline','Ajouter à mon rêve',chooseDream,seeded)}
  {item.type!=='dream'?button(praying?'checkmark-circle':'heart-outline', 'Ajouter aux prières du jour',()=>app.togglePrayer(item.id),praying):null}
 </View>;
}
const s=StyleSheet.create({rail:{gap:3,alignItems:'center'},button:{width:36,height:36,justifyContent:'center',alignItems:'center',borderRadius:20,backgroundColor:'#fff'}});
