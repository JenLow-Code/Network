import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Publication } from '@/domain/publication';
import { personPath } from '@/mocks/people';
import { TopActions } from '@/components/navigation/TopActions';
import { useAppTheme } from '@/theme/AppTheme';

/**
 * The contribution belongs to a person rather than a branded article.
 * Real uploaded avatars display when present; otherwise show initials.
 * Never substitute a generic stock portrait for a member's identity.
 */
export function DetailAuthorHeader({ item }: { item: Publication }) {
  const theme = useAppTheme();
  const initial = item.author.trim().slice(0, 1).toLocaleUpperCase('fr');
  return (
    <View
      style={[
        styles.header,
        { borderBottomColor: theme.dark ? '#55575B' : '#B8B0A6' },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retour"
        onPress={() => router.back()}
        style={styles.side}
      >
        <Ionicons name="arrow-back" size={23} color={theme.foreground} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={'Voir le profil de ' + item.author}
        onPress={() => router.push(personPath(item.author))}
        style={styles.member}
      >
        {item.avatar ? (
          <Image
            source={{ uri: item.avatar }}
            accessibilityLabel={'Avatar de ' + item.author}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: theme.dark ? '#393138' : '#E7DFD5' }]}>
            <Text style={{ color: theme.foreground, fontWeight: '600', fontSize: 14 }}>{initial}</Text>
          </View>
        )}
        <Text numberOfLines={1} style={[styles.author, { color: theme.foreground }]}>
          {item.author}
        </Text>
      </Pressable>
      <TopActions />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    marginHorizontal: 16,
    marginBottom: 19,
  },
  side: { width: 44, height: 44, justifyContent: 'center' },
  member: { flex: 1, minWidth: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9 },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarFallback: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  author: { fontSize: 16, fontFamily: 'serif', lineHeight: 24 },
});
