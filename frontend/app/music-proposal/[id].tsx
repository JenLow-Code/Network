import React, { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { musics } from '@/mocks/publications';
import { usePublication } from '@/lib/api/hooks';
import { useApp } from '@/context/AppContext';
import { api } from '@/lib/api/client';
import { chooseMusicFile, uploadMusicAudioFile } from '@/domain/musicMedia';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import { useAppTheme } from '@/theme/AppTheme';
import {workspaceCanvas,PAGE_TITLE_FONT_SIZE,PAGE_TITLE_LINE_HEIGHT} from '@/theme/workspaceLayout';

const pink = '#CB245C';

/** A real server-side music proposal; the former mock "prepared locally" success is removed. */
export default function MusicProposal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const local = musics.find(m => m.id === id);
  const remote = usePublication(local ? undefined : id);
  const music = local ?? (remote.item?.type === 'music' ? remote.item : undefined);
  const app = useApp();
  const theme = useAppTheme();
  const {width}=useWindowDimensions();
  const [note, setNote] = useState('');
  const [role, setRole] = useState('');
  const [section, setSection] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [audioMediaId, setAudioMediaId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const valid = !!music && note.trim().length > 0 && role.trim().length > 0 &&
    (!!audioMediaId || /^https:\/\//i.test(audioUrl.trim()));
  const field = {
    backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1,
    borderRadius: 11, paddingHorizontal: 13, paddingVertical: 12,
    color: theme.foreground, fontSize: 14,
  } as const;

  async function send() {
    if (!id || !valid || busy || !music) return;
    setBusy(true); setError('');
    try {
      const description = [
        section.trim() ? 'Partie concernée : ' + section.trim() : '',
        note.trim(),
      ].filter(Boolean).join('\n\n');
      const response = await api<{ proposal: { id: string; status: string } }>(
        '/api/music/' + encodeURIComponent(id) + '/proposals',
        { method: 'POST', auth: 'required', body: {
          description, audioMediaId: audioMediaId || undefined,
          externalAudioUrl: audioMediaId ? undefined : audioUrl.trim(),
          submit: true,
          credits: [{ displayName: app.name, contribution: role.trim() }],
        } },
      );
      if (!response.proposal?.id || response.proposal.status !== 'submitted')
        throw new Error('Le serveur n’a pas confirmé la proposition.');
      app.proposeMusic(id);
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'L’envoi a échoué.');
    } finally { setBusy(false); }
  }

  function selectFile() {
    chooseMusicFile(file => {
      setBusy(true); setError('');
      void uploadMusicAudioFile(file, 'music_proposal')
        .then(media => { setAudioMediaId(media.mediaId); setAudioUrl(''); })
        .catch(e => setError(e instanceof Error ? e.message : 'Import impossible.'))
        .finally(() => setBusy(false));
    });
  }

  return (
    <SafeAreaView style={{flex:1,backgroundColor:theme.background}}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{
        ...workspaceCanvas(width),paddingTop:12,paddingBottom:100,gap:16,
      }}>
        <PageHeader onBack={() => router.back()}/>
        <Text style={{color:theme.foreground,fontWeight:'700',fontSize:PAGE_TITLE_FONT_SIZE,lineHeight:PAGE_TITLE_LINE_HEIGHT}}>Proposer une collaboration</Text>
        <Text style={{color:theme.muted,fontSize:13,lineHeight:21}}>
          {music ? music.title + ' · ' + music.author : 'Morceau non trouvé'}
        </Text>
        {submitted ? <View style={{backgroundColor:theme.surface,borderRadius:17,borderWidth:1,
          borderColor:theme.border,padding:22,gap:12}}>
          <Ionicons name="checkmark-circle-outline" size={32} color="#287D58"/>
          <Text style={{fontSize:17,fontWeight:'700',color:theme.foreground}}>Proposition envoyée</Text>
          <Text style={{fontSize:13,color:theme.muted,lineHeight:21}}>
            Le serveur a enregistré ta contribution. L’auteur peut maintenant l’examiner avant une éventuelle publication.
            Elle reste créditée à ton nom.
          </Text>
          <Pressable onPress={() => router.replace('/music-hub')} style={{padding:12,borderRadius:9,
            alignItems:'center',backgroundColor:pink}}>
            <Text style={{color:'#fff',fontWeight:'700'}}>Voir mes collaborations</Text>
          </Pressable>
        </View> : <>
          <View style={{backgroundColor:theme.surface,borderRadius:16,borderWidth:1,
            borderColor:theme.border,padding:17,gap:13}}>
            <Text style={{fontWeight:'700',fontSize:16,color:theme.foreground}}>Ta contribution</Text>
            <Text style={{fontSize:12,color:theme.muted}}>Instrument ou rôle</Text>
            <TextInput value={role} onChangeText={setRole} placeholder="Ex. Basse, traduction, voix…"
              placeholderTextColor={theme.muted} style={field}/>
            <Text style={{fontSize:12,color:theme.muted}}>Partie concernée (facultatif)</Text>
            <TextInput value={section} onChangeText={setSection} placeholder="Ex. Couplet 2, refrain ou morceau entier"
              placeholderTextColor={theme.muted} style={field}/>
            <Text style={{fontSize:12,color:theme.muted}}>Décris ta proposition</Text>
            <TextInput value={note} onChangeText={setNote} multiline textAlignVertical="top"
              placeholder="Ce que tu aimerais ajouter, modifier et pourquoi…"
              placeholderTextColor={theme.muted} style={{...field,minHeight:130}}/>
            <Text style={{fontSize:12,color:theme.muted}}>Enregistrement audio</Text>
            {Platform.OS==='web' ? <Pressable onPress={selectFile} disabled={busy}
              style={{padding:13,borderRadius:10,borderColor:pink,borderWidth:1,alignItems:'center'}}>
              <Text style={{color:pink,fontWeight:'700'}}>
                {busy?'Import en cours…':audioMediaId?'Fichier importé · remplacer':'Importer mon enregistrement'}
              </Text>
            </Pressable>:null}
            <TextInput value={audioUrl} onChangeText={text => {setAudioUrl(text);setAudioMediaId('');}}
              placeholder="Ou renseigner le lien HTTPS du fichier audio"
              placeholderTextColor={theme.muted} style={field} autoCapitalize="none"/>
            <Text style={{fontSize:11,color:theme.muted,lineHeight:18}}>
              Ta proposition sera soumise pour examen. Le serveur actuel attend un enregistrement audio :
              les suggestions textuelles sans audio ne peuvent pas encore être envoyées directement.
            </Text>
            {!!error&&<Text style={{color:'#B44F63',fontSize:12}}>{error}</Text>}
            <Pressable onPress={() => {void send();}} disabled={!valid||busy}
              style={{backgroundColor:valid&&!busy?pink:theme.border,
                borderRadius:11,minHeight:48,justifyContent:'center',alignItems:'center'}}>
              {busy?<ActivityIndicator color="#fff"/>:
                <Text style={{color:'#fff',fontWeight:'700',fontSize:13}}>Envoyer ma proposition</Text>}
            </Pressable>
          </View>
          <Text style={{fontSize:11,color:theme.muted,lineHeight:19}}>
            La musique d’origine reste attribuée à son auteur. Une contribution n'écrase jamais le morceau original.
          </Text>
        </>}
      </ScrollView>
      <Nav/>
    </SafeAreaView>
  );
}
