import React, { useCallback, useRef, useState } from 'react';
import { ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { psalm150, biblePosts } from '@/mocks/publications';
import { DetailAuthorHeader } from '@/components/detail/DetailAuthorHeader';
import { ActionRail } from '@/components/detail/ActionRail';
import { Nav } from '@/components/navigation/Nav';
import { useAppTheme } from '@/theme/AppTheme';

type MeasuredVerse = { y: number; height: number };

/** Continuous, compact reading window. Focus follows the verse closest to its centre. */
export default function Bible() {
  const { verse } = useLocalSearchParams<{ reference: string; verse?: string }>();
  const initial = Math.max(1, Math.min(psalm150.length, Number(verse || 6) || 6));
  const [focused, setFocused] = useState(initial);
  const [readerHeight, setReaderHeight] = useState(0);
  const positions = useRef<Record<number, MeasuredVerse>>({});
  const scroller = useRef<ScrollView>(null);
  const laidOut = useRef(false);
  const theme = useAppTheme();
  const post = biblePosts.find(p => p.highlightedVerse === initial) || biblePosts[0];

  const scrollToVerse = useCallback((n: number, animated: boolean) => {
    const target = positions.current[n];
    if (!target || !readerHeight) return;
    scroller.current?.scrollTo({
      y: Math.max(0, target.y + target.height / 2 - readerHeight / 2),
      animated,
    });
  }, [readerHeight]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const centre = e.nativeEvent.contentOffset.y + readerHeight / 2;
    let nearest = focused, distance = Infinity;
    for (let i = 1; i <= psalm150.length; i++) {
      const pos = positions.current[i];
      if (!pos) continue;
      const d = Math.abs(pos.y + pos.height / 2 - centre);
      if (d < distance) { distance = d; nearest = i; }
    }
    if (nearest !== focused) setFocused(nearest);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flex: 1, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
        <DetailAuthorHeader item={post} />
        <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12 }}>
          <Text accessibilityRole="header" style={{ fontFamily: 'serif', fontSize: 31, lineHeight: 40, color: theme.foreground }}>
            Psaume 150
          </Text>
          <Text style={{ color: theme.muted, fontSize: 10, letterSpacing: 1.4 }}>LOUIS SEGOND 1910</Text>
        </View>
        <View style={{ flex: 1, position: 'relative' }}>
          <View
            style={{ flex: 1, maxHeight: 470, justifyContent: 'center' }}
            onLayout={e => {
              const h = e.nativeEvent.layout.height;
              if (Math.abs(h - readerHeight) > 1) { laidOut.current = false; setReaderHeight(h); }
            }}
          >
            <ScrollView
              ref={scroller}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={onScroll}
              onContentSizeChange={() => {
                if (!laidOut.current && Object.keys(positions.current).length === psalm150.length && readerHeight > 0) {
                  laidOut.current = true;
                  scrollToVerse(initial, false);
                }
              }}
              contentContainerStyle={{ paddingHorizontal: 19, paddingRight: 75, paddingVertical: readerHeight / 2 }}
            >
              {psalm150.map((text, index) => {
                const n = index + 1, active = n === focused;
                return (
                  <View
                    key={n}
                    onLayout={e => {
                      positions.current[n] = e.nativeEvent.layout;
                      if (n === psalm150.length && !laidOut.current) {
                        laidOut.current = true;
                        requestAnimationFrame(() => scrollToVerse(initial, false));
                      }
                    }}
                    style={{ paddingVertical: 20, flexDirection: 'row', alignItems: 'flex-start', gap: 11 }}
                  >
                    <Text style={{ width: 16, fontSize: 12, lineHeight: 27, color: active ? '#CB245C' : '#AAA29A' }}>{n}</Text>
                    <Text
                      selectable
                      style={{
                        flex: 1, fontFamily: 'serif', fontSize: active ? 20 : 17,
                        lineHeight: active ? 29 : 26,
                        color: active ? (theme.dark ? '#FF86AE' : '#CB245C') : (theme.dark ? '#9B9692' : '#A39B93'),
                      }}
                    >
                      {text}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
          <View pointerEvents="box-none" style={{ position: 'absolute', bottom: 14, right: 12 }}>
            <ActionRail item={post} />
          </View>
        </View>
      </View>
      <Nav />
    </SafeAreaView>
  );
}
