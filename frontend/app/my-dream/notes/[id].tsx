import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import { useDreams } from '@/domain/dreamRepository';
import { HANDWRITING_FAMILY } from '@/theme/handwriting';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Nav } from '@/components/navigation/Nav';

/** Private local notebook belonging to the owner's dream workspace. */
export default function PrivateDreamNotebook() {
  const {id} = useLocalSearchParams<{id:string}>();
  const theme=useAppTheme();
  const {height}=useWindowDimensions();
  const {items,patch}=useDreams();
  const dream=items.find(item=>item.id===id);
  const [text,setText]=useState(dream?.privateDiary||'');
  useEffect(()=>{setText(dream?.privateDiary||'');},[dream?.id]);
  const today=new Date().toISOString().slice(0,10);
  const frozen=!!dream?.paused && !!dream.pauseUntil && dream.pauseUntil>=today;
  const editable=dream?.phase==='Croissance' && !frozen;
  const checklist=(dream?.blocks||[]).filter(block=>block.kind==='todo');
  return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
    <ScrollView keyboardShouldPersistTaps="handled"
      contentContainerStyle={{paddingHorizontal:20,paddingTop:10,paddingBottom:115,
        maxWidth:780,width:'100%',alignSelf:'center',flexGrow:1}}>
      <PageHeader />
      <View style={{flexDirection:'row',alignItems:'center',gap:7,
        marginTop:23,marginBottom:27}}>
        <Ionicons name="lock-closed-outline" size={14} color={theme.muted}/>
        <Text style={{fontSize:11,letterSpacing:.6,color:theme.muted}}>
          Notes privées · uniquement pour toi
        </Text>
      </View>
      {(dream?.thoughts||[]).map(note=><Text key={note.id}
        style={{fontFamily:HANDWRITING_FAMILY,color:theme.foreground,
          fontSize:23,lineHeight:34,marginBottom:22}}>
        {note.text}
      </Text>)}

      {checklist.length ? <View style={{marginBottom:25,gap:12}}>
        <Text style={{fontSize:13,fontWeight:'700',color:theme.foreground}}>
          Ma checklist
        </Text>
        {checklist.map(block=><View key={block.id}
          style={{flexDirection:'row',alignItems:'center',gap:10,minHeight:42}}>
          <Pressable accessibilityRole="checkbox" disabled={!editable}
            accessibilityLabel={'Cocher '+(block.content||'cette tâche')}
            accessibilityState={{checked:!!block.checked,disabled:!editable}}
            onPress={()=>dream&&patch(dream.id,{blocks:(dream.blocks||[]).map(item=>
              item.id===block.id?{...item,checked:!item.checked}:item)})}
            style={{padding:4}}>
            <Ionicons name={block.checked?'checkbox':'square-outline'} size={21}
              color={block.checked?'#B88962':theme.muted}/>
          </Pressable>
          <Text style={{fontSize:14,lineHeight:22,flex:1,
            color:block.checked?theme.muted:theme.foreground,
            textDecorationLine:block.checked?'line-through':'none'}}>
            {block.content}
          </Text>
        </View>)}
      </View> : null}
      {dream ? (
        <TextInput value={editable?text:dream.privateDiary||''}
          editable={editable}
          onChangeText={next=>{setText(next);patch(dream.id,{privateDiary:next});}}
          multiline textAlignVertical="top"
          placeholder={editable?'Tu peux écrire librement ici…':''}
          placeholderTextColor={theme.muted}
          accessibilityLabel="Écrire mes notes personnelles privées"
          style={{minHeight:Math.max(390,height-245),padding:0,
            color:theme.foreground,fontFamily:HANDWRITING_FAMILY,
            fontSize:25,lineHeight:37,backgroundColor:'transparent'}}
        />
      ):<Text style={{color:theme.muted}}>Rêve introuvable.</Text>}
      {!editable&&dream ? <Text style={{color:theme.muted,fontSize:11,marginTop:14}}>
        {frozen?'Rêve congelé · notes en lecture seule':'Étape passée · notes en lecture seule'}
      </Text>:null}
    </ScrollView>
    <Nav/>
  </SafeAreaView>;
}
