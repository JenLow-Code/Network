import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { biblePosts, psalm150 } from '@/mocks/publications';
import { DetailAuthorHeader } from '@/components/detail/DetailAuthorHeader';
import { ActionRail } from '@/components/detail/ActionRail';
import { Nav } from '@/components/navigation/Nav';
import { useAppTheme } from '@/theme/AppTheme';

const SLOT = 156;
const WINDOW = 3;
/** No verse zero, no lead padding, no giant empty space. */
export default function Bible() {
  const { verse } = useLocalSearchParams<{ reference: string; verse?: string }>();
  const shared = Math.max(1, Math.min(psalm150.length, Number(verse || 6) || 6));
  const first = Math.max(0, Math.min(shared - 2, psalm150.length - WINDOW));
  const [reading, setReading] = useState(Math.min(psalm150.length, first + 2));
  const scroller = useRef<ScrollView>(null);
  const theme = useAppTheme();
  const post = biblePosts.find(p => p.highlightedVerse === shared) || biblePosts[0];

  useEffect(() => {
    scroller.current?.scrollTo({ y: first * SLOT, animated: false });
  }, [first]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const top = Math.max(0, event.nativeEvent.contentOffset.y);
    const middle = Math.round(top / SLOT) + 2;
    setReading(Math.max(1, Math.min(psalm150.length, middle)));
  };
  const colorOf = (n: number) =>
    n === shared ? (theme.dark ? '#FF86AE' : '#CB245C')
    : n === reading ? theme.foreground
    : (theme.dark ? '#99918B' : '#A39B93');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flex: 1, maxWidth: 760, width: '100%', alignSelf: 'center' }}>
        <DetailAuthorHeader item={post} />
        <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 13 }}>
          <Text accessibilityRole="header" style={{ fontFamily: 'serif', fontSize: 31, lineHeight: 40, color: theme.foreground }}>
            Psaume 150
          </Text>
          <Text style={{ color: theme.muted, fontSize: 10, letterSpacing: 1.4 }}>LOUIS SEGOND 1910</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'flex-start' }}>
          <ScrollView
            ref={scroller}
            style={{ flexGrow: 0, height: WINDOW * SLOT }}
            contentContainerStyle={{ paddingHorizontal: 19, paddingRight: 73 }}
            showsVerticalScrollIndicator={false}
            snapToInterval={SLOT}
            decelerationRate="fast"
            scrollEventThrottle={16}
            onScroll={onScroll}
            onContentSizeChange={() => scroller.current?.scrollTo({ y: first * SLOT, animated: false })}
          >
            {psalm150.map((text, i) => {
              const n = i + 1;
              return (
                <View
                  key={n}
                  style={{ height: SLOT, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                  accessibilityLabel={'Verset ' + n + (n === shared ? ', partagé' : '')}
                >
                  <Text style={{ width: 16, color: colorOf(n), fontSize: 12 }}>{n}</Text>
                  <Text
                    selectable
                    adjustsFontSizeToFit
                    minimumFontScale={0.77}
                    style={{ flex: 1, fontFamily: 'serif', fontSize: n === reading ? 19 : 17, lineHeight: 26, color: colorOf(n) }}
                  >
                    {text}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
        <View pointerEvents="box-none" style={{ position: 'absolute', right: 12, bottom: 12 }}>
          <ActionRail item={post} />
        </View>
      </View>
      <Nav />
    </SafeAreaView>
  );
}
