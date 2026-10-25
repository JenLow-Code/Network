import {Text} from '@/i18n/LocalizedText';
import React from 'react';import {Pressable,ScrollView,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';import {Ionicons} from '@expo/vector-icons';import {router} from 'expo-router';import {Nav,Avatar} from '@/components';import {myCircle} from '@/domain/demoCircle';
export default function Circle(){return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}><ScrollView style={{flex:1}} contentContainerStyle={{padding:18}}>
 <Text style={{fontFamily:'Caveat_700Bold',fontSize:35,marginBottom:6}}>Mon cercle</Text><Text style={{fontSize:12,color:'#888',marginBottom:18}}>Les personnes que je connais personnellement. Les appels vidéo sont réservés à ce cercle.</Text>
 {myCircle.map(person=><View key={person.id} style={{paddingVertical:14,flexDirection:'row',alignItems:'center',gap:11,borderBottomWidth:1,borderColor:'#eee'}}><Avatar size={36}/><View style={{flex:1}}><Text style={{fontWeight:'700'}}>{person.name}</Text><Text style={{fontSize:11,color:'#888'}}>{person.connection} · {person.talents.join(', ')}</Text></View><Pressable accessibilityLabel="Appel vidéo du cercle" onPress={()=>router.push({pathname:'/circle-call/[id]',params:{id:person.id}})}><Ionicons name="videocam-outline" color="#444" size={24}/></Pressable></View>)}
 </ScrollView><Nav/></SafeAreaView>}
