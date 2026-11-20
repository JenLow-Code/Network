import React, { useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useAppTheme } from '@/theme/AppTheme';
import type { DreamEntry } from '@/domain/dreamWorkspace';
import { DREAM_PHASES, PHASE_LABELS, type DreamPhase } from '@/domain/publication';
import { DreamPhaseIcon } from '@/icons/DreamPhaseIcon';
import { TopActions } from '@/components/navigation/TopActions';
import { pickDreamImage } from '@/lib/pickDreamImage';
import { useDreams } from '@/domain/dreamRepository';
import { workspaceLayout } from '@/theme/workspaceLayout';

/** One editorial design language for all four dream phases. */
export const phaseAccent: Record<DreamPhase, string> = {
  Rêve: '#B88962',
  Initiation: '#A1BA44',
  Croissance: '#27845B',
  Témoignage: '#D71D77',
};


/** Full-bleed editorial hero for the dream workspace.
 * Only the dream's title and its own summary belong over the cover image.
 * Stage navigation, dates and working actions remain outside the hero. */
export function DreamPhaseHeader({
  dream, phase, onBack, onNavigate, action, summary, readOnly = false,
}: {
  dream: DreamEntry;
  phase: DreamPhase;
  onBack: () => void;
  onNavigate?: (phase: DreamPhase) => void;
  action?: React.ReactNode;
  summary?: string | null;
  readOnly?: boolean;
}) {
  const theme=useAppTheme();
  const {width}=useWindowDimensions();
  const ws=workspaceLayout(width);
  const desktop=Platform.OS==='web'&&ws.desktop;
  const description=summary===undefined?dream.summary:summary;
  const {setCoverImage,ready}=useDreams();
  const [savingCover,setSavingCover]=useState(false);
  const [coverError,setCoverError]=useState('');
  const canChangeCover=phase===dream.phase&&phase!=='Témoignage'&&!readOnly;
  const chooseCover=()=>{
    if(!canChangeCover||savingCover||!ready)return;
    setCoverError('');
    pickDreamImage(uri=>{
      setSavingCover(true);
      void setCoverImage(dream.id,uri)
        .catch(error=>setCoverError(error instanceof Error?error.message:
          "Impossible d'enregistrer cette image. Réessaie."))
        .finally(()=>setSavingCover(false));
    },message=>setCoverError(message));
  };
  return <View style={{marginBottom:desktop?16:18}}>
    <View style={{height:48,flexDirection:'row',alignItems:'center',
      justifyContent:'space-between',marginBottom:desktop?12:10}}>
      <Pressable accessibilityRole="button" accessibilityLabel="Retour à mes rêves"
        onPress={onBack} style={{width:44,height:44,alignItems:'flex-start',
          justifyContent:'center'}}>
        <Ionicons name="arrow-back-outline" size={22} color={theme.foreground}/>
      </Pressable>
      <View style={{flex:1}}/>
      <TopActions/>
    </View>
    {/* Expand beyond the reading-column padding to give the image the entire
        workspace canvas. This is a hero, not a rounded content card. */}
    <View style={{
      height:desktop?500:width<520?370:440,
      marginHorizontal:-ws.gutter,
      width:'auto',
      position:'relative',
      overflow:'hidden',
      backgroundColor:theme.dark?'#142521':'#233831',
    }}>
      {dream.image?
        <Image source={{uri:dream.image}} resizeMode="cover"
          style={{position:'absolute',left:0,right:0,top:0,bottom:0,
            width:'100%',height:'100%'}}/>:
        <View pointerEvents="none" style={{position:'absolute',
          left:0,right:0,top:0,bottom:0,
          backgroundColor:theme.dark?'#18352E':'#36534B'}}/>}
      {/* Light at the top protects the photograph. The lower gradient
          makes the real words of this dream readable on any cover. */}
      <Svg pointerEvents="none" width="100%" height="100%"
        style={{position:'absolute',left:0,right:0,top:0,bottom:0}}>
        <Defs>
          <LinearGradient id="dream-full-bleed-hero" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#08110F" stopOpacity={.17}/>
            <Stop offset="29%" stopColor="#08110F" stopOpacity={.06}/>
            <Stop offset="54%" stopColor="#08110F" stopOpacity={.21}/>
            <Stop offset="79%" stopColor="#08110F" stopOpacity={.72}/>
            <Stop offset="100%" stopColor="#08110F" stopOpacity={.91}/>
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#dream-full-bleed-hero)"/>
      </Svg>
      <View pointerEvents="none" style={{
        position:'absolute',
        left:desktop?48:width<520?23:35,
        right:desktop?68:width<520?22:40,
        bottom:desktop?45:width<520?30:36,
        maxWidth:desktop?880:undefined,
        gap:desktop?15:10,
        alignItems:'flex-start',
      }}>
        <Text accessibilityRole="header"
          numberOfLines={desktop?3:4}
          style={{
            color:'#FFFFFF',
            fontFamily:'serif',
            fontSize:desktop?60:width<520?35:46,
            lineHeight:desktop?69:width<520?42:53,
            fontWeight:'700',
            letterSpacing:desktop?-1.4:-.6,
            ...(Platform.OS==='web'?({
              textShadow:'0 2px 16px rgba(0,0,0,.35)',
            } as any):{
              textShadowColor:'rgba(0,0,0,.38)',
              textShadowOffset:{width:0,height:2},
              textShadowRadius:12,
            }),
          }}>{dream.title}</Text>
        {description?.trim()?
          <Text numberOfLines={desktop?3:3} style={{
            color:'rgba(255,255,255,.94)',
            fontSize:desktop?17:width<520?13:15,
            lineHeight:desktop?25:width<520?20:23,
            fontWeight:'400',
            maxWidth:desktop?660:540,
            ...(Platform.OS==='web'?({
              textShadow:'0 1px 9px rgba(0,0,0,.5)',
            } as any):{}),
          }}>{description}</Text>:null}
      </View>
      {canChangeCover?<Pressable accessibilityRole="button"
        accessibilityLabel={dream.image?
          "Changer l'image de couverture du rêve":"Ajouter une couverture au rêve"}
        disabled={savingCover||!ready} onPress={chooseCover}
        style={{
          position:'absolute',
          top:desktop?20:15,
          right:desktop?21:15,
          width:42,height:42,
          alignItems:'center',justifyContent:'center',
          borderRadius:12,
          backgroundColor:'rgba(9,22,18,.52)',
          borderWidth:1,borderColor:'rgba(255,255,255,.40)',
        }}>
        {savingCover?<ActivityIndicator color="#FFFFFF" size="small"/>:
          <Ionicons name="image-outline" color="#FFFFFF" size={18}/>}
      </Pressable>:null}
    </View>
    {coverError?<Text accessibilityRole="alert"
      style={{fontSize:11,color:theme.dark?'#FF98AD':'#B24753',
        marginTop:9,lineHeight:18}}>{coverError}</Text>:null}
    <View accessibilityRole="tablist" style={{
      marginTop:desktop?24:18,marginBottom:desktop?17:10,
      paddingBottom:3,flexDirection:'row',alignItems:'stretch',
      gap:desktop?16:width<520?3:9,
    }}>
      {DREAM_PHASES.map((item,i)=>{
        const reached=i<=DREAM_PHASES.indexOf(dream.phase);
        const selected=item===phase;
        const activeAccent=phaseAccent[item];
        return <Pressable key={item} accessibilityRole="tab"
          accessibilityLabel={'Ouvrir '+PHASE_LABELS[item]}
          accessibilityState={{selected,disabled:!reached||!onNavigate}}
          disabled={!reached||!onNavigate}
          onPress={()=>onNavigate?.(item)}
          style={{flex:1,minWidth:0,alignItems:'center',justifyContent:'flex-end',
            gap:desktop?10:7,paddingTop:3,paddingBottom:0,
            opacity:reached?1:.46}}>
          <View style={{minHeight:desktop?29:25,flexDirection:'row',
            alignItems:'center',justifyContent:'center',gap:desktop?7:width<520?3:6}}>
            {selected?<DreamPhaseIcon phase={item}
              size={desktop?28:width<520?20:23}
              artworkScale={item==='Rêve'?.66:undefined}
              tintColor={item==='Croissance'?
                (theme.dark?'#82C9A0':'#17613F'):undefined}/>:null}
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.75}
              style={{fontSize:desktop?12:width<520?10:12,
                fontWeight:selected?'700':'500',
                color:selected?theme.foreground:theme.muted,
              }}>{PHASE_LABELS[item]}</Text>
          </View>
          <View style={{width:'100%',height:selected?3:1.5,borderRadius:2,
            backgroundColor:reached?activeAccent:theme.border,
            opacity:selected?1:reached?.57:.55}}/>
        </Pressable>;
      })}
    </View>
    {readOnly?<View style={{
      flexDirection:'row',alignItems:'center',gap:7,
      paddingTop:12,marginBottom:6,alignSelf:'flex-start',
    }}>
      <Ionicons name="lock-closed-outline" color={theme.muted} size={12}/>
      <Text style={{fontSize:11,color:theme.muted,fontStyle:'italic'}}>
        Étape passée · consultation uniquement
      </Text>
    </View>:null}
    {action?<View style={{alignItems:'flex-end',marginTop:7}}>{action}</View>:null}
  </View>;
}

export function DreamPhaseSection({ title, subtitle, children }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const theme = useAppTheme();
  return (
    <View style={{ marginTop: 14, paddingTop: 22, borderTopWidth: 1, borderColor: theme.border, marginBottom: 6 }}>
      <Text style={{ fontSize: 19, fontWeight: '700', letterSpacing: -0.3, color: theme.foreground, marginBottom: subtitle ? 6 : 17 }}>{title}</Text>
      {subtitle ? <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 19, marginBottom: 18 }}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

export function DreamPhaseButton({ label, onPress, secondary = false, disabled = false }: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }}
      style={{
        minHeight: 48, marginTop: 12, paddingHorizontal: 17, paddingVertical: 12,
        borderRadius: 12, alignItems: 'center', justifyContent: 'center',
        backgroundColor: disabled ? (theme.dark ? '#45464A' : '#D0CFCC') : secondary ? 'transparent' : (theme.dark ? '#F7F4ED' : '#242322'),
        borderWidth: secondary ? 1 : 0, borderColor: theme.border,
      }}
    >
      <Text style={{ color: disabled ? '#777' : secondary ? theme.foreground : (theme.dark ? '#242322' : '#FFFFFF'), fontSize: 13, fontWeight: '700', textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

export function DreamPhaseField({ label, value, onChange, placeholder, multiline = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <View style={{ marginBottom: 15 }}>
      <Text style={{ color: theme.foreground, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>{label}</Text>
      <TextInput
        value={value} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor={theme.muted} multiline={multiline}
        style={{
          backgroundColor: theme.surface, color: theme.foreground,
          borderWidth: 1, borderColor: theme.border, borderRadius: 12,
          padding: 13, minHeight: multiline ? 116 : 46, fontSize: 14,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}
