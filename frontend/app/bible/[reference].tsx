import React, { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { psalm150, biblePosts } from '@/mocks/publications';
import { TopActions } from '@/components/navigation/TopActions';
import { Nav } from '@/components/navigation/Nav';
import { ActionRail } from '@/components/detail/ActionRail';
import { useAppTheme } from '@/theme/AppTheme';

/**
 * Bible's detail is a reader, not another publication cover.
 * Every snap page shows the preceding verse, focused verse and following
 * verse. Swipe/scroll vertically to the next focus. No second scroll bar,
 * translucent photograph or hard-coded verse text.
 */
export default function Bible() {
  const { verse } = useLocalSearchParams<{ reference: string; verse?: string }>();
  const initial = Math.max(1, Math.min(psalm150.length, Number(verse || 6) || 6));
  const [focused, setFocused] = useState(initial);
  const [height, setHeight] = useState(0);
  const reader = useRef<ScrollView>(null);
  const theme = useAppTheme();
  const selectedPost = biblePosts.find(p => p.highlightedVerse === focused) || biblePosts[0];
  const atStart = useRef(false);
  const goto = useCallback((next: number, animated = true) => {
    const clamped = Math.max(1, Math.min(psalm150.length, next));
    setFocused(clamped);
    if (height > 0) reader.current?.scrollTo({ y: (clamped - 1) * height, animated });
  }, [height]);
  const changeFocus = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (height <= 0) return;
    const next = Math.max(1, Math.min(psalm150.length, Math.round(e.nativeEvent.contentOffset.y / height) + 1));
    setFocused(next);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{
        maxWidth: 760, width: '100%', alignSelf: 'center', flex: 1, position: 'relative',
      }}>
        <View style={{
          minHeight: 66, flexDirection: 'row', alignItems: 'center', marginHorizontal: 16,
          borderBottomWidth: 0.5, borderBottomColor: theme.dark ? '#55575B' : '#B8B0A6',
        }}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Retour"
            style={{ width: 44, justifyContent: 'center' }}
          >
            <Ionicons name="arrow-back" size={23} color={theme.foreground} />
          </Pressable>
          <Text style={{ flex: 1, textAlign: 'center', fontWeight: '700', letterSpacing: 2.2, fontSize: 12, color: theme.foreground }}>
            JENLOW
          </Text>
          <TopActions />
        </View>

        <View style={{ paddingHorizontal: 24, paddingTop: 22, paddingBottom: 12 }}>
          <Text style={{ fontFamily: 'serif', fontSize: 32, lineHeight: 39, color: theme.foreground }}>
            Psaume 150
          </Text>
          <Text style={{ fontSize: 10, letterSpacing: 1.5, color: theme.muted, marginTop: 4 }}>
            LOUIS SEGOND 1910
          </Text>
          <Text style={{ fontSize: 11, color: theme.muted, marginTop: 9 }}>
            {focused} / {psalm150.length} · Faites défiler pour lire
          </Text>
        </View>

        <View
          style={{ flex: 1 }}
          onLayout={e => {
            const nextHeight = Math.round(e.nativeEvent.layout.height);
            if (nextHeight > 0 && nextHeight !== height) {
              setHeight(nextHeight);
              atStart.current = false;
            }
          }}
        >
          {height > 0 ? (
            <ScrollView
              key={'reader-' + height}
              ref={reader}
              showsVerticalScrollIndicator={false}
              pagingEnabled
              decelerationRate="fast"
              snapToInterval={height}
              nestedScrollEnabled={false}
              onMomentumScrollEnd={changeFocus}
              onScrollEndDrag={changeFocus}
              onContentSizeChange={() => {
                if (!atStart.current) {
                  atStart.current = true;
                  reader.current?.scrollTo({ y: (focused - 1) * height, animated: false });
                }
              }}
            >
              {psalm150.map((_, center) => (
                <View key={center} style={{ height, paddingHorizontal: 22, justifyContent: 'center', paddingBottom: 22 }}>
                  {[-1, 0, 1].map(offset => {
                    const verseIndex = center + offset;
                    const exists = verseIndex >= 0 && verseIndex < psalm150.length;
                    const active = offset === 0;
                    return (
                      <Pressable
                        disabled={!exists || active}
                        onPress={() => goto(verseIndex + 1)}
                        key={offset}
                        style={{
                          minHeight: active ? 128 : 94,
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          justifyContent: 'center',
                          borderRadius: 7,
                          backgroundColor: active ? (theme.dark ? '#3A2733' : '#F7E7EE') : 'transparent',
                        }}
                      >
                        {exists && (
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 9 }}>
                            <Text style={{
                              fontSize: 12, lineHeight: 25, minWidth: 15,
                              color: active ? '#CB245C' : theme.muted,
                            }}>
                              {verseIndex + 1}
                            </Text>
                            <Text
                              style={{
                                flex: 1,
                                fontFamily: 'serif',
                                fontSize: active ? 21 : 17,
                                lineHeight: active ? 30 : 25,
                                color: active
                                  ? (theme.dark ? '#FFA0BC' : '#B71D53')
                                  : (theme.dark ? '#999' : '#98928C'),
                              }}
                            >
                              {psalm150[verseIndex]}
                            </Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          ) : null}
        </View>
        <View pointerEvents="box-none" style={{ position: 'absolute', right: 12, bottom: 14 }}>
          <ActionRail item={selectedPost} />
        </View>
      </View>
      <Nav />
    </SafeAreaView>
  );
}
