import React,{useEffect,useRef,useState} from 'react';
import {Platform,Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/AppTheme';

/** Original, genuinely audible short plucked-note study for the design preview.
 * No royalty-protected recording, real contribution or user data is fabricated. */
export function MusicProposalDemoAudio(){
  const theme=useAppTheme();
  const [playing,setPlaying]=useState(false);
  const ctxRef=useRef<AudioContext|null>(null);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const stop=()=>{
    if(timer.current!==null)clearTimeout(timer.current);
    timer.current=null;
    const context=ctxRef.current;ctxRef.current=null;
    if(context)void context.close().catch(()=>{});
    setPlaying(false);
  };
  useEffect(()=>()=>{if(timer.current!==null)clearTimeout(timer.current);
    if(ctxRef.current)void ctxRef.current.close().catch(()=>{});},[]);
  const toggle=()=>{
    if(playing){stop();return;}
    if(Platform.OS!=='web'||typeof window==='undefined')return;
    const AC=window.AudioContext;
    if(!AC)return;
    const context=new AC();
    ctxRef.current=context;
    // Four chords, 16 separately plucked notes. Purely synthetic original
    // preview audio, distinct from any collaborator's real attachment.
    const pitches=[196,246.94,293.66,369.99,174.61,220,261.63,329.63,
      164.81,196,246.94,293.66,146.83,185,220,277.18];
    const start=context.currentTime+.035;
    pitches.forEach((hz,index)=>{
      const at=start+index*.33;
      const gain=context.createGain();
      const osc=context.createOscillator();
      osc.type='triangle';osc.frequency.value=hz;
      const overtone=context.createOscillator();
      overtone.type='sine';overtone.frequency.value=hz*2;
      const high=context.createGain();high.gain.value=.10;
      osc.connect(gain);overtone.connect(high);high.connect(gain);
      gain.connect(context.destination);
      gain.gain.setValueAtTime(.0001,at);
      gain.gain.exponentialRampToValueAtTime(.10,at+.012);
      gain.gain.exponentialRampToValueAtTime(.0001,at+.29);
      osc.start(at);overtone.start(at);
      osc.stop(at+.31);overtone.stop(at+.31);
    });
    setPlaying(true);
    timer.current=setTimeout(stop,5800);
  };
  return <Pressable onPress={toggle} accessibilityRole="button"
    accessibilityLabel={playing?'Arrêter la démo sonore':'Écouter la démo sonore'}
    style={{minHeight:59,flexDirection:'row',alignItems:'center',gap:12,
      paddingHorizontal:11,borderRadius:11,borderWidth:1,borderColor:theme.border,
      backgroundColor:theme.dark?'rgba(255,255,255,.04)':'rgba(249,244,240,.8)'}}>
    <View style={{width:36,height:36,borderRadius:18,
      backgroundColor:'#CB245C',justifyContent:'center',alignItems:'center'}}>
      <Ionicons name={playing?'stop':'play'} size={17} color="#FFFFFF"/>
    </View>
    <View style={{flex:1,minWidth:0,gap:3}}>
      <Text style={{fontWeight:'700',fontSize:12,color:theme.foreground}}>
        Idée de guitare · démo sonore
      </Text>
      <Text style={{fontSize:10,color:theme.muted}}>
        Exemple original synthétisé · {playing?'lecture en cours':'appuyer pour écouter'}
      </Text>
    </View>
    <View style={{height:24,flexDirection:'row',alignItems:'center',gap:2}}>
      {Array.from({length:24},(_,i)=><View key={i} style={{
        width:2,height:5+((i*13+7)%19),borderRadius:2,
        backgroundColor:playing?'#CB245C':theme.muted,opacity:playing?.95:.35,
      }}/>)}
    </View>
  </Pressable>;
}
