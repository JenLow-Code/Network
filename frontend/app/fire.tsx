import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { Nav } from '@/components/navigation/Nav';
import { TopActions } from '@/components/navigation/TopActions';
import { publications } from '@/mocks/publications';
import { PublicationGallery } from '@/components/publication/PublicationGallery';
import { useAppTheme } from '@/theme/AppTheme';
export default function FireList() {
  const theme = useAppTheme();
  const { fireIds, fireFolders, createFireFolder, renameFireFolder, deleteFireFolder, toggleFireFolderItem } = useApp();
  const [folderName, setFolderName] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [query, setQuery] = useState('');
  const items = publications.filter(
    p =>
      fireIds.includes(p.id) &&
      (!selectedFolder || fireFolders.find(f => f.id === selectedFolder)?.publicationIds.includes(p.id)) &&
      [p.title, p.author].join(' ').toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 35 }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 9,
            marginBottom: 11,
          }}
        >
          <View />
          <TopActions />
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 14 }}>
          <Ionicons name="flame" size={26} color="#D71D77" />
          <Text style={{ fontSize: 28, fontWeight: '700', color: theme.foreground }}>
            Ma liste Fire
          </Text>
        </View>
        <Text style={{ fontSize: 12, color: '#777', marginBottom: 14 }}>
          Les publications qui t'inspirent, indépendamment de tes rêves.
        </Text>
        <View
          style={{
            borderWidth: 1,
            borderColor: '#eee',
            borderRadius: 10,
            paddingHorizontal: 12,
            height: 42,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginBottom: 18,
          }}
        >
          <Ionicons name="search" size={18} color="#777" />
          <TextInput
            placeholder="Rechercher dans Fire"
            value={query}
            onChangeText={setQuery}
            style={{ flex: 1, fontSize: 13 }}
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <TextInput
            accessibilityLabel="Nom du nouveau dossier"
            value={folderName}
            onChangeText={setFolderName}
            placeholder="Nouveau dossier (ex. Playlist)"
            style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.border, borderRadius: 9, color: theme.foreground }}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Créer le dossier" disabled={!folderName.trim()} onPress={() => { createFireFolder(folderName); setFolderName(''); }} style={{ padding: 11, opacity: folderName.trim() ? 1 : 0.4 }}>
            <Ionicons name="folder-open-outline" size={23} color={theme.foreground} />
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ alignItems: 'center', gap: 8 }}>
          <Pressable onPress={() => setSelectedFolder(null)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: selectedFolder === null ? '#F4DCE6' : theme.surface }}>
            <Text style={{ color: theme.foreground, fontSize: 12 }}>Tous</Text>
          </Pressable>
          {fireFolders.map(folder => (
            <Pressable key={folder.id} onPress={() => setSelectedFolder(folder.id)} onLongPress={() => { setRenaming(folder.id); setEditName(folder.name); }}
              style={{ flexDirection: 'row', gap: 5, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: selectedFolder === folder.id ? '#F4DCE6' : theme.surface }}>
              <Ionicons name="folder-outline" size={14} color={theme.foreground}/>
              <Text style={{ color: theme.foreground, fontSize: 12 }}>{folder.name} ({folder.publicationIds.filter(id => fireIds.includes(id)).length})</Text>
            </Pressable>
          ))}
        </ScrollView>
        {selectedFolder && <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14, alignItems: 'center' }}>
          {renaming === selectedFolder ? (
            <>
              <TextInput value={editName} onChangeText={setEditName} style={{ flex: 1, color: theme.foreground, borderBottomWidth: 1, borderColor: theme.border }} />
              <Pressable onPress={() => { renameFireFolder(selectedFolder, editName); setRenaming(null); }}><Text style={{ color: '#CB245C' }}>Enregistrer</Text></Pressable>
            </>
          ) : (
            <Pressable onPress={() => { setRenaming(selectedFolder); setEditName(fireFolders.find(f => f.id === selectedFolder)?.name || ''); }}>
              <Text style={{ color: theme.muted, fontSize: 12 }}>Renommer</Text>
            </Pressable>
          )}
          <Pressable onPress={() => Alert.alert('Supprimer le dossier ?', 'Les publications restent dans Fire.', [{ text: 'Annuler', style: 'cancel' }, { text: 'Supprimer', style: 'destructive', onPress: () => { deleteFireFolder(selectedFolder); setSelectedFolder(null); } }])}>
            <Text style={{ color: '#B71D53', fontSize: 12 }}>Supprimer</Text>
          </Pressable>
        </View>}
        {fireFolders.length > 0 && !selectedFolder && fireIds.length > 0 && (
          <View style={{ marginBottom: 17, gap: 8 }}>
            <Text style={{ fontSize: 11, color: theme.muted }}>Classer mes publications Fire</Text>
            {publications.filter(p => fireIds.includes(p.id)).map(p => (
              <View key={p.id} style={{ gap: 5, marginBottom: 5 }}>
                <Text style={{ fontSize: 12, color: theme.foreground }} numberOfLines={1}>{p.title}</Text>
                <ScrollView horizontal contentContainerStyle={{ gap: 6 }}>
                  {fireFolders.map(folder => {
                    const belongs = folder.publicationIds.includes(p.id);
                    return <Pressable key={folder.id} onPress={() => toggleFireFolderItem(folder.id, p.id)}
                      accessibilityLabel={(belongs ? 'Retirer de ' : 'Ajouter à ') + folder.name}
                      style={{ paddingVertical: 6, paddingHorizontal: 9, borderRadius: 14, backgroundColor: belongs ? '#F4DCE6' : theme.surface, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Ionicons name={belongs ? 'checkmark-circle' : 'add-circle-outline'} size={14} color={belongs ? '#CB245C' : theme.foreground} />
                      <Text style={{ fontSize: 11, color: theme.foreground }}>{folder.name}</Text>
                    </Pressable>;
                  })}
                </ScrollView>
              </View>
            ))}
          </View>
        )}
        {items.length ? (
          <PublicationGallery items={items} />
        ) : (
          <View style={{ marginTop: 70, alignItems: 'center', gap: 10 }}>
            <Ionicons name="flame-outline" size={45} color="#aaa" />
            <Text style={{ color: '#888' }}>Aucune publication dans cette liste.</Text>
          </View>
        )}
      </ScrollView>
      <Nav />
    </SafeAreaView>
  );
}
