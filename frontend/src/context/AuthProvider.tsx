import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {AppState,Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {User,Session} from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import {authConfigured,supabase} from '@/lib/supabaseClient';
import {setAccessToken} from '@/lib/api/session';

WebBrowser.maybeCompleteAuthSession();

type Social='google'|'apple';
/** A two-hour validation cycle; access tokens are shorter and rotate silently. */
export const SESSION_VALIDATION_MS=2*60*60*1000;
/** The user must authenticate again only after a full week with no activity. */
export const INACTIVITY_TIMEOUT_MS=7*24*60*60*1000;
const ACTIVITY_KEY='jenlow.network.activity.v1.';
const ACTIVITY_WRITE_MS=30*1000;

type AuthContext={
  user:User|null;
  session:Session|null;
  initialized:boolean;
  configured:boolean;
  validationError:boolean;
  revalidate:()=>Promise<void>;
  noteActivity:()=>void;
  signIn:(email:string,password:string)=>Promise<void>;
  signUp:(name:string,email:string,password:string)=>
    Promise<'confirmed'|'email_confirmation_required'>;
  signInWithSocial:(provider:Social)=>Promise<void>;
  resetPassword:(email:string)=>Promise<void>;
  signOut:()=>Promise<void>;
};
const Context=createContext<AuthContext|null>(null);
function client(){
  if(!supabase)throw new Error('auth_not_configured');
  return supabase;
}

/** A trusted local activity timestamp controls convenience, never API access. */
export function AuthProvider({children}:{children:React.ReactNode}){
  const [session,setSession]=useState<Session|null>(null);
  const [initialized,setInitialized]=useState(false);
  const [validationError,setValidationError]=useState(false);
  const verifiedAt=useRef(0);
  const activeAt=useRef(0);
  const lastWrite=useRef(0);
  const verifiedUser=useRef<string|null>(null);
  const validationId=useRef(0);
  const validating=useRef<Promise<void>|null>(null);

  const clear=useCallback(()=>{
    validationId.current+=1;
    verifiedAt.current=0;
    activeAt.current=0;
    verifiedUser.current=null;
    setSession(null);
    setAccessToken(null);
    setValidationError(false);
    setInitialized(true);
  },[]);

  const signOut=useCallback(async()=>{
    const uid=verifiedUser.current;
    clear();
    if(uid)await AsyncStorage.removeItem(ACTIVITY_KEY+uid).catch(()=>{});
    if(supabase)await supabase.auth.signOut({scope:'local'});
  },[clear]);

  const verify=useCallback(async(candidate:Session|null)=>{
    const ticket=++validationId.current;
    if(!candidate){
      clear();
      return;
    }
    try{
      const uid=candidate.user.id;
      if(!uid || candidate.user.is_anonymous){
        await client().auth.signOut({scope:'local'});
        if(ticket===validationId.current)clear();
        return;
      }
      const raw=await AsyncStorage.getItem(ACTIVITY_KEY+uid);
      const last=raw?Number(raw):NaN;
      if(Number.isFinite(last)&&Date.now()-last>=INACTIVITY_TIMEOUT_MS){
        await client().auth.signOut({scope:'local'});
        if(ticket===validationId.current)clear();
        return;
      }
      // getSession() alone reads untrusted local storage. The Auth server
      // validates the session before any protected screen can be mounted.
      const {data,error}=await client().auth.getUser();
      if(error||!data.user||data.user.id!==uid){
        if(ticket!==validationId.current)return;
        if(error && (error.status===0 || !error.status || error.status>=500)){
          verifiedAt.current=0;
          verifiedUser.current=null;
          setValidationError(true);
          setSession(null);
          setInitialized(true);
          return; // Network outage: keep credentials for a later retry.
        }
        await client().auth.signOut({scope:'local'}).catch(()=>{});
        if(ticket===validationId.current)clear();
        return;
      }
      if(ticket!==validationId.current)return;
      const now=Date.now();
      verifiedAt.current=now;
      activeAt.current=Number.isFinite(last)&&last>0?last:now;
      lastWrite.current=now;
      verifiedUser.current=uid;
      setSession(candidate);
      setValidationError(false);
      setInitialized(true);
      if(!Number.isFinite(last))void AsyncStorage.setItem(
        ACTIVITY_KEY+uid,String(now)).catch(()=>{});
    }catch{
      if(ticket===validationId.current){
        verifiedAt.current=0;
        verifiedUser.current=null;
        setValidationError(true);
        setSession(null);
        setInitialized(true);
      }
    }
  },[clear]);

  const revalidate=useCallback(async()=>{
    if(validating.current)return validating.current;
    const work=(async()=>{
      if(!supabase){clear();return;}
      const {data,error}=await supabase.auth.getSession();
      if(error){setValidationError(true);setInitialized(true);return;}
      await verify(data.session);
    })();
    validating.current=work;
    try{await work;}finally{validating.current=null;}
  },[clear,verify]);

  const noteActivity=useCallback(()=>{
    const uid=verifiedUser.current;
    if(!uid || validationError)return;
    const now=Date.now();
    if(activeAt.current && now-activeAt.current>=INACTIVITY_TIMEOUT_MS){
      void signOut();
      return;
    }
    activeAt.current=now;
    if(now-lastWrite.current<ACTIVITY_WRITE_MS)return;
    lastWrite.current=now;
    void AsyncStorage.setItem(ACTIVITY_KEY+uid,String(now)).catch(()=>{});
  },[signOut,validationError]);

  useEffect(()=>{
    if(!supabase){setInitialized(true);return;}
    let mounted=true;
    const listener=supabase.auth.onAuthStateChange((event,next)=>{
      if(!mounted)return;
      if(event==='SIGNED_OUT'){clear();return;}
      if(event==='INITIAL_SESSION')return; // Explicit getSession + getUser below.
      if(event==='TOKEN_REFRESHED'&&next&&verifiedUser.current===next.user.id){
        // Token rotation is not user activity, and must not reset inactivity.
        if(verifiedAt.current>0&&activeAt.current>0&&
          Date.now()-verifiedAt.current<SESSION_VALIDATION_MS&&
          Date.now()-activeAt.current<INACTIVITY_TIMEOUT_MS){
          setSession(next);
          return;
        }
        void verify(next);
        return;
      }
      if(next)void verify(next);
    });
    void revalidate().catch(()=>{if(mounted){
      setValidationError(true);setInitialized(true);
    }});
    const check=()=>{
      if(!verifiedUser.current)return;
      if(Date.now()-activeAt.current>=INACTIVITY_TIMEOUT_MS){
        void signOut();
      }else if(Date.now()-verifiedAt.current>=SESSION_VALIDATION_MS){
        void revalidate();
      }
    };
    const timer=setInterval(check,60*1000);
    const state=AppState.addEventListener('change',value=>{
      if(value==='active')check();
    });
    return()=>{
      mounted=false;
      listener.data.subscription.unsubscribe();
      state.remove();
      clearInterval(timer);
    };
  },[clear,revalidate,signOut,verify]);

  useEffect(()=>{
    if(Platform.OS!=='web'||typeof window==='undefined')return;
    // Only real input resets the inactivity clock; network refreshes do not.
    const activity=()=>noteActivity();
    window.addEventListener('pointerdown',activity,{passive:true});
    window.addEventListener('keydown',activity);
    window.addEventListener('touchstart',activity,{passive:true});
    const visible=()=>{if(document.visibilityState==='visible')
      void revalidateIfDue();};
    const revalidateIfDue=()=>{
      if(verifiedUser.current&&Date.now()-activeAt.current>=INACTIVITY_TIMEOUT_MS){
        void signOut();
      }else if(verifiedUser.current&&Date.now()-verifiedAt.current>=SESSION_VALIDATION_MS){
        void revalidate();
      }
    };
    document.addEventListener('visibilitychange',visible);
    return()=>{
      window.removeEventListener('pointerdown',activity);
      window.removeEventListener('keydown',activity);
      window.removeEventListener('touchstart',activity);
      document.removeEventListener('visibilitychange',visible);
    };
  },[noteActivity,revalidate,signOut]);

  const actions=useMemo<AuthContext>(()=>({
    user:session?.user??null,session,initialized,
    configured:authConfigured,validationError,revalidate,noteActivity,
    async signIn(email,password){
      const {data,error}=await client().auth.signInWithPassword({
        email:email.trim().toLowerCase(),password,
      });
      if(error)throw error;
      await verify(data.session);
    },
    async signUp(name,email,password){
      const {data,error}=await client().auth.signUp({
        email:email.trim().toLowerCase(),password,
        options:{data:{display_name:name.trim()}},
      });
      if(error)throw error;
      if(data.session)await verify(data.session);
      return data.session?'confirmed':'email_confirmation_required';
    },
    async signInWithSocial(provider){
      const auth=client();
      if(provider==='apple'&&Platform.OS!=='ios'&&Platform.OS!=='web')
        throw new Error('apple_sign_in_requires_ios');
      const callback=Platform.OS==='web'
        ?'https://network.jenlow.net/auth/callback':
          Linking.createURL('auth/callback',{scheme:'jenlownetwork'});
      const {data,error}=await auth.auth.signInWithOAuth({
        provider,options:{redirectTo:callback,skipBrowserRedirect:Platform.OS!=='web'},
      });
      if(error)throw error;
      if(Platform.OS==='web')return;
      if(!data.url)throw new Error('oauth_url_missing');
      const result=await WebBrowser.openAuthSessionAsync(data.url,callback);
      if(result.type!=='success')throw new Error('sign_in_cancelled');
      const returned=new URL(result.url);
      const oauthError=returned.searchParams.get('error_description')||
        returned.searchParams.get('error');
      if(oauthError)throw new Error(oauthError);
      const code=returned.searchParams.get('code');
      if(!code)throw new Error('oauth_authorization_code_missing');
      const {data:exchanged,error:exchangeError}=await auth.auth.exchangeCodeForSession(code);
      if(exchangeError)throw exchangeError;
      await verify(exchanged.session);
    },
    async resetPassword(email){
      const callback=Linking.createURL('auth/callback',{scheme:'jenlownetwork'});
      const {error}=await client().auth.resetPasswordForEmail(
        email.trim().toLowerCase(),{redirectTo:callback});
      if(error)throw error;
    },
    signOut,
  }),[session,initialized,validationError,revalidate,noteActivity,verify,signOut]);
  return <Context.Provider value={actions}>{children}</Context.Provider>;
}
export function useAuth(){
  const value=useContext(Context);
  if(!value)throw new Error('AuthProvider missing');
  return value;
}
