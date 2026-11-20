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
import { workspaceLayout, PAGE_TITLE_FONT_SIZE, PAGE_TITLE_LINE_HEIGHT } from '@/theme/workspaceLayout';

/** One editorial design language for all four dream phases. */
export const phaseAccent: Record<DreamPhase, string> = {
  Rêve: '#B88962',
  Initiation: '#A1BA44',
  Croissance: '#27845B',
  Témoignage: '#D71D77',
};


/** Meaningful dream hero: stage, goal, context and an actionable next step.
 * It is a working-space banner, not an image with a title overlay. */
export function DreamPhaseHeader({
  dream, phase, onBack, onNavigate, onPrimaryAction, action, summary, readOnly = false,
}: {
  dream: DreamEntry;
  phase: DreamPhase;
  onBack: () => void;
  onNavigate?: (phase: DreamPhase) => void;
  onPrimaryAction?: () => void;
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
      marginTop:10,marginBottom:15,paddingRight:110,
      minHeight:PAGE_TITLE_LINE_HEIGHT,justifyContent:'center',
    }}>
      <Text numberOfLines={1} style={{
        color:theme.foreground,fontFamily:'serif',
        fontSize:PAGE_TITLE_FONT_SIZE,lineHeight:PAGE_TITLE_LINE_HEIGHT,
        letterSpacing:-.15,
      }}>{PHASE_LABELS[phase]}</Text>
    </View>:null}
    <View style={{
      height:desktop?338:width<520?320:356,
      width:'100%',overflow:'hidden',borderRadius:desktop?17:13,
      backgroundColor:theme.dark?'#1A2924':'#243D37',
      position:'relative',
    }}>
      {dream.image?
        <Image source={{uri:dream.image}} resizeMode="cover"
          style={{position:'absolute',left:0,right:0,top:0,bottom:0,
            width:'100%',height:'100%'}}/>:
        <View pointerEvents="none" style={{position:'absolute',left:0,right:0,
          top:0,bottom:0,backgroundColor:'#354F4C'}}/>}
      {/* Dark-on-photo wash holds both a meaningful title and a usable action. */}
      <Svg pointerEvents="none" width="100%" height="100%"
        style={{position:'absolute',left:0,right:0,top:0,bottom:0}}>
        <Defs>
          <LinearGradient id="dream-editorial-hero-wash" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#0D1917" stopOpacity={.52}/>
            <Stop offset="25%" stopColor="#0B1915" stopOpacity={.25}/>
            <Stop offset="62%" stopColor="#0A1513" stopOpacity={.76}/>
            <Stop offset="100%" stopColor="#07100E" stopOpacity={.96}/>
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#dream-editorial-hero-wash)"/>
      </Svg>
      <View style={{position:'absolute',left:desktop?29:17,
        top:desktop?24:18,right:desktop?68:61,
        flexDirection:'row',alignItems:'center',gap:9}}>
        <View style={{width:7,height:7,borderRadius:4,
          backgroundColor:phaseAccent[phase]}}/>
        <Text style={{color:'rgba(255,255,255,.87)',fontSize:10,
          fontWeight:'800',letterSpacing:1.65}}>
          {PHASE_LABELS[phase].toUpperCase()}
        </Text>
        <View style={{width:1,height:12,backgroundColor:'rgba(255,255,255,.30)'}}/>
        <Text style={{color:'rgba(255,255,255,.72)',fontSize:10,
          fontWeight:'600',letterSpacing:1}}>
          {String(DREAM_PHASES.indexOf(phase)+1).padStart(2,'0')} / 04
        </Text>
      </View>
      <View style={{position:'absolute',
        left:desktop?29:18,right:desktop?36:18,bottom:desktop?25:20,
        gap:desktop?11:8,alignItems:'flex-start'}}>
        <Text style={{fontSize:10,fontWeight:'700',letterSpacing:2,
          color:'rgba(255,255,255,.79)'}}>
          {readOnly?'LE CHEMIN PARCOURU':'UN RÊVE À FAIRE GRANDIR'}
        </Text>
        <Text accessibilityRole="header" numberOfLines={desktop?2:3}
          style={{fontFamily:'serif',fontSize:desktop?43:width<520?30:35,
            lineHeight:desktop?49:width<520?36:41,
            fontWeight:'800',letterSpacing:-.65,color:'#FFFFFF',
            maxWidth:desktop?850:undefined,
            ...(Platform.OS==='web'?({
              textShadow:'0 2px 12px rgba(0,0,0,.36)',
            } as any):{})}}>
          {dream.title}
        </Text>
        {description?<Text numberOfLines={desktop?2:2}
          style={{fontSize:desktop?14:12,lineHeight:desktop?21:18,
            fontWeight:'400',color:'rgba(255,255,255,.89)',
            maxWidth:desktop?760:undefined}}>
          {description}
        </Text>:null}
        <View style={{marginTop:desktop?8:5,width:'100%',
          flexDirection:'row',alignItems:'center',
          justifyContent:'space-between',gap:11,flexWrap:'wrap'}}>
          {onPrimaryAction?<Pressable onPress={onPrimaryAction}
            accessibilityRole="button"
            accessibilityLabel={readOnly?'Consulter cette étape':'Continuer à avancer sur mon rêve'}
            style={{minHeight:43,flexDirection:'row',alignItems:'center',
              justifyContent:'center',gap:9,paddingHorizontal:16,
              borderRadius:11,backgroundColor:'#FFFCF7'}}>
            <Text style={{fontSize:12,fontWeight:'800',color:'#202826'}}>
              {readOnly?'Consulter cette étape':'Continuer mon rêve'}
            </Text>
            <Ionicons name="arrow-forward-outline" size={17} color="#202826"/>
          </Pressable>:null}
          <View style={{flexDirection:'row',alignItems:'center',gap:6,
            paddingVertical:6}}>
            <Ionicons name={dream.goalDate?'calendar-outline':'leaf-outline'}
              size={15} color="rgba(255,255,255,.82)"/>
            <Text style={{color:'rgba(255,255,255,.88)',fontSize:11,
              fontWeight:'600'}}>
              {dream.goalDate?'Objectif · '+new Date(dream.goalDate.slice(0,10)+
                'T12:00:00').toLocaleDateString('fr-FR',{
                  day:'numeric',month:'short',year:'numeric'}):
                'Un pas après l’autre'}
            </Text>
          </View>
        </View>
      </View>
      {canChangeCover?<Pressable accessibilityRole="button"
        accessibilityLabel={dream.image?
          "Changer l'image de couverture du rêve":"Ajouter une couverture au rêve"}
        disabled={savingCover||!ready} onPress={chooseCover}
        style={{position:'absolute',top:12,right:12,width:41,height:41,
          borderRadius:11,alignItems:'center',justifyContent:'center',
          backgroundColor:'rgba(13,24,21,.74)',
          borderWidth:1,borderColor:'rgba(255,255,255,.35)'}}>
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
