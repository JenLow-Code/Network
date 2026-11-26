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
import { colors as c } from '@/theme/colors';
import { api } from '@/lib/api/client';
import { useAppTheme } from '@/theme/AppTheme';
import {workspaceCanvas,workspaceLayout,PAGE_TITLE_FONT_SIZE,PAGE_TITLE_LINE_HEIGHT} from '@/theme/workspaceLayout';
import { useMusicWorkspaces } from '@/domain/musicWorkspace';

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
  const [title,setTitle] = useState('Conversation');
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
      setTitle(detail.conversation.title || 'Conversation');
      setItems((messages.items || []).slice().reverse());
    }).catch(e => {
      if (active) setError(e instanceof Error ? e.message : 'Discussion inaccessible.');
    }).finally(() => {if(active)setLoading(false);});
    return()=>{active=false;};
  },[conversationId]);
  const sendMessage = async () => {
    if (!input.trim() || busy || loading || error) return;
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
      <Pressable onPress={()=>router.back()} accessibilityLabel="Retour"
        style={{width:44,height:44,alignItems:'center',justifyContent:'center',
          ...(workspaceLayout(width).desktop?{position:'absolute' as const,left:workspaceLayout(width).gutter,top:16}:{})}}>
        <Ionicons name="arrow-back-outline" size={22} color={theme.foreground}/>
      </Pressable>
      <View style={{flex:1}}>
        <Text style={{fontWeight:'700',fontSize:PAGE_TITLE_FONT_SIZE,lineHeight:PAGE_TITLE_LINE_HEIGHT,color:theme.foreground}}>{title}</Text>
        <Text style={{color:theme.muted,fontSize:11}}>Conversation entre membres autorisés</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Actualiser la discussion"
        onPress={()=>{void reload().catch(e=>setError(e instanceof Error?e.message:'Chargement impossible.'));}}>
        <Ionicons name="refresh-outline" size={20} color={theme.foreground}/>
      </Pressable>
      <TopActions />
    </View>
    <ScrollView style={{flex:1}} contentContainerStyle={{...workspaceCanvas(width),paddingTop:16,paddingBottom:30,gap:10}}>
      {loading?<ActivityIndicator color="#CB245C"/>:null}
      {!loading && !error && !items.length?<Text style={{fontSize:12,color:theme.muted,textAlign:'center'}}>
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
        placeholder="Écrire un message…" style={{flex:1,borderRadius:10,
          padding:12,backgroundColor:theme.surface,color:theme.foreground}}/>
      <Pressable disabled={busy||loading||!!error||!input.trim()} onPress={()=>{void sendMessage();}}
        accessibilityLabel="Envoyer"><Ionicons name="send" size={23}
        color={busy?'#888':'#CB245C'}/></Pressable>
    </View>
    <Nav/>
  </SafeAreaView>;
}

export default function Chat() {
  const {id}=useLocalSearchParams<{id:string}>();
  return <MusicSharedConversation key={id} conversationId={id || ''}/>;
}
