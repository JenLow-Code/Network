import React,{useState} from 'react';
import {KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {useApp} from '@/context';
import {NetworkLogo,GoogleMark} from '@/brand';
import {useAuth} from '@/auth/AuthProvider';

export default function Login(){
 const [register,setRegister]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const {signIn,signUp,signInWithSocial,resetPassword,configured}=useAuth();
 const submit=async()=>{
  if(busy)return;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){setError('Please enter a valid email address.');return}
  if(password.length<12){setError('Your password must contain at least 12 characters.');return}
  setError('');setBusy(true);
  try{
   if(register){const result=await signUp(name,email,password);if(result==='email_confirmation_required'){setError('Account created. Please confirm your email before signing in.');return}}
   else await signIn(email,password);
   router.replace('/discover');
  }catch(e){
   const key=e instanceof Error?e.message:'request_failed';
   const errors:Record<string,string>={
    invalid_credentials:'Wrong email or password.',
    rate_limited:'Too many attempts. Please try again in 15 minutes.',
    beta_invite_required:'An invitation code is required for the private beta.',
    email_unavailable:'This email already has an account. Please sign in.',
    invalid_registration:'Please enter your name, email and a stronger password.',
    registration_failed:'Registration could not be completed.',
    server_not_configured:'The authentication server is not configured yet.',
    password_auth_unavailable:'Email sign-in is temporarily unavailable. The server needs an authentication provider.',
    request_failed:'Unable to reach the server. Check your internet connection.'
   };setError(errors[key]||key);
  }finally{setBusy(false)}
 };
 return <SafeAreaView style={s.safe}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView contentContainerStyle={s.root} keyboardShouldPersistTaps="handled">
  <View style={s.top}><NetworkLogo/></View>
  <Text style={s.heading}>{register?'Bienvenue sur JenLow':'Bienvenue !'}</Text>
  <Text style={s.subheading}>{register?'Créer mon compte':'Se connecter à JenLow Network'}</Text>
  {register?<TextInput value={name} onChangeText={setName} autoComplete="name" placeholder="Nom affiché" placeholderTextColor="#aaa" style={s.input}/>:null}
  <TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="email@domain.com" placeholderTextColor="#aaa" style={s.input}/>
  <TextInput value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete={register?'new-password':'current-password'} placeholder="Mot de passe (12 caractères minimum)" placeholderTextColor="#aaa" style={s.input}/>
  {register?<TextInput value={code} onChangeText={setCode} autoCapitalize="none" placeholder="Code d'invitation bêta" placeholderTextColor="#aaa" style={s.input}/>:null}
  {error?<Text style={s.error}>{error}</Text>:null}
  {!configured?<Text style={s.error}>Authentication setup required. Connect your Supabase project first.</Text>:null}
  <Pressable accessibilityRole="button" disabled={busy||!configured} onPress={()=>{void submit()}} style={[s.continue,busy&&{opacity:.5}]}><Text style={s.continueLabel}>{busy?'Connexion…':register?"Créer mon compte":"Se connecter"}</Text></Pressable>
  <Pressable onPress={()=>{setRegister(!register);setError('')}} style={{paddingVertical:17}}><Text style={{fontSize:12,color:'#D71D77'}}>{register?'Déjà un compte ? Se connecter':"Première fois ? Créer un compte"}</Text></Pressable>
  <View style={s.separator}><View style={s.line}/><Text style={s.or}>ou</Text><View style={s.line}/></View>
  <Pressable disabled={!configured||busy} onPress={()=>{setBusy(true);void signInWithSocial('google').catch(e=>setError(e.message||'Google login failed')).finally(()=>setBusy(false))}} style={[s.oauth,(!configured||busy)&&{opacity:.55}]}><GoogleMark size={18}/><Text style={s.oauthLabel}>Continuer avec Google</Text></Pressable>
  <Pressable disabled style={[s.oauth,{opacity:.55}]}><Ionicons name="logo-apple" size={19} color="#111"/><Text style={s.oauthLabel}>Apple · configuration développeur requise</Text></Pressable>
  <Pressable onPress={()=>{void resetPassword(email).then(()=>setError('Password recovery email requested.')).catch(e=>setError(e.message))}} disabled={!configured||!email}><Text style={{fontSize:11,color:'#777'}}>Mot de passe oublié ?</Text></Pressable>
  <Text style={s.terms}>JenLow Network utilise une authentification sécurisée externe. Google et Apple nécessitent une configuration fournisseur.</Text>
 </ScrollView></KeyboardAvoidingView></SafeAreaView>
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:'#fff'},root:{flexGrow:1,alignItems:'center',paddingHorizontal:34},top:{marginTop:75,marginBottom:52,alignItems:'center'},heading:{fontSize:14,fontWeight:'700',color:'#191919'},subheading:{fontSize:12,marginTop:4,marginBottom:25,color:'#222'},input:{height:38,borderWidth:1,borderColor:'#e4e4e4',width:'100%',borderRadius:7,paddingHorizontal:12,fontSize:12,marginBottom:10},error:{color:'#D71D77',fontSize:11,alignSelf:'flex-start',marginTop:5},continue:{width:'100%',height:38,alignItems:'center',justifyContent:'center',borderRadius:6,marginTop:12,backgroundColor:'#000'},continueLabel:{color:'#fff',fontSize:12},separator:{width:'100%',marginVertical:19,flexDirection:'row',alignItems:'center',gap:8},line:{height:1,backgroundColor:'#e5e5e5',flex:1},or:{color:'#aaa',fontSize:12},oauth:{height:36,backgroundColor:'#ededed',borderRadius:6,width:'100%',alignItems:'center',justifyContent:'center',flexDirection:'row',gap:9,marginBottom:8},oauthLabel:{fontSize:12,color:'#222'},terms:{fontSize:10,color:'#aaa',lineHeight:15,marginTop:18,textAlign:'center'}});
