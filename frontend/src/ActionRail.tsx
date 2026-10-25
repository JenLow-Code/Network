import React,{useState} from 'react';
import {Modal,Pressable,Share,StyleSheet,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {useApp} from './context';
import {dreams,Publication} from './discoveryData';
import {allowedActions,ActionId} from './domain/publicationRules';
import {myCircle,matchingTalents,myTalents} from './domain/demoCircle';
import {PrayerIcon} from './PrayerIcon';
import {FireIcon} from './FireIcon';
import {colors as c} from './theme';

export function ActionRail({item}:{item:Publication}){
 const app=useApp(),[modal,setModal]=useState<'dream'|'circle'|null>(null);
 const permitted=allowedActions(item);
 const seeded=Object.values(app.dreamInspirations).some(ids=>ids.includes(item.id));
 const activity=(id:ActionId)=>{
  switch(id){
   case 'fire': app.toggleFire(item.id);break;
   case 'prayer': app.togglePrayer(item.id);break;
   case 'inspire':setModal('dream');break;
   case 'share-internal':router.push({pathname:'/share/[id]',params:{id:item.id}});break;
   case 'share-external':void Share.share({message:item.title+' — JenLow Network'});break;
   case 'offer-help':router.push({pathname:'/chat/[id]',params:{id:'teacher'}});break;
   case 'introduce':setModal('circle');break;
   case 'encourage':app.encourage(item.id);break;
   case 'same-dream':app.joinDream(item.id);break;
   case 'audio-collab':router.push({pathname:'/music-proposal/[id]',params:{id:item.id}});break;
   case 'verse-export':router.push({pathname:'/verse-export/[id]',params:{id:item.id}});break;
  }
 };
 const icons:Partial<Record<ActionId,keyof typeof Ionicons.glyphMap>>={
  'fire':'flame-outline','share-internal':'chatbubble-outline','share-external':'share-outline',
  'inspire':'add-circle-outline','encourage':'sparkles-outline','same-dream':'people-outline',
  'offer-help':'hand-left-outline','introduce':'people-circle-outline',
  'audio-collab':'mic-outline','verse-export':'download-outline'
 };
 const primary=permitted.filter(a=>a!=='prayer'&&(item.type!=='dream'||!['encourage','same-dream'].includes(a)));
 return <View style={s.rail}>
  {primary.map(action=><Pressable key={action} accessibilityLabel={action} accessibilityRole="button" onPress={()=>activity(action)} style={s.iconButton}>
   {action==='fire'?<FireIcon size={28}/>:action==='inspire'&&seeded?<Ionicons name="leaf" color={c.pink} size={20}/>:<Ionicons name={icons[action]||'add'} color="#222" size={20}/>}
  </Pressable>)}
  {permitted.includes('prayer')?<Pressable accessibilityLabel="Prayer list" onPress={()=>activity('prayer')} style={[s.iconButton,app.isPraying(item.id)&&{backgroundColor:'#f7e9f0'}]}><PrayerIcon size={27}/></Pressable>:null}
  <Modal visible={modal!==null} transparent animationType="fade" onRequestClose={()=>setModal(null)}><View style={s.overlay}><View style={s.box}>
   <View style={s.heading}><Text style={{fontWeight:'700',fontSize:16}}>{modal==='circle'?'Présenter quelqu’un':'Ajouter à mon rêve'}</Text><Pressable onPress={()=>setModal(null)}><Ionicons name="close" size={24}/></Pressable></View>
   {modal==='dream'?dreams.map(d=><Pressable key={d.id} style={s.item} onPress={()=>{app.addToDream(d.id,item.id);setModal(null)}}><Text style={{flex:1,fontSize:13}}>{d.title}</Text>{app.dreamInspirations[d.id]?.includes(item.id)?<Ionicons name="checkmark" color={c.pink} size={18}/>:null}</Pressable>):
   myCircle.filter(person=>item.type==='dream'&&matchingTalents(item.needs,person.talents).length>0).map(person=><Pressable key={person.id} style={s.item} onPress={()=>{setModal(null);router.push({pathname:'/introduce/[id]',params:{id:item.id,person:person.id}})}}><Text style={{flex:1}}>{person.name} · {person.talents.join(', ')}</Text><Ionicons name="chevron-forward" size={19}/></Pressable>)}
   <Text style={{color:'#888',fontSize:11,marginTop:12}}>Démo : les invitations et introductions réelles nécessitent le backend.</Text>
  </View></View></Modal>
 </View>;
}
const s=StyleSheet.create({rail:{gap:1,alignItems:'center'},iconButton:{width:32,height:32,justifyContent:'center',alignItems:'center',borderRadius:20,backgroundColor:'#fff'},overlay:{flex:1,justifyContent:'center',padding:20,backgroundColor:'rgba(0,0,0,.38)'},box:{padding:18,backgroundColor:'#fff',borderRadius:15},heading:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:13},item:{paddingVertical:12,paddingHorizontal:7,borderBottomWidth:1,borderColor:'#eee',flexDirection:'row',alignItems:'center',gap:9}});
