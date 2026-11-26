import React from 'react';
import {Modal,Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';
import type {MusicProjectFile} from '@/domain/musicWorkspace';

type Props={
  visible:boolean;
  initialFile?:MusicProjectFile|null;
  sourceFile?:File|null;
  onClose:()=>void;
  onSaved:(file:MusicProjectFile)=>void;
};

/** Standalone scanner retired. Document recognition belongs to the future
 * Music Engine. No upload, recognition request or simulated save is possible.
 */
export function MusicDocumentScanner({visible,onClose}:Props){
  const theme=useAppTheme();
  return <Modal visible={visible} onRequestClose={onClose} transparent animationType="slide">
    <View style={{flex:1,backgroundColor:'rgba(0,0,0,.57)',padding:24,alignItems:'center',justifyContent:'center'}}>
      <View style={{width:'100%',maxWidth:540,backgroundColor:theme.background,borderRadius:18,padding:20,gap:16}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
          <Ionicons name="scan-outline" color={theme.muted} size={24}/>
          <Text style={{flex:1,fontSize:18,fontWeight:'700',color:theme.foreground}}>Numériser un document</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer le scanner" onPress={onClose} style={{padding:8}}>
            <Ionicons name="close" size={23} color={theme.foreground}/>
          </Pressable>
        </View>
        <Text accessibilityRole="alert" style={{color:theme.muted,fontSize:13,lineHeight:21}}>La reconnaissance des paroles et des partitions sera disponible avec le moteur musical JenLow.</Text>
        <Pressable disabled accessibilityRole="button" accessibilityState={{disabled:true}} style={{alignSelf:'flex-start',backgroundColor:theme.border,borderRadius:9,paddingHorizontal:18,paddingVertical:12}}>
          <Text style={{color:theme.muted,fontWeight:'700'}}>Analyser</Text>
        </Pressable>
      </View>
    </View>
  </Modal>;
}
