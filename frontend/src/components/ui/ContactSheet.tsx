import React, { useEffect, useRef, useState } from 'react';
import {api} from '@/lib/api/client';
import {isRetiredFixture} from '@/lib/api/realRecords';
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Avatar } from './Avatar';
import { useApp } from '@/context/AppContext';
type Contact={member:{id:string;handle:string;displayName:string;isDemo?:boolean}};
export function ContactSheet() {
  const {email}=useApp();
  const [contacts,setContacts]=useState<Contact[]>([]);
  const [state,setState]=useState<'loading'|'ready'|'error'>('loading');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const expandedHeight = Math.min(Dimensions.get('window').height * 0.64, 490);
  const translate = useRef(new Animated.Value(0)).current;
  const [open, setOpen] = useState(false);
  useEffect(()=>{let active=true;setContacts([]);setError('');setState('loading');
    if(open)void api<{items:Contact[]}>('/api/contacts',{auth:'required'}).then(result=>{
      if(active){setContacts(result.items.filter(p=>p.member?.id&&p.member.handle&&!isRetiredFixture(p.member)));setState('ready');}
    }).catch(()=>{if(active)setState('error');});
    return()=>{active=false;};
  },[email,open]);
  const chat=async(handle:string)=>{
    if(busy)return;setBusy(true);setError('');
    try{const result=await api<{conversationId:string}>('/api/conversations',{auth:'required',method:'POST',body:{handle}});
      if(!result.conversationId)throw Error('missing conversation');
      router.push({pathname:'/chat/[id]',params:{id:result.conversationId}});
    }catch{setError('Impossible d’ouvrir cette conversation.');}finally{setBusy(false);}
  };
  const openRef = useRef(false);
  function go(next: boolean) {
    openRef.current = next;
    setOpen(next);
    Animated.spring(translate, {
      toValue: next ? 1 : 0,
      useNativeDriver: false,
      tension: 65,
      friction: 12,
    }).start();
  }
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
      onPanResponderRelease: (_, g) => {
        if (g.dy < -24) go(true);
        else if (g.dy > 24) go(false);
        else go(!openRef.current);
      },
    }),
  ).current;
  const height = translate.interpolate({ inputRange: [0, 1], outputRange: [54, expandedHeight] });
  return (
    <Animated.View style={[styles.shell, { height }]}>
      <View {...pan.panHandlers} style={styles.handleArea}>
        <View style={styles.handle} />
        <View style={styles.titleRow}>
          <Text style={styles.heading}>Mes contacts</Text>
          <Ionicons name={open ? 'chevron-down' : 'chevron-up'} size={16} color="#9a9a9a" />
        </View>
      </View>
      <View style={{ flex: 1, overflow: 'hidden' }}>
        {open?<>{state==='loading'?<Text style={{padding:12,color:'#999'}}>Chargement…</Text>:state==='error'?<Text style={{padding:12,color:'#999'}}>Contacts indisponibles.</Text>:!contacts.length?<Text style={{padding:12,color:'#999'}}>Aucun contact.</Text>:null}
        {!!error&&<Text style={{padding:12,color:'#A51D4F'}}>{error}</Text>}
        {contacts.map(({member})=><Pressable key={member.id} disabled={busy} onPress={()=>void chat(member.handle)} style={[styles.contact,{borderBottomWidth:1}]}>
          <Avatar size={32}/><View style={{flex:1}}><Text style={styles.name}>{member.displayName}</Text></View>
          <Ionicons name="chatbubble-ellipses-outline" color="#888" size={20}/>
        </Pressable>)}</>:null}
      </View>
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 0,
    zIndex: 5,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  handleArea: { height: 50, justifyContent: 'center', paddingHorizontal: 15 },
  handle: {
    alignSelf: 'center',
    height: 4,
    width: 42,
    borderRadius: 4,
    backgroundColor: '#d5d5d5',
    marginBottom: 8,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading: { fontWeight: '700', fontSize: 13, color: '#111' },
  contact: {
    height: 61,
    marginHorizontal: 12,
    borderColor: '#f3f3f3',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  avatar: { position: 'relative' },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.4,
    borderColor: '#fff',
    position: 'absolute',
    bottom: 0,
    right: -2,
  },
  name: { fontWeight: '600', fontSize: 12, color: '#202020' },
  subtitle: { fontSize: 10, color: '#999', marginTop: 2 },
});
