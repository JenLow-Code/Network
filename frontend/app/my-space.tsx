import React, { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import type { DreamEntry } from '@/domain/dreamWorkspace';
import { PHASE_LABELS, type DreamPhase } from '@/domain/publication';
import { useDreams } from '@/domain/dreamRepository';
import { useAppTheme } from '@/theme/AppTheme';
import { phaseAccent } from '@/components/dream/DreamPhaseLayout';

type Filter = 'Tout' | 'Liste' | 'En pause';
const groups: { phase: DreamPhase; title: string; intro: string }[] = [
  { phase: 'Témoignage', title: 'Mes témoignages', intro: 'Ce qui a déjà fleuri.' },
  { phase: 'Rêve', title: 'Mes semences', intro: 'Les idées qui attendent de grandir.' },
  { phase: 'Initiation', title: 'En germination', intro: 'Les projets qui se préparent.' },
  { phase: 'Croissance', title: 'En croissance', intro: 'Les rêves que je fais avancer.' },
];
const open = (dream: DreamEntry) =>
  router.push({pathname:'/my-dream/[id]',params:{id:dream.id}});
const today = () => new Date().toISOString().slice(0,10);
const paused = (dream: DreamEntry) => !!dream.paused && !!dream.pauseUntil && dream.pauseUntil >= today();
const info = (dream: DreamEntry) => {
  if (paused(dream)) return 'En pause jusqu’au ' + dream.pauseUntil;
  if (dream.phase === 'Témoignage') return 'Rêve accompli';
  if (dream.phase === 'Rêve') return 'À imaginer';
  const r = dream.resources || [];
  return r.length ? r.filter(x=>x.confirmed).length+'/'+r.length+' ressources trouvées' : 'À faire grandir';
};
function DreamStrip({dream, cardWidth, compact, list}:{
  dream:DreamEntry;cardWidth:number;compact:boolean;list:boolean;
}) {
  const theme = useAppTheme();
  const cover = dream.phase==='Témoignage' ? dream.resultImage || dream.image : dream.image;
  if (list) return (
    <Pressable onPress={()=>open(dream)} accessibilityRole="button"
      style={{paddingVertical:15,borderBottomWidth:1,borderColor:theme.border,flexDirection:'row',alignItems:'center',gap:12}}>
      {cover ? <Image source={{uri:cover}} style={{width:58,height:58,borderRadius:8}}/> :
        <View style={{width:58,height:58,borderRadius:8,backgroundColor:theme.surface}}/>}
      <View style={{flex:1,gap:5}}>
        <Text style={{fontSize:14,color:theme.foreground,fontWeight:'700'}} numberOfLines={2}>{dream.title}</Text>
        <Text style={{fontSize:11,color:paused(dream)?'#B98542':phaseAccent[dream.phase]}}>
          {PHASE_LABELS[dream.phase]} · {info(dream)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color={theme.muted}/>
    </Pressable>
  );
  return (
    <Pressable onPress={()=>open(dream)} accessibilityRole="button"
      accessibilityLabel={dream.title+', ouvrir mon rêve'}
      style={{width:cardWidth,gap:8,marginRight:compact?13:17}}>
      <View style={{width:cardWidth,height:compact?120:145,backgroundColor:theme.surface,borderRadius:11,overflow:'hidden'}}>
        {cover ? <Image source={{uri:cover}} resizeMode="cover" style={{width:'100%',height:'100%'}}/> : null}
        <View style={{position:'absolute',left:10,bottom:10,right:10,flexDirection:'row',justifyContent:'space-between'}}>
          <View style={{height:3,width:29,borderRadius:4,backgroundColor:phaseAccent[dream.phase]}}/>
          {paused(dream) ? <Ionicons name="pause-circle" size={19} color="#FFFFFF"/> : null}
        </View>
      </View>
      <Text style={{color:theme.foreground,fontSize:compact?13:14,fontWeight:'700',lineHeight:19}}
        numberOfLines={2}>{dream.title}</Text>
      <Text style={{color:theme.muted,fontSize:11,lineHeight:17}} numberOfLines={1}>{info(dream)}</Text>
    </Pressable>
  );
}

export default function MySpace() {
  const theme=useAppTheme();
  const {width}=useWindowDimensions();
  const compact=width<600;
  const {items}=useDreams();
  const [filter,setFilter]=useState<Filter>('Tout');
  const list=filter==='Liste';
  const visible=filter==='En pause'?items.filter(paused):items;
  const cardWidth=compact?Math.max(132,Math.min(210,Math.floor((width-40)*.49))):205;
  const unfinished=items.filter(d=>d.phase==='Croissance' && !!d.flowerDraft?.story);

  return (
    <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
      <ScrollView style={{flex:1}} contentContainerStyle={{
        paddingTop:compact?14:27,paddingBottom:70,
        width:'100%',maxWidth:900,alignSelf:'center',
      }}>
        <View style={{paddingHorizontal:compact?18:27}}>
          <PageHeader/>
          <View style={{marginTop:compact?14:24,marginBottom:21}}>
            <Text style={{fontWeight:'700',fontSize:compact?30:32,lineHeight:40,color:theme.foreground}}>Mes rêves</Text>
            <Text style={{color:theme.muted,fontSize:12,marginTop:3}}>Des premières idées aux histoires accomplies.</Text>
          </View>
          <View style={{flexDirection:'row',alignItems:'center',gap:7,marginBottom:23}}>
            {(['Tout','Liste','En pause'] as Filter[]).map(value=>(
              <Pressable key={value} onPress={()=>setFilter(value)} accessibilityRole="button"
                accessibilityState={{selected:filter===value}}
                style={{paddingHorizontal:compact?11:16,paddingVertical:10,borderRadius:23,
                  borderWidth:1,borderColor:filter===value?theme.foreground:theme.border,
                  backgroundColor:filter===value?theme.foreground:'transparent'}}>
                <Text style={{fontSize:11,fontWeight:'700',color:filter===value?theme.background:theme.foreground}}>{value}</Text>
              </Pressable>
            ))}
            <View style={{flex:1}}/>
            <Pressable onPress={()=>router.push('/my-dream/new')} accessibilityRole="button"
              accessibilityLabel="Planter une semence" style={{
                width:41,height:41,borderRadius:12,
                backgroundColor:'#D71D77',justifyContent:'center',alignItems:'center',
              }}>
              <Ionicons name="add" size={22} color="#FFFFFF"/>
            </Pressable>
          </View>
        </View>

        {visible.length===0 ? (
          <View style={{alignItems:'center',marginTop:60,paddingHorizontal:35,gap:10}}>
            <Ionicons name={filter==='En pause'?'pause-circle-outline':'sparkles-outline'} size={27} color={theme.muted}/>
            <Text style={{color:theme.foreground,fontSize:16,fontWeight:'700'}}>
              {filter==='En pause'?'Aucun rêve en pause':'Tout commence par une semence'}
            </Text>
            <Text style={{color:theme.muted,fontSize:12,textAlign:'center',lineHeight:20}}>
              {filter==='En pause'?'Les germinations temporairement congelées apparaîtront ici.':'Donne vie à ta première idée.'}
            </Text>
          </View>
        ) : null}

        {groups.map(group=>{
          const dreams=visible.filter(d=>d.phase===group.phase);
          if(!dreams.length)return null;
          return (
            <View key={group.phase} style={{marginBottom:compact?27:38}}>
              <View style={{
                paddingHorizontal:compact?18:27,flexDirection:'row',
                justifyContent:'space-between',alignItems:'center',gap:8,marginBottom:14,
              }}>
                <View style={{flex:1}}>
                  <Text style={{fontSize:18,fontWeight:'700',color:theme.foreground}}>{group.title}</Text>
                  {!list?<Text style={{fontSize:11,color:theme.muted,marginTop:4}}>{group.intro}</Text>:null}
                </View>
                <Text style={{fontSize:12,color:phaseAccent[group.phase],fontWeight:'700'}}>{dreams.length}</Text>
              </View>
              {list ? (
                <View style={{paddingHorizontal:compact?18:27}}>
                  {dreams.map(d=><DreamStrip key={d.id} dream={d} cardWidth={cardWidth} compact={compact} list/>)}
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{paddingHorizontal:compact?18:27,paddingBottom:4}}>
                  {dreams.map(d=><DreamStrip key={d.id} dream={d} cardWidth={cardWidth} compact={compact} list={false}/>)}
                </ScrollView>
              )}
            </View>
          );
        })}
        {unfinished.length>0 && filter!=='En pause' ? (
          <View style={{marginTop:4,paddingHorizontal:compact?18:27}}>
            <Text style={{color:theme.foreground,fontSize:15,fontWeight:'700',marginBottom:10}}>Floraisons à terminer</Text>
            {unfinished.map(d=>(
              <Pressable key={d.id} accessibilityRole="button"
                onPress={()=>router.push({pathname:'/my-dream/flower/[id]',params:{id:d.id}})}
                style={{padding:13,borderWidth:1,borderColor:theme.border,borderRadius:10,marginBottom:8,
                  flexDirection:'row',alignItems:'center',gap:10}}>
                <Ionicons name="flower-outline" size={19} color="#D71D77"/>
                <Text numberOfLines={1} style={{flex:1,color:theme.foreground,fontSize:12,fontWeight:'600'}}>{d.title}</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.muted}/>
              </Pressable>
            ))}
          </View>
        ):null}
      </ScrollView>
      <Nav/>
    </SafeAreaView>
  );
}
