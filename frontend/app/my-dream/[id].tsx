import { Text, TextInput } from '@/i18n/LocalizedText';
import React, { useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Nav } from '@/components/navigation/Nav';
import { TopActions } from '@/components/navigation/TopActions';
import { PHASE_COLORS, PHASE_LABELS } from '@/domain/publication';
import { useDreams } from '@/domain/dreamRepository';
import { pickDreamImage } from '@/lib/pickDreamImage';
import { useAppTheme } from '@/theme/AppTheme';

const defaults = [
  'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800',
  'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800',
];
function OutlineButton({
  label,
  onPress,
  danger = false,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderWidth: 1,
        borderColor: danger ? '#C99B9B' : '#ddd',
        borderRadius: 10,
        padding: 12,
        marginTop: 9,
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: 13, color: danger ? '#9D4141' : '#282828', fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{ fontSize: 15, fontWeight: '700', marginTop: 17, marginBottom: 7, color: '#252525' }}
    >
      {children}
    </Text>
  );
}
export default function Workspace() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();
  const { items, update, add, advance, remove } = useDreams();
  const dream = items.find(x => x.id === id);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [editingImage, setEditingImage] = useState(false);
  const [needDraft, setNeedDraft] = useState('');
  const [entry, setEntry] = useState('');
  if (!dream)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <Text>Rêve introuvable</Text>
        <Nav />
      </SafeAreaView>
    );
  const phase = dream.phase,
    seed = phase === 'Rêve',
    germ = phase === 'Initiation',
    growth = phase === 'Croissance',
    flower = phase === 'Témoignage';
  const editable = seed || germ;
  const confirmAction = (title: string, message: string, action: () => void) => {
    if (Platform.OS === 'web') {
      if (window.confirm(title + '\n' + message)) action();
      return;
    }
    Alert.alert(title, message, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmer', style: 'destructive', onPress: action },
    ]);
  };
  const deleteDream = () =>
    confirmAction('Arracher ce rêve', 'Cette action supprimera ce rêve du stockage local.', () => {
      remove(dream.id);
      router.replace('/my-space');
    });
  const togglePause = () =>
    growth &&
    confirmAction(
      dream.paused ? 'Réveiller la plante' : 'Mettre la plante en hiver',
      'Une plante en hiver doit être masquée lors de la publication publique.',
      () => update(dream.id, 'paused', !dream.paused),
    );
  const choosePhoto = () =>
    pickDreamImage(
      uri => {
        update(dream.id, 'image', uri);
        setEditingImage(false);
      },
      message => Alert.alert('Image', message),
    );
  const addNeed = () => {
    const text = needDraft.trim();
    if (!text || dream.needs.includes(text)) return;
    update(dream.id, 'needs', [...dream.needs, text]);
    setNeedDraft('');
  };
  const removeNeed = (n: string) =>
    update(
      dream.id,
      'needs',
      dream.needs.filter(v => v !== n),
    );
  const toggleNeed = (n: string) => {
    const previous = dream.resolvedNeeds || [];
    update(
      dream.id,
      'resolvedNeeds',
      previous.includes(n) ? previous.filter(v => v !== n) : [...previous, n],
    );
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <Image
        pointerEvents="none"
        source={{ uri: dream.image }}
        resizeMode="cover"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          opacity: 0.075,
        }}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 10,
          paddingBottom: 48,
          maxWidth: 780,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Pressable onPress={() => router.back()} accessibilityLabel="Retour">
            <Ionicons name="chevron-back" size={25} color={theme.foreground} />
          </Pressable>
          {!flower ? (
            <Pressable
              onPress={() => setEditingImage(v => !v)}
              accessibilityLabel="Changer mon image"
            >
              <Ionicons name="image-outline" size={24} color={theme.foreground} />
            </Pressable>
          ) : (
            <TopActions />
          )}
        </View>
        <Text
          style={{
            fontSize: 23,
            fontWeight: '800',
            textAlign: 'center',
            marginTop: 10,
            color: theme.foreground,
          }}
        >
          {dream.title}
        </Text>
        <Text
          style={{
            fontSize: 12,
            textAlign: 'center',
            marginTop: 3,
            marginBottom: 15,
            color: PHASE_COLORS[phase].foreground,
          }}
        >
          {PHASE_LABELS[phase]}
        </Text>
        <View
          style={{ borderRadius: 14, backgroundColor: PHASE_COLORS[phase].background, padding: 11 }}
        >
          <View style={{ height: 190, overflow: 'hidden', borderRadius: 10 }}>
            <Image
              source={{ uri: dream.image }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </View>
        </View>
        {editingImage && !flower ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 12,
              padding: 12,
              marginTop: 12,
              backgroundColor: '#fff',
            }}
          >
            <OutlineButton label="Importer une image" onPress={choosePhoto} />
            <Text style={{ fontSize: 12, marginTop: 14, color: '#666' }}>
              Ou utiliser une image intégrée
            </Text>
            <View style={{ flexDirection: 'row', gap: 9, marginTop: 10 }}>
              {defaults.map(url => (
                <Pressable
                  key={url}
                  onPress={() => {
                    update(dream.id, 'image', url);
                    setEditingImage(false);
                  }}
                >
                  <Image
                    source={{ uri: url }}
                    style={{ width: 100, height: 70, borderRadius: 9 }}
                  />
                </Pressable>
              ))}
            </View>
            <Text style={{ fontSize: 10, marginTop: 8, color: '#888' }}>
              L'import local est disponible sur le web ; le sélecteur mobile natif sera ajouté
              ensuite.
            </Text>
          </View>
        ) : null}
        <Pressable
          onPress={() => setParticipantsOpen(v => !v)}
          style={{
            flexDirection: 'row',
            gap: 8,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 12,
          }}
        >
          <Ionicons name="people-outline" size={18} color="#777" />
          <Text style={{ fontSize: 12, color: theme.muted }}>Qui partage mon rêve ?</Text>
          <Ionicons
            name={participantsOpen ? 'chevron-up' : 'chevron-down'}
            size={16}
            color="#888"
          />
        </Pressable>
        {participantsOpen ? (
          <View
            style={{
              borderWidth: 1,
              borderColor: '#eee',
              borderRadius: 10,
              padding: 12,
              backgroundColor: '#fff',
            }}
          >
            <Text style={{ fontSize: 12 }}>Participants actuels : {dream.ownerIds.join(', ')}</Text>
            <Text style={{ fontSize: 11, color: '#888', marginTop: 6 }}>
              Invitations et rôles seront reliés aux comptes après l'intégration du backend.
            </Text>
          </View>
        ) : null}
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 14,
            padding: 15,
            borderWidth: 1,
            borderColor: '#eee',
            marginTop: 8,
          }}
        >
          <Label>Mon but</Label>
          {flower ? (
            <Text style={{ fontSize: 13, color: '#555', lineHeight: 20 }}>{dream.summary}</Text>
          ) : (
            <TextInput
              multiline
              editable={editable}
              value={dream.summary}
              onChangeText={v => update(dream.id, 'summary', v)}
              placeholder="Quel résultat est-ce que je souhaite atteindre ?"
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 9,
                padding: 11,
                minHeight: 70,
                color: '#222',
              }}
            />
          )}
          <Label>Ma motivation</Label>
          {flower ? (
            <Text style={{ fontSize: 13, color: '#555', lineHeight: 20 }}>
              {dream.motivation || 'Non renseignée'}
            </Text>
          ) : (
            <TextInput
              multiline
              value={dream.motivation || ''}
              onChangeText={v => update(dream.id, 'motivation', v)}
              placeholder="Pourquoi ce rêve compte-t-il pour moi ?"
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 9,
                padding: 11,
                minHeight: 65,
                color: '#222',
              }}
            />
          )}
          {(germ || growth || flower) && (
            <>
              <Label>Date objectif</Label>
              {flower ? (
                <Text style={{ fontSize: 13, color: '#555' }}>
                  {dream.goalDate || 'Aucune date'}
                </Text>
              ) : (
                <TextInput
                  value={dream.goalDate || ''}
                  onChangeText={v => update(dream.id, 'goalDate', v)}
                  placeholder="AAAA-MM-JJ"
                  style={{
                    borderWidth: 1,
                    borderColor: '#ddd',
                    borderRadius: 9,
                    padding: 11,
                    color: '#222',
                  }}
                />
              )}
            </>
          )}
          {!flower && (
            <>
              <Label>De ce que j’ai besoin</Label>
              {dream.needs.map(n => (
                <View
                  key={n}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 6,
                    padding: 9,
                    borderRadius: 9,
                    backgroundColor: (dream.resolvedNeeds || []).includes(n)
                      ? '#E5F5EC'
                      : '#FFF2E9',
                  }}
                >
                  <Pressable
                    onPress={() => toggleNeed(n)}
                    accessibilityLabel={'Marquer le besoin ' + n}
                  >
                    <Ionicons
                      name={
                        (dream.resolvedNeeds || []).includes(n)
                          ? 'checkmark-circle'
                          : 'ellipse-outline'
                      }
                      size={23}
                      color={(dream.resolvedNeeds || []).includes(n) ? '#39785A' : '#C4833E'}
                    />
                  </Pressable>
                  <Text style={{ flex: 1, fontSize: 12, color: '#333' }}>{n}</Text>
                  {editable ? (
                    <Pressable onPress={() => removeNeed(n)} accessibilityLabel={'Retirer ' + n}>
                      <Ionicons name="close" size={17} color="#777" />
                    </Pressable>
                  ) : null}
                </View>
              ))}
              {editable ? (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <TextInput
                    value={needDraft}
                    onChangeText={setNeedDraft}
                    placeholder="Ajouter un besoin..."
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: '#ddd',
                      borderRadius: 8,
                      padding: 9,
                    }}
                  />
                  <Pressable onPress={addNeed} style={{ padding: 9, justifyContent: 'center' }}>
                    <Ionicons name="add-circle-outline" size={26} color="#252525" />
                  </Pressable>
                </View>
              ) : null}
            </>
          )}
          {flower ? (
            <>
              <Label>Ma floraison</Label>
              <Text style={{ fontSize: 13, color: '#555', lineHeight: 21 }}>
                {dream.testimony?.comment || 'Témoignage non disponible'}
              </Text>
              {dream.testimony?.mediaItems?.map((m, i) => (
                <View
                  key={i}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 9 }}
                >
                  {m.kind === 'photo' ? (
                    <Image
                      source={{ uri: m.uri }}
                      style={{ width: 76, height: 65, borderRadius: 9 }}
                    />
                  ) : (
                    <Ionicons
                      name={
                        m.kind === 'video'
                          ? 'videocam-outline'
                          : m.kind === 'audio'
                            ? 'musical-note-outline'
                            : 'document-outline'
                      }
                      size={23}
                    />
                  )}
                  <Text numberOfLines={1} style={{ flex: 1, fontSize: 12 }}>
                    {m.name}
                  </Text>
                </View>
              ))}
            </>
          ) : (
            <>
              <Label>
                {growth ? 'Journal de croissance' : seed ? 'Mes notes' : 'Notes et projets'}
              </Label>
              {[...dream.additions, ...dream.notes].map((note, i) => (
                <View
                  key={i}
                  style={{ flexDirection: 'row', alignItems: 'stretch', gap: 10, marginTop: 8 }}
                >
                  <View style={{ alignItems: 'center', width: 23 }}>
                    <Ionicons
                      name={growth ? 'leaf' : 'document-text-outline'}
                      size={20}
                      color={growth ? '#51A27E' : '#999'}
                    />
                    {growth ? (
                      <View
                        style={{ width: 2, flex: 1, minHeight: 17, backgroundColor: '#A5D8B8' }}
                      />
                    ) : null}
                  </View>
                  <Text
                    style={{
                      fontSize: 12,
                      padding: 11,
                      flex: 1,
                      backgroundColor: '#F5F5F5',
                      borderRadius: 8,
                      color: '#444',
                    }}
                  >
                    {note}
                  </Text>
                </View>
              ))}
              <TextInput
                multiline
                value={entry}
                onChangeText={setEntry}
                placeholder={
                  growth
                    ? 'Raconter une nouvelle étape...'
                    : seed
                      ? 'Mes notes…'
                      : 'Ajouter une note...'
                }
                style={{
                  borderWidth: 1,
                  borderColor: '#ddd',
                  borderRadius: 9,
                  padding: 11,
                  minHeight: 63,
                  marginTop: 12,
                  color: '#222',
                }}
              />
              <OutlineButton
                label={growth ? 'Ajouter une feuille à mon journal' : 'Ajouter à mes notes'}
                onPress={() => {
                  if (entry.trim()) {
                    add(dream.id, entry.trim(), growth ? 'notes' : 'additions');
                    setEntry('');
                  }
                }}
              />
            </>
          )}
        </View>
        <View style={{ marginTop: 14 }}>
          {seed ? (
            <>
              <OutlineButton label="Planter cette semence" onPress={() => advance(dream.id)} />
              <OutlineButton label="Arracher cette semence" danger onPress={deleteDream} />
            </>
          ) : null}
          {germ ? (
            <>
              <OutlineButton
                label="Chercher des talents"
                onPress={() => router.push('/discover?filter=Talents')}
              />
              <OutlineButton label="Faire grandir cette plante" onPress={() => advance(dream.id)} />
              <OutlineButton label="Arracher ce germe" danger onPress={deleteDream} />
            </>
          ) : null}
          {growth ? (
            <>
              <OutlineButton
                label="Admirer les fleurs de cette plante"
                onPress={() =>
                  router.push({ pathname: '/my-dream/flower/[id]', params: { id: dream.id } })
                }
              />
              <OutlineButton
                label={dream.paused ? 'Réveiller cette plante' : 'C’est l’hiver pour cette plante'}
                onPress={togglePause}
              />
              <OutlineButton label="Arracher cette plante" danger onPress={deleteDream} />
            </>
          ) : null}
          {flower ? (
            <OutlineButton label="Arracher cette fleur" danger onPress={deleteDream} />
          ) : null}
        </View>
        <Text style={{ fontSize: 10, color: theme.muted, marginTop: 22 }}>
          Données enregistrées localement sur cet appareil. Collaboration publique et
          synchronisation après la connexion du backend.
        </Text>
      </ScrollView>
      <Nav />
    </SafeAreaView>
  );
}
