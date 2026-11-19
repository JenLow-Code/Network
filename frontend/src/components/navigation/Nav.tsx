import React, { useState } from 'react';
import { Image, Platform, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { router, useGlobalSearchParams, usePathname } from 'expo-router';
import { useLocale } from '@/i18n/locale';
import { useAppTheme } from '@/theme/AppTheme';
import { useDreams } from '@/domain/dreamRepository';
import { isPublishedFlower } from '@/domain/dreamWorkspace';
import { DREAM_PHASES, PHASE_LABELS, type DreamPhase } from '@/domain/publication';
import { workspaceLayout } from '@/theme/workspaceLayout';

/** Five durable destinations. Fire and Messages live in the global header. */
export function Nav({ placement = 'page' }: { placement?: 'page' | 'desktop' }) {
  const theme = useAppTheme();
  const path = usePathname();
  const { t } = useLocale();
  const {width}=useWindowDimensions();
  const desktop=Platform.OS==='web'&&workspaceLayout(width).desktop;
  const [collapsed,setCollapsed]=useState(false);
  const [dreamTreeOpen,setDreamTreeOpen]=useState(true);
  const params=useGlobalSearchParams<{view?:string}>();
  const {items:dreams}=useDreams();
  const segments=path.split('/').filter(Boolean);
  const contextId=segments[0]==='my-dream'
    ?(['flower','notes','library'].includes(segments[1])?segments[2]:segments[1])
    :segments[0]==='my-dream-participants'?segments[1]:undefined;
  const currentDream=contextId?
    dreams.find(d=>d.id===decodeURIComponent(contextId)):undefined;
  const requestedPhase=params.view;
  const currentPhase:DreamPhase=currentDream&&
    DREAM_PHASES.some(value=>value===requestedPhase)?
      requestedPhase as DreamPhase:currentDream?.phase||'Rêve';
  const currentPhaseIndex=DREAM_PHASES.indexOf(currentDream?.phase||'Rêve');
  const openPhase=(phase:DreamPhase)=>{
    if(!currentDream||DREAM_PHASES.indexOf(phase)>currentPhaseIndex)return;
    if(phase==='Témoignage'&&!isPublishedFlower(currentDream)){
      router.push({pathname:'/my-dream/flower/[id]',params:{id:currentDream.id}});
      return;
    }
    router.push({pathname:'/my-dream/[id]',params:{id:currentDream.id,view:phase}});
  };
  const openResource=(kind:'notes'|'library')=>{
    if(!currentDream)return;
    router.push({pathname:kind==='notes'?
      '/my-dream/notes/[id]':'/my-dream/library/[id]',
      params:{id:currentDream.id}});
  };
  const links = [
    {
      icon: 'calendar-outline' as const, title: t('agenda'),
      path: '/agenda' as const,
      active: path === '/agenda' || path === '/prayers',
    },
    {
      icon: 'musical-note-outline' as const, title: t('music'),
      path: '/music-hub' as const,
      active: path === '/music-hub' || path.startsWith('/publish/music') ||
        path.startsWith('/music-proposal/') || path === '/music/new' || path.startsWith('/music-workspace/') ||
        path.startsWith('/music-collaboration/'),
    },
    {
      icon: 'ellipse-outline' as const, title: t('discover'),
      path: '/discover' as const,
      active: path === '/discover' || path.startsWith('/dream/') ||
        path.startsWith('/bible/') || path.startsWith('/person/') ||
        (path.startsWith('/music/') && path !== '/music/new'),
    },
    {
      icon: 'layers-outline' as const, title: 'Mes rêves',
      path: '/my-space' as const,
      active: path === '/my-space' || path === '/my-dreams' || path.startsWith('/my-dream'),
    },
    {
      icon: 'person-circle-outline' as const, title: 'Mon profil',
      path: '/profile' as const,
      active: path === '/profile' || path === '/settings',
    },
  ];
  const foreground = theme.foreground;
  const webFrost = Platform.OS === 'web'
    ? ({ backdropFilter: 'blur(30px) saturate(190%)', WebkitBackdropFilter: 'blur(30px) saturate(190%)' } as any)
    : {};
  // Desktop: a real layout column, not a floating overlay. Navigation names
  // are primary; icons are compact secondary cues. The user may collapse it to
  // give the creative workspace additional horizontal room.
  if(placement==='desktop'&&!desktop)return null;
  if(placement==='page'&&desktop)return null;
  if(placement==='desktop') {
    const mainLinks=links.filter(x=>x.path!=='/profile');
    const profile=links.find(x=>x.path==='/profile')!;
    const activeColor='#CB245C';
    // Material-like glass keeps the navigation integrated in the desktop grid.
    // The content remains legible over a soft, context-aware colour wash.
    const navSurface=theme.dark?'rgba(17,24,33,.23)':'rgba(244,248,251,.13)';
    const glassBorder=theme.dark?'rgba(255,255,255,.19)':'rgba(255,255,255,.77)';
    const selectedBg=theme.dark?'rgba(215,65,127,.22)':'rgba(203,36,92,.095)';
    const glassEffects=Platform.OS==='web'?({
      backdropFilter:'blur(30px) saturate(180%)',
      WebkitBackdropFilter:'blur(30px) saturate(180%)',
      boxShadow:theme.dark
        ?'inset 1px 0 0 rgba(255,255,255,.12), -8px 0 28px rgba(4,8,14,.11)'
        :'inset 1px 0 0 rgba(255,255,255,.66), -9px 0 32px rgba(59,64,74,.055)',
    } as any):{};
    const renderEntry=(item:typeof links[number])=><Pressable
      key={item.path}
      onPress={()=>router.replace(item.path)}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      accessibilityState={{selected:item.active}}
      style={{height:46,marginHorizontal:collapsed?8:13,
        paddingHorizontal:collapsed?0:12,
        borderRadius:9,flexDirection:'row',alignItems:'center',
        justifyContent:collapsed?'center':'flex-start',gap:12,
        position:'relative',
        backgroundColor:item.active?selectedBg:'transparent'}}>
        {item.active?<View pointerEvents="none" style={{
          position:'absolute',left:0,top:10,bottom:10,width:3,
          backgroundColor:activeColor,borderRadius:3}}/>:null}
        <Ionicons name={item.path==='/discover'?'compass-outline':
          item.path==='/profile'?'person-outline':item.icon}
          size={19} color={item.active?activeColor:theme.muted}/>
        {!collapsed?<Text numberOfLines={1} style={{
          color:item.active?activeColor:theme.foreground,
          fontSize:14,fontWeight:item.active?'700':'500',flex:1}}>
          {item.title}
        </Text>:null}
      </Pressable>;
    return <View accessibilityRole="navigation" style={{
      width:collapsed?72:212,minWidth:collapsed?72:212,
      height:'100%',backgroundColor:navSurface,
      borderLeftWidth:1,borderLeftColor:glassBorder,
      justifyContent:'space-between',paddingTop:28,paddingBottom:24,
      overflow:'hidden',...glassEffects,
    }}>
      <BlurView pointerEvents="none" intensity={60}
        tint={theme.dark?'systemUltraThinMaterialDark':'systemUltraThinMaterialLight'}
        style={{position:'absolute',top:0,left:0,right:0,bottom:0,
          opacity:theme.dark?.30:.24}}/>
      <Svg pointerEvents="none" width="100%" height="100%"
        style={{position:'absolute',top:0,right:0,bottom:0,left:0}}>
        <Defs>
          <LinearGradient id="jenlow-desktop-glass" x1="0%" y1="0%"
            x2="100%" y2="100%">
            <Stop offset="0%" stopColor={theme.dark?'#ADB7CA':'#FFFFFF'}
              stopOpacity={theme.dark?.11:.16}/>
            <Stop offset="38%" stopColor={theme.dark?'#657487':'#DCEBF2'}
              stopOpacity={theme.dark?.08:.10}/>
            <Stop offset="72%" stopColor={theme.dark?'#A26782':'#F4E0EA'}
              stopOpacity={theme.dark?.08:.07}/>
            <Stop offset="100%" stopColor={theme.dark?'#A1A9BB':'#FFFFFF'}
              stopOpacity={theme.dark?.11:.14}/>
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#jenlow-desktop-glass)"/>
      </Svg>
      <View pointerEvents="none" style={{position:'absolute',left:2,top:1,
        bottom:1,width:1,
        backgroundColor:theme.dark?'rgba(255,255,255,.20)':'rgba(255,255,255,.85)'}}/>
      <View style={{gap:21}}>
        <View style={{paddingHorizontal:collapsed?13:24,
          flexDirection:'row',alignItems:'center',
          justifyContent:collapsed?'center':'space-between',height:39}}>
          {!collapsed?<Text style={{fontSize:10,
            fontWeight:'700',letterSpacing:1.65,color:theme.muted}}>
            NAVIGATION
          </Text>:null}
          <Pressable onPress={()=>setCollapsed(value=>!value)}
            accessibilityRole="button"
            accessibilityLabel={collapsed?'Développer la navigation':'Réduire la navigation'}
            style={{width:32,height:32,justifyContent:'center',
              alignItems:'center',borderRadius:8}}>
            <Ionicons name={collapsed?'chevron-back-outline':'chevron-forward-outline'}
              size={17} color={theme.muted}/>
          </Pressable>
        </View>
        <View style={{gap:4}}>
          {mainLinks.map(item=><React.Fragment key={item.path}>
            {renderEntry(item)}
            {item.path==='/my-space'&&currentDream?
              <View style={{marginLeft:collapsed?10:35,marginRight:collapsed?8:13,
                marginTop:2,marginBottom:9,borderLeftWidth:collapsed?0:1,
                borderLeftColor:theme.dark?'rgba(240,240,244,.28)':
                  'rgba(92,91,100,.27)',paddingLeft:collapsed?0:8}}>
                <Pressable accessibilityRole="button"
                  accessibilityLabel={'Rêve actuel : '+currentDream.title}
                  accessibilityHint={collapsed?'Ouvrir le rêve':'Afficher ou masquer les étapes'}
                  accessibilityState={{expanded:!collapsed&&dreamTreeOpen}}
                  onPress={()=>{
                    if(collapsed)router.push({pathname:'/my-dream/[id]',
                      params:{id:currentDream.id}});
                    else setDreamTreeOpen(value=>!value);
                  }}
                  style={{flexDirection:'row',alignItems:'center',
                    gap:9,paddingVertical:8,paddingHorizontal:collapsed?2:5,
                    borderRadius:8}}>
                  {currentDream.image?<Image source={{uri:currentDream.image}}
                    resizeMode="cover" style={{
                      width:collapsed?40:31,height:collapsed?40:36,
                      borderRadius:5,backgroundColor:theme.border}}/>:
                    <View style={{width:collapsed?40:31,height:collapsed?40:36,
                      borderRadius:5,backgroundColor:theme.border,
                      alignItems:'center',justifyContent:'center'}}>
                      <Ionicons name="leaf-outline" size={17} color={theme.muted}/>
                    </View>}
                  {!collapsed?<View style={{flex:1,minWidth:0,gap:3}}>
                    <Text numberOfLines={2} style={{
                      color:theme.foreground,fontSize:12,fontWeight:'700',
                      lineHeight:16}}>{currentDream.title}</Text>
                    <Text style={{fontSize:10,color:theme.muted}}>
                      {PHASE_LABELS[currentPhase]}
                    </Text>
                  </View>:null}
                  {!collapsed?<Ionicons name={dreamTreeOpen?'chevron-up':'chevron-down'}
                    size={14} color={theme.muted}/>:null}
                </Pressable>
                {!collapsed&&dreamTreeOpen?<View style={{gap:1,marginTop:4}}>
                  {DREAM_PHASES.map((phase,index)=>{
                    const reached=index<=currentPhaseIndex;
                    const selected=currentPhase===phase;
                    const accent=phase==='Rêve'?'#B88962':
                      phase==='Initiation'?'#819D32':
                      phase==='Croissance'?'#27845B':'#CB245C';
                    const phaseNav=<Pressable key={phase} onPress={()=>openPhase(phase)}
                      disabled={!reached} accessibilityRole="button"
                      accessibilityLabel={'Ouvrir '+PHASE_LABELS[phase]}
                      accessibilityState={{selected,disabled:!reached}}
                      style={{minHeight:34,flexDirection:'row',
                        alignItems:'center',gap:8,paddingHorizontal:9,
                        borderRadius:7,opacity:reached?1:.52,
                        backgroundColor:selected?
                          (theme.dark?'rgba(255,255,255,.09)':'rgba(255,255,255,.29)'):
                          'transparent'}}>
                      <View style={{width:selected?7:5,height:selected?7:5,
                        borderRadius:5,backgroundColor:reached?accent:theme.muted}}/>
                      <Text numberOfLines={1} style={{flex:1,fontSize:12,
                        color:selected?theme.foreground:theme.muted,
                        fontWeight:selected?'700':'500'}}>
                        {PHASE_LABELS[phase]}
                      </Text>
                      {!reached?<Ionicons name="lock-closed-outline" size={11}
                        color={theme.muted}/>:null}
                    </Pressable>;
                    if(!selected||!reached)return phaseNav;
                    return <React.Fragment key={phase}>
                      {phaseNav}
                      <View style={{marginLeft:14,paddingLeft:10,
                        borderLeftWidth:1,borderLeftColor:theme.dark?
                          'rgba(255,255,255,.15)':'rgba(71,77,78,.15)',
                        gap:1,marginVertical:2}}>
                        {([
                          {kind:'library' as const,
                            title:phase==='Rêve'?'Inspirations':'Documents',
                            active:path.startsWith('/my-dream/library/')},
                          {kind:'notes' as const,title:'Notes personnelles',
                            active:path.startsWith('/my-dream/notes/')},
                        ]).map(resource=><Pressable key={resource.kind}
                          onPress={()=>openResource(resource.kind)}
                          accessibilityRole="button"
                          accessibilityState={{selected:resource.active}}
                          style={{minHeight:31,justifyContent:'center',
                            paddingHorizontal:6,borderRadius:6,
                            backgroundColor:resource.active?
                              'rgba(203,36,92,.10)':'transparent'}}>
                          <Text style={{fontSize:11,
                            fontWeight:resource.active?'700':'400',
                            color:resource.active?'#CB245C':theme.muted}}>
                            {resource.title}
                          </Text>
                        </Pressable>)}
                      </View>
                    </React.Fragment>;
                  })}
                </View>:null}
              </View>:null}
          </React.Fragment>)}
        </View>
      </View>
      <View style={{gap:12}}>
        <View style={{height:1,backgroundColor:theme.border,
          marginHorizontal:collapsed?14:24}}/>
        {renderEntry(profile)}
      </View>
    </View>;
  }
  // A real translucent overlay: the page can remain visible and scroll behind it.
  return (
    <View style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-around',
      paddingTop: 11, paddingBottom: 10,
      minHeight: 60, zIndex: 30,
      overflow: 'hidden',
      borderTopLeftRadius: 18, borderTopRightRadius: 18,
      backgroundColor: theme.dark ? 'rgba(18,29,38,0.10)' : 'rgba(239,248,251,0.10)',
      borderTopWidth: 1,
      borderColor: theme.dark ? 'rgba(221,241,250,0.26)' : 'rgba(255,255,255,0.84)',
      shadowColor: theme.dark ? '#A4D5ED' : '#7FB5C9',
      shadowOpacity: 0.21, shadowRadius: 18,
      shadowOffset: { width: 0, height: -5 }, elevation: 8,
      ...webFrost,
    }}>
      <BlurView
        pointerEvents="none"
        intensity={Platform.OS === 'ios' ? 74 : 63}
        tint={theme.dark ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'}
        // On Android 12+ native blur requires a BlurTargetView; the web/iOS
        // path blurs content directly while Android keeps a translucent surface.
        style={{position:'absolute',top:0,left:0,right:0,bottom:0}}
      />
      <Svg pointerEvents="none" width="100%" height="100%"
        style={{position:'absolute',top:0,left:0,right:0,bottom:0}}>
        <Defs>
          <LinearGradient id="nav-water" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={theme.dark ? '#CDEFFA' : '#FFFFFF'} stopOpacity={theme.dark ? .16 : .59} />
            <Stop offset=".22" stopColor={theme.dark ? '#8BBCCB' : '#D7EFF6'} stopOpacity={.11}/>
            <Stop offset=".75" stopColor={theme.dark ? '#304F60' : '#DEEDF0'} stopOpacity={.07}/>
            <Stop offset="1" stopColor={theme.dark ? '#7897AA' : '#B5D9E2'} stopOpacity={.18}/>
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#nav-water)"/>
      </Svg>
      <View pointerEvents="none" style={{
        position: 'absolute', top: 2, left: 24, right: 24, height: 1,
        backgroundColor: theme.dark ? 'rgba(255,255,255,0.27)' : 'rgba(255,255,255,0.85)',
      }} />
      {links.map(x => (
        <Pressable
          key={x.path}
          accessibilityRole="button"
          accessibilityLabel={x.title}
          accessibilityState={{ selected: x.active }}
          onPress={() => router.replace(x.path)}
          style={{ minWidth: 48, minHeight: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          {x.path === '/discover' ? (
            <View style={{
              width: 15, height: 15, borderRadius: 8,
              borderWidth: x.active ? 0 : 2, borderColor: foreground,
              backgroundColor: x.active ? '#CB245C' : 'transparent',
            }} />
          ) : x.path === '/profile' ? (
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&q=75' }}
              style={{
                width: 28, height: 28, borderRadius: 14,
                borderWidth: x.active ? 2 : 1, borderColor: x.active ? '#CB245C' : '#B2B8B9',
              }}
            />
          ) : (
            <Ionicons
              name={
                x.path === '/agenda' && x.active ? 'calendar'
                : x.path === '/music-hub' && x.active ? 'musical-note'
                : x.path === '/my-space' && x.active ? 'layers'
                : x.icon
              }
              size={24}
              color={x.active ? '#CB245C' : foreground}
            />
          )}
        </Pressable>
      ))}
    </View>
  );
}
