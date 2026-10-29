import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import { DetailLayout } from '@/components/detail/DetailLayout';
import type { Publication } from '@/domain/publication';
export function DetailPanel({
  title,
  children,
  foldable = false,
  defaultOpen = true,
  hideTopBorder = false,
}: {
  title: string;
  children: React.ReactNode;
  foldable?: boolean;
  defaultOpen?: boolean;
  hideTopBorder?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const theme = useAppTheme();
  return (
    <View
      style={{
        borderTopWidth: hideTopBorder ? 0 : 1,
        borderColor: theme.dark ? '#55575B' : '#D9D2C8',
        paddingVertical: 17,
        paddingLeft: 0,
      }}
    >
      <Pressable
        disabled={!foldable}
        onPress={() => setOpen(v => !v)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 5,
        }}
      >
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.65}
          style={{ fontFamily: 'serif', fontSize: 20, lineHeight: 27, color: theme.foreground, flexShrink: 1 }}
        >
          {title}
        </Text>
        {foldable ? (
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={17} color={theme.foreground} />
        ) : null}
      </Pressable>
      {open ? <View style={{ marginTop: 5 }}>{children}</View> : null}
    </View>
  );
}
export function PublicationDetail({
  item,
  children,
  media,
  headerIcon,
  onCoverPress,
  musicPlaying = false,
}: {
  item: Publication;
  children: React.ReactNode;
  media?: React.ReactNode;
  headerIcon?: React.ReactNode;
  onImageDoubleTap?: () => void;
  onCoverPress?: () => void;
  musicPlaying?: boolean;
}) {
  return (
    <DetailLayout item={item} featured={media} headerIcon={headerIcon} onCoverPress={onCoverPress} musicPlaying={musicPlaying}>
      {children}
    </DetailLayout>
  );
}
