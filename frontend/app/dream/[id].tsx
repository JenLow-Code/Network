import React from 'react';
import {Pressable,Text,View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {dreams,PHASE_COLORS} from '@/discoveryData';
import {PublicationDetail} from '@/PublicationDetail';
import {useApp} from '@/context';
function Heading({children}:{children:React.ReactNode}){return <Text style={{fontSize:15,fontWeight:'700',color:'#252525',marginTop:15,marginBottom:6}}>{children}</Text>}
export default function DreamDetail(){
 const {id}=useLocalSearchParams<{id:string}>();
 const app=useApp();
 const d=dreams.find(x=>x.id===id);
 if(!d)return <View style={{padding:24}}><Pressable onPress={()=>router.back()}><Text>← Retour</Text></Pressable><Text>Rêve introuvable</Text></View>;
 return <PublicationDetail item={d} onImageDoubleTap={()=>app.joinDream(d.id)}>
  <Heading>Description</Heading>
  <Text style={{fontSize:14,lineHeight:22,color:'#343434'}}>{d.summary}</Text>
  <Heading>Ma motivation</Heading>
  <Text style={{fontSize:14,lineHeight:22,color:'#444'}}>{d.motivation||'Non renseignée pour le moment.'}</Text>
  {d.phase==='Initiation'&&<><Heading>Date objectif</Heading><Text style={{fontSize:13,color:'#666'}}>{d.goalDate||'À définir'}</Text></>}
  {d.phase!=='Témoignage'&&<><Heading>De ce que j’ai besoin</Heading>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{d.needs.map(n=><View key={n} style={{paddingHorizontal:12,paddingVertical:9,borderWidth:1,borderColor:'#ddd',borderRadius:18,backgroundColor:'#fff'}}><Text style={{color:'#555',fontSize:12}}>{n}</Text></View>)}</View></>}
  {d.phase==='Croissance'&&<><Heading>Journal de croissance</Heading>
   {(d.logs||[]).map((log,i)=><View key={i} style={{flexDirection:'row',alignItems:'center',gap:9,marginTop:7}}><Text style={{fontSize:21}}>🌿</Text><View style={{flex:1,borderLeftWidth:2,borderColor:'#65A98F',padding:9}}><Text style={{fontSize:12,color:'#444'}}>{log}</Text></View></View>)}</>}
  {d.phase==='Témoignage'&&<><Heading>Floraison</Heading><Text style={{fontSize:13,color:'#555'}}>L'histoire d'un rêve accompli, à partager et à transmettre.</Text></>}
  {d.phase==='Rêve'&&<Pressable onPress={()=>app.joinDream(d.id)} style={{marginTop:19,borderWidth:1,borderColor:'#aaa',borderRadius:11,padding:12,alignItems:'center',backgroundColor:app.myDreamIds.includes(d.id)?PHASE_COLORS['Rêve'].background:'#fff'}}><Text style={{fontWeight:'700',fontSize:13}}>{app.myDreamIds.includes(d.id)?'Moi aussi ✓':'Moi aussi'}</Text></Pressable>}
 </PublicationDetail>;
}
