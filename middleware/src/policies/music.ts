import type {Sql} from '../core/database';
import type {Viewer} from '../core/context';
import {notFound} from '../core/errors';
import {blockedBetween} from '../privacy/blocking';
export async function requirePublishedTrackMember(sql:Sql,viewer:Viewer,trackId:string,ownerOnly=false):Promise<void>{
 const t=await sql.first<{publisher_id:string;withdrawn_at:string|null;account_status:string}>("SELECT t.publisher_id,t.withdrawn_at,u.account_status FROM music_tracks t JOIN users u ON u.id=t.publisher_id WHERE t.id=?",trackId);
 if(!t||t.withdrawn_at||t.account_status!=='active'||await blockedBetween(sql,viewer.id,t.publisher_id))throw notFound();
 if(t.publisher_id===viewer.id)return;
 if(ownerOnly||!await sql.exists("SELECT 1 FROM music_collab_proposals WHERE original_track_id=? AND proposed_by=? AND status IN ('accepted','published')",trackId,viewer.id))throw notFound();
}
export async function requireProposalParty(sql:Sql,viewer:Viewer,id:string,ownerOnly=false):Promise<void>{
 const p=await sql.first<{proposed_by:string;publisher_id:string}>("SELECT p.proposed_by,t.publisher_id FROM music_collab_proposals p JOIN music_tracks t ON t.id=p.original_track_id WHERE p.id=?",id);
 if(!p||await blockedBetween(sql,viewer.id,p.publisher_id)||await blockedBetween(sql,viewer.id,p.proposed_by))throw notFound();
 if(viewer.id!==p.publisher_id&&(ownerOnly||viewer.id!==p.proposed_by))throw notFound();
}
