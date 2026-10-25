import type {Publication,DreamPhase} from '../discoveryData';

/** Stable permission identifiers; backend can enforce the same policy. */
export type ActionId='share-internal'|'share-external'|'fire'|'prayer'|'inspire'|'verse-export'|'encourage'|'same-dream'|'offer-help'|'introduce'|'audio-collab';
export const dreamPermissions:Record<DreamPhase,readonly ActionId[]>={
  'Rêve':['share-internal','encourage','same-dream','fire','prayer'],
  'Initiation':['share-internal','prayer','offer-help','introduce'],
  'Croissance':['prayer'],
  'Témoignage':['share-internal','share-external','prayer','fire','inspire'],
};
export function allowedActions(item:Publication):readonly ActionId[]{
  switch(item.type){
   case 'dream':return dreamPermissions[item.phase];
   case 'bible':return ['share-internal','fire','prayer','inspire','verse-export'];
   case 'music':return ['share-internal','fire','audio-collab'];
  }
}
export function can(item:Publication,action:ActionId):boolean{return allowedActions(item).includes(action);}
export const labels:Record<ActionId,string>={
 'share-internal':'Partager dans JenLow','share-external':'Partager à l’extérieur',
 'fire':'Ma liste Fire','prayer':'Ma prière du jour',
 'inspire':'Inspirer mon rêve','verse-export':'Exporter ce verset',
 'encourage':"Je t’encourage",'same-dream':'Moi aussi',
 'offer-help':'Proposer mon aide','introduce':'Présenter quelqu’un de mon cercle',
 'audio-collab':'Proposer une adaptation musicale',
};
/** Permissions: "same Dream" never grants co-ownership or editing rights.
 * Encourage counts are creator-only; "me too" counts are public and server-derived.
 * A collaborator is distinct from a co-owner and must accept an invitation.
 * Music adaptations are permitted by posting, but creator controls republishing
 * and is required to credit the adaptation's contributors. No music download.
 */
export const CAN_DOWNLOAD_MUSIC=false;
export const DOWNLOADABLE_CONTENT_TYPES=['bible'] as const;
