export type Visibility='private'|'members'|'public';
/** Resolve ownership and identity from trusted server state, never client parameters. */
export function canSee(visibility:unknown,authenticated:boolean,owner:boolean):boolean {
 return owner||visibility==='public'||(visibility==='members'&&authenticated);
}
