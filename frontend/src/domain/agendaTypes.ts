/** Agenda domain contracts. Local demo first; backend must validate invitations. */
export type AgendaStatus='pending'|'confirmed'|'declined';
export type AgendaEntry={
 id:string;title:string;partner:string;place:string;dateLabel:string;timeLabel:string;
 status:AgendaStatus;source:'lesson'|'dream'|'service';createdBy:string;
};
export const DEMO_AGENDA:AgendaEntry[]=[{
 id:'demo-tandem-001',title:'Tandem guitare',partner:'nebulanomad',place:'JenLow Studio',
 dateLabel:'Prochain cours (démo)',timeLabel:'13:00',status:'pending',source:'lesson',createdBy:'system'
}];
/** Invitees must accept before pending appointments are treated as confirmed.
 * Confirmed events may later be exported to external calendars, with consent.
 * The backend will store ISO timestamps and timezones; dateLabel is demo UI only.
 */
