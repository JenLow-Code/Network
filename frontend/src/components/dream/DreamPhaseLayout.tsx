import React, { useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useAppTheme } from '@/theme/AppTheme';
import type { DreamEntry } from '@/domain/dreamWorkspace';
import { DREAM_PHASES, PHASE_LABELS, type DreamPhase } from '@/domain/publication';
import { dreamPhaseImageUris } from '../../../assets/dreamPhaseImages';
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


/** A dream's original cover belongs to the atmosphere, not to a repeated card.
 * Semence, Germination, Croissance and Floraison all share the same treatment.
 */
export function DreamCoverBackdrop({ uri }: { uri?: string }) {
  const theme = useAppTheme();
  if (!uri) return null;
  // Anchor the cover to the ENTIRE phase viewport, not the 760px reading
  // column or a fixed 510px band. It stays continuous when content scrolls.
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image source={{ uri }} resizeMode="cover"
        style={[StyleSheet.absoluteFill,{opacity:1},
          ...(Platform.OS==='web'?([{filter:'saturate(1.22) contrast(1.05)'} as any]):[])]}/>
      <Svg width="100%" height="100%" pointerEvents="none"
        style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="dream-cover-background-fade"
            x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={theme.background}
              stopOpacity={theme.dark ? .67 : .64}/>
            <Stop offset="23%" stopColor={theme.background}
              stopOpacity={theme.dark ? .58 : .51}/>
            <Stop offset="48%" stopColor={theme.background}
              stopOpacity={theme.dark ? .54 : .54}/>
            <Stop offset="75%" stopColor={theme.background}
              stopOpacity={theme.dark ? .76 : .78}/>
            <Stop offset="100%" stopColor={theme.background}
              stopOpacity={theme.dark ? .94 : .94}/>
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#dream-cover-background-fade)"/>
      </Svg>
    </View>
  );
}

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
  const theme = useAppTheme();
  const {width}=useWindowDimensions();
  const desktop=Platform.OS==='web'&&workspaceLayout(width).desktop;
  const accent = phaseAccent[phase];
  const description = summary === undefined ? dream.summary : summary;
  const {setCoverImage,ready}=useDreams();
  const [savingCover,setSavingCover]=useState(false);
  const [coverError,setCoverError]=useState('');
  const canChangeCover=phase===dream.phase && phase!=='Témoignage' && !readOnly;
  const chooseCover=()=>{
    if(!canChangeCover||savingCover||!ready)return;
    setCoverError('');
    pickDreamImage(
      uri=>{
        setSavingCover(true);
        void setCoverImage(dream.id,uri)
          .catch(error=>setCoverError(error instanceof Error?error.message:
            "Impossible d'enregistrer cette image. Réessaie."))
          .finally(()=>setSavingCover(false));
      },
      message=>setCoverError(message),
    );
  };
  return (
    <View style={{ marginBottom: 13 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, marginBottom: 23 }}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Retour au rêve" style={{ padding: 9, marginLeft: -9 }}>
          <Ionicons name="arrow-back-outline" size={22} color={theme.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}/>
        <TopActions />
      </View>

      <View style={{flexDirection:'row',alignItems:'flex-start',gap:4,
        marginBottom:description?10:18}}>
        <Text style={{flex:1,color:theme.foreground,fontFamily:'serif',
          fontSize:33,lineHeight:41,letterSpacing:-0.5}}>{dream.title}</Text>
        {canChangeCover?<Pressable onPress={chooseCover}
          disabled={savingCover||!ready}
          accessibilityRole="button"
          accessibilityLabel={dream.image?"Changer l'image de couverture du rêve":
            "Ajouter une image de couverture au rêve"}
          accessibilityHint="Ouvre le sélecteur d'image"
          accessibilityState={{disabled:savingCover||!ready}}
          style={{width:34,height:34,alignItems:'center',justifyContent:'center',
            marginTop:5}}>
          {savingCover?<ActivityIndicator size="small" color={theme.muted}/>:
            <Ionicons name="image-outline" size={15} color={theme.muted}/>}
        </Pressable>:null}
      </View>
      {description ? (
        <Text style={{ color: theme.foreground, opacity: .88, fontSize: 14, lineHeight: 22, marginBottom: 20, fontWeight: '500', ...(Platform.OS==='web'?({textShadow:theme.dark?'0 1px 4px rgba(0,0,0,.45)':'0 1px 6px rgba(255,255,255,.85)'} as any):{}) }}>
          {description}
        </Text>
      ) : null}
      {coverError?<Text accessibilityRole="alert"
        style={{fontSize:11,color:'#B24753',lineHeight:17,marginBottom:10}}>
        {coverError}
      </Text>:null}
      {/* A restrained, permanent four-phase timeline on every screen,
          including desktop. The sidebar is a second way to navigate,
          never a replacement for the journey itself. */}
      <View style={{marginBottom:19,marginTop:5,
        flexDirection:'row',alignItems:'flex-end',gap:width<520?4:10,
        paddingVertical:7,paddingHorizontal:width<520?4:9,
        borderRadius:13,
        borderWidth:Platform.OS==='web'?1:0,
        borderColor:theme.dark?'rgba(255,255,255,.13)':'rgba(255,255,255,.32)',
        backgroundColor:theme.dark?'rgba(19,24,25,.36)':'rgba(250,249,246,.32)',
        ...(Platform.OS==='web'?({
          backdropFilter:'blur(22px) saturate(140%)',
          WebkitBackdropFilter:'blur(22px) saturate(140%)',
        } as any):{})}}>
        {DREAM_PHASES.map((item,i)=>{
          const reached=i<=DREAM_PHASES.indexOf(dream.phase);
          const selected=item===phase;
          const phaseColor=phaseAccent[item];
          return <Pressable key={item} onPress={()=>onNavigate?.(item)}
            accessibilityRole="button"
            accessibilityLabel={'Ouvrir '+PHASE_LABELS[item]}
            accessibilityState={{selected,disabled:!reached||!onNavigate}}
            disabled={!reached||!onNavigate}
            style={{flex:1,minWidth:0,justifyContent:'flex-end',
              gap:5,alignItems:'center',paddingHorizontal:2,
              paddingTop:4,paddingBottom:0}}>
            <View style={{flexDirection:'row',alignItems:'center',
              justifyContent:'center',gap:6,minHeight:24}}>
              <View style={{opacity:reached?1:.42}}><DreamPhaseIcon phase={item} size={width<520?23:27}/></View>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.74}
                style={{fontSize:width<520?10:12,
                  fontWeight:selected?'700':'500',
                  color:theme.dark?'#F6F4F0':'#262C2B',
                  opacity:reached?1:.65,textAlign:'center'}}>
                {PHASE_LABELS[item]}
              </Text>
            </View>
            <View style={{width:'100%',height:selected?2.5:1.5,
              borderRadius:1,backgroundColor:reached?phaseColor:
                theme.dark?'rgba(240,240,240,.35)':'rgba(41,50,47,.25)',
              opacity:selected?1:reached?.65:.72}}/>
          </Pressable>;
        })}
      </View>
      {readOnly ? (
        <View style={{
          flexDirection:'row',alignItems:'center',gap:7,
          paddingVertical:9,paddingHorizontal:11,marginBottom:15,
          backgroundColor:theme.dark?'#303438':'#F1EFEA',
          borderRadius:8,alignSelf:'flex-start',
        }}>
          <Ionicons name="lock-closed-outline" color={theme.muted} size={13}/>
          <Text style={{color:theme.muted,fontSize:11,fontWeight:'600'}}>Étape passée · consultation uniquement</Text>
        </View>
      ) : null}
      {action ? <View style={{ alignItems: 'flex-end', marginTop: -8, marginBottom: 12 }}>{action}</View> : null}
    </View>
  );
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
