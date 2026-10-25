/**
 * Shared Dreams: data contracts for future persistent backend.
 * "Moi aussi" does not grant ownership; owner invitations require acceptance.
 */
export type DreamRole='owner'|'collaborator';
export type InvitationStatus='pending'|'accepted'|'declined';
export type DreamMembership={
  dreamId:string;
  userId:string;
  role:DreamRole;
  status:InvitationStatus;
  invitedBy:string;
};
export type DreamSharingSummary={
  dreamId:string;
  ownerIds:string[];
  acceptedCollaboratorIds:string[];
  meTooCount:number;  // public, server-derived
  encouragementCountForOwners:number; // private to owners only
};
export function mayEditDream(userId:string,memberships:DreamMembership[]):boolean{
 return memberships.some(m=>m.userId===userId&&m.role==='owner'&&m.status==='accepted');
}
export function acceptOwnerInvitation(invitation:DreamMembership):DreamMembership{
 if(invitation.role!=='owner'||invitation.status!=='pending')return invitation;
 return {...invitation,status:'accepted'};
}
/** Production: backend must authorize invites, enforce owner edits and
 * prevent unconsented ownership. No client-only role can grant privileges.
 */
