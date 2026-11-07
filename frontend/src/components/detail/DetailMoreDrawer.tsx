import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';

/** Focused editorial reading drawer, shared by Dream and other public detail screens. */
export function DetailMoreDrawer({
  heading, subtitle, children, label = 'En savoir plus',
}: {
  heading:string; subtitle?:string; children:React.ReactNode; label?:string;
}) {
  const theme=useAppTheme();
  const {width}=useWindowDimensions();
  const [open,setOpen]=useState(false);
  const offset=useRef(new Animated.Value(550)).current;
  useEffect(()=>{
    if(open) Animated.timing(offset,{toValue:0,duration:270,useNativeDriver:true}).start();
    else offset.setValue(550);
  },[open,offset]);

  return <>
    <View style={{flexDirection:'row',justifyContent:'flex-end',alignItems:'center',
      minHeight:42,paddingRight:50}}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={()=>setOpen(true)}
        style={{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:12}}>
        <Text style={{color:theme.foreground,fontSize:12,fontWeight:'700'}}>{label}</Text>
        <Ionicons name="arrow-forward-outline" size={15} color={theme.foreground}/>
      </Pressable>
    </View>
    <Modal visible={open} transparent animationType="fade" onRequestClose={()=>setOpen(false)}>
      <View style={{flex:1,backgroundColor:'rgba(16,16,17,0.53)',
        flexDirection:'row',justifyContent:'flex-end'}}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button"
          accessibilityLabel="Fermer les informations" onPress={()=>setOpen(false)}/>
        <Animated.View style={{
          height:'100%',width:Math.min(520,width),
          backgroundColor:theme.background,
          borderTopLeftRadius:width>600?18:0,borderBottomLeftRadius:width>600?18:0,
          overflow:'hidden',transform:[{translateX:offset}],
        }}>
          <ScrollView keyboardShouldPersistTaps="handled"
            contentContainerStyle={{paddingHorizontal:width<430?22:35,paddingTop:20,paddingBottom:70}}>
            <View style={{flexDirection:'row',justifyContent:'space-between',
              alignItems:'center',marginBottom:33,paddingBottom:18,borderBottomWidth:1,
              borderColor:theme.border}}>
              <Pressable onPress={()=>setOpen(false)} accessibilityRole="button"
                accessibilityLabel="Retour à la publication" style={{width:42,height:42,justifyContent:'center'}}>
                <Ionicons name="arrow-back-outline" color={theme.foreground} size={23}/>
              </Pressable>
              <Text style={{fontSize:10,color:theme.muted,fontWeight:'700',letterSpacing:1.25}}>LE RÊVE EN DÉTAIL</Text>
              <Pressable onPress={()=>setOpen(false)} accessibilityRole="button"
                accessibilityLabel="Fermer" style={{padding:9}}>
                <Ionicons name="close-outline" size={21} color={theme.foreground}/>
              </Pressable>
            </View>
            {subtitle ? <Text style={{color:'#B75B7B',fontWeight:'700',fontSize:10,
              letterSpacing:1.4,textTransform:'uppercase',marginBottom:12}}>{subtitle}</Text>:null}
            <Text style={{fontFamily:'serif',fontSize:width<430?30:37,
              lineHeight:width<430?39:46,color:theme.foreground,marginBottom:28}}>{heading}</Text>
            <View style={{gap:15}}>{children}</View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  </>;
}
export function DetailInfoSection({title,text,children}:{
  title:string;text?:string;children?:React.ReactNode;
}) {
 const theme=useAppTheme();
 if(!text?.trim()&&!children)return null;
 return (
  <View style={{
    paddingVertical:18,borderTopWidth:1,borderColor:theme.border,
    gap:10,
  }}>
    <Text style={{fontSize:10,letterSpacing:1.25,fontWeight:'700',color:theme.muted}}>
      {title.toUpperCase()}
    </Text>
    {text?.trim()?<Text style={{fontSize:14,lineHeight:23,color:theme.foreground}}>{text}</Text>:null}
    {children}
  </View>
 );
}
