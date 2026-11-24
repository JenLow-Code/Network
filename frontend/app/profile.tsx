import { Text, TextInput } from '@/i18n/LocalizedText';
import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthProvider';
import { useAppTheme } from '@/theme/AppTheme';
import { workspaceCanvas, workspaceLayout } from '@/theme/workspaceLayout';

import { ProfileTalents } from '@/components/profile/ProfileTalents';
import { ProfilePublications } from '@/components/profile/ProfilePublications';
import { MusicLibrary } from '@/components/profile/ProfileMusic';
import { Prayers } from '@/components/profile/ProfilePrayers';
import { BibleLibraryScreen } from '@/components/profile/ProfileBible';
import { Settings } from '@/components/profile/ProfileSettings';
import type { MusicLibraryLayout } from '@/domain/musicLibraryPreferences';

const sections=[
  {id:'talents',title:'Mes talents',subtitle:'Ce que je peux apporter',icon:'sparkles-outline',color:'#27845B'},
  {id:'publications',title:'Mes publications',subtitle:'Ce que je partage',icon:'albums-outline',color:'#CB245C'},
  {id:'music',title:'Mes musiques',subtitle:'Ce que je crée',icon:'musical-note-outline',color:'#7364A6'},
  {id:'prayers',title:'Mes prières',subtitle:'Ce que je porte dans la prière',icon:'heart-outline',color:'#C83D77'},
  {id:'bible',title:'Ma Bible',subtitle:'Un moment dans la Parole',icon:'book-outline',color:'#B88962'},
  {id:'settings',title:'Paramètres',subtitle:'Compte & préférences',icon:'settings-outline',color:'#647A8D'},
] as const;
type SectionId=typeof sections[number]['id'];
/** One personal space, with in-page anchors and shared feature editors. */
export default function Profile() {
  const app=useApp(),auth=useAuth(),theme=useAppTheme();
  const {width}=useWindowDimensions();
  const ws=workspaceLayout(width);
  const {section}=useLocalSearchParams<{section?:string}>();
  const scroll=useRef<React.ComponentRef<typeof ScrollView>>(null);
  const anchors=useRef<Partial<Record<SectionId,number>>>({});
  const pending=useRef<SectionId|null>(null);
  const [panelWidth,setPanelWidth]=useState(0);
  const [preferredLayout,setPreferredLayout]=useState<MusicLibraryLayout>();
  const [settingsOpen,setSettingsOpen]=useState(false);
  const inset=ws.desktop?22:14;
  const fallback=Math.max(100,Math.min(ws.maxWidth??width,width-(ws.desktop?236:0))-ws.contentGutter-ws.gutter-inset*2);
  const contentWidth=panelWidth||fallback;
  const jump=(id:SectionId)=>{
    if(id==='settings')setSettingsOpen(true);
    pending.current=id;
    const y=anchors.current[id];
    if(y!==undefined){pending.current=null;requestAnimationFrame(()=>scroll.current?.scrollTo({y:Math.max(0,y-12),animated:true}));}
  };
  useEffect(()=>{
    const target=sections.find(item=>item.id===section);
    if(target)jump(target.id);
  },[section]);

  const [edit,setEdit]=useState<'bio'|'city'|'church'|null>(null);
  const [draft,setDraft]=useState('');
  const start = (key: 'bio' | 'city' | 'church') => {
    setEdit(key);
    setDraft(app[key] || '');
  };
  const save = () => {
    if (edit) app.edit({ [edit]: draft });
    setEdit(null);
  };
  const field = (key: 'bio' | 'city' | 'church', label: string) => (
    <View style={{ marginTop: 16, width: '100%' }}>
      <Text style={{ fontSize: 12, color: theme.muted, marginBottom: 5 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        {edit === key ? (
          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline={key === 'bio'}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 9,
              padding: 10,
              color: theme.foreground,
              minHeight: key === 'bio' ? 70 : 40,
            }}
          />
        ) : (
          <Text style={{ flex: 1, color: theme.foreground, fontSize: 14, lineHeight: 21 }}>
            {app[key] || 'À compléter'}
          </Text>
        )}
        <Pressable
          onPress={edit === key ? save : () => start(key)}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons
            name={edit === key ? 'checkmark' : 'pencil-outline'}
            size={19}
            color={theme.foreground}
          />
        </Pressable>
      </View>
    </View>
  );
  const avatar=typeof auth.user?.user_metadata?.avatar_url==='string'
    ?auth.user.user_metadata.avatar_url:undefined;
  return <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{...workspaceCanvas(width),
      paddingTop:12,paddingBottom:ws.desktop?100:70}}>
      <PageHeader title="Mon profil"/>
        <View style={{ alignItems: 'center', marginTop: 23 }}>
          {avatar ? (
            <Image
              source={{ uri: avatar }}
              style={{
                width: 94,
                height: 94,
                borderRadius: 47,
                borderWidth: 2,
                borderColor: theme.border,
              }}
            />
          ) : (
            <Avatar size={94} />
          )}
          <Text style={{ fontSize: 22, fontWeight: '700', color: theme.foreground, marginTop: 12 }}>
            {app.name}
          </Text>
        </View>
        <View style={{alignItems:'center',marginTop:12,gap:4}}>
          <Text style={{fontSize:14,color:theme.muted,textAlign:'center',maxWidth:440}}>{app.bio || 'Ajouter une description personnelle'}</Text>
          <Text style={{fontSize:12,color:theme.muted}}>{app.church || 'Église non renseignée'}</Text>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'center',
            flexWrap:'wrap',gap:8,marginTop:9}}>
            <Pressable onPress={()=>start('bio')} accessibilityRole="button"
              accessibilityLabel="Modifier ma présentation"
              style={{minHeight:40,paddingHorizontal:10,flexDirection:'row',
                alignItems:'center',gap:6}}>
              <Ionicons name="pencil-outline" size={14} color={theme.muted}/>
              <Text style={{fontSize:12,color:theme.foreground,fontWeight:'600'}}>Modifier</Text>
            </Pressable>
            <View style={{width:1,height:19,backgroundColor:theme.border}}/>
            <Pressable onPress={()=>router.push('/profile-preview')} accessibilityRole="button"
              accessibilityLabel="Voir mon profil public tel que les autres le voient"
              style={{minHeight:39,paddingVertical:8,paddingHorizontal:13,
                flexDirection:'row',alignItems:'center',gap:8,borderWidth:1,
                borderColor:theme.border,borderRadius:20,backgroundColor:theme.surface}}>
              <Ionicons name="eye-outline" size={16} color={theme.foreground}/>
              <Text style={{fontSize:12,color:theme.foreground,fontWeight:'600'}}>
                Voir mon profil public
              </Text>
              <Ionicons name="arrow-forward-outline" size={13} color={theme.muted}/>
            </Pressable>
          </View>
        </View>
        {edit!==null?<View style={{backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,borderRadius:12,padding:15,marginTop:10}}>
          {field('bio','Ma description')}{field('city','Ma ville')}{field('church','Ma communauté')}
          <Pressable onPress={()=>setEdit(null)} style={{padding:10,alignItems:'center'}}><Text style={{color:theme.muted}}>Fermer</Text></Pressable>
        </View>:null}
        <View style={{marginTop:ws.desktop?46:34,marginBottom:18}}>
          <Text style={{fontSize:11,color:theme.muted,fontWeight:'700',letterSpacing:1.25,marginBottom:12}}>MON ESPACE PERSONNEL</Text>
          <View style={{flexDirection:'row',gap:ws.desktop?14:10,flexWrap:'wrap'}}>
            {sections.map(link => (
              <Pressable key={link.id} accessibilityRole="button" accessibilityLabel={link.title}
                onPress={()=>jump(link.id)}
                style={{
                  width:ws.desktop?'31.8%':width>=360?'48.5%':'100%',padding:ws.desktop?18:10,borderWidth:1,borderColor:theme.border,
                  borderRadius:12,backgroundColor:theme.surface,flexDirection:'row',alignItems:'center',gap:ws.desktop?13:8,
                  minHeight:ws.desktop?89:70,
                }}>
                <View style={{width:ws.desktop?38:30,height:ws.desktop?38:30,borderRadius:11,backgroundColor:theme.background,
                  justifyContent:'center',alignItems:'center'}}>
                  <Ionicons name={link.icon} size={21} color={link.color}/>
                </View>
                <View style={{flex:1,gap:4}}>
                  <Text style={{color:theme.foreground,fontWeight:'700',fontSize:ws.desktop?14:12}}>{link.title}</Text>
                  <Text style={{color:theme.muted,fontSize:ws.desktop?11:10}}>{link.subtitle}</Text>
                </View>
                <Ionicons name="arrow-down-outline" size={16} color={theme.muted}/>
              </Pressable>
            ))}
          </View>
        </View>
        {sections.map((item,index)=>(
          <View key={item.id} onLayout={event=>{
            anchors.current[item.id]=event.nativeEvent.layout.y;
            if(pending.current===item.id)jump(item.id);
          }} style={{marginTop:index===0?18:22,borderRadius:16,
            backgroundColor:item.id==='publications'?theme.background:
              item.id==='settings'?theme.surface:
              theme.dark?item.color+'19':item.color+'0B',
            borderWidth:item.id==='publications'||item.id==='music'?0:1,
            borderColor:theme.dark?theme.border:item.color+'25',
            paddingHorizontal:inset,paddingVertical:ws.desktop?22:16,gap:15}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
              <View style={{width:36,height:36,borderRadius:12,alignItems:'center',justifyContent:'center',
                backgroundColor:theme.dark?theme.surface:item.color+'14'}}>
                <Ionicons name={item.icon} size={20} color={theme.dark?theme.foreground:item.color}/>
              </View>
              <View style={{flex:1,gap:2}}>
                <Text accessibilityRole="header" style={{fontSize:18,fontWeight:'700',color:theme.foreground}}>{item.title}</Text>
                {item.id==='settings'?null:<Text style={{fontSize:12,color:theme.muted}}>{item.subtitle}</Text>}
              </View>
              {item.id==='settings'?<Pressable onPress={()=>setSettingsOpen(v=>!v)} accessibilityRole="button" accessibilityLabel="Afficher les paramètres" accessibilityState={{expanded:settingsOpen}} style={{padding:10}}><Ionicons name={settingsOpen?'chevron-up':'chevron-down'} size={20} color={theme.foreground}/></Pressable>:null}
              {item.id==='bible'?<Pressable onPress={()=>router.push('/bible-library')} accessibilityRole="button" accessibilityLabel="Ouvrir le lecteur de la Bible" style={{padding:8}}>
                <Ionicons name="expand-outline" size={20} color={theme.foreground}/>
              </Pressable>:null}
            </View>
            <View onLayout={item.id==='talents'?e=>setPanelWidth(e.nativeEvent.layout.width):undefined}>
              {item.id==='talents'?<ProfileTalents contentWidth={contentWidth}/>:null}
              {item.id==='publications'?<ProfilePublications contentWidth={contentWidth}/>:null}
              {item.id==='music'?<MusicLibrary embedded contentWidth={contentWidth} preferredLayout={preferredLayout}/>:null}
              {item.id==='prayers'?<Prayers/>:null}
              {item.id==='bible'?<BibleLibraryScreen embedded/>:null}
              {item.id==='settings'?(settingsOpen?<Settings onMusicLayoutChange={setPreferredLayout}/>:<Pressable onPress={()=>setSettingsOpen(true)} accessibilityRole="button" style={{paddingVertical:4}}><Text style={{color:theme.muted,fontSize:12}}>Langue · Apparence · Préférences musicales · Compte</Text></Pressable>):null}
            </View>
          </View>
        ))}
        <Pressable onPress={()=>scroll.current?.scrollTo({y:0,animated:true})}
          accessibilityRole="button" accessibilityLabel="Retour en haut" style={{alignSelf:'center',marginTop:22,padding:12,flexDirection:'row',gap:7,alignItems:'center'}}>
          <Ionicons name="arrow-up-outline" size={16} color={theme.muted}/>
          <Text style={{color:theme.muted,fontSize:12}}>Retour à mon profil</Text>
        </Pressable>
    </ScrollView>
    <Nav/>
  </SafeAreaView>;
}
