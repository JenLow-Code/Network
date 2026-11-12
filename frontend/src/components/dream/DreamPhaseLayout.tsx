import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import type { DreamEntry } from '@/domain/dreamWorkspace';
import { DREAM_PHASES, PHASE_LABELS, type DreamPhase } from '@/domain/publication';
import { dreamPhaseImageUris } from '../../../assets/dreamPhaseImages';
import { TopActions } from '@/components/navigation/TopActions';
import { pickDreamImage } from '@/lib/pickDreamImage';
import { useDreams } from '@/domain/dreamRepository';

/** One editorial design language for all four dream phases. */
export const phaseAccent: Record<DreamPhase, string> = {
  Rêve: '#B88962',
  Initiation: '#A1BA44',
  Croissance: '#27845B',
  Témoignage: '#D71D77',
};

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
        <Text style={{ color: theme.muted, fontSize: 14, lineHeight: 22, marginBottom: 20 }}>
          {description}
        </Text>
      ) : null}
      {coverError?<Text accessibilityRole="alert"
        style={{fontSize:11,color:'#B24753',lineHeight:17,marginBottom:10}}>
        {coverError}
      </Text>:null}
      {/* The phase progression is the single botanical header, preceding the dream identity. */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 19 }}>
        {DREAM_PHASES.map((item, i) => {
          // A phase is reached only by an explicit phase transition.
          // Legacy editor timestamps are not phase transitions.
          const reached = i <= DREAM_PHASES.indexOf(dream.phase);
          const selected = item === phase;
          return (
            <Pressable key={item}
              accessibilityRole="button"
              accessibilityLabel={'Ouvrir ' + PHASE_LABELS[item]}
              accessibilityState={{ disabled: !reached || !onNavigate, selected }}
              disabled={!reached || !onNavigate}
              onPress={() => onNavigate?.(item)}
              style={{
                flex: 1, minWidth: 0, minHeight: 75,
                justifyContent: 'flex-end', alignItems: 'center',
                paddingBottom: 2,
              }}>
              {selected ? (
                <Image source={{ uri: dreamPhaseImageUris[item] }} resizeMode="contain"
                  style={{
                    width: item==='Rêve'?16:31,
                    height: item==='Rêve'?16:31,
                    marginBottom: item==='Rêve'?13:5,
                    ...(item==='Croissance'?{tintColor:phaseAccent.Croissance}:{}),
                  }}/>
              ) : <View style={{ height: 36 }} />}
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}
                style={{
                  color: selected ? accent : reached ? theme.muted : theme.border,
                  fontSize: 10, fontWeight: selected ? '800' : '500',
                  textAlign: 'center',
                }}>{PHASE_LABELS[item]}</Text>
              <View style={{
                width: '100%', height: selected ? 4 : 3,
                marginTop: 11, borderRadius: 3,
                backgroundColor: selected ? accent :
                  reached ? phaseAccent[item] :
                  theme.dark ? '#35373A' : '#E9E7E1',
                opacity: selected ? 1 : reached ? .60 : .7,
              }} />
            </Pressable>
          );
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
