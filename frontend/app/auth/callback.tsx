import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Pressable,Text,View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {supabase} from '@/lib/supabaseClient';
import {useAuth} from '@/context/AuthProvider';

/** Supports web auth callback URLs and native PKCE redirects. */
export default function AuthCallback(){
 const params=useLocalSearchParams<{code?:string;error?:string;error_description?:string}>();
 const {user}=useAuth();
 const [error,setError]=useState('');
 useEffect(()=>{
  let alive=true;
  const finish=async()=>{
   if(user){router.replace('/discover');return}
   if(params.error||params.error_description){setError(params.error_description||params.error||'OAuth failed');return}
   if(typeof params.code==='string'&&supabase){
    const {error:exchangeError}=await supabase.auth.exchangeCodeForSession(params.code);
    if(exchangeError){if(alive)setError(exchangeError.message)}
    else router.replace('/discover');
   }else if(alive)setError('No authorization code received');
  };
  void finish();
  return()=>{alive=false}
 },[params.code,params.error,params.error_description,user]);
 return <View style={{flex:1,justifyContent:'center',alignItems:'center',padding:28,backgroundColor:'#fff'}}>
  {error?<><Text style={{color:'#9e3158',marginBottom:16}}>{error}</Text><Pressable onPress={()=>router.replace('/login')}><Text>Back to sign in</Text></Pressable></>:<ActivityIndicator/>}
 </View>;
}
