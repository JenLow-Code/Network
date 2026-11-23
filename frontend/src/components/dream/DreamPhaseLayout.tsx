import React, { useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';
import type { DreamEntry } from '@/domain/dreamWorkspace';
import { DREAM_PHASES, PHASE_LABELS, type DreamPhase } from '@/domain/publication';
import { DreamPhaseIcon } from '@/icons/DreamPhaseIcon';
import { PageHeader } from '@/components/navigation/PageHeader';
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


/** Compact workspace identity, shared by Semence, Germination, Croissance and Floraison.
 * Unlike the public fruit gallery, working inside a dream is not a full-screen cover.
 * The right-hand global navigation stays untouched.
 */
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
  const {width} = useWindowDimensions();
  const ws = workspaceLayout(width);
  const desktop = Platform.OS === 'web' && ws.desktop;
  // On narrow screens the phases stay at the top, on their own compact row
  // beneath the Back / global actions, so none of the names is truncated.
  const phasesInTopRow = width >= 760;
  const workspaceWidth = Math.min(Math.max(0, width - (ws.desktop ? 212 : 0)),
    ws.maxWidth ?? width);
  const readingWidth = Math.max(0, workspaceWidth - ws.contentGutter - ws.gutter);
  const topPhaseWidth = Math.max(290, Math.min(620, readingWidth -
    (desktop ? 180 : 160)));
  const narrow = width < 600;
  const coverSize = desktop ? 106 : narrow ? 82 : 96;
  const description = summary === undefined ? dream.summary : summary;
  const {setCoverImage, ready} = useDreams();
  const [savingCover, setSavingCover] = useState(false);
  const [coverError, setCoverError] = useState('');
  const canChangeCover = phase === dream.phase && phase !== 'Témoignage' && !readOnly;
  const chooseCover = () => {
    if (!canChangeCover || savingCover || !ready) return;
    setCoverError('');
    pickDreamImage(uri => {
      setSavingCover(true);
      void setCoverImage(dream.id, uri)
        .catch(error => setCoverError(error instanceof Error ? error.message :
          "Impossible d'enregistrer cette image. Réessaie."))
        .finally(() => setSavingCover(false));
    }, message => setCoverError(message));
  };
  // One navigation component is mounted either inside PageHeader or directly
  // below it on phones. The global header actions and right sidebar do not change.
  const advancement = <View accessibilityRole="tablist" style={{
    width:phasesInTopRow?topPhaseWidth:'100%',
    flexDirection:'row',alignItems:'stretch',gap:desktop?12:width<520?4:8,
    paddingBottom:2,
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
          minHeight:phasesInTopRow?41:34,
          gap:phasesInTopRow?5:3,opacity:reached?1:.46}}>
        <View style={{minHeight:phasesInTopRow?23:21,
          flexDirection:'row',alignItems:'center',justifyContent:'center',
          gap:phasesInTopRow?5:2,maxWidth:'100%'}}>
          {selected && width>=600 ?
            <DreamPhaseIcon phase={item} size={desktop?20:16}
              artworkScale={item==='Rêve'?.66:undefined}
              tintColor={item==='Croissance'?
                (theme.dark?'#82C9A0':'#17613F'):undefined}/> : null}
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={.8}
            style={{flexShrink:1,fontSize:desktop?12:width<380?9:width<600?10:11,
              fontWeight:selected?'700':'500',
              color:selected?theme.foreground:theme.muted}}>
            {PHASE_LABELS[item]}
          </Text>
        </View>
        <View style={{width:'100%',height:selected?3:2,borderRadius:2,
          backgroundColor:reached?activeAccent:theme.border,
          opacity:selected?1:reached?.65:.55}}/>
      </Pressable>;
    })}
  </View>;
  return <View style={{marginBottom:desktop?17:18}}>
    {/* Move advancement to the page heading, not to the global sidebar.
        On phones it sits immediately under the header to keep four readable tabs. */}
    <PageHeader center={phasesInTopRow?advancement:undefined} onBack={onBack}/>
    {!phasesInTopRow ?
      <View style={{marginTop:5,marginBottom:11}}>{advancement}</View> : null}
    {/* The dream's own title belongs beside its rounded cover, with the
        description immediately underneath. No repeated phase row follows. */}
    <View style={{flexDirection:'row',alignItems:'center',
      gap:desktop?20:12,marginTop:phasesInTopRow?(desktop?14:12):7,
      minHeight:coverSize}}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={canChangeCover ?
          (dream.image ? "Changer l'image de couverture du rêve" :
            "Ajouter une couverture au rêve") : "Image de couverture du rêve"}
        accessibilityState={{disabled:!canChangeCover||savingCover||!ready}}
        disabled={!canChangeCover||savingCover||!ready}
        onPress={chooseCover}
        style={{width:coverSize,height:coverSize,borderRadius:12,
          flexShrink:0,overflow:'hidden',backgroundColor:theme.surface,
          borderWidth:1,borderColor:theme.border}}>
        {dream.image ?
          <Image source={{uri:dream.image}} resizeMode="cover"
            style={{width:'100%',height:'100%'}}/> :
          <View style={{flex:1,alignItems:'center',justifyContent:'center'}}>
            <Ionicons name="image-outline" size={24} color={theme.muted}/>
          </View>}
        {canChangeCover ?
          <View pointerEvents="none" style={{position:'absolute',right:5,bottom:5,
            width:27,height:27,borderRadius:8,alignItems:'center',
            justifyContent:'center',backgroundColor:'rgba(12,19,17,.78)'}}>
            {savingCover?<ActivityIndicator size="small" color="#FFFFFF"/>:
              <Ionicons name="pencil-outline" size={13} color="#FFFFFF"/>}
          </View> : null}
      </Pressable>
      <View style={{flex:1,minWidth:0,gap:narrow?5:7}}>
        <Text accessibilityRole="header" numberOfLines={narrow?4:3}
          style={{color:theme.foreground,fontFamily:'serif',
            fontSize:desktop?27:narrow?20:24,
            lineHeight:desktop?34:narrow?26:31,
            fontWeight:'600',letterSpacing:-.45}}>
          {dream.title}
        </Text>
        {description?.trim() ?
          <Text numberOfLines={narrow?4:3}
            style={{color:theme.muted,fontSize:desktop?14:narrow?12:13,
              lineHeight:desktop?21:narrow?18:20}}>
            {description}
          </Text> : null}
      </View>
    </View>
    {coverError ?
      <Text accessibilityRole="alert" style={{
        fontSize:11,color:theme.dark?'#FF98AD':'#B24753',
        marginTop:9,lineHeight:18}}>
        {coverError}
      </Text> : null}
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
