import {Text,TextInput} from '@/i18n/LocalizedText';
import React,{useState} from 'react';
import {KeyboardAvoidingView,Linking,Platform,Pressable,ScrollView,StyleSheet,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {router,useLocalSearchParams} from 'expo-router';
import {Avatar,Nav,TopActions} from '@/components';
import {useApp} from '@/context';
import {colors as c} from '@/theme';

function ChatHeader({name,subtitle}:{name:string,subtitle:string}) {
 return <View style={s.header}>
  <Pressable onPress={()=>router.back()} accessibilityLabel="Back"><Ionicons name="chevron-back" size={24}/></Pressable>
  <Avatar size={35}/>
  <View style={{flex:1}}><Text style={s.headerName}>{name}</Text><Text style={s.headerDetail}>{subtitle}</Text></View>
  <Ionicons name="videocam-outline" size={21} color="#111"/><TopActions/>

 </View>;
}
function Action({title,subtitle,icon,onPress}:{title:string,subtitle?:string,icon:keyof typeof Ionicons.glyphMap,onPress:()=>void}) {
 return <Pressable accessibilityRole="button" onPress={onPress} style={s.action}>
  <Ionicons name={icon} color={c.pink} size={19}/>
  <View style={{flex:1}}><Text style={s.actionTitle}>{title}</Text>{subtitle&&<Text style={s.actionSubtitle}>{subtitle}</Text>}</View>
  <Ionicons name="chevron-forward" color="#888" size={16}/>
 </Pressable>;
}
function SystemChat(){
 const [calendarOptions,setCalendarOptions]=useState(false);
 const open=(url:string)=>{void Linking.openURL(url).catch(()=>setCalendarOptions(true));};
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}>
  <ChatHeader name="JenLow Network" subtitle="System • lesson reminder"/>
  <ScrollView style={{flex:1}} contentContainerStyle={{padding:18,paddingTop:40,paddingBottom:35}}>
   <Text style={s.day}>Lesson reminder</Text>
   <View style={s.systemBubble}>
    <Text style={{fontSize:13,lineHeight:21,color:'#141414'}}>Your tandem with <Text style={{fontWeight:'700'}}>nebulanomad</Text> is scheduled for tomorrow at 13:00 at JenLow Studio.</Text>
    <Text style={{fontSize:13,lineHeight:21,marginTop:10}}>What would you like to do?</Text>
   </View>
   <View style={{marginTop:16,gap:9}}>
    <Action title="Add to my calendar" subtitle="Google Calendar, Outlook…" icon="calendar-outline" onPress={()=>setCalendarOptions(v=>!v)}/>
    {calendarOptions&&<View style={s.calendarChoices}>
      <Text style={{fontSize:11,color:'#666',marginBottom:8}}>Choose a calendar to create an event:</Text>
      <View style={{flexDirection:'row',gap:9}}>
       <Pressable style={s.calendarProvider} onPress={()=>open('https://calendar.google.com/calendar/u/0/r/eventedit')}><Text style={s.calendarProviderLabel}>Google Calendar ↗</Text></Pressable>
       <Pressable style={s.calendarProvider} onPress={()=>open('https://outlook.live.com/calendar/0/deeplink/compose')}><Text style={s.calendarProviderLabel}>Outlook ↗</Text></Pressable>
      </View>
      <Text style={{fontSize:10,color:'#999',marginTop:8}}>These links open a new event. Automatic lesson details will follow with the backend.</Text>
     </View>}
    <Action title="Add to JenLow Agenda" subtitle="Internal agenda — coming soon" icon="book-outline" onPress={()=>router.push('/agenda')}/>
    <Action title="Contact my teacher" subtitle="Open the conversation with nebulanomad" icon="chatbubble-ellipses-outline" onPress={()=>router.push('/chat/teacher')}/>
   </View>
  </ScrollView><Nav/>
 </SafeAreaView>;
}
function PersonChat({teacher,recipient,sharedId}:{teacher:boolean;recipient?:string;sharedId?:string}){
 const {messages,send}=useApp();const [input,setInput]=useState('');
 const submit=()=>{const m=input.trim();if(m){send(m);setInput('')}};
 return <SafeAreaView style={{flex:1,backgroundColor:'#fff'}}><KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
  <ChatHeader name={recipient|| (teacher?'nebulanomad':'Helena Hills')} subtitle={teacher?'Teacher • Demo contact':'Active 11m ago'}/>
  <ScrollView style={{flex:1}} contentContainerStyle={{padding:16,paddingTop:30,gap:8,flexGrow:1,justifyContent:'flex-end'}}>
   <Text style={s.day}>Demo conversation</Text>{sharedId?<View style={{padding:13,backgroundColor:'#f5f5f5',borderRadius:10}}><Text style={{fontSize:13,fontWeight:'700'}}>Publication partagée</Text><Text style={{fontSize:12,marginTop:6}}>{sharedId}</Text><Text style={{fontSize:11,color:'#888',marginTop:5}}>Aperçu uniquement : aucun message n'a été envoyé.</Text></View>:null}
   {messages.map(m=><View key={m.id} style={[s.bubble,{alignSelf:m.fromMe?'flex-end':'flex-start',backgroundColor:m.fromMe?'#000':c.pink}]}><Text style={{fontSize:13,color:m.fromMe?'#fff':'#111'}}>{m.text}</Text></View>)}
  </ScrollView>
  <View style={s.composer}>
   <TextInput placeholder="Message..." value={input} onChangeText={setInput} onSubmitEditing={submit} returnKeyType="send" style={s.input}/>
   <Pressable onPress={submit} accessibilityLabel="Send message"><Ionicons name="send" color={c.pink} size={22}/></Pressable>
  </View>
 </KeyboardAvoidingView><Nav/></SafeAreaView>;
}
export default function Chat(){
 const {id,recipient,sharedId}=useLocalSearchParams<{id:string;recipient?:string;sharedId?:string}>();
 return id==='system'?<SystemChat/>:<PersonChat teacher={id==='teacher'} recipient={recipient} sharedId={sharedId}/>;
}
const s=StyleSheet.create({
 header:{flexDirection:'row',gap:10,alignItems:'center',borderBottomWidth:StyleSheet.hairlineWidth,borderColor:'#ececec',padding:15},
 headerName:{fontSize:13,fontWeight:'700',color:'#121212'},headerDetail:{fontSize:10,color:'#888',marginTop:2},
 day:{alignSelf:'center',fontSize:11,color:'#aaa',marginBottom:22},
 systemBubble:{backgroundColor:'#fce8f1',alignSelf:'flex-start',borderRadius:16,borderTopLeftRadius:5,padding:16,maxWidth:'93%'},
 action:{minHeight:59,borderWidth:1,borderColor:'#ededed',backgroundColor:'#fff',borderRadius:11,flexDirection:'row',alignItems:'center',gap:13,padding:13},
 actionTitle:{fontSize:13,fontWeight:'600',color:'#171717'},actionSubtitle:{fontSize:10,color:'#8b8b8b',marginTop:4},
 calendarChoices:{paddingHorizontal:15,paddingVertical:14,borderWidth:1,borderColor:'#f6dce7',borderRadius:10,backgroundColor:'#fffbfd'},
 calendarProvider:{paddingVertical:9,paddingHorizontal:10,borderRadius:7,borderWidth:1,borderColor:'#ddd'},calendarProviderLabel:{fontSize:11,color:'#333'},
 bubble:{maxWidth:'84%',paddingVertical:10,paddingHorizontal:13,borderRadius:16},
 composer:{padding:12,flexDirection:'row',gap:10,alignItems:'center'},input:{flex:1,borderWidth:1,borderColor:'#dedede',borderRadius:10,height:42,paddingHorizontal:12,fontSize:13}
});
