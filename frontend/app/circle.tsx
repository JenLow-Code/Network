import { Text } from '@/i18n/LocalizedText';
import React, {useEffect,useState} from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { api } from '@/lib/api/client';
import { useApp } from '@/context/AppContext';
type CircleMember = {member:{id:string;displayName:string;isDemo?:boolean};label?:string;talents?:{name:string}[]};
import {workspaceCanvas} from '@/theme/workspaceLayout';
export default function Circle() {
  const {width}=useWindowDimensions();
  const {email}=useApp();
  const [members,setMembers]=useState<CircleMember[]>([]);
  const [status,setStatus]=useState<'loading'|'ready'|'error'>('loading');
  useEffect(()=>{let live=true;setMembers([]);setStatus('loading');
    void api<{items:CircleMember[]}>('/api/circle',{auth:'required'}).then(result=>{if(live){setMembers(result.items.filter(p=>!p.member.isDemo));setStatus('ready');}}).catch(()=>{if(live)setStatus('error');});
    return()=>{live=false;};
  },[email]);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{...workspaceCanvas(width),paddingTop:12,paddingBottom:65}}>
        <PageHeader title="Mon cercle" />
        <Text style={{ fontSize: 12, color: '#888', marginBottom: 18 }}>
          Les personnes que je connais personnellement. Les appels vidéo sont réservés à ce cercle.
        </Text>
        {status==='loading'?<Text>Chargement…</Text>:status==='error'?<Text>Le cercle est indisponible.</Text>:!members.length?<Text>Aucun membre dans ton cercle.</Text>:null}
        {members.map(person => (
          <View
            key={person.member.id}
            style={{
              paddingVertical: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 11,
              borderBottomWidth: 1,
              borderColor: '#eee',
            }}
          >
            <Avatar size={36} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700' }}>{person.member.displayName}</Text>
              <Text style={{ fontSize: 11, color: '#888' }}>
                {[person.label,...(person.talents||[]).map(t=>t.name)].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Appel vidéo du cercle"
              onPress={() =>
                router.push({ pathname: '/circle-call/[id]', params: { id: person.member.id } })
              }
            >
              <Ionicons name="videocam-outline" color="#444" size={24} />
            </Pressable>
          </View>
        ))}
      </ScrollView>
      <Nav />
    </SafeAreaView>
  );
}
