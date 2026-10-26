import React,{createContext,useContext,useEffect,useMemo,useState} from 'react';
import {Platform} from 'react-native';
import type {User,Session} from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import {authConfigured,supabase} from './supabaseClient';

WebBrowser.maybeCompleteAuthSession();

type Social='google'|'apple';
type AuthContext={
 user:User|null;session:Session|null;initialized:boolean;configured:boolean;
 signIn:(email:string,password:string)=>Promise<void>;
 signUp:(name:string,email:string,password:string)=>Promise<'confirmed'|'email_confirmation_required'>;
 signInWithSocial:(provider:Social)=>Promise<void>;
 resetPassword:(email:string)=>Promise<void>;
 signOut:()=>Promise<void>;
};
const Context=createContext<AuthContext|null>(null);
const getClient=()=>{if(!supabase)throw new Error('auth_not_configured');return supabase};

export function AuthProvider({children}:{children:React.ReactNode}){
 const [session,setSession]=useState<Session|null>(null);
 const [initialized,setInitialized]=useState(false);
 useEffect(()=>{
  if(!supabase){setInitialized(true);return}
  let alive=true;
  const sub=supabase.auth.onAuthStateChange((_event,next)=>{
   if(alive){setSession(next);setInitialized(true)}
  });
  void supabase.auth.getSession().then(({data,error})=>{
   if(alive){setSession(error?null:data.session);setInitialized(true)}
  }).catch(()=>{if(alive){setInitialized(true);setSession(null)}});
  return ()=>{alive=false;sub.data.subscription.unsubscribe()}
 },[]);
 const actions=useMemo<AuthContext>(()=>({
  user:session?.user??null,session,initialized,configured:authConfigured,
  async signIn(email,password){
   const {error}=await getClient().auth.signInWithPassword({email:email.trim().toLowerCase(),password});
   if(error)throw error;
  },
  async signUp(name,email,password){
   const {data,error}=await getClient().auth.signUp({
    email:email.trim().toLowerCase(),password,
    options:{data:{display_name:name.trim()}}
   });
   if(error)throw error;
   return data.session?'confirmed':'email_confirmation_required';
  },
  async signInWithSocial(provider){
   const client=getClient();
   // iOS Apple signing must be enabled in provider dashboard and Apple Developer portal.
   if(provider==='apple'&&Platform.OS!=='ios'&&Platform.OS!=='web')throw new Error('apple_sign_in_requires_ios');
   const callback=Platform.OS==='web'
    ? 'https://network.jenlow.net/auth/callback'
    : Linking.createURL('auth/callback',{scheme:'jenlownetwork'});
   const {data,error}=await client.auth.signInWithOAuth({
    provider,options:{redirectTo:callback,skipBrowserRedirect:Platform.OS!=='web'}
   });
   if(error)throw error;
   if(Platform.OS==='web')return; // The browser navigates to the provider.
   if(!data.url)throw new Error('oauth_url_missing');
   const result=await WebBrowser.openAuthSessionAsync(data.url,callback);
   if(result.type!=='success')throw new Error('sign_in_cancelled');
   const returned=new URL(result.url);
   const oauthError=returned.searchParams.get('error_description')||returned.searchParams.get('error');
   if(oauthError)throw new Error(oauthError);
   const code=returned.searchParams.get('code');
   if(!code)throw new Error('oauth_authorization_code_missing');
   const {error:exchangeError}=await client.auth.exchangeCodeForSession(code);
   if(exchangeError)throw exchangeError;
  },
  async resetPassword(email){
   const callback=Linking.createURL('auth/callback',{scheme:'jenlownetwork'});
   const {error}=await getClient().auth.resetPasswordForEmail(email.trim().toLowerCase(),{redirectTo:callback});
   if(error)throw error;
  },
  async signOut(){
   const {error}=await getClient().auth.signOut();
   if(error)throw error;
  }
 }),[session,initialized]);
 return <Context.Provider value={actions}>{children}</Context.Provider>
}
export function useAuth(){const ctx=useContext(Context);if(!ctx)throw new Error('AuthProvider missing');return ctx}
