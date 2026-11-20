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
/** Monotonic note-on/off timing in musical beats. Rests are naturally the
 * gaps between event starts and the previous note-offs.
 * We keep millibeat precision; score symbols can be quantized separately. */
export function liveNotePosition(startedAtMs:number,eventAtMs:number,bpm:number,
  originBeats=0):number {
  const elapsed=Math.max(0,eventAtMs-startedAtMs);
  return Math.round((originBeats+elapsed*bpm/60000)*1000)/1000;
}
export function liveNoteLength(pressedAtMs:number,releasedAtMs:number,bpm:number):number {
  const beats=Math.max(.125,(releasedAtMs-pressedAtMs)*bpm/60000);
  return Math.round(beats*1000)/1000;
}
/** Extend or shorten a note without silently covering the following notes.
 * Later notes on that instrument and the editing cursor are moved by the
 * exact duration delta; notes starting together keep their chord alignment.
 */
export function resizeMusicNote(
  events:MusicNotationEvent[],id:string,nextLength:number,
):MusicNotationEvent[]{
  const selected=events.find(event=>event.id===id);
  if(!selected||!Number.isFinite(nextLength)||nextLength<=0)return events;
  const oldEnd=selected.startBeats+selected.lengthBeats;
  const delta=nextLength-selected.lengthBeats;
  return events.map(event=>{
    if(event.id===id)return {...event,lengthBeats:nextLength};
    if(event.instrument===selected.instrument&&
      event.startBeats>=oldEnd-0.00001&&Math.abs(delta)>0.00001)
      return {...event,startBeats:Math.max(0,
        Math.round((event.startBeats+delta)*1000)/1000)};
    return event;
  });
}
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
export function exportMusicMidi(events:MusicNotationEvent[],tempoBpm:number,
  numerator=4,denominator=4):Uint8Array {
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
    0,255,88,4,Math.max(1,Math.min(32,Math.round(numerator))),
      Math.round(Math.log2(denominator)),24,8,
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
export function downloadMusicMidi(events:MusicNotationEvent[],bpm:number,title:string,
  numerator=4,denominator=4) {
  if(typeof document==='undefined'||typeof URL==='undefined')
    throw new Error('Export MIDI disponible dans le navigateur web.');
  const safe=(title.trim()||'idee-musicale').replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,70);
  const bytes=exportMusicMidi(events,bpm,numerator,denominator);
  const blob=new Blob([bytes as BlobPart],{type:'audio/midi'});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=url;anchor.download=safe+'.mid';
  document.body.appendChild(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}


/**
 * A4 printable notation PDF, generated locally without sending any musical data.
 * One staff is printed per instrument and meter-aligned span; drafts print grey.
 */
export function exportMusicScorePdf(events:MusicNotationEvent[],bpm:number,
  title:string,clef:'treble'|'bass'='treble',
  numerator=4,denominator=4):Uint8Array {
  const ordered=events.filter(e=>Number.isFinite(e.midi)&&Number.isFinite(e.startBeats))
    .slice().sort((a,b)=>a.startBeats-b.startBeats);
  if(!ordered.length)throw Error('Ajoute au moins une note avant d’exporter la partition.');
  const ascii=(value:string)=>value.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7e]/g,' ').slice(0,115);
  const esc=(value:string)=>ascii(value).replace(/([\\()])/g,'\\$1');
  const titleText=esc(title.trim()||'Partition JenLow');
  const barBeats=Math.max(.25,numerator*4/denominator);
  const beatsPerSystem=Math.max(barBeats,Math.floor(8/barBeats)*barBeats);
  const maxBeat=ordered.reduce((m,e)=>Math.max(m,e.startBeats+e.lengthBeats),barBeats);
  const instruments=(['piano','drum'] as const)
    .filter(part=>ordered.some(e=>e.instrument===part));
  const systems=Math.max(1,Math.ceil(maxBeat/beatsPerSystem));
  const rows:{part:'piano'|'drum';from:number;items:MusicNotationEvent[]}[]=[];
  for(let index=0;index<systems;index++)for(const part of instruments){
    rows.push({part,from:index*beatsPerSystem,items:ordered.filter(e=>e.instrument===part&&
      e.startBeats>=index*beatsPerSystem&&e.startBeats<(index+1)*beatsPerSystem)});
  }
  const pages:typeof rows[]=[];
  for(let i=0;i<rows.length;i+=6)pages.push(rows.slice(i,i+6));
  const number=(value:number)=>Number(value.toFixed(2));
  const diatonic=(midi:number)=>{
    const map=[0,0,1,1,2,3,3,4,4,5,5,6];
    return (Math.floor(midi/12)-1)*7+map[((midi%12)+12)%12];
  };
  const pdfPages=pages.map((page,pageIndex)=>{
    const commands:string[]=['0.7 w','0 G'];
    const text=(x:number,y:number,size:number,value:string)=>
      commands.push('BT /F1 '+size+' Tf '+x+' '+y+' Td ('+esc(value)+') Tj ET');
    text(49,787,17,titleText);
    text(49,768,10,'JenLow Music | '+Math.max(40,Math.min(240,Math.round(bpm)))+
      ' BPM | '+numerator+'/'+denominator+' | '+
      (clef==='treble'?'Treble clef':'Bass clef'));
    text(487,787,8,'Page '+(pageIndex+1)+' / '+pages.length);
    page.forEach((row,rowIndex)=>{
      const top=705-rowIndex*104;
      const bottom=top-40;
      text(48,top+14,9,(row.part==='piano'?(clef==='treble'?'G clef':'F clef'):
        'Percussion')+' | Beats '+row.from+'-'+(row.from+beatsPerSystem));
      for(let i=0;i<5;i++)commands.push('0.5 G 78 '+(bottom+i*10)+' m 532 '+(bottom+i*10)+' l S');
      for(let bar=0;bar<=Math.floor(beatsPerSystem/barBeats);bar++){
        const x=88+bar*barBeats*440/beatsPerSystem;
        commands.push('0.7 G '+x+' '+bottom+' m '+x+' '+top+' l S');
      }
      const sorted=row.items.slice().sort((a,b)=>a.startBeats-b.startBeats);
      let previous=row.from;
      sorted.forEach(e=>{
        const x=91+(e.startBeats-row.from)*440/beatsPerSystem;
        if(e.startBeats-previous>=.25){
          const restX=91+(previous-row.from)*440/beatsPerSystem+
            Math.min(17,(e.startBeats-previous)*440/beatsPerSystem/2);
          text(number(restX),number(bottom+18),10,'r');
        }
        const base=row.part==='drum'?null:
          diatonic(clef==='treble'?64:43);
        const y=row.part==='drum'?bottom+20:
          bottom+(diatonic(e.midi)-(base||0))*5;
        const yy=number(Math.max(bottom-22,Math.min(top+22,y)));
        const xx=number(x);
        const r=4,k=.55228475;
        commands.push(e.draft?'0.5 g':'0.79 0.14 0.36 rg');
        commands.push([
          number(xx-r)+' '+yy+' m',
          number(xx-r)+' '+number(yy+r*k)+' '+number(xx-r*k)+' '+
            number(yy+r)+' '+xx+' '+number(yy+r)+' c',
          number(xx+r*k)+' '+number(yy+r)+' '+number(xx+r)+' '+
            number(yy+r*k)+' '+number(xx+r)+' '+yy+' c',
          number(xx+r)+' '+number(yy-r*k)+' '+number(xx+r*k)+' '+
            number(yy-r)+' '+xx+' '+number(yy-r)+' c',
          number(xx-r*k)+' '+number(yy-r)+' '+number(xx-r)+' '+
            number(yy-r*k)+' '+number(xx-r)+' '+yy+' c f',
        ].join(' '));
        commands.push('0.5 G '+number(xx+4)+' '+yy+' m '+
          number(xx+4)+' '+number(yy+27)+' l S');
        if(row.part==='piano'&&[1,3,6,8,10].includes(e.midi%12))
          text(number(xx-12),number(yy+2),11,'#');
        text(number(xx-5),number(bottom-22),7,
          e.lengthBeats>=1?String(number(e.lengthBeats)):'');
        previous=Math.max(previous,e.startBeats+e.lengthBeats);
      });
    });
    return commands.join('\n')+'\n';
  });
  const count=pdfPages.length;
  const objects:string[]=[];
  objects[1]='<< /Type /Catalog /Pages 2 0 R >>';
  objects[2]='<< /Type /Pages /Count '+count+' /Kids ['+
    pages.map((_,i)=>(4+i*2)+' 0 R').join(' ')+'] >>';
  objects[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  pdfPages.forEach((stream,i)=>{
    const pageId=4+i*2,contentId=pageId+1;
    objects[pageId]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] '+
      '/Resources << /Font << /F1 3 0 R >> >> /Contents '+contentId+' 0 R >>';
    objects[contentId]='<< /Length '+stream.length+' >>\nstream\n'+stream+'endstream';
  });
  let raw='%PDF-1.4\n%JenLow\n';
  const offsets:number[]=[0];
  for(let id=1;id<objects.length;id++){
    offsets[id]=raw.length;
    raw+=id+' 0 obj\n'+objects[id]+'\nendobj\n';
  }
  const xref=raw.length;
  raw+='xref\n0 '+objects.length+'\n0000000000 65535 f \n';
  for(let id=1;id<objects.length;id++)
    raw+=String(offsets[id]).padStart(10,'0')+' 00000 n \n';
  raw+='trailer\n<< /Size '+objects.length+' /Root 1 0 R >>\n'+
    'startxref\n'+xref+'\n%%EOF\n';
  return new TextEncoder().encode(raw);
}
export function downloadMusicScorePdf(events:MusicNotationEvent[],bpm:number,
  title:string,clef:'treble'|'bass'='treble',
  numerator=4,denominator=4){
  if(typeof document==='undefined'||typeof URL==='undefined')
    throw Error('Export PDF disponible sur le navigateur web.');
  const bytes=exportMusicScorePdf(events,bpm,title,clef,numerator,denominator);
  const blob=new Blob([bytes as BlobPart],{type:'application/pdf'});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=url;
  anchor.download=(title.trim()||'partition').normalize('NFKD')
    .replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,65)+'.pdf';
  document.body.appendChild(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
