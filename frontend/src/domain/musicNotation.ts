/** Local-first musical sketch. Notes are real MIDI events, not an audio track or a mock score. */
export type MusicNotationEvent = {
  id: string;
  instrument: 'piano' | 'drum';
  midi: number;
  startBeats: number;
  lengthBeats: number;
  velocity: number;
  /** A grey, uncommitted manual sketch note; not yet part of MIDI export. */
  draft?: boolean;
};
export const DRUM_PADS = [
  {label:'Kick',midi:36},
  {label:'Snare',midi:38},
  {label:'Hi-hat',midi:42},
  {label:'Open hat',midi:46},
  {label:'Clap',midi:39},
  {label:'Crash',midi:49},
] as const;
export const PIANO_NOTES = [
  {name:'Do',midi:60},{name:'Do♯',midi:61},{name:'Ré',midi:62},
  {name:'Ré♯',midi:63},{name:'Mi',midi:64},{name:'Fa',midi:65},
  {name:'Fa♯',midi:66},{name:'Sol',midi:67},{name:'Sol♯',midi:68},
  {name:'La',midi:69},{name:'La♯',midi:70},{name:'Si',midi:71},
  {name:'Do',midi:72},
] as const;
export function musicNoteName(midi:number) {
  const names=['Do','Do♯','Ré','Ré♯','Mi','Fa','Fa♯','Sol','Sol♯','La','La♯','Si'];
  return names[((midi%12)+12)%12]+(Math.floor(midi/12)-1);
}

/** Standard MIDI File type 1: meta/tempo, piano (ch 1), percussion (ch 10). */
export function exportMusicMidi(events:MusicNotationEvent[],tempoBpm:number):Uint8Array {
  const bpm=Math.min(240,Math.max(40,Math.round(tempoBpm||100)));
  const ticksPerBeat=480;
  const number=(value:number,length:number)=>{
    const out:number[]=[];
    for(let i=length-1;i>=0;i--)out.push((value>>>(i*8))&255);
    return out;
  };
  const chunk=(name:string,bytes:number[])=>
    [...Array.from(name).map(char=>char.charCodeAt(0)),...number(bytes.length,4),...bytes];
  const vlq=(v:number)=>{
    let value=Math.max(0,Math.floor(v)),bytes=[value&127];
    while((value>>=7)>0)bytes.unshift((value&127)|128);
    return bytes;
  };
  const tempo=Math.round(60000000/bpm);
  const meta=[
    0,255,81,3,...number(tempo,3),
    0,255,88,4,4,2,24,8,
    0,255,47,0,
  ];
  const track=(instrument:MusicNotationEvent['instrument'])=>{
    const channel=instrument==='piano'?0:9;
    const operations:{tick:number;order:number;data:number[]}[]=[];
    for(const event of events.filter(e=>e.instrument===instrument&&!e.draft)){
      if(!Number.isFinite(event.midi)||!Number.isFinite(event.startBeats))continue;
      const pitch=Math.max(0,Math.min(127,Math.round(event.midi)));
      const start=Math.max(0,Math.round(event.startBeats*ticksPerBeat));
      const end=start+Math.max(1,Math.round(Math.max(.125,event.lengthBeats||.5)*ticksPerBeat));
      const velocity=Math.max(1,Math.min(127,Math.round(event.velocity||95)));
      operations.push({tick:start,order:1,data:[0x90|channel,pitch,velocity]});
      operations.push({tick:end,order:0,data:[0x80|channel,pitch,0]});
    }
    operations.sort((a,b)=>a.tick-b.tick||a.order-b.order);
    const result:number[]=[];
    let prev=0;
    for(const event of operations){
      result.push(...vlq(event.tick-prev),...event.data);
      prev=event.tick;
    }
    result.push(0,255,47,0);
    return result;
  };
  const bytes=[
    ...chunk('MThd',[0,1,0,3,...number(ticksPerBeat,2)]),
    ...chunk('MTrk',meta),
    ...chunk('MTrk',track('piano')),
    ...chunk('MTrk',track('drum')),
  ];
  return new Uint8Array(bytes);
}
export function downloadMusicMidi(events:MusicNotationEvent[],bpm:number,title:string) {
  if(typeof document==='undefined'||typeof URL==='undefined')
    throw new Error('Export MIDI disponible dans le navigateur web.');
  const safe=(title.trim()||'idee-musicale').replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,70);
  const bytes=exportMusicMidi(events,bpm);
  const blob=new Blob([bytes as BlobPart],{type:'audio/midi'});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=url;anchor.download=safe+'.mid';
  document.body.appendChild(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
