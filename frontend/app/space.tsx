import { Text } from '@/i18n/LocalizedText';
import React, { useEffect, useState } from 'react';
import {api} from '@/lib/api/client';
import {isRetiredFixture} from '@/lib/api/realRecords';
import { Alert, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { Nav } from '@/components/navigation/Nav';
import { Pill } from '@/components/ui/Pill';
import { PageHeader } from '@/components/navigation/PageHeader';
import { ContactSheet } from '@/components/ui/ContactSheet';
import { colors as c } from '@/theme/colors';
import { useApp } from '@/context/AppContext';
import { FireHeader } from '@/components/fire/FireHeader';
import { useLocale } from '@/i18n/locale';
import {workspaceCanvas,WORKSPACE_TITLE_GAP} from '@/theme/workspaceLayout';
import { useAppTheme } from '@/theme/AppTheme';

type Kind = 'All'|'Chats'|'Collabs'|'Lessons';
type Conversation={id:string;type:string;title?:string|null;members?:{id:string;displayName?:string;isDemo?:boolean}[];lastMessage?:{preview?:string|null;sentAt?:string|null}|null;lastActivityAt?:string|null;unread?:number};
export default function Space() {
  const theme = useAppTheme();
  const {width}=useWindowDimensions();
  const {email}=useApp();
  const { t } = useLocale();
  const [tab, setTab] = useState<Kind>('All');
  const [activities,setActivities]=useState<Conversation[]>([]);
  const [state,setState]=useState<'loading'|'ready'|'error'>('loading');
  useEffect(()=>{let active=true;setActivities([]);setState('loading');
    void api<{items:Conversation[]}>('/api/conversations',{auth:'required'}).then(result=>{
      if(active){setActivities(result.items.filter(c=>!isRetiredFixture(c)&&!(c.members||[]).some(isRetiredFixture)));setState('ready');}
    }).catch(()=>{if(active)setState('error');});
    return()=>{active=false;};
  },[email]);
  const visible=activities.filter(c=>tab==='All'||tab==='Chats'&&c.type==='direct'||tab==='Collabs'&&['music','dream','group'].includes(c.type)||tab==='Lessons'&&c.type==='lesson');
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{...workspaceCanvas(width),paddingTop:12,paddingBottom:148}}>
          <PageHeader title={t('space')} />
          <Pressable accessibilityRole="button" onPress={()=>router.push('/notifications')}
            style={{marginBottom:10,borderRadius:11,borderWidth:1,borderColor:theme.border,
              padding:14,flexDirection:'row',alignItems:'center',gap:11,backgroundColor:theme.dark?'#32242C':'#FCF7F8'}}>
            <Ionicons name="notifications-outline" size={21} color="#CB245C"/>
            <View style={{flex:1,gap:3}}>
              <Text style={{fontSize:13,color:theme.foreground,fontWeight:'700'}}>Mes notifications</Text>
              <Text style={{fontSize:11,color:theme.muted}}>Réponses à mes demandes et actualités de mes aspirations</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.muted}/>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={()=>router.push('/talent-invitations')}
            style={{marginBottom:16,borderRadius:11,borderWidth:1,borderColor:theme.border,
              padding:14,flexDirection:'row',alignItems:'center',gap:11,backgroundColor:theme.dark?'#26352D':'#F4F7F2'}}>
            <Ionicons name="people-outline" size={21} color="#27845B"/>
            <View style={{flex:1,gap:3}}>
              <Text style={{fontSize:13,color:theme.foreground,fontWeight:'700'}}>Invitations de talents</Text>
              <Text style={{fontSize:11,color:theme.muted}}>Accepter ou refuser une invitation à participer à une aspiration</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.muted}/>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 20 }}>
            {(['All', 'Chats', 'Collabs', 'Lessons'] as Kind[]).map(t => (
              <Pill key={t} text={t} active={tab === t} onPress={() => setTab(t)} />
            ))}
          </View>
          {state==='loading'?<Text style={{color:theme.muted}}>Chargement…</Text>:state==='error'?<Text style={{color:theme.muted}}>Conversations indisponibles actuellement.</Text>:!visible.length?<Text style={{color:theme.muted}}>Aucune conversation dans cette catégorie.</Text>:null}
          {visible.map(item=><Pressable key={item.id}
            onPress={()=>router.push({pathname:'/chat/[id]',params:{id:item.id}})}
            style={{paddingHorizontal:14,paddingVertical:10,flexDirection:'row',alignItems:'center',gap:10,minHeight:65}}>
            <Avatar size={39}/>
            <View style={{flex:1}}>
              <Text style={{color:theme.foreground,fontWeight:'700',fontSize:12}}>{item.title||'Conversation'}</Text>
              {!!item.lastMessage?.preview&&<Text style={{fontSize:11,color:theme.muted,marginTop:4}}>{item.lastMessage.preview}</Text>}
            </View>
            {!!item.unread&&<Text style={{fontSize:11,color:theme.muted}}>{item.unread}</Text>}
            <Ionicons name="chevron-forward" size={18} color={theme.muted}/>
          </Pressable>)}
        </ScrollView>
        <ContactSheet />
      </View>
      <Nav />
    </SafeAreaView>
  );
}
