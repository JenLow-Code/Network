import type { DreamBlock } from './dreamWorkspace';

export type TileSize='1x1'|'2x1'|'1x2'|'2x2';
export type InspirationLayoutGroup =
 | {type:'columns';left:DreamBlock[];right:DreamBlock[]}
 | {type:'wide';block:DreamBlock};

export const tileSizeOf=(block:DreamBlock):TileSize=>
 block.tileSize??(block.size==='featured'?'2x1':'1x1');
export const isWideTile=(block:DreamBlock):boolean=>
 tileSizeOf(block).startsWith('2');
export const isTallTile=(block:DreamBlock):boolean=>
 tileSizeOf(block).endsWith('x2');

/** Rough masonry height estimate to balance independent columns. Actual card height is content-driven. */
function estimatedHeight(block:DreamBlock):number{
 const size=tileSizeOf(block);
 const kind=block.kind;
 const length=block.noteBlocks?.map(b=>b.text).join('').length??block.content.length;
 const raw=kind==='image'||kind==='gallery'||kind==='publication-ref'?165:
   kind==='quote'||kind==='bible-verse'||kind==='poem'||kind==='note'?
   Math.min(330,85+Math.ceil(length/35)*21):kind==='document'||kind==='pdf'?135:
   Math.min(190,95+Math.ceil(length/32)*19);
 return isTallTile(block)?Math.max(310,raw):Math.max(120,raw);
}

/** Two stacked masonry lanes, flushed whenever a full-width tile occurs.
 * Avoids row alignment holes while preserving the approximate original order.
 */
export function layoutInspirations(blocks:DreamBlock[]):InspirationLayoutGroup[]{
 const result:InspirationLayoutGroup[]=[];
 let left:DreamBlock[]=[],right:DreamBlock[]=[];
 let leftHeight=0,rightHeight=0;
 const flush=()=>{
  if(left.length||right.length){
   result.push({type:'columns',left,right});
   left=[];right=[];leftHeight=0;rightHeight=0;
  }
 };
 for(const block of blocks){
  if(isWideTile(block)){flush();result.push({type:'wide',block});continue;}
  const height=estimatedHeight(block);
  if(leftHeight<=rightHeight){left.push(block);leftHeight+=height+10;}
  else{right.push(block);rightHeight+=height+10;}
 }
 flush();
 return result;
}
