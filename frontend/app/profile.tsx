import { Text, TextInput } from '@/i18n/LocalizedText';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Avatar } from '@/components/ui/Avatar';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthProvider';
import { useAppTheme } from '@/theme/AppTheme';
import { workspaceCanvas, workspaceLayout } from '@/theme/workspaceLayout';

/** Personal profile overview: the six cards are destinations, not in-page anchors. */
export default function Profile() {
  const app=useApp(),auth=useAuth(),theme=useAppTheme();
  const {width}=useWindowDimensions();
  const ws=workspaceLayout(width);
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
    <ScrollView contentContainerStyle={{...workspaceCanvas(width),
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
            {([
              {title:'Mes talents',subtitle:'Compétences et niveaux',icon:'sparkles-outline',path:'talents',color:'#27845B'},
              {title:'Mes publications',subtitle:'Ce que je partage',icon:'albums-outline',path:'publications',color:'#CB245C'},
              {title:'Mes musiques',subtitle:'Mes morceaux',icon:'musical-note-outline',path:'music',color:'#7364A6'},
              {title:'Mes prières',subtitle:'Intentions & suivis',icon:'heart-outline',path:'/prayers',color:'#C83D77'},
              {title:'Ma Bible',subtitle:'Lire, télécharger, partager',icon:'book-outline',path:'/bible-library',color:'#B88962'},
              {title:'Paramètres',subtitle:'Compte & préférences',icon:'settings-outline',path:'/settings',color:'#647A8D'},
            ] as const).map(link => (
              <Pressable key={link.path} accessibilityRole="button" accessibilityLabel={link.title}
                onPress={()=>link.path==='talents'?router.push('/profile-talents'):link.path==='publications'?router.push('/profile-publications'):link.path==='music'?router.push({pathname:'/music-hub',params:{mine:'1'}}):router.push(link.path as '/prayers' | '/settings' | '/bible-library')}
                style={{
                  width:ws.desktop?'31.8%':ws.tablet?'48.8%':'100%',padding:ws.desktop?18:14,borderWidth:1,borderColor:theme.border,
                  borderRadius:12,backgroundColor:theme.surface,flexDirection:'row',alignItems:'center',gap:13,
                  minHeight:ws.desktop?89:76,
                }}>
                <View style={{width:38,height:38,borderRadius:11,backgroundColor:theme.background,
                  justifyContent:'center',alignItems:'center'}}>
                  <Ionicons name={link.icon} size={21} color={link.color}/>
                </View>
                <View style={{flex:1,gap:4}}>
                  <Text style={{color:theme.foreground,fontWeight:'700',fontSize:14}}>{link.title}</Text>
                  <Text style={{color:theme.muted,fontSize:11}}>{link.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={17} color={theme.muted}/>
              </Pressable>
            ))}
          </View>
        </View>
    </ScrollView>
    <Nav/>
  </SafeAreaView>;
}
