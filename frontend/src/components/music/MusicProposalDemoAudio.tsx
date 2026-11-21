import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Platform,Text,View} from 'react-native';
import {useAppTheme} from '@/theme/AppTheme';
import {MusicPeakBars} from './MusicAudioPeaksNext';
import {MusicCapturePlaybackBar} from './MusicCapturePlaybackBar';

const DURATION=5.8;
/** Original, genuinely audible plucked-note study. Never mislabels this
 * synthetic example as a real collaboration or a user recording. */
export function MusicProposalDemoAudio(){
  const theme=useAppTheme();
  const [playing,setPlaying]=useState(false);
  const [position,setPosition]=useState(0);
  const ctxRef=useRef<AudioContext|null>(null);
  const ticker=useRef<ReturnType<typeof setInterval>|null>(null);
  const startAt=useRef(0);
  // The bars reflect the amplitude envelopes of the generated sixteen plucks.
  const levels=useMemo(()=>Array.from({length:76},(_,i)=>{
    const time=i*DURATION/76;
    const noteOffset=time%0.33;
    if(time>5.3)return 0.01;
    return Math.max(.015,Math.min(1,Math.exp(-noteOffset*11)*(.65+(.35*Math.sin(i*1.37)**2))));
  }),[]);
  const stop=()=>{
    if(ticker.current!==null)clearInterval(ticker.current);
    ticker.current=null;
    const context=ctxRef.current;ctxRef.current=null;
    if(context)void context.close().catch(()=>{});
    setPlaying(false);setPosition(0);
  };
  useEffect(()=>()=> {
    if(ticker.current!==null)clearInterval(ticker.current);
    if(ctxRef.current)void ctxRef.current.close().catch(()=>{});
  },[]);
  const toggle=()=>{
    if(playing){stop();return;}
    if(Platform.OS!=='web'||typeof window==='undefined')return;
    const AC=window.AudioContext;
    if(!AC)return;
    const context=new AC();
    ctxRef.current=context;
    // Four chords, sixteen separate notes generated only from oscillators.
    const pitches=[196,246.94,293.66,369.99,174.61,220,261.63,329.63,
      164.81,196,246.94,293.66,146.83,185,220,277.18];
    const start=context.currentTime+.035;
    startAt.current=start;
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
    setPosition(0);setPlaying(true);
    ticker.current=setInterval(()=>{
      const elapsed=Math.max(0,context.currentTime-startAt.current);
      if(elapsed>=DURATION){stop();return;}
      setPosition(elapsed);
    },90);
  };
  return <View style={{gap:6,paddingVertical:6}}>
    <Text style={{fontWeight:'700',fontSize:12,color:theme.foreground}}>
      Idée de guitare · démo sonore
    </Text>
    <MusicCapturePlaybackBar title="la démo sonore" playing={playing}
      onToggle={toggle} position={position} duration={DURATION}
      waveform={<MusicPeakBars levels={levels} height={26}
         progress={position/DURATION}/>}/>
    <Text style={{fontSize:10,color:theme.muted}}>
      Exemple original synthétisé · non envoyé
    </Text>
  </View>;
}
