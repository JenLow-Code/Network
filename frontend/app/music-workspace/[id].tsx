import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useAppTheme } from '@/theme/AppTheme';
import { useApp } from '@/context/AppContext';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import { TalentLevelSelector } from '@/components/talent/TalentLevelSelector';
import { TranslatorLanguageFields } from '@/components/talent/TranslatorLanguageFields';
import { api } from '@/lib/api/client';
import { chooseMusicFile, resolveMusicAudio, uploadMusicAudioFile } from '@/domain/musicMedia';
import { useMusicWorkspaces, newMusicId, LYRIC_TEMPLATE } from '@/domain/musicWorkspace';
import type { MusicSection, MusicLayer, MusicLyric, MusicNeed, MusicSuggestion } from '@/domain/musicWorkspace';

type Tab = 'overview' | 'lyrics' | 'tracks' | 'collabs' | 'chat';
type ServerProposal = {
  id: string;
  trackTitle: string;
  trackPublicationId: string;
  proposer?: { displayName?: string; handle?: string };
  status: 'draft' | 'submitted' | 'accepted' | 'rejected' | 'withdrawn' | 'published';
  description: string;
  credits?: { displayName: string; contribution: string }[];
};
const accent = '#CB245C';
const types: { key: MusicSuggestion['kind']; label: string }[] = [
  { key: 'track', label: 'Nouvelle piste' },
  { key: 'section', label: 'Modifier une partie' },
  { key: 'lyrics', label: 'Paroles / traduction' },
  { key: 'style', label: 'Style musical' },
];
const fmtDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('fr-FR');
};

function AudioClip({ url, mediaId }: { url?: string; mediaId?: string }) {
  const theme = useAppTheme();
  const [resolved, setResolved] = useState<string | null>(mediaId ? null : url || null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setResolved(mediaId ? null : url || null);
    setError(false);
    if (mediaId) {
      void resolveMusicAudio(mediaId).then(uri => {
        if (active) { setResolved(uri); setError(!uri); }
      }).catch(() => { if (active) setError(true); });
    }
    return () => { active = false; };
  }, [mediaId, url]);
  if (!resolved) return <Text style={{ fontSize: 11, color: theme.muted }}>
    {error ? 'Audio indisponible avec cette session.' : 'Chargement de l’audio…'}
  </Text>;
  return <AudioPlayback key={resolved} uri={resolved}/>;
}
function AudioPlayback({ uri }: { uri: string }) {
  const theme = useAppTheme();
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={status.playing ? 'Pause' : 'Écouter cette piste'}
      onPress={() => status.playing ? player.pause() : player.play()}
      style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: accent,
        alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={status.playing ? 'pause' : 'play'} size={15} color="#fff"/>
    </Pressable>
    <Text style={{ color: theme.muted, fontSize: 11 }}>
      {Math.floor(status.currentTime / 60)}:{String(Math.floor(status.currentTime % 60)).padStart(2, '0')}
      {' / '}{status.duration ? Math.floor(status.duration / 60) + ':' + String(Math.floor(status.duration % 60)).padStart(2, '0') : '—'}
    </Text>
  </View>;
}

export default function MusicWorkspace() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, patch, remove, say, ready, error: storageError } = useMusicWorkspaces();
  const project = items.find(item => item.id === id);
  const app = useApp();
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const compact = width < 620;
  const [tab, setTab] = useState<Tab>('overview');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [newSection, setNewSection] = useState('');
  const [language, setLanguage] = useState('Français');
  const [trackName, setTrackName] = useState('');
  const [trackRole, setTrackRole] = useState('');
  const [trackUrl, setTrackUrl] = useState('');
  const [trackSection, setTrackSection] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [requestKind, setRequestKind] = useState<MusicNeed['kind']>('talent');
  const [requestLabel, setRequestLabel] = useState('');
  const [requestLevel, setRequestLevel] = useState('Quelques notions');
  const [sourceLanguage, setSourceLanguage] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('');
  const [suggestionKind, setSuggestionKind] = useState<MusicSuggestion['kind']>('track');
  const [suggestionTitle, setSuggestionTitle] = useState('');
  const [suggestionNote, setSuggestionNote] = useState('');
  const [suggestionSection, setSuggestionSection] = useState('');
  const [message, setMessage] = useState('');
  const [serverProposals, setServerProposals] = useState<ServerProposal[]>([]);
  const [serverError, setServerError] = useState('');
  const [savingServer, setSavingServer] = useState<string | null>(null);
  const [rights, setRights] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [masterInput, setMasterInput] = useState('');
  const [openingChat,setOpeningChat] = useState(false);
  const [chatError,setChatError] = useState('');

  useEffect(() => {
    setDraftTitle(project?.title || '');
    setDraftDescription(project?.description || '');
    setMasterInput(project?.masterMediaId ? '' : project?.masterUrl || '');
  }, [project?.id]);
  useEffect(() => {
    if (!project?.publishedId) { setServerProposals([]); return; }
    let active = true;
    void api<{items:ServerProposal[]}>('/api/music/' + encodeURIComponent(project.publishedId) + '/proposals',
      {auth:'required'}).then(result => { if(active) setServerProposals(result.items || []); })
      .catch(() => { if(active) setServerError('Les propositions en ligne sont indisponibles avec cette session.'); });
    return () => { active = false; };
  }, [project?.publishedId]);

  const remoteVisible = useMemo(() => serverProposals.filter(x =>
    !(project?.archivedRemoteProposals || []).includes(x.id)), [serverProposals, project?.archivedRemoteProposals]);

  if (!ready) return <SafeAreaView style={{ flex: 1, justifyContent: 'center',
    backgroundColor: theme.background }}><ActivityIndicator color={accent}/><Nav/></SafeAreaView>;
  if (!project) return <SafeAreaView style={{ flex:1, backgroundColor: theme.background }}>
    <View style={{ padding: 22, gap: 14 }}>
      <PageHeader/>
      <Text style={{ color: theme.foreground, fontWeight: '700' }}>Ce dossier de musique est introuvable.</Text>
      <Text style={{ color: theme.muted, fontSize: 12 }}>Les dossiers privés sont enregistrés sur l'appareil où ils ont été créés.</Text>
      <Pressable onPress={() => router.replace('/music-hub')}><Text style={{ color: accent }}>Retour à Musique</Text></Pressable>
    </View><Nav/>
  </SafeAreaView>;

  const save = (changes: Parameters<typeof patch>[1]) => patch(project.id, changes);
  const sections = project.sections;
  const inputStyle = { color: theme.foreground, backgroundColor: theme.background,
    borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 11, fontSize: 13 } as const;
  const cardStyle = { borderWidth: 1, borderColor: theme.border,
    borderRadius: 16, backgroundColor: theme.surface, padding: 16, gap: 13 } as const;
  const field = (label: string, value: string, onChange: (value: string) => void, placeholder: string) =>
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 12, color: theme.muted }}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor={theme.muted} style={inputStyle}/>
    </View>;
  const action = (text: string, handler: () => void, outlined = false, disabled = false) =>
    <Pressable onPress={handler} disabled={disabled} accessibilityRole="button"
      accessibilityState={{disabled}} style={{ minHeight: 42, alignItems: 'center', justifyContent: 'center',
        borderRadius: 10, paddingVertical: 10, paddingHorizontal: 15,
        borderWidth: outlined ? 1 : 0, borderColor: accent,
        backgroundColor: disabled ? theme.border : outlined ? 'transparent' : accent }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: outlined ? accent : '#fff' }}>{text}</Text>
    </Pressable>;
  const sectionSelector = (value: string, onSelect: (id: string) => void) =>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
      <Pressable onPress={() => onSelect('')}
        style={{ borderColor: value === '' ? accent : theme.border, borderWidth: 1,
          borderRadius: 8, padding: 9 }}><Text style={{ color: theme.foreground, fontSize: 11 }}>Tout le morceau</Text></Pressable>
      {sections.map(section => <Pressable key={section.id} onPress={() => onSelect(section.id)}
        style={{ borderColor: value === section.id ? accent : theme.border, borderWidth: 1,
          borderRadius: 8, padding: 9 }}>
        <Text style={{ color: theme.foreground, fontSize: 11 }}>{section.title}</Text>
      </Pressable>)}
    </ScrollView>;
  const addSection = () => {
    if (!newSection.trim()) return;
    save({ sections: [...sections, { id: newMusicId(), title: newSection.trim() }] });
    setNewSection('');
  };
  const moveSection = (index: number, direction: number) => {
    const to = index + direction;
    if (to < 0 || to >= sections.length) return;
    const next = [...sections];
    [next[index], next[to]] = [next[to], next[index]];
    save({ sections: next });
  };
  const addLanguage = () => {
    const nextLanguage = language.trim();
    if (!nextLanguage || project.lyrics.some(l => l.language.toLowerCase() === nextLanguage.toLowerCase())) return;
    const lyric: MusicLyric = {
      id: newMusicId(), language: nextLanguage, text: '', updatedAt: new Date().toISOString(), origin: 'written'
    };
    save({ lyrics: [...project.lyrics, lyric] });
    setLanguage('');
  };
  const changeLyrics = (id: string, text: string) => save({
    lyrics: project.lyrics.map(lyric => lyric.id === id
      ? { ...lyric, text, updatedAt: new Date().toISOString() } : lyric),
  });
  const addTrack = () => {
    if (!trackName.trim()) return;
    const url = trackUrl.trim();
    if (url && !/^https:\/\//i.test(url)) {
      setUploadError('Utilise une adresse HTTPS valide pour la piste audio.');
      return;
    }
    const layer: MusicLayer = { id: newMusicId(), title: trackName.trim(),
      role: trackRole.trim() || 'Piste', contributor: app.name,
      sectionId: trackSection || undefined, audioUrl: url || undefined,
      createdAt: new Date().toISOString() };
    save({ layers: [...project.layers, layer] });
    setTrackName(''); setTrackRole(''); setTrackUrl(''); setTrackSection(''); setUploadError('');
  };
  const onFile = (file: File, master: boolean) => {
    setUploading(true); setUploadError('');
    void uploadMusicAudioFile(file).then(media => {
      if (master) {
        save({ masterMediaId: media.mediaId, masterUrl: undefined });
      } else {
        const layer: MusicLayer = {
          id: newMusicId(), title: file.name.replace(/\.[^.]+$/, ''),
          role: trackRole.trim() || 'Piste audio', contributor: app.name,
          sectionId: trackSection || undefined, audioMediaId: media.mediaId,
          createdAt: new Date().toISOString(),
        };
        save({ layers: [...project.layers, layer] });
      }
    }).catch(err => setUploadError(err instanceof Error ? err.message : 'Échec de l’import audio.'))
      .finally(() => setUploading(false));
  };
  const addNeed = () => {
    if (!requestLabel.trim()) return;
    if (requestKind === 'talent' && requestLabel.trim().toLowerCase() === 'traducteur' &&
      (!sourceLanguage.trim() || !targetLanguage.trim())) return;
    save({ needs: [...project.needs, { id: newMusicId(), kind: requestKind, label: requestLabel.trim(),
      level: requestKind === 'talent' ? requestLevel : undefined,
      sourceLanguage: requestLabel.trim().toLowerCase() === 'traducteur' ? sourceLanguage.trim() : undefined,
      targetLanguage: requestLabel.trim().toLowerCase() === 'traducteur' ? targetLanguage.trim() : undefined,
    }] });
    setRequestLabel(''); setSourceLanguage(''); setTargetLanguage('');
  };
  const addSuggestion = () => {
    if (!suggestionTitle.trim() || !suggestionNote.trim()) return;
    save({ suggestions: [...project.suggestions, {
      id: newMusicId(), kind: suggestionKind, title: suggestionTitle.trim(),
      note: suggestionNote.trim(), sectionId: suggestionSection || undefined,
      status: 'pending', createdAt: new Date().toISOString(),
    }] });
    setSuggestionTitle(''); setSuggestionNote(''); setSuggestionSection('');
  };
  const decideServer = async (id: string, operation: 'accept' | 'reject' | 'publish') => {
    setSavingServer(id); setServerError('');
    try {
      await api('/api/music-proposals/' + encodeURIComponent(id) + '/' + operation,
        { method: 'POST', auth: 'required', body: {} });
      setServerProposals(previous => previous.map(item => item.id === id
        ? { ...item, status: operation === 'accept' ? 'accepted' :
          operation === 'reject' ? 'rejected' : 'published' } : item));
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Impossible de traiter la proposition.');
    } finally { setSavingServer(null); }
  };
  const openSharedChat = async () => {
    if (!project.publishedId || openingChat) return;
    setOpeningChat(true);setChatError('');
    try {
      const response = await api<{conversationId:string}>(
        '/api/music/' + encodeURIComponent(project.publishedId) + '/conversation',
        {auth:'required'});
      router.push({pathname:'/chat/[id]',params:{id:response.conversationId}});
    } catch (e) { setChatError(e instanceof Error?e.message:'Discussion partagée inaccessible.'); }
    finally {setOpeningChat(false);}
  };
  const publish = async () => {
    if (!rights || (!project.masterMediaId && !project.masterUrl)) {
      setPublishError('Il faut un mix final et une confirmation des droits pour publier.');
      return;
    }
    setPublishing(true); setPublishError('');
    try {
      const reply = await api<{ item: { id: string } }>('/api/music',
        { method: 'POST', auth: 'required', body: {
          title: project.title, description: project.description,
          songAuthor: project.ownerName,
          audioMediaId: project.masterMediaId || undefined,
          externalStreamUrl: project.masterMediaId ? undefined : project.masterUrl,
          visibility: 'public', rightsConfirmed: true,
          credits: [{ displayName: project.ownerName, contribution: 'Création originale' }],
          rights: { originalCreatorName: project.ownerName,
            rightsHolderName: project.ownerName, licenseType: 'own_work',
            attributionText: project.ownerName + ' — création originale',
            adaptationsAllowed: true },
        } });
      if (!reply.item?.id) throw new Error('Le serveur ne confirme pas la publication.');
      save({ publishedId: reply.item.id });
    } catch (e) { setPublishError(e instanceof Error ? e.message : 'Publication non effectuée.'); }
    finally { setPublishing(false); }
  };

  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
    <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }}
      contentContainerStyle={{ width: '100%', maxWidth: 820, alignSelf: 'center',
        paddingHorizontal: compact ? 17 : 27, paddingTop: 10, paddingBottom: 104, gap: 19 }}>
      <PageHeader onBack={() => router.replace('/music-hub')} title="Mon dossier musical"/>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
        <View style={{ width: compact ? 84 : 105, height: compact ? 84 : 105,
          backgroundColor: theme.dark ? '#30262D' : '#F4E6EB',
          borderRadius: 18, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
          {project.coverUrl ? <Image source={{ uri: project.coverUrl }}
            style={{ width: '100%', height: '100%', borderRadius: 18 }}/> :
            <Ionicons name="musical-notes-outline" size={39} color={accent}/>}
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ color: theme.foreground, fontWeight: '700',
            fontSize: compact ? 22 : 27 }}>{project.title}</Text>
          <Text style={{ color: theme.muted, fontSize: 12 }}>
            {project.publishedId ? 'Dossier de création · publication liée' : 'Dossier de création · privé'}
          </Text>
          <Text style={{ color: theme.muted, fontSize: 11 }}>
            {project.layers.length} pistes · {project.lyrics.length} langues · {project.sections.length} parties
          </Text>
        </View>
      </View>
      {storageError ? <Text style={{ color: '#B44F63', fontSize: 12 }}>{storageError}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
        {([
          ['overview','Morceau'], ['lyrics','Paroles'], ['tracks','Pistes'],
          ['collabs','Collaborations'], ['chat','Discussion']
        ] as const).map(([key,label]) =>
          <Pressable key={key} accessibilityRole="tab"
            accessibilityState={{selected:tab === key}} onPress={() => setTab(key)}
            style={{ borderWidth: 1, borderRadius: 12, minHeight: 43,
              borderColor: tab === key ? accent : theme.border,
              backgroundColor: tab === key ? (theme.dark ? '#422A37' : '#FAE8F0') : theme.surface,
              paddingVertical: 11, paddingHorizontal: 13 }}>
            <Text style={{ color: tab === key ? accent : theme.foreground,
              fontSize: 12, fontWeight: tab === key ? '700' : '500' }}>{label}</Text>
          </Pressable>)}
      </ScrollView>

      {tab === 'overview' ? <>
        <View style={cardStyle}>
          <Text style={{ fontWeight: '700', fontSize: 18, color: theme.foreground }}>À propos de ce morceau</Text>
          {field('Titre', draftTitle, setDraftTitle, 'Titre du morceau')}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, color: theme.muted }}>Description</Text>
            <TextInput multiline textAlignVertical="top" value={draftDescription}
              onChangeText={setDraftDescription} placeholder="Ce que ce chant signifie, l’idée, l’arrangement…"
              placeholderTextColor={theme.muted}
              style={{ ...inputStyle, minHeight: 84 }}/>
          </View>
          {field('Image du dossier (adresse HTTPS, facultative)', project.coverUrl || '',
            value => save({ coverUrl: value }), 'https://…')}
          {action('Enregistrer les informations', () => {
            if (draftTitle.trim()) save({title:draftTitle.trim(), description:draftDescription.trim()});
          }, false, !draftTitle.trim())}
        </View>
        <View style={cardStyle}>
          <Text style={{ fontWeight: '700', fontSize: 18, color: theme.foreground }}>Structure musicale</Text>
          <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 19 }}>
            Organise ton morceau en sections. Chaque proposition pourra concerner l’ensemble ou une partie précise.
          </Text>
          {sections.map((section,index) => <View key={section.id}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 7,
              borderBottomWidth: 1, borderColor: theme.border }}>
            <Text style={{ color: accent, fontSize: 11, minWidth: 22 }}>{index + 1}</Text>
            <TextInput accessibilityLabel={'Nom de la partie ' + (index+1)} value={section.title}
              onChangeText={title => save({ sections: sections.map(s => s.id === section.id ? {...s,title}:s) })}
              style={{ color: theme.foreground, flex:1, fontSize: 14, paddingVertical: 5 }}/>
            <Pressable disabled={index===0} onPress={() => moveSection(index,-1)} accessibilityLabel="Monter">
              <Ionicons name="arrow-up-outline" size={18} color={index===0?theme.border:theme.muted}/>
            </Pressable>
            <Pressable disabled={index===sections.length-1} onPress={() => moveSection(index,1)} accessibilityLabel="Descendre">
              <Ionicons name="arrow-down-outline" size={18}
                color={index===sections.length-1?theme.border:theme.muted}/>
            </Pressable>
            <Pressable onPress={() => save({ sections: sections.filter(s => s.id !== section.id) })}
              accessibilityLabel="Retirer cette partie">
              <Ionicons name="close-outline" size={20} color={theme.muted}/>
            </Pressable>
          </View>)}
          {field('Ajouter une partie', newSection, setNewSection, 'Ex. Couplet 3, Pont, Solo…')}
          {action('Ajouter une partie',addSection,true,!newSection.trim())}
        </View>
        <View style={cardStyle}>
          <Text style={{ fontWeight:'700',fontSize:18,color:theme.foreground }}>Publication</Text>
          {project.publishedId ? <>
            <Text style={{ fontSize:12,color:theme.muted }}>Ce dossier est lié à une publication publique.</Text>
            {action('Voir la publication', () =>
              router.push({ pathname:'/music/[id]',params:{id:project.publishedId!,from:'music-tab'} }))}
          </> : <>
            <Text style={{ fontSize:12,color:theme.muted,lineHeight:20 }}>
              Le dossier reste privé. Pour publier, joins un mix final déjà assemblé.
              Les pistes isolées ne sont pas automatiquement mixées.
            </Text>
            {field('Lien HTTPS du mix final', masterInput, value => {
              setMasterInput(value); if (/^https:\/\//.test(value) || !value) save({ masterUrl: value || undefined, masterMediaId: undefined });
            },'https://…/mix-final.mp3')}
            {Platform.OS==='web' ? action(uploading?'Import en cours…':'Importer un mix final',
              () => chooseMusicFile(file => onFile(file,true)),true,uploading) : null}
            {project.masterMediaId ? <Text style={{ color: accent,fontSize:12 }}>Mix final importé sur JenLow.</Text> : null}
            <Pressable onPress={() => setRights(!rights)} accessibilityRole="checkbox"
              accessibilityState={{checked:rights}} style={{flexDirection:'row',alignItems:'flex-start',gap:10}}>
              <Ionicons name={rights?'checkbox':'square-outline'} size={22} color={rights?accent:theme.muted}/>
              <Text style={{color:theme.foreground,fontSize:12,lineHeight:19,flex:1}}>
                Je confirme détenir les droits nécessaires sur le morceau et toutes les pistes du mix final.
              </Text>
            </Pressable>
            {action(publishing?'Publication en cours…':'Publier ce morceau',publish,false,
              publishing||!rights||(!project.masterUrl&&!project.masterMediaId))}
            <Text style={{color:theme.muted,fontSize:11,lineHeight:17}}>
              Les paroles multilingues, la structure et les demandes de talents restent pour l’instant dans le dossier local :
              la publication serveur actuelle ne synchronise pas encore ces éléments.
            </Text>
            {publishError ? <Text style={{color:'#C34D65',fontSize:12}}>{publishError}</Text>:null}
          </>}
        </View>
      </> : null}

      {tab === 'lyrics' ? <View style={{gap:14}}>
        <Text style={{ fontSize:19,fontWeight:'700',color:theme.foreground }}>Paroles</Text>
        <Text style={{fontSize:12,color:theme.muted,lineHeight:19}}>
          Conserve différentes langues dans ton dossier. Une traduction n’écrase jamais les paroles originales.
        </Text>
        {project.lyrics.map(lyric => <View key={lyric.id} style={cardStyle}>
          <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
            <Text style={{fontWeight:'700',fontSize:15,color:theme.foreground}}>{lyric.language}</Text>
            <Pressable accessibilityLabel={'Supprimer la version ' + lyric.language}
              onPress={() => save({lyrics:project.lyrics.filter(x=>x.id!==lyric.id)})}>
              <Ionicons name="trash-outline" size={17} color={theme.muted}/>
            </Pressable>
          </View>
          <TextInput multiline textAlignVertical="top" value={lyric.text}
            onChangeText={value => changeLyrics(lyric.id,value)}
            placeholder="Écris les paroles de ton morceau…"
            placeholderTextColor={theme.muted}
            style={{...inputStyle,minHeight:220,lineHeight:24,fontSize:15}}/>
          <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:9}}>
            <Text style={{fontSize:10,color:theme.muted}}>Modifié le {fmtDate(lyric.updatedAt)}</Text>
            {action('Insérer un modèle',() => changeLyrics(lyric.id,lyric.text
              ? lyric.text + '\n\n' + LYRIC_TEMPLATE : LYRIC_TEMPLATE),true)}
          </View>
        </View>)}
        <View style={cardStyle}>
          {field('Ajouter une langue',language,setLanguage,'Ex. Français, Portugais…')}
          {action('Créer la version des paroles',addLanguage,false,!language.trim()||
            project.lyrics.some(x=>x.language.toLowerCase()===language.toLowerCase()))}
          <Text style={{fontSize:11,color:theme.muted,lineHeight:18}}>
            Traduction automatique sur demande : le service n’est pas encore connecté. Pour l’instant,
            ajoute une langue et renseigne une traduction manuellement ou avec un collaborateur traducteur.
          </Text>
        </View>
      </View>:null}

      {tab === 'tracks' ? <View style={{gap:14}}>
        <Text style={{fontSize:19,fontWeight:'700',color:theme.foreground}}>Pistes audio</Text>
        <Text style={{fontSize:12,lineHeight:19,color:theme.muted}}>
          Ajoute tes prises de voix et d’instruments, et associe éventuellement une piste à une partie du morceau.
        </Text>
        {project.layers.map(layer => <View key={layer.id} style={cardStyle}>
          <View style={{flexDirection:'row',gap:10,alignItems:'center'}}>
            <View style={{width:44,height:44,borderRadius:11,backgroundColor:theme.dark?'#42313F':'#F8E7EF',
              alignItems:'center',justifyContent:'center'}}>
              <Ionicons name="musical-note-outline" color={accent} size={22}/>
            </View>
            <View style={{flex:1,gap:4}}>
              <Text style={{fontSize:15,fontWeight:'700',color:theme.foreground}}>{layer.title}</Text>
              <Text style={{color:theme.muted,fontSize:11}}>
                {layer.role} · {layer.contributor}
                {layer.sectionId ? ' · '+(sections.find(s=>s.id===layer.sectionId)?.title || 'Partie supprimée') : ''}
              </Text>
            </View>
            <Pressable accessibilityLabel="Retirer cette piste du dossier"
              onPress={() => save({layers:project.layers.filter(x=>x.id!==layer.id)})}>
              <Ionicons name="close-outline" size={21} color={theme.muted}/>
            </Pressable>
          </View>
          {layer.audioMediaId || layer.audioUrl ? <AudioClip url={layer.audioUrl} mediaId={layer.audioMediaId}/>:
            <Text style={{fontSize:11,color:theme.muted}}>Aucun enregistrement lié à cette piste.</Text>}
          {layer.audioMediaId || layer.audioUrl ? action('Utiliser comme mix final',() =>
            save({masterMediaId:layer.audioMediaId,masterUrl:layer.audioMediaId?undefined:layer.audioUrl}),true):null}
        </View>)}
        <View style={cardStyle}>
          <Text style={{fontWeight:'700',fontSize:16,color:theme.foreground}}>Ajouter une piste</Text>
          {field('Nom de la piste',trackName,setTrackName,'Ex. Basse, Voix principale, Guitare…')}
          {field('Instrument / rôle',trackRole,setTrackRole,'Ex. Bassiste')}
          <Text style={{fontSize:12,color:theme.muted}}>Partie concernée (facultatif)</Text>
          {sectionSelector(trackSection,setTrackSection)}
          {field('Lien audio HTTPS (facultatif)',trackUrl,setTrackUrl,'https://…/piste.wav')}
          {action('Ajouter cette piste',addTrack,false,!trackName.trim())}
          {Platform.OS==='web' ? action(uploading?'Import en cours…':'Importer un fichier audio',
            () => chooseMusicFile(file => onFile(file,false)),true,uploading):null}
          <Text style={{fontSize:11,color:theme.muted,lineHeight:18}}>
            Les imports utilisent le stockage sécurisé JenLow lorsque l’API et la session sont disponibles.
            Aucun fichier local non enregistré n’est présenté comme sauvegardé.
          </Text>
          {uploadError ? <Text style={{color:'#C34D65',fontSize:12}}>{uploadError}</Text>:null}
        </View>
      </View>:null}

      {tab === 'collabs' ? <View style={{gap:15}}>
        <Text style={{fontSize:19,fontWeight:'700',color:theme.foreground}}>Collaborations</Text>
        <View style={cardStyle}>
          <Text style={{fontWeight:'700',color:theme.foreground,fontSize:16}}>Talents et styles recherchés</Text>
          <Text style={{color:theme.muted,fontSize:12,lineHeight:18}}>
            Indique les personnes ou les directions musicales que tu recherches pour ce morceau.
          </Text>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
            {project.needs.map(need => <View key={need.id}
              style={{borderWidth:1,borderColor:need.kind==='talent'?accent:theme.border,
                backgroundColor:need.kind==='talent'?(theme.dark?'#43273B':'#FAE6EE'):theme.background,
                borderRadius:11,paddingHorizontal:10,paddingVertical:7,flexDirection:'row',alignItems:'center',gap:8}}>
              <Text style={{color:theme.foreground,fontSize:12}}>{need.label}
                {need.sourceLanguage&&need.targetLanguage?' · '+need.sourceLanguage+' → '+need.targetLanguage:''}</Text>
              <Pressable onPress={()=>save({needs:project.needs.filter(x=>x.id!==need.id)})}
                accessibilityLabel={'Retirer '+need.label}>
                <Ionicons name="close" size={14} color={theme.muted}/>
              </Pressable>
            </View>)}
          </View>
          <View style={{flexDirection:'row',gap:8}}>
            {(['talent','style'] as const).map(kind=> <Pressable key={kind} onPress={()=>setRequestKind(kind)}
              style={{borderRadius:9,padding:10,borderWidth:1,borderColor:requestKind===kind?accent:theme.border}}>
              <Text style={{color:theme.foreground,fontSize:12}}>{kind==='talent'?'Talent':'Style musical'}</Text>
            </Pressable>)}
          </View>
          {field(requestKind==='talent'?'Talent recherché':'Proposition de style',
            requestLabel,setRequestLabel,requestKind==='talent'?'Ex. Batteur, Traducteur…':'Ex. Neo-soul, Jazz fusion…')}
          {requestKind==='talent'?<View style={{gap:8}}>
            <Text style={{fontSize:12,color:theme.muted}}>Niveau souhaité</Text>
            <TalentLevelSelector value={requestLevel} onChange={setRequestLevel}/>
          </View>:null}
          {requestKind==='talent'&&requestLabel.trim().toLowerCase()==='traducteur'?
            <TranslatorLanguageFields sourceLanguage={sourceLanguage} targetLanguage={targetLanguage}
              onChangeSource={setSourceLanguage} onChangeTarget={setTargetLanguage}/>:null}
          {action('Ajouter ce besoin',addNeed,true,!requestLabel.trim()||
            (requestKind==='talent'&&requestLabel.trim().toLowerCase()==='traducteur'&&
              (!sourceLanguage.trim()||!targetLanguage.trim())))}
          <Text style={{fontSize:11,color:theme.muted,lineHeight:17}}>
            Ces besoins sont enregistrés dans ton dossier. Leur publication dans la découverte des talents
            sera connectée à la synchronisation serveur du dossier.
          </Text>
        </View>
        <View style={cardStyle}>
          <Text style={{fontWeight:'700',fontSize:16,color:theme.foreground}}>Propositions de travail</Text>
          <Text style={{color:theme.muted,fontSize:12,lineHeight:18}}>
            Conserve des idées, ajustements et propositions concernant tout le morceau ou une partie.
            Les propositions créées ici sont personnelles, pas des soumissions d’autres membres.
          </Text>
          {project.suggestions.map(s => <View key={s.id} style={{borderBottomWidth:1,
            borderColor:theme.border,paddingVertical:12,gap:7}}>
            <Text style={{color:theme.foreground,fontSize:14,fontWeight:'700'}}>{s.title}</Text>
            <Text style={{color:theme.muted,fontSize:11}}>
              {types.find(t=>t.key===s.kind)?.label}{s.sectionId?' · '+(sections.find(x=>x.id===s.sectionId)?.title||'Partie'):''}
            </Text>
            <Text style={{color:theme.foreground,fontSize:12,lineHeight:19}}>{s.note}</Text>
            <Text style={{color:accent,fontSize:11}}>
              {s.status==='pending'?'En attente':s.status==='integrated'?'Intégrée au travail':'Archivée'}
            </Text>
            <View style={{flexDirection:'row',gap:9,flexWrap:'wrap'}}>
              {s.status!=='integrated'?action('Marquer intégrée',()=>
                save({suggestions:project.suggestions.map(x=>x.id===s.id?{...x,status:'integrated'}:x)}),true):null}
              {s.status!=='archived'?action('Archiver',()=>
                save({suggestions:project.suggestions.map(x=>x.id===s.id?{...x,status:'archived'}:x)}),true):null}
              {s.status!=='pending'?action('Remettre en attente',()=>
                save({suggestions:project.suggestions.map(x=>x.id===s.id?{...x,status:'pending'}:x)}),true):null}
            </View>
          </View>)}
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
            {types.map(type=><Pressable key={type.key} onPress={()=>setSuggestionKind(type.key)}
              style={{padding:9,borderRadius:8,borderWidth:1,
                borderColor:suggestionKind===type.key?accent:theme.border}}>
              <Text style={{color:theme.foreground,fontSize:11}}>{type.label}</Text>
            </Pressable>)}
          </View>
          {field('Intitulé',suggestionTitle,setSuggestionTitle,'Ex. Ajouter un solo au pont')}
          <Text style={{fontSize:12,color:theme.muted}}>Partie concernée</Text>
          {sectionSelector(suggestionSection,setSuggestionSection)}
          <TextInput multiline textAlignVertical="top" value={suggestionNote}
            onChangeText={setSuggestionNote} placeholder="Décris la proposition, l’idée musicale…"
            placeholderTextColor={theme.muted} style={{...inputStyle,minHeight:85}}/>
          {action('Ajouter à mes propositions',addSuggestion,false,!suggestionTitle.trim()||!suggestionNote.trim())}
        </View>
        {project.publishedId ? <View style={cardStyle}>
          <Text style={{fontSize:16,fontWeight:'700',color:theme.foreground}}>Propositions reçues</Text>
          <Text style={{fontSize:12,color:theme.muted,lineHeight:19}}>
            Les contributions audio envoyées via JenLow sont affichées ici avec leur véritable statut serveur.
          </Text>
          {serverError?<Text style={{color:'#B44F63',fontSize:12}}>{serverError}</Text>:null}
          {remoteVisible.map(p=><View key={p.id} style={{borderBottomWidth:1,borderColor:theme.border,
            paddingVertical:11,gap:8}}>
            <Text style={{color:theme.foreground,fontWeight:'700'}}>{p.proposer?.displayName||'Musicien'}</Text>
            <Text style={{color:theme.foreground,fontSize:12,lineHeight:19}}>{p.description}</Text>
            <Text style={{color:accent,fontSize:11}}>Statut : {p.status}</Text>
            {p.credits?.map((credit,i)=><Text key={i} style={{color:theme.muted,fontSize:11}}>
              {credit.displayName} · {credit.contribution}
            </Text>)}
            <View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}>
              {p.status==='submitted'?<>
                {action(savingServer===p.id?'Traitement…':'Accepter',()=>{void decideServer(p.id,'accept');},false,savingServer===p.id)}
                {action('Refuser',()=>{void decideServer(p.id,'reject');},true,savingServer===p.id)}
              </>:null}
              {p.status==='accepted'?action('Publier ce mix proposé',()=>
                {void decideServer(p.id,'publish');},false,savingServer===p.id):null}
              {action('Archiver de ma vue',()=>save({
                archivedRemoteProposals:[...(project.archivedRemoteProposals||[]),p.id]
              }),true)}
            </View>
            {p.status==='accepted'?<Text style={{fontSize:11,color:theme.muted,lineHeight:17}}>
              La publication serveur utilise l’audio fourni par le collaborateur tel quel.
              Vérifie qu’il s’agit du mix complet souhaité et non d’une piste isolée.
            </Text>:null}
          </View>)}
          {!remoteVisible.length&&!serverError?
            <Text style={{fontSize:12,color:theme.muted}}>Aucune proposition reçue pour le moment.</Text>:null}
        </View>:null}
      </View>:null}

      {tab === 'chat' ? <View style={cardStyle}>
        <Text style={{fontSize:19,fontWeight:'700',color:theme.foreground}}>Discussion du morceau</Text>
        <Text style={{fontSize:12,color:theme.muted,lineHeight:20}}>
          Chaque dossier possède sa discussion. Les notes ci-dessous restent privées sur cet appareil.
          Pour un morceau publié, tu peux ouvrir sa discussion partagée avec les collaborateurs acceptés.
        </Text>
        {project.publishedId ? <>
          {action(openingChat?'Ouverture…':'Ouvrir le chat partagé',()=>{void openSharedChat();},false,openingChat)}
          {chatError?<Text style={{color:'#B44F63',fontSize:12}}>{chatError}</Text>:null}
        </>:null}
        {project.messages.map(note=><View key={note.id}
          style={{padding:12,borderRadius:13,backgroundColor:theme.dark?'#352733':'#F8EAF0',gap:5}}>
          <Text style={{fontSize:11,color:accent,fontWeight:'700'}}>{note.author} · {fmtDate(note.createdAt)}</Text>
          <Text style={{color:theme.foreground,fontSize:13,lineHeight:20}}>{note.text}</Text>
        </View>)}
        {!project.messages.length?<Text style={{fontSize:12,color:theme.muted}}>
          La conversation est vide pour le moment.
        </Text>:null}
        <TextInput multiline value={message} onChangeText={setMessage}
          placeholder="Une idée, une question, une note pour ce morceau…"
          placeholderTextColor={theme.muted} style={{...inputStyle,minHeight:75}}/>
        {action('Ajouter à la discussion',()=>{say(project.id,message);setMessage('');},false,!message.trim())}
      </View>:null}
      <Text style={{fontSize:11,color:theme.muted,lineHeight:18}}>
        Dossier personnel · les modifications sont enregistrées sur cet appareil.
        La cassette apparaît uniquement sur les publications publiques.
      </Text>
    </ScrollView>
    <Nav/>
  </SafeAreaView>;
}
