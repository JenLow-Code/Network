import type { DreamBlock } from './dreamWorkspace';

export type TileSize='1x1'|'2x1'|'1x2'|'2x2';
export type InspirationLayoutGroup =
 | {type:'columns';left:DreamBlock[];right:DreamBlock[]}
 | {type:'wide';block:DreamBlock};

export const tileSizeOf=(block:DreamBlock):TileSize=>block.tileSize??'1x1';
export const isWideTile=(block:DreamBlock):boolean=>tileSizeOf(block).startsWith('2');
export const isTallTile=(block:DreamBlock):boolean=>tileSizeOf(block).endsWith('x2');

function estimateHeight(block:DreamBlock):number{
 const wide=isWideTile(block),tall=isTallTile(block);
 if(['image','gallery'].includes(block.kind))
   return (tall?wide?305:294:wide?190:157)+(block.title?34:0);
 if(block.kind==='publication-ref'||block.kind==='profile-ref')
   return tall?wide?315:305:wide?190:165;
 if(block.kind==='document'||block.kind==='pdf')return tall?300:wide?126:165;
 const length=block.kind==='note'&&block.noteBlocks?.length?
   block.noteBlocks.map(b=>b.text).join('\n').length:block.content.length;
 const approximateLineWidth=wide?44:21;
 const maxLines=tall?15:wide?7:9;
 const lines=Math.min(maxLines,Math.max(1,Math.ceil(length/approximateLineWidth)));
 return Math.max(tall?300:120,12+14+8+lines*(block.kind==='quote'?22:19)+12);
}

function balancedColumns(blocks:DreamBlock[],measurements:Record<string,number>):{
 left:DreamBlock[];right:DreamBlock[];
}{
 // Content is measured on the actual device rather than assumed to fit a row.
 // Discretized subset-sum balances the *total heights* of both columns, even
 // with text wrapping, different files and manually enlarged cards.
 const heights=blocks.map(b=>Math.max(1,Math.round(
   (measurements[b.id]??estimateHeight(b)+11)/12)));
 const stages:Array<Map<number,{previous:number;left:boolean}>>=[];
 let reachable=new Map<number,{previous:number;left:boolean}>([[0,{previous:0,left:false}]]);
 for(const height of heights){
   const next=new Map<number,{previous:number;left:boolean}>();
   for(const sum of reachable.keys()){
     if(!next.has(sum))next.set(sum,{previous:sum,left:false});
     if(!next.has(sum+height))next.set(sum+height,{previous:sum,left:true});
   }
   stages.push(next);reachable=next;
 }
 const total=heights.reduce((a,b)=>a+b,0);
 let best=0;
 for(const sum of reachable.keys()){
   if(Math.abs(total-2*sum)<Math.abs(total-2*best))best=sum;
 }
 const isLeft=new Array<boolean>(blocks.length).fill(false);
 for(let i=blocks.length-1;i>=0;i--){
   const decision=stages[i].get(best);
   if(!decision)break;
   isLeft[i]=decision.left;
   best=decision.previous;
 }
 // Preserve the author's canonical order within each vertical column.
 return {
   left:blocks.filter((_,i)=>isLeft[i]),
   right:blocks.filter((_,i)=>!isLeft[i]),
 };
}

/** Balanced masonry, with full-width cards retaining their position.
 * Measurements update after the actual cards render on each screen size.
 */
export function layoutInspirations(blocks:DreamBlock[],
 measurements:Record<string,number>={}):InspirationLayoutGroup[]{
 const result:InspirationLayoutGroup[]=[];
 let segment:DreamBlock[]=[];
 const flush=()=>{
   if(segment.length){
     result.push({type:'columns',...balancedColumns(segment,measurements)});
     segment=[];
   }
 };
 for(const block of blocks){
   if(isWideTile(block)){flush();result.push({type:'wide',block});}
   else segment.push(block);
 }
 flush();
 return result;
}

/** Reorder the underlying DreamBlock array, preserving every card's id/content. */
export function reorderInspiration(blocks:DreamBlock[],sourceId:string,
 targetId:string,after=false):DreamBlock[]{
 if(!sourceId||!targetId||sourceId===targetId)return blocks;
 const from=blocks.findIndex(b=>b.id===sourceId);
 if(from<0||!blocks.some(b=>b.id===targetId))return blocks;
 const next=blocks.slice();
 const [item]=next.splice(from,1);
 const target=next.findIndex(b=>b.id===targetId);
 next.splice(target+(after?1:0),0,item);
 if(blocks.every((b,i)=>b.id===next[i]?.id))return blocks;
 return next;
}
