import type {Sql} from '../core/database';
import {areContacts,inCircle} from '../authorization/access';
export async function mutuallyConnected(sql:Sql,a:string,b:string):Promise<boolean>{
 return (await areContacts(sql,a,b)&&await areContacts(sql,b,a))||await inCircle(sql,a,b);
}
