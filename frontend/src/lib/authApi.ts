export const API_BASE=(process.env.EXPO_PUBLIC_API_URL||'https://jenlow-network-auth.jenlow-production.workers.dev').replace(/\/$/,'');
export type AuthReply={user:{id:string;email:string;displayName:string;handle?:string};session:{accessToken:string;refreshToken:string;expiresIn:number;tokenType:string}};
export async function authCall(route:string,data:Record<string,unknown>):Promise<AuthReply>{
 const response=await fetch(API_BASE+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
 const result=await response.json().catch(()=>({error:'invalid_server_response'}));
 if(!response.ok)throw new Error(result.error||'authentication_failed');
 return result as AuthReply;
}
export const authenticateEmail=(email:string,password:string)=>authCall('/v1/auth/email/login',{email,password});
export const registerEmail=(displayName:string,email:string,password:string,inviteCode:string)=>authCall('/v1/auth/email/register',{displayName,email,password,inviteCode});
