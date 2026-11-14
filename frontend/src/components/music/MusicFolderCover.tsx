import React,{useEffect,useMemo,useState} from 'react';
import {Image,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {getDraftAttachment} from '@/domain/musicLocalStorage';
import type {MusicProject} from '@/domain/musicWorkspace';
import {useAppTheme} from '@/theme/AppTheme';

/** A rounded PRIVATE song portrait. Public covers are composed on JenLow cassettes elsewhere. */
export function MusicFolderCover({project,size=82}: {project:MusicProject;size?:number}){
  const theme=useAppTheme();
  const [localUrl,setLocalUrl]=useState<string|null>(null);
  useEffect(()=>{
    let active=true;let temporary:string|null=null;
    setLocalUrl(null);
    if(project.coverLocalId){
      void getDraftAttachment(project.coverLocalId).then(blob=>{
        if(!blob)return;
        temporary=URL.createObjectURL(blob);
        if(active)setLocalUrl(temporary);
      }).catch(()=>{});
    }
    return()=>{active=false;if(temporary)URL.revokeObjectURL(temporary);};
  },[project.coverLocalId]);
  const palette=['#F3E4E7','#E9EAF2','#E8EEDF','#E8E8E2','#F1E9D8'];
  const tint=useMemo(()=>palette[
    Array.from(project.id).reduce((sum,ch)=>sum+ch.charCodeAt(0),0)%palette.length
  ],[project.id]);
  const uri=localUrl||project.coverUrl;
  return <View style={{width:size,height:size,borderRadius:Math.round(size*.18),overflow:'hidden',
    justifyContent:'center',alignItems:'center',
    backgroundColor:theme.dark?'#392D36':tint}}>
    {uri?<Image source={{uri}} style={{width:'100%',height:'100%'}} resizeMode="cover"/>:
      <Ionicons name="musical-notes-outline" color="#CB245C" size={Math.round(size*.35)}/>}
  </View>;
}
