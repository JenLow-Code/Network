import type {MusicNotationEvent} from './musicNotation';

/**
 * Parse Standard MIDI Files (format 0/1, PPQ timing) without a third-party
 * dependency. Tempo changes are integrated into seconds before normalizing the
 * editable event positions to a fixed displayed BPM.
 *
 * The original .mid remains stored in Capture; this never modifies its bytes.
 */
export function parseMusicMidi(bytes:Uint8Array):{
  events:MusicNotationEvent[];bpm:number;durationSeconds:number
}{
  if(bytes.length<22||bytes.length>8*1024*1024)
    throw new Error('Fichier MIDI vide ou trop volumineux (8 Mo maximum).');
  const four=(at:number)=>String.fromCharCode(...bytes.slice(at,at+4));
  const u16=(at:number)=>((bytes[at]||0)<<8)|(bytes[at+1]||0);
  const u32=(at:number)=>((bytes[at]||0)*0x1000000+
    ((bytes[at+1]||0)<<16)+((bytes[at+2]||0)<<8)+(bytes[at+3]||0));
  if(four(0)!=='MThd')throw new Error('Le fichier ne contient pas une en-tête MIDI valide.');
  const headerSize=u32(4),format=u16(8),trackCount=u16(10),division=u16(12);
  if(headerSize<6||8+headerSize>bytes.length||format>1||trackCount<1||trackCount>128)
    throw new Error('Format MIDI non pris en charge.');
  if(division&0x8000||division===0)
    throw new Error('La lecture MIDI nécessite une base temporelle PPQ.');
  const ticksPerBeat=division&0x7fff;
  let cursor=8+headerSize;
  const tempos:[number,number][]=[[0,500000]];
  type Raw={pitch:number;channel:number;start:number;end:number;velocity:number};
  const raw:Raw[]=[];
  let lastTick=0;
  let sequence=0;
  const vlq=(end:number)=>{
    let value=0;
    for(let k=0;k<4;k++){
      if(cursor>=end)throw new Error('Événement MIDI incomplet.');
      const next=bytes[cursor++];
      value=value*128+(next&127);
      if(!(next&128))return value;
    }
    throw new Error('Valeur MIDI invalide.');
  };
  for(let t=0;t<trackCount;t++){
    if(cursor+8>bytes.length||four(cursor)!=='MTrk')
      throw new Error('Piste MIDI manquante.');
    const length=u32(cursor+4);
    cursor+=8;
    const end=cursor+length;
    if(end>bytes.length)throw new Error('Piste MIDI tronquée.');
    let tick=0,status=0;
    const held=new Map<number,{tick:number;velocity:number}[]>();
    while(cursor<end){
      tick+=vlq(end);lastTick=Math.max(lastTick,tick);
      if(cursor>=end)break;
      let command=bytes[cursor];
      if(command&0x80){cursor++;status=command<0xf0?command:0;}
      else if(status)command=status;
      else throw new Error('Statut MIDI manquant.');
      if(command===0xff){
        if(cursor>=end)throw new Error('Métadonnée MIDI tronquée.');
        const kind=bytes[cursor++],size=vlq(end);
        if(cursor+size>end)throw new Error('Métadonnée MIDI tronquée.');
        if(kind===0x51&&size===3){
          const value=((bytes[cursor]<<16)|(bytes[cursor+1]<<8)|bytes[cursor+2]);
          if(value>0)tempos.push([tick,value]);
        }
        cursor+=size;
        if(kind===0x2f){cursor=end;break;}
        continue;
      }
      if(command===0xf0||command===0xf7){
        const size=vlq(end);
        if(cursor+size>end)throw new Error('SysEx MIDI tronqué.');
        cursor+=size;continue;
      }
      if(command>=0xf0){
        const count=command===0xf1||command===0xf3?1:command===0xf2?2:0;
        if(cursor+count>end)throw new Error('Message MIDI tronqué.');
        cursor+=count;continue;
      }
      const kind=command&0xf0,channel=command&15;
      const count=kind===0xc0||kind===0xd0?1:2;
      if(cursor+count>end)throw new Error('Message MIDI tronqué.');
      const first=bytes[cursor++],second=count===2?bytes[cursor++]:0;
      if(kind!==0x80&&kind!==0x90)continue;
      const key=channel*128+first;
      if(kind===0x90&&second>0){
        const stack=held.get(key)||[];
        stack.push({tick,velocity:second});
        held.set(key,stack);
      }else{
        const stack=held.get(key),note=stack?.shift();
        if(!note)continue;
        if(raw.length>16000)throw new Error('Trop de notes dans ce MIDI (maximum 16 000).');
        raw.push({pitch:first,channel,start:note.tick,
          end:Math.max(tick,note.tick+1),velocity:note.velocity});
      }
    }
    // A missing MIDI note-off must not create an unbounded sustained sound.
    for(const [key,notes] of held){
      for(const note of notes){
        raw.push({pitch:key%128,channel:Math.floor(key/128),start:note.tick,
          end:Math.max(note.tick+1,lastTick),velocity:note.velocity});
      }
    }
    cursor=end;
  }
  if(!raw.length)throw new Error('Aucune note MIDI jouable dans ce fichier.');
  tempos.sort((a,b)=>a[0]-b[0]);
  const unique:[number,number][]=[];
  for(const tempo of tempos){
    if(unique.length&&unique[unique.length-1][0]===tempo[0])
      unique[unique.length-1]=tempo;
    else unique.push(tempo);
  }
  const bpm=Math.max(30,Math.min(300,Math.round(60000000/unique[0][1])));
  const secondsAt=(tick:number)=>{
    let total=0,previous=0,micros=unique[0][1];
    for(let i=1;i<unique.length&&unique[i][0]<tick;i++){
      const [next,newTempo]=unique[i];
      total+=(next-previous)/ticksPerBeat*micros/1000000;
      previous=next;micros=newTempo;
    }
    return total+(tick-previous)/ticksPerBeat*micros/1000000;
  };
  const events:MusicNotationEvent[]=raw
    .sort((a,b)=>a.start-b.start||a.pitch-b.pitch)
    .map((note,index)=>{
      const start=secondsAt(note.start);
      const end=secondsAt(note.end);
      return {
        id:'midi-import-'+index, instrument:note.channel===9?'drum':'piano',
        midi:note.pitch, velocity:note.velocity,
        startBeats:Math.round(start*bpm/60*1000)/1000,
        lengthBeats:Math.max(.01,Math.round((end-start)*bpm/60*1000)/1000),
      };
    });
  return {events,bpm,durationSeconds:Math.max(...raw.map(n=>secondsAt(n.end)))};
}
