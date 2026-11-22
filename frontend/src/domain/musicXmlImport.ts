import type {MusicNotationEvent} from './musicNotation';

/** A safe, browser-side bridge between editable MusicXML and JenLow MIDI events.
 * No claim is made that a PDF or raster image has been recognized.
 * OMR engines may produce MusicXML as their verified interchange format.
 */
export type ParsedMusicXml={
  events:MusicNotationEvent[];
  bpm:number;
  numerator:number;
  denominator:number;
  clef:'treble'|'bass';
  warnings:string[];
};

const PITCH:Record<string,number>={
  C:0,D:2,E:4,F:5,G:7,A:9,B:11,
};
const SHARP_ORDER=['F','C','G','D','A','E','B'];
const FLAT_ORDER=['B','E','A','D','G','C','F'];
const text=(parent:Element,selector:string)=>
  parent.querySelector(selector)?.textContent?.trim()||'';
const number=(raw:string,fallback:number)=>
  raw!==''&&Number.isFinite(Number(raw))?Number(raw):fallback;
const direct=(parent:Element,tag:string)=>
  Array.from(parent.children).filter(child=>child.localName===tag);
const clamp=(v:number,low:number,high:number)=>Math.min(high,Math.max(low,v));

export function parseMusicXml(xml:string):ParsedMusicXml{
  if(typeof DOMParser==='undefined')
    throw Error('La reconnaissance MusicXML nécessite un navigateur web.');
  if(xml.length>5_000_000||!xml.trim())
    throw Error('Partition MusicXML vide ou trop volumineuse (5 Mo maximum).');
  if(/<!DOCTYPE\b|<!ENTITY\b/i.test(xml))
    throw Error('Partition MusicXML contenant des entités externes non autorisées.');
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.getElementsByTagName('parsererror').length||
    doc.documentElement.localName!=='score-partwise')
    throw Error('MusicXML invalide : fichier score-partwise requis.');
  const parts=direct(doc.documentElement,'part');
  if(!parts.length||parts.length>30)
    throw Error('La partition doit contenir entre 1 et 30 parties.');
  const partNames=new Map<string,string>();
  for(const part of Array.from(doc.getElementsByTagName('score-part'))){
    const id=part.getAttribute('id');
    if(id)partNames.set(id,text(part,'part-name'));
  }
  const warnings:string[]=[];
  let bpm=100,numerator=4,denominator=4;
  let clef:'treble'|'bass'='treble',haveTempo=false,haveMeter=false;
  const events:MusicNotationEvent[]=[];
  for(const part of parts){
    const partName=partNames.get(part.getAttribute('id')||'')||'';
    const percussion=/drum|percussion|batterie|schlagzeug/i.test(partName);
    let divisions=1,signature=0,offset=0;
    let partClef:'treble'|'bass'='treble';
    const measures=direct(part,'measure');
    for(const measure of measures){
      let cursor=0,measureLength=0,previousStart=0;
      const meterDuration=numerator*4/denominator;
      for(const element of Array.from(measure.children)){
        if(element.localName==='attributes'){
          divisions=Math.max(.001,number(text(element,'divisions'),divisions));
          const fifths=number(text(element,'key fifths'),signature);
          signature=clamp(fifths,-7,7);
          const n=number(text(element,'time beats'),numerator);
          const d=number(text(element,'time beat-type'),denominator);
          if(n>=1&&n<=32&&[1,2,4,8,16,32].includes(d)){
            if(!haveMeter){numerator=n;denominator=d;haveMeter=true;}
          }
          if(text(element,'clef sign')==='F'){
            partClef='bass';if(events.length===0)clef='bass';
          }
          continue;
        }
        if(element.localName==='direction'){
          const t=number(
            element.querySelector('sound')?.getAttribute('tempo')||'',
            number(text(element,'metronome per-minute'),0));
          if(t>=20&&t<=320&&!haveTempo){bpm=Math.round(t);haveTempo=true;}
          continue;
        }
        if(element.localName==='backup'){
          cursor=Math.max(0,cursor-number(text(element,'duration'),0)/divisions);
          continue;
        }
        if(element.localName==='forward'){
          cursor+=Math.max(0,number(text(element,'duration'),0))/divisions;
          measureLength=Math.max(measureLength,cursor);
          continue;
        }
        if(element.localName!=='note')continue;
        const chord=direct(element,'chord').length>0;
        const rest=direct(element,'rest').length>0;
        const grace=direct(element,'grace').length>0;
        let length=number(text(element,'duration'),0)/divisions;
        if(grace)length=0;
        const start=chord?previousStart:cursor;
        if(!chord)previousStart=start;
        if(!rest&&!grace){
          const step=text(element,'pitch step');
          const octave=number(text(element,'pitch octave'),-1);
          const explicitAlter=text(element,'pitch alter');
          const keyAlter=signature>0&&SHARP_ORDER.slice(0,signature).includes(step)?1:
            signature<0&&FLAT_ORDER.slice(0,-signature).includes(step)?-1:0;
          const alter=number(explicitAlter,keyAlter);
          const midi=12*(octave+1)+(PITCH[step]??-100)+alter;
          if(midi>=0&&midi<=127&&step in PITCH){
            const velocity=clamp(Math.round(number(text(element,'velocity'),90)),1,127);
            events.push({
              id:'xml-'+events.length,
              instrument:percussion?'drum':'piano',
              midi:Math.round(midi),velocity,
              startBeats:Math.round((offset+start)*1000)/1000,
              lengthBeats:Math.max(.125,Math.round(length*1000)/1000),
            });
            if(events.length>16000)
              throw Error('Partition trop complexe (plus de 16 000 notes).');
          }else warnings.push('Certaines notes ou percussions n’ont pas pu être interprétées.');
        }
        if(!chord)cursor+=length;
        measureLength=Math.max(measureLength,start+length,cursor);
      }
      // Pickup measures can be shorter than the declared meter; do not
      // fabricate silence that would shift all subsequent notes.
      offset+=Math.max(measureLength,measures.length===1?0:
        (measureLength===0?meterDuration:0));
    }
    if(partClef==='bass'&&events.length<=1)clef='bass';
  }
  if(!events.length)throw Error('Aucune note jouable reconnue dans ce MusicXML.');
  if(parts.length>1)warnings.push(
    'Les parties instrumentales sont réunies dans l’éditeur JenLow. Vérifie les voix et les instruments.');
  warnings.push('Vérifie les reprises, articulations et signes complexes avant utilisation.');
  return {events,bpm,numerator,denominator,clef,warnings:[...new Set(warnings)]};
}
