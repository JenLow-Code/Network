import { Text, TextInput } from '@/i18n/LocalizedText';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Nav } from '@/components/navigation/Nav';
import { TopActions } from '@/components/navigation/TopActions';
import { useApp } from '@/context/AppContext';
import { colors as c } from '@/theme/colors';
import { useDreams } from '@/domain/dreamRepository';
import { api } from '@/lib/api/client';
import { useAppTheme } from '@/theme/AppTheme';
import {workspaceCanvas,PAGE_TITLE_FONT_SIZE,PAGE_TITLE_LINE_HEIGHT} from '@/theme/workspaceLayout';
import { useMusicWorkspaces } from '@/domain/musicWorkspace';

function ChatHeader({ name, subtitle }: { name: string; subtitle: string }) {
  const theme=useAppTheme();
  const {width}=useWindowDimensions();
  return (
    <View style={[s.header,workspaceCanvas(width),{borderColor:theme.border}]}>
      <Pressable onPress={() => router.back()} accessibilityLabel="Retour" accessibilityRole="button"
        style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}>
        <Ionicons name="arrow-back-outline" size={23} color={theme.foreground} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={[s.headerName,{color:theme.foreground,fontSize:PAGE_TITLE_FONT_SIZE,lineHeight:PAGE_TITLE_LINE_HEIGHT}]}>{name}</Text>
        <Text style={[s.headerDetail,{color:theme.muted}]}>{subtitle}</Text>
      </View>
      <TopActions />
    </View>
  );
}
function Action({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const theme=useAppTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[s.action,{borderColor:theme.border,backgroundColor:theme.surface}]}>
      <Ionicons name={icon} color={theme.accent} size={19} />
      <View style={{ flex: 1 }}>
        <Text style={[s.actionTitle,{color:theme.foreground}]}>{title}</Text>
        {subtitle && <Text style={[s.actionSubtitle,{color:theme.muted}]}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" color={theme.muted} size={16} />
    </Pressable>
  );
}
function SystemChat() {
  const theme=useAppTheme();
  const {width}=useWindowDimensions();
  const [calendarOptions, setCalendarOptions] = useState(false);
  const open = (url: string) => {
    void Linking.openURL(url).catch(() => setCalendarOptions(true));
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ChatHeader name="JenLow Network" subtitle="System • lesson reminder" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{...workspaceCanvas(width),paddingTop:40,paddingBottom:35}}
      >
        <Text style={[s.day,{color:theme.muted}]}>Lesson reminder</Text>
        <View style={[s.systemBubble,{backgroundColor:theme.dark?'#442D38':'#FCE8F1'}]}>
          <Text style={{ fontSize: 13, lineHeight: 21, color: theme.foreground }}>
            Your tandem with <Text style={{ fontWeight: '700' }}>nebulanomad</Text> is scheduled for
            tomorrow at 13:00 at JenLow Studio.
          </Text>
          <Text style={{ fontSize: 13, lineHeight: 21, marginTop: 10,color:theme.foreground }}>
            What would you like to do?
          </Text>
        </View>
        <View style={{ marginTop: 16, gap: 9 }}>
          <Action
            title="Add to my calendar"
            subtitle="Google Calendar, Outlook…"
            icon="calendar-outline"
            onPress={() => setCalendarOptions(v => !v)}
          />
          {calendarOptions && (
            <View style={[s.calendarChoices,{backgroundColor:theme.surface,borderColor:theme.border}]}>
              <Text style={{ fontSize: 11, color: theme.muted, marginBottom: 8 }}>
                Choose a calendar to create an event:
              </Text>
              <View style={{ flexDirection: 'row', gap: 9 }}>
                <Pressable
                  style={[s.calendarProvider,{borderColor:theme.border}]}
                  onPress={() => open('https://calendar.google.com/calendar/u/0/r/eventedit')}
                >
                  <Text style={[s.calendarProviderLabel,{color:theme.foreground}]}>Google Calendar ↗</Text>
                </Pressable>
                <Pressable
                  style={[s.calendarProvider,{borderColor:theme.border}]}
                  onPress={() => open('https://outlook.live.com/calendar/0/deeplink/compose')}
                >
                  <Text style={[s.calendarProviderLabel,{color:theme.foreground}]}>Outlook ↗</Text>
                </Pressable>
              </View>
              <Text style={{ fontSize: 10, color: theme.muted, marginTop: 8 }}>
                These links open a new event. Automatic lesson details will follow with the backend.
              </Text>
            </View>
          )}
          <Action
            title="Add to JenLow Agenda"
            subtitle="Internal agenda — coming soon"
            icon="book-outline"
            onPress={() => router.push('/agenda')}
          />
          <Action
            title="Contact my teacher"
            subtitle="Open the conversation with nebulanomad"
            icon="chatbubble-ellipses-outline"
            onPress={() => router.push('/chat/teacher')}
          />
        </View>
      </ScrollView>
      <Nav />
    </SafeAreaView>
  );
}
function PersonChat({
  teacher,
  recipient,
  sharedId,
  draft,
}: {
  teacher: boolean;
  recipient?: string;
  sharedId?: string;
  draft?: string;
}) {
  const theme=useAppTheme();
  const { messages, send } = useApp();
  const {width}=useWindowDimensions();
  const [input, setInput] = useState(draft || '');
  const submit = () => {
    const m = input.trim();
    if (m) {
      send(m);
      setInput('');
    }
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ChatHeader
          name={recipient || (teacher ? 'nebulanomad' : 'Helena Hills')}
          subtitle={teacher ? 'Teacher • Demo contact' : 'Active 11m ago'}
        />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            ...workspaceCanvas(width),
            paddingTop: 30,
            gap: 8,
            flexGrow: 1,
            justifyContent: 'flex-end',
          }}
        >
          <Text style={[s.day,{color:theme.muted}]}>Demo conversation</Text>
          {sharedId ? (
            <View style={{ padding: 13, backgroundColor: theme.surface, borderRadius: 10 }}>
              <Text style={{ color:theme.foreground,fontSize: 13, fontWeight: '700' }}>Publication partagée</Text>
              <Text style={{ color:theme.foreground,fontSize: 12, marginTop: 6 }}>{sharedId}</Text>
              <Text style={{ fontSize: 11, color: theme.muted, marginTop: 5 }}>
                Aperçu uniquement : aucun message n'a été envoyé.
              </Text>
            </View>
          ) : null}
          {messages.map(m => (
            <View
              key={m.id}
              style={[
                s.bubble,
                {
                  alignSelf: m.fromMe ? 'flex-end' : 'flex-start',
                  backgroundColor: m.fromMe ? (theme.dark?'#454950':'#242322') : '#CB245C',
                },
              ]}
            >
              <Text style={{ fontSize: 13, color: '#FFFFFF' }}>{m.text}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={[s.composer,workspaceCanvas(width)]}>
          <TextInput
            placeholder="Message..."
            value={input}
            onChangeText={setInput}
            onSubmitEditing={submit}
            returnKeyType="send"
            style={[s.input,{backgroundColor:theme.surface,borderColor:theme.border,color:theme.foreground}]}
          />
          <Pressable onPress={submit} accessibilityLabel="Send message">
            <Ionicons name="send" color={theme.accent} size={22} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      <Nav />
    </SafeAreaView>
  );
}
type MusicChatMessage = {
  id: string; body: string | null; sentAt: string; mine: boolean;
  sender?: { displayName?: string } | null;
  musicSection?: {id:string;title:string}|null;
};

/** Shared, server-backed chat. Unlike draft notes, these messages reach other members. */
function MusicSharedConversation({ conversationId }: { conversationId: string }) {
  const theme = useAppTheme();
  const {width}=useWindowDimensions();
  const {sectionId,sectionTitle,projectId} = useLocalSearchParams<{
    sectionId?:string;sectionTitle?:string;projectId?:string;
  }>();
  const workspaces=useMusicWorkspaces();
  const [contextId,setContextId] = useState(sectionId||'');
  const [contextTitle,setContextTitle] = useState(sectionTitle||'');
  const [title,setTitle] = useState('Discussion du morceau');
  const [items,setItems] = useState<MusicChatMessage[]>([]);
  const [input,setInput] = useState('');
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const [loading,setLoading] = useState(true);
  const reload = async () => {
    const result = await api<{ items:MusicChatMessage[] }>(
      '/api/conversations/' + encodeURIComponent(conversationId) + '/messages?limit=100',
      {auth:'required'});
    setItems((result.items || []).slice().reverse());
  };
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    void Promise.all([
      api<{conversation:{title?:string}}>('/api/conversations/' +
        encodeURIComponent(conversationId),{auth:'required'}),
      api<{items:MusicChatMessage[]}>('/api/conversations/' +
        encodeURIComponent(conversationId) + '/messages?limit=100',{auth:'required'}),
    ]).then(([detail, messages]) => {
      if (!active) return;
      setTitle(detail.conversation.title || 'Discussion du morceau');
      setItems((messages.items || []).slice().reverse());
    }).catch(e => {
      if (active) setError(e instanceof Error ? e.message : 'Discussion inaccessible.');
    }).finally(() => {if(active)setLoading(false);});
    return()=>{active=false;};
  },[conversationId]);
  const sendMessage = async () => {
    if (!input.trim() || busy) return;
    setBusy(true);setError('');
    const body = input.trim();
    try {
      await api('/api/conversations/' + encodeURIComponent(conversationId) + '/messages',{
        method:'POST',auth:'required',body:{
          type:'text',body,clientMessageId:'music-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),
          ...(contextId&&contextTitle?{musicSectionId:contextId,musicSectionTitle:contextTitle}:{}),
        },
      });
      setInput('');
      setContextId('');setContextTitle('');
      await reload();
    } catch(e) { setError(e instanceof Error?e.message:'Envoi impossible.'); }
    finally{setBusy(false);}
  };
  return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
    <View style={{...workspaceCanvas(width),flexDirection:'row',alignItems:'center',gap:12,
      paddingVertical:16,borderBottomWidth:1,borderColor:theme.border}}>
      <Pressable onPress={()=>router.back()} accessibilityLabel="Retour">
        <Ionicons name="arrow-back-outline" size={22} color={theme.foreground}/>
      </Pressable>
      <View style={{flex:1}}>
        <Text style={{fontWeight:'700',fontSize:PAGE_TITLE_FONT_SIZE,lineHeight:PAGE_TITLE_LINE_HEIGHT,color:theme.foreground}}>{title}</Text>
        <Text style={{color:theme.muted,fontSize:11}}>Conversation partagée des collaborateurs autorisés</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Actualiser la discussion"
        onPress={()=>{void reload().catch(e=>setError(e instanceof Error?e.message:'Chargement impossible.'));}}>
        <Ionicons name="refresh-outline" size={20} color={theme.foreground}/>
      </Pressable>
    </View>
    <ScrollView style={{flex:1}} contentContainerStyle={{...workspaceCanvas(width),paddingTop:16,paddingBottom:30,gap:10}}>
      {loading?<ActivityIndicator color="#CB245C"/>:null}
      {!loading && !items.length?<Text style={{fontSize:12,color:theme.muted,textAlign:'center'}}>
        Aucun message. La discussion commence ici.
      </Text>:null}
      {items.map(item=><View key={item.id} style={{alignSelf:item.mine?'flex-end':'flex-start',
        backgroundColor:item.mine?'#CB245C':theme.surface,borderWidth:item.mine?0:1,
        borderColor:theme.border,borderRadius:14,padding:12,maxWidth:'85%',gap:4}}>
        {!item.mine?<Text style={{color:theme.muted,fontSize:11,fontWeight:'700'}}>
          {item.sender?.displayName||'Membre'}
        </Text>:null}
        {item.musicSection?<Pressable accessibilityRole="button"
          onPress={()=>{
            const local=workspaces.items.find(p=>p.publishedId===conversationId.slice(6)||
              p.versions.some(v=>v.publishedId===conversationId.slice(6)));
            if(local && local.sections.some(x=>x.id===item.musicSection!.id))
              router.push({pathname:'/music-workspace/[id]',params:{
                id:local.id,sectionId:item.musicSection!.id,
              }});
          }} style={{paddingVertical:5,paddingHorizontal:8,borderRadius:8,
            backgroundColor:item.mine?'rgba(255,255,255,.18)':(theme.dark?'#3B2D38':'#F9E8F0'),
            alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:5}}>
          <Ionicons name="return-down-forward-outline" size={13}
            color={item.mine?'#fff':'#CB245C'}/>
          <Text style={{fontSize:11,fontWeight:'700',color:item.mine?'#fff':'#CB245C'}}>
            {item.musicSection.title}
          </Text>
        </Pressable>:null}
        <Text style={{color:item.mine?'#fff':theme.foreground,fontSize:13,lineHeight:19}}>
          {item.body||'Message indisponible'}
        </Text>
      </View>)}
      {error?<Text style={{color:theme.accent,fontSize:12}}>{error}</Text>:null}
    </ScrollView>
    {contextId&&contextTitle?<View style={{...workspaceCanvas(width),flexDirection:'row',alignItems:'center',gap:9,
      borderTopWidth:1,borderColor:theme.border,paddingVertical:7}}>
      <Ionicons name="return-down-forward-outline" color="#CB245C" size={17}/>
      <Text style={{color:theme.foreground,fontSize:12,flex:1}}>
        Référence : {contextTitle}
      </Text>
      <Pressable accessibilityLabel="Retirer la référence"
        onPress={()=>{setContextId('');setContextTitle('');}}>
        <Ionicons name="close" color={theme.muted} size={19}/>
      </Pressable>
    </View>:null}
    <View style={{...workspaceCanvas(width),paddingVertical:12,gap:8,flexDirection:'row',alignItems:'center',
      borderTopWidth:1,borderColor:theme.border}}>
      <TextInput value={input} onChangeText={setInput}
        placeholder="Un message pour ce morceau…" style={{flex:1,borderRadius:10,
          padding:12,backgroundColor:theme.surface,color:theme.foreground}}/>
      <Pressable disabled={busy||!input.trim()} onPress={()=>{void sendMessage();}}
        accessibilityLabel="Envoyer"><Ionicons name="send" size={23}
        color={busy?'#888':'#CB245C'}/></Pressable>
    </View>
    <Nav/>
  </SafeAreaView>;
}

function DreamConversation({ dreamId }: { dreamId: string }) {
 const theme=useAppTheme();
 const {width}=useWindowDimensions();
 const { items, patch } = useDreams();
 const dream = items.find(d => d.id === dreamId);
 const [input, setInput] = useState('');
 const submit = () => {
  if (!dream || !input.trim() || !dream.chat) return;
  patch(dream.id, { chat: { ...dream.chat, messages: [...dream.chat.messages, { id: 'msg-' + Date.now(), text: input.trim(), createdAt: new Date().toISOString() }] } });
  setInput('');
 };
 return <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
  <View style={{...workspaceCanvas(width),paddingVertical:18,flexDirection:'row',alignItems:'center',gap:12,borderBottomWidth:1,borderColor:theme.border}}>
   <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={() => router.back()}
      style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}>
      <Ionicons name="arrow-back-outline" size={23} color={theme.foreground}/>
    </Pressable>
   <View style={{ flex: 1 }}><Text numberOfLines={1} style={{ color:theme.foreground,fontWeight: '700', fontSize: PAGE_TITLE_FONT_SIZE,lineHeight:PAGE_TITLE_LINE_HEIGHT }}>{dream?.title || 'Conversation du rêve'}</Text><Text style={{ color: theme.muted, fontSize: 11 }}>Espace de conversation du rêve · Sur cet appareil</Text></View>
  </View>
  <ScrollView style={{ flex: 1 }} contentContainerStyle={{...workspaceCanvas(width),paddingTop:16,paddingBottom:20,gap:10}}>
   <Text style={{ fontSize: 12, color: theme.muted, textAlign: 'center', marginBottom: 18 }}>Cette conversation est enregistrée localement. Les invitations et la messagerie entre membres ne sont pas encore connectées.</Text>
   {(dream?.chat?.messages || []).map(m => <View key={m.id} style={{ backgroundColor: '#D71D77', padding: 12, borderRadius: 12, alignSelf: 'flex-end', maxWidth: '85%' }}><Text style={{ color: '#fff' }}>{m.text}</Text></View>)}
  </ScrollView>
  <View style={{...workspaceCanvas(width),paddingVertical:12,flexDirection:'row',gap:10,alignItems:'center'}}>
   <TextInput value={input} onChangeText={setInput} onSubmitEditing={submit} placeholder="Un message pour ce rêve…" style={{ flex: 1, borderRadius: 12, padding: 12, backgroundColor: theme.surface,color:theme.foreground,borderWidth:1,borderColor:theme.border }}/>
   <Pressable accessibilityLabel="Envoyer" onPress={submit}><Ionicons name="send" size={23} color="#D71D77"/></Pressable>
  </View>
  <Nav/>
 </SafeAreaView>;
}
export default function Chat() {
  const { id, recipient, sharedId, draft } = useLocalSearchParams<{
    id: string;
    recipient?: string;
    sharedId?: string;
    draft?: string;
  }>();
  return id?.startsWith('dream-') ? <DreamConversation dreamId={id.slice(6)}/> : id?.startsWith('music-') ? (
    <MusicSharedConversation conversationId={id}/>
  ) : id === 'system' ? (
    <SystemChat />
  ) : (
    <PersonChat teacher={id === 'teacher'} recipient={recipient} sharedId={sharedId} draft={draft} />
  );
}
const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ececec',
    padding: 15,
  },
  headerName: { fontSize: 13, fontWeight: '700', color: '#121212' },
  headerDetail: { fontSize: 10, color: '#888', marginTop: 2 },
  day: { alignSelf: 'center', fontSize: 11, color: '#aaa', marginBottom: 22 },
  systemBubble: {
    backgroundColor: '#fce8f1',
    alignSelf: 'flex-start',
    borderRadius: 16,
    borderTopLeftRadius: 5,
    padding: 16,
    maxWidth: '93%',
  },
  action: {
    minHeight: 59,
    borderWidth: 1,
    borderColor: '#ededed',
    backgroundColor: '#fff',
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 13,
  },
  actionTitle: { fontSize: 13, fontWeight: '600', color: '#171717' },
  actionSubtitle: { fontSize: 10, color: '#8b8b8b', marginTop: 4 },
  calendarChoices: {
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#f6dce7',
    borderRadius: 10,
    backgroundColor: '#fffbfd',
  },
  calendarProvider: {
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  calendarProviderLabel: { fontSize: 11, color: '#333' },
  bubble: { maxWidth: '84%', paddingVertical: 10, paddingHorizontal: 13, borderRadius: 16 },
  composer: { padding: 12, flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dedede',
    borderRadius: 10,
    height: 42,
    paddingHorizontal: 12,
    fontSize: 13,
  },
});
