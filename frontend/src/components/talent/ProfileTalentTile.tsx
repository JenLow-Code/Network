import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TalentArt, type TalentIllustration } from '@/components/talent/TalentArt';
import { TalentLevelDots } from '@/components/talent/TalentLevelDots';
import { useAppTheme } from '@/theme/AppTheme';

/** Reused by public and owner profiles: only content and action differ. */
export function ProfileTalentTile({
  title,
  level,
  subtitle,
  art,
  width,
  onPress,
}: {
  title: string;
  level: string;
  subtitle?: string;
  art?: TalentIllustration;
  width: number;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title + ', niveau ' + level + ', ouvrir le détail'}
      onPress={onPress}
      style={{
        width,
        aspectRatio: 1,
        borderRadius: 8,
        backgroundColor: theme.dark ? '#25272C' : '#F0EDE8',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 9,
        gap: 5,
      }}
    >
      {art ? <TalentArt kind={art} size={Math.min(110, width * (subtitle ? .49 : .64))} /> :
        <Ionicons name={title.toLocaleLowerCase('fr')==='traducteur'?'language-outline':'person-outline'}
          size={Math.min(95, width * (subtitle ? .40 : .52))} color={theme.foreground}/>}
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}
        style={{ color: theme.foreground, fontSize: 11, fontWeight: '800', letterSpacing: 0.7 }}>
        {title.toLocaleUpperCase('fr')}
      </Text>
      {subtitle ? <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.7}
        style={{color:theme.muted,fontSize:9,textAlign:'center'}}>{subtitle}</Text> : null}
      <TalentLevelDots level={level} size={width < 112 ? 6 : 8} spacing={4} />
    </Pressable>
  );
}
