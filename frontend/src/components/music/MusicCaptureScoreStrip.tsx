import React,{useEffect,useRef,useState} from 'react';
import {ScrollView,Text,View} from 'react-native';
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
function MiniStaff({events,kind,clef,playheadBeats,scorePartId}:{
  events:MusicNotationEvent[];kind:'piano'|'drum';
  clef:'treble'|'bass';playheadBeats:number|null;
  scorePartId?:string;
}){
  const theme=useAppTheme();
  const scroll=useRef<React.ElementRef<typeof ScrollView>>(null);
  const offsetRef=useRef(0);
  const [availableWidth,setAvailableWidth]=useState(0);
  const notes=events.filter(event=>event.instrument===kind&&
    (!scorePartId||event.scorePartId===scorePartId))
    .sort((a,b)=>a.startBeats-b.startBeats);
  const end=Math.max(8,...notes.map(n=>n.startBeats+n.lengthBeats));
  // Extend the five ruled lines across most of the preview column, without
  // returning to full-page-width staves. Notes remain compact and readable.
  const width=Math.max(LEFT+end*STEP+18,
    availableWidth>0?availableWidth-3:460);
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
    if(playheadBeats===null||availableWidth<=0)return;
    const position=LEFT+playheadBeats*STEP;
    const current=offsetRef.current;
    const maxOffset=Math.max(0,width-availableWidth);
    // Follow long notation only after the playhead reaches the rightmost
    // quarter of the *visible* staff; short scores never scroll.
    if(maxOffset<=0)return;
    if(position>current+availableWidth*.76||
      position<current+availableWidth*.12){
      const next=Math.max(0,Math.min(maxOffset,
        position-availableWidth*.4));
      scroll.current?.scrollTo({x:next,animated:false});
      offsetRef.current=next;
    }
  },[playheadBeats,availableWidth,width]);
  if(!notes.length)return null;
  const y=(n:MusicNotationEvent)=>topInset+(kind==='piano'?
    pianoHeight(n.midi,clef):drumHeight(n.midi));
  return <View onLayout={event=>
      setAvailableWidth(Math.ceil(event.nativeEvent.layout.width))}
    style={{width:'100%',minWidth:0,height:staffHeight}}>
    <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false}
      scrollEventThrottle={32}
      onScroll={event=>{
        offsetRef.current=event.nativeEvent.contentOffset.x;
      }}
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
export function MusicCaptureScoreStrip({file,aligned=false}:{
  file:MusicProjectFile;aligned?:boolean;
}){
  const [seconds,setSeconds]=useState<number|null>(null);
  const notes=file.musicEvents||[];
  const piano=notes.some(n=>n.instrument==='piano');
  const drum=notes.some(n=>n.instrument==='drum');
  const bpm=file.tempoBpm||100;
  const theme=useAppTheme();
  const scoreParts=file.scoreParts||[];
  return <View style={{flexDirection:'row',alignItems:'center',gap:aligned?10:7,
    width:'100%',minWidth:0}}>
    <View style={aligned?{width:34,flexShrink:0,
      alignItems:'center',justifyContent:'center'}:undefined}>
      <MusicMidiPreview iconOnly file={file} onPlaybackSeconds={setSeconds}/>
    </View>
    <View style={{flex:1,minWidth:0,gap:0}}>
      {piano&&scoreParts.length>0?
        scoreParts.filter(part=>notes.some(note=>
          note.scorePartId===part.id)).map(part=>
          <View key={part.id} style={{gap:3,marginBottom:5}}>
            <Text style={{fontSize:11,color:theme.muted}}>
              {part.name} · {part.clef==='bass'?'Clé de fa':
                part.clef==='treble'?'Clé de sol':'Clé d’ut'}
            </Text>
            <MiniStaff events={notes} kind="piano"
              clef={part.clef==='bass'?'bass':'treble'}
              scorePartId={part.id}
              playheadBeats={seconds===null?null:seconds*bpm/60}/>
          </View>):
        piano?<MiniStaff events={notes} kind="piano"
          clef={file.scoreClef||'treble'}
          playheadBeats={seconds===null?null:seconds*bpm/60}/>:null}
      {drum?<MiniStaff events={notes} kind="drum" clef="treble"
        playheadBeats={seconds===null?null:seconds*bpm/60}/>:null}
    </View>
    {aligned?<View style={{width:65,flexShrink:0}}/>:null}
  </View>;
}
