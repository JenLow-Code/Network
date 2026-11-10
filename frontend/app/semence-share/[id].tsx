import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import { api } from '@/lib/api/client';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import { layoutInspirations } from '@/domain/inspirationLayout';
import { InspirationTile } from '@/components/dream/SemenceInspirations';
import SemenceInspirationDetail from '@/components/dream/SemenceInspirationDetail';
import type { DreamBlock } from '@/domain/dreamWorkspace';
import type { PublishedSemence } from '@/components/dream/SemencePublishActions';

export default function PublishedSemenceScreen(){
 const {id}=useLocalSearchParams<{id:string}>();
 const theme=useAppTheme();
 const [item,setItem]=useState<PublishedSemence|null>(null);
 const [loading,setLoading]=useState(true);
 const [selected,setSelected]=useState<DreamBlock|null>(null);
 useEffect(()=>{
  if(!id)return;
  let live=true;
  setLoading(true);setItem(null);
  void api<{item:PublishedSemence}>('/api/semence-shares/'+encodeURIComponent(id),{
    auth:'optional',
  }).then(result=>{if(live)setItem(result.item);})
    .catch(()=>{if(live)setItem(null);})
    .finally(()=>{if(live)setLoading(false);});
  return ()=>{live=false;};
 },[id]);
 const blocks=(item?.blocks||[]).map(b=>({...b,
   size:b.size||'small',tone:b.tone||'clear',
 })) as DreamBlock[];
 const tile=(b:DreamBlock)=><InspirationTile key={b.id} block={b}
   onPress={()=>setSelected({...b})} onLongPress={()=>setSelected({...b})}/>;
 return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
   <ScrollView keyboardShouldPersistTaps="handled"
     contentContainerStyle={{paddingHorizontal:18,paddingTop:10,
       paddingBottom:115,maxWidth:780,width:'100%',alignSelf:'center',gap:16}}>
     <PageHeader onBack={()=>router.back()}/>
     {loading?<ActivityIndicator style={{padding:50}} color={theme.muted}/>:
       !item?<View style={{padding:24,gap:11}}>
         <Text style={{fontSize:21,fontFamily:'serif',color:theme.foreground}}>
           Publication introuvable
         </Text>
         <Text style={{fontSize:13,lineHeight:20,color:theme.muted}}>
           Cette Semence est privée, supprimée ou indisponible.
         </Text>
       </View>:<>
         {!!item.coverUrl?<Image source={{uri:item.coverUrl}}
           resizeMode="cover" style={{height:170,width:'100%',borderRadius:13,
             opacity:0.82}}/>:null}
         <Text style={{fontSize:10,letterSpacing:1.4,
           fontWeight:'700',color:'#A5713D'}}>SEMENCE</Text>
         <Text style={{fontSize:30,fontFamily:'serif',
           lineHeight:38,color:theme.foreground}}>{item.title}</Text>
         {!!item.summary?<Text style={{fontSize:14,color:theme.muted,lineHeight:23}}>
           {item.summary}
         </Text>:null}
         <View style={{flexDirection:'row',alignItems:'center',gap:7}}>
           <Ionicons name={item.visibility==='friends'?'people-outline':'globe-outline'}
             color={theme.muted} size={15}/>
           <Text style={{fontSize:11,color:theme.muted}}>
             {item.visibility==='friends'?'Partagé avec les amis JenLow':'Publié sur le profil'}
             {' · '}{item.author.displayName}
           </Text>
         </View>
         <View style={{gap:11,marginTop:7}}>
           {layoutInspirations(blocks).map((group,index)=>
             group.type==='wide'?tile(group.block):
               <View key={'g-'+index} style={{flexDirection:'row',gap:11,
                 alignItems:'flex-start'}}>
                 <View style={{flex:1,gap:11}}>{group.left.map(tile)}</View>
                 <View style={{flex:1,gap:11}}>{group.right.map(tile)}</View>
               </View>)}
         </View>
         {!blocks.length?<Text style={{fontSize:12,color:theme.muted}}>
           Aucune inspiration incluse dans cette publication.
         </Text>:null}
       </>}
   </ScrollView>
   {selected?<SemenceInspirationDetail block={selected} editable={false}
     initialMenu={false} onClose={()=>setSelected(null)}
     onEdit={()=>{}} onDelete={()=>{}} onShare={()=>setSelected(null)}/>:null}
   <Nav/>
 </SafeAreaView>;
}
