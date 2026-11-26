/** Compatibility boundary for the retired fixture namespace. Not an authorization check.
 * Remove when the legacy data has been reviewed and the functional API enforces its own contract.
 * Never use a display name, title, account email or ordinary user-owned test record to classify fixtures.
 */
type LegacyRecord={id?:string|null;isDemo?:boolean;author?:{id?:string|null;isDemo?:boolean}|null};
export const isRetiredFixture=(record:LegacyRecord|null|undefined):boolean=>
  !!record&&(record.isDemo===true||/^demo-/i.test(record.id||'')||
    record.author?.isDemo===true||/^demo-/i.test(record.author?.id||''));
export const isRealProposal=(proposal:LegacyRecord&{trackPublicationId?:string|null}):boolean=>
  !!proposal.id&&!!proposal.trackPublicationId&&!isRetiredFixture(proposal)&&
  !isRetiredFixture({id:proposal.trackPublicationId});
