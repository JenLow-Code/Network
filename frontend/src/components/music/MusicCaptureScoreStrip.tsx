import React,{useEffect,useRef,useState} from 'react';
import {ScrollView,View} from 'react-native';
import Svg,{Ellipse,Line} from 'react-native-svg';
import {useAppTheme} from '@/theme/AppTheme';
import type {MusicProjectFile} from '@/domain/musicWorkspace';
import type {MusicNotationEvent} from '@/domain/musicNotation';
import {MusicMidiPreview} from './MusicMidiPreview';

const PINK='#CB245C';
const STEP=29;
const LEFT=24;
const BASE_STAFF_HEIGHT=64;
const drumHeight=(pitch:number)=>pitch===36?44:pitch===38||pitch===39?30:
  pitch===42||pitch===46?16:23;
const pianoHeight=(pitch:number,clef:'treble'|'bass')=>{
  // E4 is the lowest treble line; G2 is the lowest bass line.
  const reference=clef==='bass'?43:64;
  const diatonic=(midi:number)=>{
    const letters=[0,0,1,1,2,3,3,4,4,5,5,6];
    return Math.floor(midi/12)*7+letters[(midi%12+12)%12];
  };
  return 44-(diatonic(pitch)-diatonic(reference))*4;
};
function MiniStaff({events,kind,clef,playheadBeats}:{
  events:MusicNotationEvent[];kind:'piano'|'drum';
  clef:'treble'|'bass';playheadBeats:number|null;
}){
  const theme=useAppTheme();
  const scroll=useRef<React.ElementRef<typeof ScrollView>>(null);
  const notes=events.filter(event=>event.instrument===kind)
    .sort((a,b)=>a.startBeats-b.startBeats);
  const end=Math.max(8,...notes.map(n=>n.startBeats+n.lengthBeats));
  // Draw only the occupied staff, while longer scores remain horizontally scrollable.
  const width=Math.max(185,LEFT+end*STEP+18);
  const rawYs=notes.map(n=>kind==='piano'?
    pianoHeight(n.midi,clef):drumHeight(n.midi));
  const highestStem=Math.min(10,...rawYs.map((y,i)=>
    notes[i].lengthBeats<3.5?y-21:y-5));
  // Extend the staff vertically for high and low ledger notes, preserving
  // all stems/flags rather than clipping the upper end of the score.
  const topInset=Math.max(7,10-highestStem);
  const lowest=Math.max(44,...rawYs);
  const staffHeight=Math.max(BASE_STAFF_HEIGHT,topInset+lowest+13);
  useEffect(()=>{
    if(playheadBeats===null)return;
    scroll.current?.scrollTo({
      x:Math.max(0,LEFT+playheadBeats*STEP-105),animated:false,
    });
  },[playheadBeats]);
  if(!notes.length)return null;
  const y=(n:MusicNotationEvent)=>topInset+(kind==='piano'?
    pianoHeight(n.midi,clef):drumHeight(n.midi));
  return <View style={{width:'100%',minWidth:0,height:staffHeight}}>
    <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false}
      accessibilityLabel={kind==='piano'?'Extrait de portée musicale':'Extrait de percussion'}
      style={{height:staffHeight,flexGrow:0,width:'100%'}}>
    <Svg width={width} height={staffHeight} viewBox={`0 0 ${width} ${staffHeight}`}>
      {[12,20,28,36,44].map(line=><Line key={line}
        x1={4} x2={width-3} y1={line+topInset} y2={line+topInset}
        stroke={theme.foreground} opacity={.38} strokeWidth={.65}/>)}
      {notes.map(n=>{
        const x=LEFT+n.startBeats*STEP;
        const pos=y(n);
        const played=playheadBeats!==null&&n.startBeats<=playheadBeats;
        const ink=played?PINK:theme.foreground;
        const small=kind==='drum';
        return <React.Fragment key={n.id}>
          {pos>topInset+48?<Line x1={x-9} x2={x+9}
            y1={topInset+52} y2={topInset+52}
            stroke={ink} strokeWidth={.8}/>:null}
          {pos<topInset+5?<Line x1={x-9} x2={x+9}
            y1={topInset+2} y2={topInset+2}
            stroke={ink} strokeWidth={.8}/>:null}
          {small?<>
            <Line x1={x-3} x2={x+3} y1={pos-3} y2={pos+3}
              stroke={ink} strokeWidth={1.2}/>
            <Line x1={x-3} x2={x+3} y1={pos+3} y2={pos-3}
              stroke={ink} strokeWidth={1.3}/>
          </>:<Ellipse cx={x} cy={pos} rx={4} ry={2.8}
            rotation={-18} origin={`${x},${pos}`}
            fill={n.lengthBeats<2?ink:'none'} stroke={ink} strokeWidth={1.4}/>}
          {n.lengthBeats<3.5?<Line x1={x+4} x2={x+4}
            y1={pos} y2={pos-20} stroke={ink} strokeWidth={1.15}/>:null}
          {n.lengthBeats<1?<Line x1={x+4} x2={x+8}
            y1={pos-20} y2={pos-11} stroke={ink} strokeWidth={1.15}/>:null}
        </React.Fragment>;
      })}
      {playheadBeats!==null?<Line
        x1={LEFT+playheadBeats*STEP} x2={LEFT+playheadBeats*STEP}
        y1={topInset+5} y2={topInset+49} stroke={PINK} opacity={.4} strokeWidth={1}/>:null}
    </Svg>
    </ScrollView>
  </View>;
}
/** Capture overview: no paper panel, no empty instrumental staves and no
 * extra edit button. Only the row's single chevron opens the editor. */
export function MusicCaptureScoreStrip({file}:{file:MusicProjectFile}){
  const [seconds,setSeconds]=useState<number|null>(null);
  const notes=file.musicEvents||[];
  const piano=notes.some(n=>n.instrument==='piano');
  const drum=notes.some(n=>n.instrument==='drum');
  const bpm=file.tempoBpm||100;
  return <View style={{flexDirection:'row',alignItems:'center',gap:7}}>
    <MusicMidiPreview iconOnly file={file} onPlaybackSeconds={setSeconds}/>
    <View style={{flex:1,minWidth:0,gap:0}}>
      {piano?<MiniStaff events={notes} kind="piano"
        clef={file.scoreClef||'treble'}
        playheadBeats={seconds===null?null:seconds*bpm/60}/>:null}
      {drum?<MiniStaff events={notes} kind="drum" clef="treble"
        playheadBeats={seconds===null?null:seconds*bpm/60}/>:null}
    </View>
  </View>;
}
