import React from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { psalm150, biblePosts } from '@/mocks/publications';
import { PublicationDetail } from '@/components/publication/PublicationDetail';
import { useAppTheme } from '@/theme/AppTheme';

/**
 * Read the whole chapter in the page's ONE scroll area.
 *
 * Previously a second fixed-height scroll view, an opaque top fade and automatic
 * centering hid the opening verses. The detail cover already highlights the
 * shared verse; below it, the complete chapter should be readable from verse 1.
 */
export default function Bible() {
  const { verse } = useLocalSearchParams<{ reference: string; verse?: string }>();
  const focus = Math.max(1, Math.min(psalm150.length, Number(verse || 6) || 6));
  const post = biblePosts.find(p => p.highlightedVerse === focus) || biblePosts[0];
  const theme = useAppTheme();

  return (
    <PublicationDetail item={post}>
      <View>
        <View style={{ paddingBottom: 19 }}>
          <Text
            accessibilityRole="header"
            style={{ fontFamily: 'serif', fontSize: 28, lineHeight: 34, color: theme.foreground }}
          >
            Psaume 150
          </Text>
          <Text
            style={{
              fontSize: 11,
              letterSpacing: 1.2,
              marginTop: 4,
              color: theme.muted,
            }}
          >
            LOUIS SEGOND 1910 · CHAPITRE COMPLET
          </Text>
        </View>
        <View style={{ gap: 5 }}>
          {psalm150.map((v, i) => {
            const selected = i + 1 === focus;
            return (
              <View
                key={i}
                accessibilityLabel={'Verset ' + (i + 1) + (selected ? ', sélectionné' : '')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 11,
                  paddingVertical: 12,
                  paddingHorizontal: 11,
                  backgroundColor: selected ? (theme.dark ? '#3A2733' : '#F7E7EE') : 'transparent',
                  borderRadius: selected ? 7 : 0,
                }}
              >
                <Text
                  style={{
                    minWidth: 16,
                    fontSize: 12,
                    lineHeight: 24,
                    color: selected ? '#CB245C' : theme.muted,
                  }}
                >
                  {i + 1}
                </Text>
                <Text
                  selectable
                  style={{
                    flex: 1,
                    fontFamily: 'serif',
                    fontSize: 17,
                    lineHeight: 26,
                    fontWeight: selected ? '600' : '400',
                    color: selected ? (theme.dark ? '#FF86AE' : '#B71D53') : theme.foreground,
                  }}
                >
                  {v}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </PublicationDetail>
  );
}
