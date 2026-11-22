import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MusicCassetteDraft } from './MusicCassetteDraft';
import { MusicParticipantBadges, type MusicCollaborator } from './MusicCollaboratorAvatars';
import { CassetteArtwork } from '@/components/publication/PublicationGallery';
import { MusicAudioPreview } from './MusicAudioPreview';
import { useAppTheme } from '@/theme/AppTheme';

type MusicTileProps = {
  title: string;
  byline: string;
  detail?: string;
  width: number;
  mode: 'draft' | 'cassette';
  layout?: 'cards' | 'list';
  participants?: MusicCollaborator[];
  artwork?: string;
  audioUrl?: string;
  demo?: boolean;
  status?: string;
  onPress?: () => void;
};

/**
 * One musical item, independent of project ownership.
 * Only the work's state changes the illustration: editable workspace = blueprint;
 * published/shared opportunity = the full photographic Discovery cassette.
 * Participants appear on the SAME tile, never in a separate collaboration section.
 */
export function MusicTile({
  title, byline, detail, width, mode, layout = 'cards', participants = [],
  artwork, audioUrl, demo = false, status, onPress,
}: MusicTileProps) {
  const theme = useAppTheme();
  const [audioOpen, setAudioOpen] = useState(false);
  const listed = layout === 'list';
  const imageWidth = listed ? 78 : width;
  const imageHeight = listed ? 78 : width;
  const surface = theme.dark ? '#332D32' : mode === 'draft' ? '#E6DACB' : '#EFE9E2';
  const secondary = theme.dark ? '#D6D0D3' : '#514943';
  const playAvailable = !!audioUrl && !demo;

  const visual = <View style={{
    width: imageWidth, height: imageHeight, borderRadius: listed ? 11 : 15,
    overflow: 'hidden', backgroundColor: surface,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  }}>
    {mode === 'draft'
      ? <MusicCassetteDraft width={imageWidth} variant="tile"/>
      : <CassetteArtwork width={imageWidth} height={imageHeight}
          title={title} artwork={artwork} transparent/>}
    {participants.length > 0 ? <View pointerEvents="none" style={{
      position: 'absolute', right: 8, bottom: 9,
    }}>
      <MusicParticipantBadges people={participants} size={listed ? 23 : 31}/>
    </View> : null}
    {demo ? <View pointerEvents="none" style={{
      position: 'absolute', left: 8, top: 8, borderRadius: 10,
      backgroundColor: theme.dark ? '#272126' : '#FFFCF5',
      paddingHorizontal: 8, paddingVertical: 4,
    }}>
      <Text style={{fontSize:9,letterSpacing:0.8,fontWeight:'800',
        color:theme.foreground}}>DÉMO</Text>
    </View> : null}
  </View>;

  return <View style={{ width: listed ? '100%' : width, gap: 6 }}>
    <Pressable disabled={demo || !onPress} onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={(demo ? 'Exemple : ' : 'Ouvrir le morceau ') + title}
      style={listed
        ? { flexDirection:'row',alignItems:'center',gap:12,width:'100%',
          borderBottomWidth:1,borderBottomColor:theme.border,paddingVertical:8 }
        : { width:'100%',gap:9,alignItems:'stretch' }}>
      {visual}
      <View style={{ flex: listed ? 1 : undefined, minWidth:0, gap:4,
        paddingHorizontal:listed ? 0 : 2 }}>
        <Text numberOfLines={listed ? 1 : 2}
          style={{fontSize:listed?14:14,fontWeight:'700',
            color:theme.foreground,lineHeight:19}}>{title}</Text>
        <Text numberOfLines={1} style={{fontSize:11,color:secondary,
          fontWeight:'500'}}>{byline}</Text>
        {detail ? <Text numberOfLines={1} style={{fontSize:10,
          color:theme.muted}}>{detail}</Text> : null}
        {status ? <Text numberOfLines={1} style={{fontSize:10,color:'#C6235D',
          fontWeight:'700'}}>{status}</Text> : null}
      </View>
      {listed && !demo ? <Ionicons name="chevron-forward-outline"
        size={17} color={theme.foreground}/> : null}
    </Pressable>
    {playAvailable ? <View style={{paddingHorizontal:2,gap:6}}>
      <Pressable onPress={() => setAudioOpen(prev => !prev)}
        accessibilityRole="button"
        accessibilityLabel={audioOpen ? 'Masquer le lecteur' : 'Écouter ' + title}
        style={{flexDirection:'row',alignItems:'center',gap:5,minHeight:30}}>
        <Ionicons name={audioOpen?'chevron-up-circle-outline':'play-circle-outline'}
          size={19} color="#CB245C"/>
        <Text style={{color:theme.foreground,fontSize:11,fontWeight:'700'}}>
          {audioOpen ? 'Masquer le lecteur' : 'Écouter'}
        </Text>
      </Pressable>
      {audioOpen ? <MusicAudioPreview source={{audioUrl}}/> : null}
    </View> : null}
  </View>;
}
