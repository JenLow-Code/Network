import React from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppTheme } from '@/theme/AppTheme';
import type { DreamEntry } from '@/domain/dreamWorkspace';

type Action={label:string;icon:keyof typeof Ionicons.glyphMap;go:()=>void;visible?:boolean};
const niceDate=(date?:string)=>{
 if(!date)return 'Aucune date définie';
 const parsed=new Date(date+'T12:00:00');
 return Number.isNaN(parsed.getTime())?'Date non disponible':
   parsed.toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
};
export default function DreamQuickActions({dream,onClose}:{
 dream:DreamEntry|null;onClose:()=>void;
}){
 const theme=useAppTheme();
 const show=!!dream;
 if(!dream)return <Modal visible={false}/>;
 const active=dream.phase==='Croissance'||dream.phase==='Témoignage';
 const run=(handler:()=>void)=>()=>{onClose();handler();};
 const open=(path:'view'|'inspirations'|'docs'|'notes'|'chat'|'coowners'|'participants')=>{
  if(path==='view'){router.push({pathname:'/my-dream/[id]',params:{id:dream.id,view:dream.phase}});return;}
  if(path==='inspirations'){router.push({pathname:'/my-dream/[id]',params:{id:dream.id,view:'Rêve'}});return;}
  if(path==='docs'){router.push({pathname:'/my-dream/library/[id]',params:{id:dream.id,tab:'documents'}});return;}
  if(path==='notes'){router.push({pathname:'/my-dream/notes/[id]',params:{id:dream.id}});return;}
  if(path==='chat'){router.push({pathname:'/chat/[id]',params:{id:dream.chat?.id||'dream-'+dream.id}});return;}
  router.push({pathname:'/my-dream-participants/[id]',params:{id:dream.id,tab:path==='coowners'?'coowners':'participants'}});
 };
 const actions:Action[]=[
  {label:'Voir les détails du rêve',icon:'open-outline',go:run(()=>open('view'))},
  {label:dream.phase==='Rêve'?'Voir les inspirations':'Voir les documents',
    icon:'folder-open-outline',go:run(()=>open(dream.phase==='Rêve'?'inspirations':'docs'))},
  {label:'Notes personnelles',
    icon:'lock-closed-outline',go:run(()=>open('notes'))},
  {label:'Conversation du rêve',icon:'chatbubbles-outline',go:run(()=>open('chat')),visible:active},
  {label:'Co-propriétaires',icon:'people-outline',go:run(()=>open('coowners'))},
  {label:'Participants',icon:'person-add-outline',go:run(()=>open('participants')),
    visible:dream.phase!=='Rêve'},
 ];
 return <Modal visible={show} transparent animationType="fade"
   onRequestClose={onClose}>
   <View style={{flex:1,justifyContent:'flex-end'}}>
     <Pressable onPress={onClose} accessibilityRole="button"
       accessibilityLabel="Fermer les actions du rêve"
       style={{flex:1,backgroundColor:'rgba(0,0,0,.45)'}}/>
     <View style={{paddingHorizontal:19,paddingTop:18,paddingBottom:Platform.OS==='ios'?35:24,
       backgroundColor:theme.surface,borderTopLeftRadius:22,borderTopRightRadius:22,maxHeight:'83%'}}>
       <View style={{width:40,height:4,borderRadius:3,backgroundColor:theme.border,
         alignSelf:'center',marginBottom:20}}/>
       <Text numberOfLines={2} style={{fontSize:22,fontFamily:'serif',
         color:theme.foreground,lineHeight:29}}>{dream.title}</Text>
       <View style={{marginTop:11,marginBottom:14,flexDirection:'row',alignItems:'center',gap:8}}>
         <Ionicons name="calendar-outline" size={16} color="#B88962"/>
         <Text style={{fontSize:12,color:theme.muted}}>
           Objectif : {niceDate(dream.goalDate)}
         </Text>
       </View>
       <ScrollView contentContainerStyle={{paddingBottom:5}}>
         {actions.filter(a=>a.visible!==false).map(action=>
           <Pressable key={action.label} onPress={action.go}
             accessibilityRole="button" accessibilityLabel={action.label}
             style={{flexDirection:'row',alignItems:'center',gap:12,minHeight:52,
               borderTopWidth:1,borderColor:theme.border,paddingVertical:11}}>
             <Ionicons name={action.icon} size={19} color={theme.muted}/>
             <Text style={{fontSize:14,color:theme.foreground,flex:1}}>{action.label}</Text>
             <Ionicons name="chevron-forward" color={theme.muted} size={17}/>
           </Pressable>
         )}
       </ScrollView>
     </View>
   </View>
 </Modal>;
}
