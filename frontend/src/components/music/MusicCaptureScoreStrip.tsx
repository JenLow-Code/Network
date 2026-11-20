import React,{useEffect,useRef,useState} from 'react';
import {ScrollView,View} from 'react-native';
import Svg,{Ellipse,Line,Text as SvgText} from 'react-native-svg';
import {useAppTheme} from '@/theme/AppTheme';
import type {MusicProjectFile} from '@/domain/musicWorkspace';
import type {MusicNotationEvent} from '@/domain/musicNotation';
import {MusicMidiPreview} from './MusicMidiPreview';

const PINK='#CB245C';
const STEP=34;
const LEFT=24;
const STAFF_HEIGHT=72;
const staffTop=12;
const drumHeight=(pitch:number)=>pitch===36?52:pitch===38||pitch===39?35:
  pitch===42||pitch===46?18:26;
const pianoHeight=(pitch:number,clef:'treble'|'bass')=>{
  // E4 is the lowest treble line; G2 is the lowest bass line.
  const reference=clef==='bass'?43:64;
  const diatonic=(midi:number)=>{
    const letters=[0,0,1,1,2,3,3,4,4,5,5,6];
    return Math.floor(midi/12)*7+letters[(midi%12+12)%12];
  };
  return 52-(diatonic(pitch)-diatonic(reference))*5;
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
  const width=Math.max(520,LEFT+end*STEP+40);
  useEffect(()=>{
    if(playheadBeats===null)return;
    scroll.current?.scrollTo({
      x:Math.max(0,LEFT+playheadBeats*STEP-105),animated:false,
    });
  },[playheadBeats]);
  if(!notes.length)return null;
  const y=(n:MusicNotationEvent)=>kind==='piano'?
    pianoHeight(n.midi,clef):drumHeight(n.midi);
  return <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false}
    accessibilityLabel={kind==='piano'?'Extrait de portée musicale':'Extrait de percussion'}
    style={{height:STAFF_HEIGHT,flexGrow:0}}>
    <Svg width={width} height={STAFF_HEIGHT} viewBox={`0 0 ${width} ${STAFF_HEIGHT}`}>
      {[12,22,32,42,52].map(line=><Line key={line}
        x1={4} x2={width-3} y1={line} y2={line}
        stroke={theme.foreground} opacity={.43} strokeWidth={.75}/>)}
      {notes.map(n=>{
        const x=LEFT+n.startBeats*STEP;
        const pos=y(n);
        const played=playheadBeats!==null&&n.startBeats<=playheadBeats;
        const ink=played?PINK:theme.foreground;
        const small=kind==='drum';
        return <React.Fragment key={n.id}>
          {pos>57?<Line x1={x-11} x2={x+11} y1={62} y2={62}
            stroke={ink} strokeWidth={.8}/>:null}
          {small?<>
            <Line x1={x-5} x2={x+5} y1={pos-5} y2={pos+5}
              stroke={ink} strokeWidth={1.7}/>
            <Line x1={x-5} x2={x+5} y1={pos+5} y2={pos-5}
              stroke={ink} strokeWidth={1.7}/>
          </>:<Ellipse cx={x} cy={pos} rx={6.3} ry={4.3}
            rotation={-18} origin={`${x},${pos}`}
            fill={n.lengthBeats<2?ink:'none'} stroke={ink} strokeWidth={1.4}/>}
          {n.lengthBeats<3.5?<Line x1={x+6} x2={x+6}
            y1={pos} y2={pos-23} stroke={ink} strokeWidth={1.25}/>:null}
          {n.lengthBeats<1?<Line x1={x+6} x2={x+13}
            y1={pos-23} y2={pos-13} stroke={ink} strokeWidth={1.6}/>:null}
        </React.Fragment>;
      })}
      {playheadBeats!==null?<Line
        x1={LEFT+playheadBeats*STEP} x2={LEFT+playheadBeats*STEP}
        y1={6} y2={59} stroke={PINK} opacity={.4} strokeWidth={1}/>:null}
    </Svg>
  </ScrollView>;
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
