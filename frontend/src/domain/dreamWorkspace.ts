import type {DreamPhase,DreamPublication} from '../discoveryData';
export type DreamEntry={id:string;title:string;phase:DreamPhase;summary:string;image:string;needs:string[];notes:string[];additions:string[];testimony?:{comment:string;mediaType:'audio'|'photo'|'video'|'text';mediaUrl?:string;date:string};createdAt:string;ownerIds:string[]};
export const phaseOrder:DreamPhase[]=['Rêve','Initiation','Croissance','Témoignage'];
export function fromDemo(d:DreamPublication):DreamEntry{return {id:d.id,title:d.title,phase:d.phase,summary:d.summary,image:d.image,needs:d.needs,notes:[],additions:[],createdAt:new Date().toISOString(),ownerIds:['demo-user']}}
export function canEditField(phase:DreamPhase,field:'title'|'summary'|'image'|'needs'|'notes'|'additions'|'testimony'):boolean{
 if(field==='title')return false;
 if(phase==='Rêve')return true;
 if(phase==='Initiation')return field==='additions'||field==='notes';
 if(phase==='Croissance')return field==='notes';
 return false;
}
export function canClose(phase:DreamPhase):boolean{return phase==='Croissance'}
export function nextPhase(phase:DreamPhase):DreamPhase|undefined{return phaseOrder[phaseOrder.indexOf(phase)+1]}
