import { Text } from '@/i18n/LocalizedText';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Nav } from '@/components/navigation/Nav';
import { TopActions } from '@/components/navigation/TopActions';
import { useApp } from '@/context/AppContext';
import { useAppTheme } from '@/theme/AppTheme';
import {workspaceCanvas,PAGE_TITLE_FONT_SIZE,PAGE_TITLE_LINE_HEIGHT} from '@/theme/workspaceLayout';
import { useLocale, Language, LANGUAGE_KEY } from '@/i18n/locale';
import { readMusicLibraryLayout, writeMusicLibraryLayout, type MusicLibraryLayout } from '@/domain/musicLibraryPreferences';
const choices: { id: Language; label: string }[] = [
  { id: 'fr', label: 'Français' },
  { id: 'en', label: 'English' },
  { id: 'de', label: 'Deutsch' },
  { id: 'pt', label: 'Português' },
];
export default function Settings() {
  const {width}=useWindowDimensions();
  const { language, setLanguage, t, tr } = useLocale();
  const { logout, email } = useApp();
  const [busy, setBusy] = useState(false);
  const [musicLayout, setMusicLayout] = useState<MusicLibraryLayout>('cards');
  useEffect(() => {
    let live = true;
    setMusicLayout('cards');
    void readMusicLibraryLayout(email).then(value => { if (live) setMusicLayout(value); }).catch(() => {});
    return () => { live = false; };
  }, [email]);
  const changeMusicLayout = (value: MusicLibraryLayout) => {
    setMusicLayout(value);
    void writeMusicLibraryLayout(email, value).catch(() => {});
  };
  const {
    preference: appearance,
    setPreference: chooseAppearance,
    dark,
    background,
    foreground,
    border,
  } = useAppTheme();
  const keys = [
    'jenlow.network.demo.dream.workspace.v1.' + (email || 'guest').toLowerCase(),
    'jenlow.network.fire.v1.' + email.toLowerCase(),
    'jenlow.network.inspirations.v1.' + email.toLowerCase(),
    ...['jenlow.mine.', 'jenlow.prayer.', 'jenlow.encouragement.', 'jenlow.proposals.'].map(
      s => s + email,
    ),
  ];
  const clearDemo = async () => {
    setBusy(true);
    try {
      await Promise.all(keys.map(k => AsyncStorage.removeItem(k)));
      logout();
      router.replace('/login');
    } finally {
      setBusy(false);
    }
  };
  function confirmDemo() {
    Alert.alert(
      'Clear demo data?',
      'This clears saved prototype Dreams and lists on this device. It does not delete a server account, since no real account exists yet.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear demo data',
          style: 'destructive',
          onPress: () => {
            void clearDemo();
          },
        },
      ],
    );
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ ...workspaceCanvas(width),paddingTop:12,paddingBottom:55 }}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Pressable onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={25} />
          </Pressable>
          <TopActions />
        </View>
        <Text
          style={{
            fontSize:PAGE_TITLE_FONT_SIZE,
            lineHeight:PAGE_TITLE_LINE_HEIGHT,
            fontWeight: '700',
            color: foreground,
            marginTop: 14,
            marginBottom: 23,
          }}
        >
          {t('settings')}
        </Text>
        <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 12 }}>{t('language')}</Text>
        <View
          style={{ borderWidth: 1, borderColor: '#e8e8e8', borderRadius: 12, overflow: 'hidden' }}
        >
          {choices.map((option, i) => (
            <Pressable
              key={option.id}
              onPress={() => setLanguage(option.id)}
              accessibilityRole="button"
              style={{
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottomWidth: i === choices.length - 1 ? 0 : 1,
                borderColor: '#eee',
              }}
            >
              <Text style={{ fontSize: 14, color: '#222' }}>{option.label}</Text>
              <Ionicons
                name={language === option.id ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={language === option.id ? '#D71D77' : '#aaa'}
              />
            </Pressable>
          ))}
        </View>
        <Text style={{ fontSize: 11, lineHeight: 17, color: '#888', marginTop: 11 }}>
          {tr('settingsHelp')}
        </Text>
        <Text style={{ fontSize: 16, fontWeight: '700', marginTop: 28, marginBottom: 12 }}>
          Apparence
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { id: 'light' as const, label: 'Clair' },
            { id: 'dark' as const, label: 'Sombre' },
            { id: 'system' as const, label: 'Système' },
          ].map(o => (
            <Pressable
              key={o.id}
              onPress={() => chooseAppearance(o.id)}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: appearance === o.id ? '#CB245C' : '#ddd',
                backgroundColor:
                  appearance === o.id ? (dark ? '#4E2A3E' : '#FAEAF0') : dark ? '#252525' : '#fff',
                borderRadius: 9,
                padding: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: foreground, fontSize: 12 }}>{o.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={{ fontSize: 11, color: '#888', marginTop: 8 }}>
          Le choix est enregistré et appliqué à la navigation. Certains écrans de démonstration
          utilisent encore des couleurs fixes.
        </Text>
        <Text style={{ fontSize: 16, fontWeight: '700', color: foreground, marginTop: 30, marginBottom: 10 }}>
          Affichage de mes morceaux
        </Text>
        <Text style={{ fontSize: 12, color: dark ? '#B2B2B2' : '#777', marginBottom: 12 }}>
          Choisis comment afficher ta bibliothèque musicale. Les cartes sont sélectionnées par défaut.
        </Text>
        <View style={{ flexDirection: 'row', gap: 9 }}>
          {([{ id: 'cards', label: 'Cartes', icon: 'grid-outline' },
             { id: 'list', label: 'Liste', icon: 'list-outline' }] as const).map(option => (
            <Pressable key={option.id} accessibilityRole="button"
              accessibilityLabel={'Afficher mes morceaux en ' + option.label.toLowerCase()}
              accessibilityState={{ selected: musicLayout === option.id }}
              onPress={() => changeMusicLayout(option.id)}
              style={{ flex: 1, borderWidth: 1, borderColor: musicLayout === option.id ? '#CB245C' : border,
                borderRadius: 11, paddingVertical: 13, paddingHorizontal: 14, minHeight: 46,
                backgroundColor: musicLayout === option.id ? (dark ? '#422736' : '#F9EBF0') : (dark ? '#202227' : '#FFFFFF'),
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Ionicons name={option.icon} size={18} color={musicLayout === option.id ? '#CB245C' : foreground}/>
              <Text style={{ color: musicLayout === option.id ? '#CB245C' : foreground, fontSize: 13,
                fontWeight: musicLayout === option.id ? '700' : '500' }}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={{ fontSize: 16, fontWeight: '700', marginTop: 34, marginBottom: 12 }}>
          {t('account')}
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={confirmDemo}
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            padding: 13,
            borderRadius: 9,
            flexDirection: 'row',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <Ionicons name="trash-outline" color="#9e5163" size={20} />
          <Text style={{ color: '#733e4b', fontSize: 13 }}>{t('demoData')}</Text>
        </Pressable>
        <View style={{ padding: 14, backgroundColor: '#f7f7f7', borderRadius: 10, marginTop: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: '600' }}>{t('deleteAccount')}</Text>
          <Text style={{ fontSize: 12, color: '#777', lineHeight: 19, marginTop: 7 }}>
            Real account deletion will be available here when secure authentication and server-side
            deletion are implemented. This prototype currently has no real account to delete.
          </Text>
        </View>
      </ScrollView>
      <Nav />
    </SafeAreaView>
  );
}
