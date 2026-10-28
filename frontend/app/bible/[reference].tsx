import React, { useId, useRef, useState } from 'react';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { ScrollView, Text, View, type ScrollViewInstance } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { psalm150, biblePosts } from '@/mocks/publications';
import { PublicationDetail } from '@/components/publication/PublicationDetail';
const READER_HEIGHT = 340;
const TOP_FADE_HEIGHT = 94;
const VERSE_ZERO_SPACER = TOP_FADE_HEIGHT + 8; // Empty, unnumbered space above verse 1 so its text stays readable beneath the fixed fade.
export default function Bible() {
  const { verse } = useLocalSearchParams<{ reference: string; verse?: string }>();
  const focus = Math.max(1, Math.min(psalm150.length, Number(verse || 6) || 6));
  const post = biblePosts.find(p => p.highlightedVerse === focus) || biblePosts[0];
  const inner = useRef<ScrollViewInstance>(null);
  const positions = useRef<Record<number, { y: number; height: number }>>({});
  const [ready, setReady] = useState(false);
  const fadeId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const centre = () => {
    const pos = positions.current[focus];
    if (pos)
      inner.current?.scrollTo({
        y: Math.max(0, pos.y + pos.height / 2 - READER_HEIGHT / 2),
        animated: false,
      });
  };
  return (
    <PublicationDetail item={post}>
      <View style={{ height: READER_HEIGHT, position: 'relative' }}>
        <ScrollView
          ref={inner}
          nestedScrollEnabled
          showsVerticalScrollIndicator
          style={{ height: READER_HEIGHT }}
          contentContainerStyle={{ gap: 6, paddingRight: 6, paddingBottom: 16 }}
          onContentSizeChange={() => {
            if (!ready) {
              centre();
              setReady(true);
            }
          }}
        >
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{ height: VERSE_ZERO_SPACER }}
          />
          {psalm150.map((v, i) => (
            <View
              key={i}
              onLayout={e => {
                positions.current[i + 1] = e.nativeEvent.layout;
                if (i === psalm150.length - 1) requestAnimationFrame(centre);
              }}
              style={{
                flexDirection: 'row',
                gap: 9,
                borderRadius: 7,
                padding: 10,
                backgroundColor: i + 1 === focus ? '#F7E9F0' : 'rgba(255,252,245,0.68)',
              }}
            >
              <Text style={{ fontSize: 11, color: i + 1 === focus ? '#CB245C' : '#777' }}>
                {i + 1}
              </Text>
              <Text
                style={{
                  flex: 1,
                  fontSize: 15,
                  lineHeight: 21,
                  color: i + 1 === focus ? '#CB245C' : '#333',
                  fontWeight: i + 1 === focus ? '700' : '400',
                }}
              >
                {v}
              </Text>
            </View>
          ))}
        </ScrollView>
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 6, height: TOP_FADE_HEIGHT }}
        >
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id={fadeId} x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#D0D0CE" stopOpacity={0.97} />
                <Stop offset="55%" stopColor="#D0D0CE" stopOpacity={0.62} />
                <Stop offset="100%" stopColor="#D0D0CE" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={`url(#${fadeId})`} />
          </Svg>
        </View>
      </View>
    </PublicationDetail>
  );
}
