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
import { ProfileMarkedVerses } from '@/components/profile/ProfileMarkedVerses';
import Svg, { Path } from 'react-native-svg';
import { Settings } from '@/components/profile/ProfileSettings';
import type { MusicLibraryLayout } from '@/domain/musicLibraryPreferences';

const sections=[
  {id:'talents',title:'Mes talents',subtitle:'Ce que je peux apporter',icon:'sparkles-outline',color:'#27845B'},
  {id:'publications',title:'Mes publications',subtitle:'Ce que je partage',icon:'albums-outline',color:'#CB245C'},
  {id:'music',title:'Mes musiques',subtitle:'Ce que je crée',icon:'musical-note-outline',color:'#7364A6'},
  {id:'prayers',title:'Mes prières',subtitle:'Ce que je porte dans la prière',icon:'heart-outline',color:'#C83D77'},
  {id:'bible',title:'Ma Bible',subtitle:'Mes versets marqués',icon:'book-outline',color:'#B88962'},
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
        <View style={{ alignItems: 'center', marginTop: 22 }}>
          {ws.desktop?<View pointerEvents="none" style={{position:'absolute',right:6,top:0,width:260,height:154,opacity:theme.dark?.65:.8}}>
            <Svg width="100%" height="100%" viewBox="0 0 260 154" fill="none">
              <Path d="M260 23 C220 14 205 47 177 46 C149 44 139 16 117 30 C98 43 125 70 143 58 C167 41 132 19 105 41 C80 61 105 94 131 89 C170 80 157 45 182 52 C211 60 196 99 164 113 C124 129 78 95 54 116 C29 137 42 150 0 150" stroke={theme.dark?'#E78CAD':'#C97898'} strokeWidth="1.15" strokeLinecap="round"/>
              <Path d="M260 23 C245 20 236 22 222 30" stroke="#B88962" strokeWidth="1.15" strokeLinecap="round"/>
            </Svg>
          </View>:null}
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
          <Text style={{ fontSize: 26, fontWeight: '700', color: theme.foreground, marginTop: 12 }}>
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
        <View style={{marginTop:ws.desktop?32:25,marginBottom:6}}>
          <Text style={{fontSize:11,color:theme.muted,fontWeight:'700',letterSpacing:1.4,marginBottom:10}}>MON ESPACE PERSONNEL</Text>
          <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
            {sections.map(link => (
              <Pressable key={link.id} accessibilityRole="button" accessibilityLabel={link.title}
                onPress={()=>jump(link.id)}
                style={{
                  paddingHorizontal:12,paddingVertical:9,borderWidth:1,borderColor:theme.border,
                  borderRadius:20,backgroundColor:theme.surface,flexDirection:'row',alignItems:'center',gap:7,
                  minHeight:40,
                }}>
                <Ionicons name={link.icon} size={17} color={theme.dark?theme.muted:link.color}/>
                <Text style={{color:theme.foreground,fontWeight:'600',fontSize:12}}>{link.title}</Text>
                <Ionicons name="arrow-down-outline" size={12} color={theme.muted}/>
              </Pressable>
            ))}
          </View>
        </View>
        {sections.map((item,index)=>(
          <View key={item.id} onLayout={event=>{
            anchors.current[item.id]=event.nativeEvent.layout.y;
            if(pending.current===item.id)jump(item.id);
          }} style={{marginTop:index===0?18:22,borderRadius:16,overflow:'hidden',
            backgroundColor:item.id==='talents'?(theme.dark?'#1B2220':'#F5F6EF'):
              item.id==='music'?(theme.dark?'#24212B':'#F5F1F7'):
              item.id==='bible'?(theme.dark?'#28231F':'#F8F1E8'):
              item.id==='prayers'?(theme.dark?'#252023':'#FAF3F3'):theme.surface,
            borderWidth:1,borderColor:theme.border,
            paddingHorizontal:inset,paddingVertical:ws.desktop?22:16,gap:15}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
              <Ionicons name={item.icon} size={24} color={theme.dark?theme.foreground:item.color}/>
              <View style={{flex:1,gap:2}}>
                <Text accessibilityRole="header" style={{fontSize:20,fontWeight:'700',color:theme.foreground}}>{item.title}</Text>
                {item.id==='settings'?null:<Text style={{fontSize:12,color:theme.muted}}>{item.subtitle}</Text>}
              </View>
              {item.id==='settings'?<Pressable onPress={()=>setSettingsOpen(v=>!v)} accessibilityRole="button" accessibilityLabel="Afficher les paramètres" accessibilityState={{expanded:settingsOpen}} style={{padding:10}}><Ionicons name={settingsOpen?'chevron-up':'chevron-down'} size={20} color={theme.foreground}/></Pressable>:null}
              {item.id==='bible'?<Pressable onPress={()=>router.push('/bible-library')} accessibilityRole="button" accessibilityLabel="Ouvrir le lecteur de la Bible" style={{minHeight:40,paddingHorizontal:10,flexDirection:'row',alignItems:'center',gap:5,borderRadius:20,borderWidth:1,borderColor:theme.border,backgroundColor:theme.surface}}>
                <Text style={{fontSize:12,fontWeight:'600',color:theme.foreground}}>Lire</Text><Ionicons name="arrow-forward-outline" size={15} color={theme.foreground}/>
              </Pressable>:null}
            </View>
            <View onLayout={item.id==='talents'?e=>setPanelWidth(e.nativeEvent.layout.width):undefined}>
              {item.id==='talents'?<ProfileTalents contentWidth={contentWidth}/>:null}
              {item.id==='publications'?<ProfilePublications contentWidth={contentWidth}/>:null}
              {item.id==='music'?<MusicLibrary embedded contentWidth={contentWidth} preferredLayout={preferredLayout}/>:null}
              {item.id==='prayers'?<Prayers/>:null}
              {item.id==='bible'?<ProfileMarkedVerses/>:null}
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
