import React,{useEffect,useState} from 'react';
import {Platform,View} from 'react-native';
import {getDraftAttachment} from '@/domain/musicLocalStorage';
import {useAppTheme} from '@/theme/AppTheme';
import type {MusicProjectFile} from '@/domain/musicWorkspace';

const pink='#CB245C';
/** Peak bars are calculated from the actual saved recording, never fabricated artwork. */
export function MusicAudioPeaks({file,muted=false}:{file?:MusicProjectFile;muted?:boolean}){
  const theme=useAppTheme();
  const [peaks,setPeaks]=useState<number[]>([]);
  useEffect(()=>{
    let live=true;
    setPeaks([]);
    if(Platform.OS!=='web'||typeof AudioContext==='undefined'||!file?.localFileId)return;
    void (async()=>{
      const blob=await getDraftAttachment(file.localFileId!);
      if(!blob)return;
      const context=new AudioContext();
      try{
        const buffer=await context.decodeAudioData(await blob.arrayBuffer());
        const channel=buffer.getChannelData(0);
        const bins=48;
        const stride=Math.max(1,Math.floor(channel.length/(bins*100)));
        const computed=Array.from({length:bins},(_,i)=>{
          const begin=Math.floor(i*channel.length/bins);
          const end=Math.floor((i+1)*channel.length/bins);
          let peak=0;
          for(let sample=begin;sample<end;sample+=stride)
            peak=Math.max(peak,Math.abs(channel[sample]||0));
          return peak;
        });
        if(live)setPeaks(computed);
      }finally{await context.close();}
    })().catch(()=>{});
    return()=>{live=false;};
  },[file?.localFileId]);
  return <View accessibilityLabel="Aperçu de la forme d’onde réelle"
    style={{height:25,flexDirection:'row',alignItems:'center',gap:2,
      flex:1,justifyContent:'space-between'}}>
    {peaks.length?peaks.map((v,i)=><View key={i}
      style={{flex:1,maxWidth:5,height:Math.max(2,Math.min(24,2+v*22)),
        borderRadius:2,backgroundColor:muted?theme.muted:pink,opacity:muted?.33:.75}}/>):
      <View style={{height:2,backgroundColor:theme.border,flex:1,borderRadius:1}}/>}
  </View>;
}
