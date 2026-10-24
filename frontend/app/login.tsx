import React,{useState} from 'react';
import {Alert,KeyboardAvoidingView,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router} from 'expo-router';
import {useApp} from '@/context';
import {NetworkLogo,GoogleMark} from '@/brand';

export default function Login(){
 const [email,setEmail]=useState('');const [error,setError]=useState(false);
 const {login}=useApp();
 function proceed(){if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())){setError(true);return;}setError(false);login(email.trim());router.replace('/discover');}
 function oauth(provider:string){Alert.alert('Coming soon',provider+' sign-in will be enabled after the authentication backend is connected.');}
 return <SafeAreaView style={s.safe}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView contentContainerStyle={s.root} keyboardShouldPersistTaps="handled">
 <View style={s.top}><NetworkLogo/></View>
 <Text style={s.heading}>Première fois ?</Text>
 <Text style={s.subheading}>Crée ton compte</Text>
 <TextInput value={email} onChangeText={x=>{setEmail(x);setError(false)}} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="email@domain.com" placeholderTextColor="#aaa" style={[s.input,error&&{borderColor:'#D71D77'}]} />
 {error&&<Text style={s.error}>Enter a valid email address.</Text>}
 <Pressable accessibilityRole="button" onPress={proceed} style={s.continue}><Text style={s.continueLabel}>Continue</Text></Pressable>
 <View style={s.separator}><View style={s.line}/><Text style={s.or}>or</Text><View style={s.line}/></View>
 <Pressable onPress={()=>oauth('Google')} style={s.oauth}><GoogleMark size={18}/><Text style={s.oauthLabel}>Continue with Google</Text></Pressable>
 <Pressable onPress={()=>oauth('Apple')} style={s.oauth}><Ionicons name="logo-apple" size={19} color="#111"/><Text style={s.oauthLabel}>Continue with Apple</Text></Pressable>
 <Text style={s.terms}>By clicking continue, you agree to our <Text style={s.termsLink}>Terms of Service</Text>{'\n'}and <Text style={s.termsLink}>Privacy Policy</Text></Text>
 </ScrollView></KeyboardAvoidingView></SafeAreaView>
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:'#fff'},root:{flexGrow:1,alignItems:'center',paddingHorizontal:34},top:{marginTop:86,marginBottom:64,alignItems:'center'},heading:{fontSize:14,fontWeight:'700',color:'#191919'},subheading:{fontSize:12,marginTop:4,marginBottom:25,color:'#222'},input:{height:34,borderWidth:1,borderColor:'#e4e4e4',width:'100%',borderRadius:7,paddingHorizontal:12,fontSize:12},error:{color:'#D71D77',fontSize:11,alignSelf:'flex-start',marginTop:5},continue:{width:'100%',height:35,alignItems:'center',justifyContent:'center',borderRadius:6,marginTop:16,backgroundColor:'#000'},continueLabel:{color:'#fff',fontSize:12},separator:{width:'100%',marginVertical:29,flexDirection:'row',alignItems:'center',gap:8},line:{height:1,backgroundColor:'#e5e5e5',flex:1},or:{color:'#aaa',fontSize:12},oauth:{height:35,backgroundColor:'#ededed',borderRadius:6,width:'100%',alignItems:'center',justifyContent:'center',flexDirection:'row',gap:9,marginBottom:8},oauthLabel:{fontSize:12,color:'#222'},terms:{fontSize:10,color:'#aaa',lineHeight:15,marginTop:18,textAlign:'center'},termsLink:{color:'#333'}});
