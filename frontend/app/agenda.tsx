import React from 'react';
import{View,Text,Pressable}from'react-native';
import{SafeAreaView}from'react-native-safe-area-context';
import{Ionicons}from'@expo/vector-icons';
import{router}from'expo-router';
import{Nav}from'@/components';
export default function Agenda(){return <SafeAreaView style={{flex:1,backgroundColor:'#fff',padding:24}}><Pressable onPress={()=>router.back()}><Ionicons name="chevron-back" size={26}/></Pressable><View style={{flex:1,alignItems:'center',justifyContent:'center',gap:16}}><Ionicons name="calendar-outline" size={58} color="#d71d77"/><Text style={{fontSize:23,fontWeight:'700'}}>JenLow Agenda</Text><Text style={{color:'#777',fontSize:14,textAlign:'center',lineHeight:21}}>Function not yet available.{'\n'}Here you will be able to view lessons, add them to your agenda and contact your teacher or student.</Text></View><Nav/></SafeAreaView>}
