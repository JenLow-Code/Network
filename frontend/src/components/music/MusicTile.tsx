import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MusicCassetteDraft } from './MusicCassetteDraft';
import { MusicParticipantBadges, type MusicCollaborator } from './MusicCollaboratorAvatars';
import { CassetteArtwork } from '@/components/publication/PublicationGallery';
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
  onLearnMore?: () => void;
};

/**
 * One musical item, independent of project ownership.
 * Only the work's state changes the illustration: editable workspace = blueprint;
 * published/shared opportunity = the full photographic Discovery cassette.
 * Participants appear on the SAME tile, never in a separate collaboration section.
 */
export function MusicTile({
  title, byline, detail, width, mode, layout = 'cards', participants = [],
  artwork, audioUrl, demo = false, status, onPress, onLearnMore,
}: MusicTileProps) {
  const theme = useAppTheme();
  const listed = layout === 'list';
  const imageWidth = listed ? 78 : width;
  const imageHeight = listed ? 78 : width;
  const surface = theme.dark ? '#332D32' : mode === 'draft' ? '#E6DACB' : '#EFE9E2';
  const secondary = theme.dark ? '#D6D0D3' : '#514943';
  // Audio remains available in the opened music detail; no player outside the square.
  const displayTitle = title.replace(/^\[Démo\]\s*/i, '').trim();
  const compactLabel = imageWidth < 132;

  const visual = <View style={{
    width: imageWidth, height: imageHeight, borderRadius: listed ? 10 : imageWidth < 160 ? 11 : 15,
    overflow: 'hidden', backgroundColor: surface,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  }}>
    {mode === 'draft'
      ? <MusicCassetteDraft width={imageWidth} variant="tile" title={displayTitle}/>
      : listed ? <CassetteArtwork width={imageWidth} height={imageHeight}
          title={displayTitle} artwork={artwork} transparent technicalLabel/>
      : <>
          <View style={{height:imageHeight * 0.65,justifyContent:'center'}}>
            <CassetteArtwork width={imageWidth} height={imageHeight * 0.65}
              title={displayTitle} artwork={artwork} transparent technicalLabel/>
          </View>
          <View pointerEvents="none" style={{
            flex:1,alignSelf:'stretch',paddingHorizontal:compactLabel?5:10,
            justifyContent:'center',gap:compactLabel?0:2,
            backgroundColor:theme.dark?'#332D32':'#EEE7DF',
          }}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.62}
              style={{color:theme.foreground,fontSize:compactLabel?10:13,
                lineHeight:compactLabel?12:16,fontWeight:'700'}}>
              {displayTitle}
            </Text>
            <Text numberOfLines={1} style={{color:theme.muted,
              fontSize:compactLabel?8:10,lineHeight:compactLabel?10:12}}>
              {byline}
            </Text>
            {!!detail && imageWidth >= 94 && <Text numberOfLines={1} style={{
              color:theme.muted,fontSize:compactLabel?7:9,
              lineHeight:compactLabel?9:11
            }}>{detail.replace(/^Recherche\s*:\s*/i,'')}</Text>}
            {!!status && <Text numberOfLines={1} style={{
              color:'#CB245C',fontSize:compactLabel?8:10,
              lineHeight:compactLabel?10:12,fontWeight:'600'
            }}>{status}</Text>}
          </View>
        </>}
    {participants.length > 0 ? <View pointerEvents="none" style={{
      position: 'absolute', right: 7, bottom: mode === 'draft' ? 6 : 8,
    }}>
      <MusicParticipantBadges people={participants} size={listed ? 23 : imageWidth < 155 ? 22 : imageWidth < 210 ? 25 : 30}
        maxVisible={imageWidth < 185 ? 2 : 3}/>
    </View> : null}
    {mode === 'draft' && status?.includes('à examiner') ? <View pointerEvents="none" style={{
      position:'absolute',right:7,top:7,borderRadius:10,
      backgroundColor:theme.dark?'#42303B':'#FFF6EA',
      paddingHorizontal:6,paddingVertical:4,
    }}>
      <Ionicons name="alert-circle-outline" size={15} color="#CB245C"/>
    </View> : null}

  </View>;

  return <View style={{ width: listed ? '100%' : width, gap: 0, position:'relative' }}>
    <Pressable disabled={!onPress} onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={'Ouvrir le morceau ' + displayTitle +
        (mode === 'draft' && status ? ', ' + status : '')}
      style={listed
        ? { flexDirection:'row',alignItems:'center',gap:12,width:'100%',
          borderBottomWidth:1,borderBottomColor:theme.border,paddingVertical:8 }
        : { width:'100%',gap:9,alignItems:'stretch' }}>
      {visual}
      {listed ? <View style={{ flex: 1, minWidth:0, gap:4,
        paddingHorizontal:listed ? 0 : 2 }}>
        <Text numberOfLines={listed ? 1 : 2}
          style={{fontSize:listed?14:14,fontWeight:'700',
            color:theme.foreground,lineHeight:19}}>{displayTitle}</Text>
        <Text numberOfLines={1} style={{fontSize:11,color:secondary,
          fontWeight:'500'}}>{byline}</Text>
        {detail ? <Text numberOfLines={1} style={{fontSize:10,
          color:theme.muted}}>{detail}</Text> : null}
        {status ? <Text numberOfLines={1} style={{fontSize:10,color:'#C6235D',
          fontWeight:'700'}}>{status}</Text> : null}
      </View> : null}
      {listed && !demo ? <Ionicons name="chevron-forward-outline"
        size={17} color={theme.foreground}/> : null}
    </Pressable>
    {mode === 'cassette' && !listed && (onLearnMore || onPress) ?
      <Pressable onPress={onLearnMore || onPress}
        accessibilityRole="button" accessibilityLabel={'En savoir plus sur ' + displayTitle}
        hitSlop={5}
        style={{position:'absolute',top:5,right:5,zIndex:3,
          minWidth:26,minHeight:26,borderRadius:13,
          backgroundColor:theme.dark?'#393137':'#FFF9F2',
          flexDirection:'row',alignItems:'center',justifyContent:'center',
          paddingHorizontal:compactLabel?0:6,gap:3}}>
        <Ionicons name="information-circle-outline" size={compactLabel?17:18}
          color={theme.foreground}/>
        {!compactLabel ? <Text style={{fontSize:9,color:theme.foreground}}>
          Infos
        </Text> : null}
      </Pressable> : null}
  </View>;
}
