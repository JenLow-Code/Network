import React,{useEffect,useState} from 'react';
import {Image,Platform,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {getDraftAttachment} from '@/domain/musicLocalStorage';
import {useAppTheme} from '@/theme/AppTheme';
import type {MusicProjectFile} from '@/domain/musicWorkspace';
const pink='#CB245C';
export function MusicLocalArt({file,size=42,cover=false,thumbnail=false,banner=false}:{
  file:MusicProjectFile;size?:number;cover?:boolean;thumbnail?:boolean;banner?:boolean;
}){
  const theme=useAppTheme();
  const [uri,setUri]=useState('');
  useEffect(()=>{
    let active=true;let url='';
    setUri('');
    if(Platform.OS==='web'&&file.localFileId){
      void getDraftAttachment(file.localFileId).then(blob=>{
        if(!blob)return;
        url=URL.createObjectURL(blob);
        if(active)setUri(url);else URL.revokeObjectURL(url);
      }).catch(()=>{});
    }
    return()=>{active=false;if(url)URL.revokeObjectURL(url);};
  },[file.localFileId]);
  return <View style={{width:banner?'100%':thumbnail?100:cover?'100%':size,
    maxWidth:banner?350:undefined,
    height:banner?66:thumbnail?70:cover?164:size,
    borderRadius:banner?6:thumbnail?11:cover?0:11,
    overflow:'hidden',alignItems:'center',justifyContent:'center',
    // The Capture preview is a small framed artwork/document thumbnail, not
    // a wide cropped strip that hides most of the original image.
    backgroundColor:banner?
      (theme.dark?'#28262A':'#F3F0E9'):theme.surface,
    borderWidth:banner?.5:1,borderColor:theme.border}}>
    {uri?<Image source={{uri}} style={{width:'100%',height:'100%'}}
      resizeMode={banner?'contain':'cover'}/>:
      <Ionicons name="image-outline" color={pink} size={21}/>}
  </View>;
}
