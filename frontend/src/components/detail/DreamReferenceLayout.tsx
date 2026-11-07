import React from 'react';
import { Image, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DreamPublication } from '@/domain/publication';
import { PHASE_LABELS } from '@/domain/publication';
import { DetailLayout } from './DetailLayout';
import { DetailMoreDrawer, DetailInfoSection } from './DetailMoreDrawer';
import { useAppTheme } from '@/theme/AppTheme';

export function DreamReferenceLayout({item}:{item:DreamPublication}) {
  const theme=useAppTheme();
  const resources=item.resources||[];
  const people=resources.filter(r=>r.category==='person');
  const others=resources.filter(r=>r.category!=='person');
  const foundPeople=people.filter(r=>r.confirmed).length;
  const foundOthers=others.filter(r=>r.confirmed).length;
  const phase=PHASE_LABELS[item.phase];
  const logs=(item.logs||[]).filter(Boolean);
  const photo=item.resultImage || (item.phase==='Témoignage'?item.image:undefined);
  const hasMore=item.phase!=='Rêve';

  return (
    <DetailLayout item={item}>
      {hasMore ? (
        <DetailMoreDrawer heading={item.title} subtitle={phase+' · '+item.author}>
          {item.summary?.trim() ? (
            <View style={{backgroundColor:theme.surface,borderRadius:12,padding:18}}>
              <Text style={{fontFamily:'serif',fontSize:18,lineHeight:27,color:theme.foreground}}>
                {item.summary}
              </Text>
            </View>
          ):null}
          <DetailInfoSection title="Pourquoi ce rêve ?" text={item.motivation}/>
          {item.goalDate ? <DetailInfoSection title="Date objectif">
            <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
              <Ionicons name="calendar-outline" size={19} color={theme.foreground}/>
              <Text style={{color:theme.foreground,fontSize:14,fontWeight:'700'}}>{item.goalDate}</Text>
            </View>
          </DetailInfoSection>:null}
          {resources.length>0 ? (
            <DetailInfoSection title="Ce qu’il reste à réunir">
              <View style={{flexDirection:'row',gap:9,flexWrap:'wrap',marginBottom:7}}>
                {people.length>0 ? <Text style={{fontSize:12,fontWeight:'700',color:'#D71D77'}}>
                  {foundPeople}/{people.length} talents trouvés
                </Text>:null}
                {others.length>0 ? <Text style={{fontSize:12,fontWeight:'700',color:'#387D9F'}}>
                  {foundOthers}/{others.length} ressources trouvées
                </Text>:null}
              </View>
              {resources.map((r,i)=>(
                <View key={r.title+'-'+i} style={{padding:13,borderWidth:1,
                  borderColor:theme.border,borderRadius:11,marginBottom:8,
                  flexDirection:'row',gap:11,alignItems:'flex-start'}}>
                  <View style={{width:33,height:33,borderRadius:9,backgroundColor:theme.surface,
                    justifyContent:'center',alignItems:'center'}}>
                    <Ionicons
                      name={r.confirmed?'checkmark-circle-outline':
                        r.category==='person'?'person-outline':
                        r.category==='financial'?'wallet-outline':'cube-outline'}
                      size={19} color={r.confirmed?'#27845B':r.category==='person'?'#D71D77':'#387D9F'}
                    />
                  </View>
                  <View style={{flex:1,gap:5}}>
                    <Text style={{fontWeight:'700',fontSize:13,color:theme.foreground}}>{r.title}</Text>
                    <Text style={{fontSize:11,color:theme.muted}}>
                      {r.confirmed?'Confirmé':r.category==='person'?'Talent recherché':
                        r.category==='financial'?'Financement nécessaire':'Ressource recherchée'}
                      {r.requiredLevel?' · '+r.requiredLevel:''}
                    </Text>
                    {r.description?.trim()?<Text style={{color:theme.foreground,fontSize:12,lineHeight:19}}>
                      {r.description}
                    </Text>:null}
                  </View>
                </View>
              ))}
            </DetailInfoSection>
          ):item.needs?.length ? <DetailInfoSection title="Besoins" text={item.needs.join(' · ')}/>:null}
          {item.phase==='Croissance' && (logs.length>0 || item.journalEntry?.text) ? (
            <DetailInfoSection title="Journal de croissance">
              {logs.map((entry,index)=>(
                <View key={index} style={{flexDirection:'row',gap:10,paddingVertical:10}}>
                  <View style={{width:6,height:6,borderRadius:3,backgroundColor:'#27845B',marginTop:9}}/>
                  <Text style={{flex:1,color:theme.foreground,fontSize:13,lineHeight:21}}>{entry}</Text>
                </View>
              ))}
              {item.journalEntry?.text ? (
                <View style={{padding:15,backgroundColor:theme.surface,borderRadius:11}}>
                  <Text style={{color:theme.foreground,fontSize:13,lineHeight:22}}>
                    {item.journalEntry.text}
                  </Text>
                </View>
              ):null}
            </DetailInfoSection>
          ):null}
          {item.phase==='Témoignage' ? (
            <DetailInfoSection title="La floraison">
              {photo ? <Image source={{uri:photo}} resizeMode="cover"
                style={{width:'100%',height:178,borderRadius:10}}/>:null}
              <Text style={{color:theme.foreground,fontSize:13,lineHeight:22}}>{item.summary}</Text>
            </DetailInfoSection>
          ):null}
          <View style={{paddingVertical:17}}>
            <Text style={{color:theme.muted,fontSize:11,lineHeight:19}}>
              Les informations affichées sont celles que le porteur du rêve a renseignées.
              Les ressources marquées comme recherchées ne sont pas encore confirmées.
            </Text>
          </View>
        </DetailMoreDrawer>
      ) : null}
    </DetailLayout>
  );
}
