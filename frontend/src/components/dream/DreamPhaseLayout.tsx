import React, { useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import type { DreamEntry } from '@/domain/dreamWorkspace';
import { DREAM_PHASES, PHASE_LABELS, type DreamPhase } from '@/domain/publication';
import { DreamPhaseIcon } from '@/icons/DreamPhaseIcon';
import { TopActions } from '@/components/navigation/TopActions';
import { pickDreamImage } from '@/lib/pickDreamImage';
import { useDreams } from '@/domain/dreamRepository';
import { workspaceLayout, PAGE_TITLE_FONT_SIZE, PAGE_TITLE_LINE_HEIGHT } from '@/theme/workspaceLayout';

/** One editorial design language for all four dream phases. */
export const phaseAccent: Record<DreamPhase, string> = {
  Rêve: '#B88962',
  Initiation: '#A1BA44',
  Croissance: '#27845B',
  Témoignage: '#D71D77',
};


/** The dream's photo is now a real, contained image rather than a page-wide
 * translucent backdrop. All four phases share the same responsive masthead.
 * Text always sits on the solid theme background, never on top of the photo. */
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
  const desktop=Platform.OS==='web'&&workspaceLayout(width).desktop;
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
    <View style={desktop?{
      height:0,position:'relative',zIndex:5,overflow:'visible',
    }:{
      height:44,flexDirection:'row',alignItems:'center',
      justifyContent:'space-between',marginBottom:10,
    }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Retour à mes rêves"
        onPress={onBack} style={desktop?{
          position:'absolute',left:-51,top:7,width:44,height:44,
          alignItems:'flex-start',justifyContent:'center',
        }:{width:44,height:44,alignItems:'flex-start',justifyContent:'center'}}>
        <Ionicons name="arrow-back-outline" size={22} color={theme.foreground}/>
      </Pressable>
      {!desktop?<View style={{flex:1}}/>:null}
      {desktop?<View style={{position:'absolute',right:0,top:0}}>
        <TopActions/>
      </View>:<TopActions/>}
    </View>
    {desktop?<View style={{
      flexDirection:'row',alignItems:'center',gap:9,
      marginTop:10,marginBottom:16,paddingRight:110,minHeight:32,
    }}>
      <DreamPhaseIcon phase={phase} size={29}
        tintColor={phase==='Croissance'?(theme.dark?'#82C9A0':'#17613F'):undefined}/>
      <Text numberOfLines={1} style={{
        color:theme.foreground,fontFamily:'serif',
        fontSize:PAGE_TITLE_FONT_SIZE,lineHeight:PAGE_TITLE_LINE_HEIGHT,
        letterSpacing:-.15,
      }}>{PHASE_LABELS[phase]}</Text>
    </View>:null}
    <View style={{
      height:desktop?168:width<520?148:177,
      width:'100%',overflow:'hidden',borderRadius:desktop?12:10,
      backgroundColor:theme.dark?'#303532':'#E9E8E2',
      position:'relative',
    }}>
      {dream.image?
        <Image source={{uri:dream.image}} resizeMode="cover"
          style={{width:'100%',height:'100%'}}/>:
        <View style={{flex:1,justifyContent:'center',alignItems:'center'}}>
          <Ionicons name="image-outline" size={31} color={theme.muted}/>
        </View>}
      {canChangeCover?<Pressable accessibilityRole="button"
        accessibilityLabel={dream.image?
          "Changer l'image de couverture du rêve":"Ajouter une couverture au rêve"}
        disabled={savingCover||!ready} onPress={chooseCover}
        style={{position:'absolute',top:12,right:12,width:38,height:38,
          borderRadius:11,alignItems:'center',justifyContent:'center',
          backgroundColor:'rgba(16,20,18,.66)',
          borderWidth:1,borderColor:'rgba(255,255,255,.24)'}}>
        {savingCover?<ActivityIndicator color="#FFFFFF" size="small"/>:
          <Ionicons name="image-outline" color="#FFFFFF" size={17}/>}
      </Pressable>:null}
    </View>
    <View style={{paddingTop:desktop?15:13,gap:description?6:0}}>
      <Text style={{fontFamily:'serif',fontSize:desktop?23:24,
        lineHeight:desktop?31:32,letterSpacing:-.3,
        color:theme.foreground}}>{dream.title}</Text>
      {description?<Text style={{
        fontSize:desktop?13:12,lineHeight:desktop?21:20,
        color:theme.muted,
      }}>{description}</Text>:null}
    </View>
    {coverError?<Text accessibilityRole="alert"
      style={{fontSize:11,color:theme.dark?'#FF98AD':'#B24753',
        marginTop:9,lineHeight:18}}>{coverError}</Text>:null}
    {!desktop?<View style={{
      marginTop:20,marginBottom:9,paddingBottom:3,
      flexDirection:'row',alignItems:'flex-end',gap:width<520?4:10,
      borderBottomWidth:1,borderBottomColor:theme.border,
    }}>
      {DREAM_PHASES.map((item,i)=>{
        const reached=i<=DREAM_PHASES.indexOf(dream.phase);
        const selected=item===phase;
        const phaseColor=phaseAccent[item];
        return <Pressable key={item} accessibilityRole="button"
          accessibilityLabel={'Ouvrir '+PHASE_LABELS[item]}
          accessibilityState={{selected,disabled:!reached||!onNavigate}}
          disabled={!reached||!onNavigate}
          onPress={()=>onNavigate?.(item)}
          style={{flex:1,minWidth:0,gap:5,
            paddingTop:3,paddingBottom:10,alignItems:'center',
            justifyContent:'flex-end',opacity:reached?1:.45}}>
          <View style={{minHeight:25,flexDirection:'row',
            alignItems:'center',justifyContent:'center',gap:width<520?3:6}}>
            <DreamPhaseIcon phase={item} size={width<520?20:23}
              tintColor={item==='Croissance'?
                (theme.dark?'#82C9A0':'#17613F'):undefined}/>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.75}
              style={{fontSize:width<520?10:12,
                fontWeight:selected?'700':'500',color:theme.foreground}}>
              {PHASE_LABELS[item]}
            </Text>
          </View>
          <View style={{position:'absolute',bottom:-4,left:0,right:0,
            height:selected?3:1.5,borderRadius:2,
            backgroundColor:reached?phaseColor:theme.muted,
            opacity:selected?1:.45}}/>
        </Pressable>;
      })}
    </View>:null}
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
