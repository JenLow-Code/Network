import React, { useEffect, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import Svg, { Defs, LinearGradient, Stop, Rect, Filter, FeTurbulence, FeDisplacementMap } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { router, useGlobalSearchParams, usePathname } from 'expo-router';
import { useLocale } from '@/i18n/locale';
import { useAppTheme } from '@/theme/AppTheme';
import { useDreams } from '@/domain/dreamRepository';
import { useMusicWorkspaces } from '@/domain/musicWorkspace';
import { musicNextState } from '@/domain/musicNext';
import { api } from '@/lib/api/client';
import { MusicFolderCover } from '@/components/music/MusicFolderCover';
import { NetworkMark } from '@/components/brand/NetworkMark';
import { isPublishedFlower } from '@/domain/dreamWorkspace';
import { DREAM_PHASES, PHASE_LABELS, type DreamPhase } from '@/domain/publication';
import { workspaceLayout } from '@/theme/workspaceLayout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Height reserved by the root layout for mobile navigation. */
export const MOBILE_NAV_HEIGHT=72;

/** Five durable destinations. Fire and Messages live in the global header. */
export function Nav({ placement = 'page' }: { placement?: 'page' | 'desktop' | 'root' }) {
  const theme = useAppTheme();
  const insets=useSafeAreaInsets();
  const path = usePathname();
  const { t } = useLocale();
  const {width}=useWindowDimensions();
  const desktop=Platform.OS==='web'&&workspaceLayout(width).desktop;
  const [collapsed,setCollapsed]=useState(false);
  const [dreamTreeOpen,setDreamTreeOpen]=useState(true);
  const params=useGlobalSearchParams<{view?:string;section?:string;focus?:string;tab?:string;intent?:string}>();
  const {items:dreams}=useDreams();
  const {items:musicProjects,patch:patchMusic}=useMusicWorkspaces();
  const [songTreeOpen,setSongTreeOpen]=useState(true);
  const [versionsTreeOpen,setVersionsTreeOpen]=useState(true);
  const [pendingRequests,setPendingRequests]=useState<number|null>(null);
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
  const songId=['music-workspace','music-lyrics','music-composer'].includes(segments[0])?segments[1]:
    segments[0]==='music'&&segments[1]&&segments[1]!=='new'?segments[1]:undefined;
  const currentSong=songId?musicProjects.find(song=>song.id===decodeURIComponent(songId)):undefined;
  const songState=currentSong?musicNextState(currentSong):null;
  const activeVersion=songState?.versions.find(v=>v.id===songState.activeVersionId)
    ||songState?.versions[0];
  const publishedIds=currentSong
    ? [...new Set([currentSong.publishedId,...currentSong.versions.map(v=>v.publishedId)]
        .filter((v):v is string=>!!v))]
    : [];
  const publishedKey=publishedIds.slice().sort().join('|');
  useEffect(()=>{
    let live=true;
    setPendingRequests(null);
    if(placement!=='desktop'||!desktop||!currentSong||!publishedKey)return;
    void api<{items:{trackPublicationId:string;status:string;reviewState?:string}[]}>(
      '/api/me/music-proposals?role=received',{auth:'required'})
      .then(result=>{
        if(!live)return;
        const ids=new Set(publishedKey.split('|'));
        setPendingRequests((result.items||[]).filter(proposal=>
          ids.has(proposal.trackPublicationId)&&proposal.status==='submitted'&&
          proposal.reviewState!=='archived').length);
      })
      .catch(()=>{if(live)setPendingRequests(null);});
    return()=>{live=false;};
  },[placement,desktop,currentSong?.id,publishedKey,path,params.tab]);
  const openMusicArea=(tab:'capture'|'create'|'collaborate',
    intent?:'new-version'|'write'|'upload'|'play'|'record')=>{
    if(!currentSong)return;
    router.replace({pathname:'/music-workspace/[id]',
      params:{id:currentSong.id,tab,...(intent?{intent}:{})}});
  };
  const openPhase=(phase:DreamPhase)=>{
    if(!currentDream||DREAM_PHASES.indexOf(phase)>currentPhaseIndex)return;
    if(phase==='Témoignage'&&!isPublishedFlower(currentDream)){
      router.replace({pathname:'/my-dream/flower/[id]',params:{id:currentDream.id}});
      return;
    }
    router.replace({pathname:'/my-dream/[id]',params:{id:currentDream.id,view:phase}});
  };
  const openResource=(kind:'notes'|'library'|'resources',
    phase:DreamPhase)=>{
    if(!currentDream)return;
    const id=currentDream.id;
    if(kind==='resources'){
      router.replace({pathname:'/my-dream/[id]',
        params:{id,view:phase,focus:'resources'}});
    }else {
      router.replace({pathname:kind==='notes'?'/my-dream/notes/[id]':
        '/my-dream/library/[id]',
        params:{id,view:phase,section:kind==='library'?'all':'notes'}});
    }
  };
  const openMusicVersion=(versionId:string)=>{
    if(!currentSong||!songState)return;
    patchMusic(currentSong.id,{musicNext:{...songState,activeVersionId:versionId}});
    openMusicArea('create');
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
  // Mobile navigation is rendered ONCE by app/_layout, outside page ScrollViews.
  // Existing page-level <Nav/> calls become inert; otherwise the bar scrolls
  // with its page and overlays items at unpredictable positions.
  if(placement==='page'||(placement==='root'&&desktop))return null;
  if(placement==='desktop') {
    const mainLinks=links.filter(x=>x.path!=='/profile');
    const profile=links.find(x=>x.path==='/profile')!;
    const activeColor='#CB245C';
    // Desktop-only translucent glass with actual dream imagery behind the navigation.
    // The content remains legible over a soft, context-aware colour wash.
    const navSurface=theme.dark?'rgba(12,21,20,.40)':'rgba(248,249,245,.29)';
    
    const selectedBg=theme.dark?'rgba(215,65,127,.20)':'rgba(203,36,92,.075)';
    // The dream cover is rendered *inside* the desktop navigation surface:
    // a sibling column cannot blur imagery painted only in the workspace.
    const glassEffects=Platform.OS==='web'?({
      backdropFilter:'blur(24px) saturate(155%)',
      WebkitBackdropFilter:'blur(24px) saturate(155%)',
      boxShadow:theme.dark
        ?'inset 1px 0 0 rgba(255,255,255,.10), -8px 0 30px rgba(3,10,9,.10)'
        :'inset 1px 0 0 rgba(255,255,255,.22), -8px 0 30px rgba(18,31,27,.055)',
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
        <Ionicons name={item.path==='/discover'?'ellipse-outline':
          item.path==='/profile'?'person-outline':item.icon}
          size={19} color={item.active?activeColor:theme.muted}/>
        {!collapsed?<Text numberOfLines={1} style={{
          color:item.active?activeColor:theme.foreground,
          fontSize:14,fontWeight:item.active?'700':'500',flex:1}}>
          {item.title}
        </Text>:null}
      </Pressable>;
    return <View accessibilityRole="navigation" style={{
      width:collapsed?72:236,minWidth:collapsed?72:236,
      height:'100%',minHeight:0,flexShrink:0,backgroundColor:navSurface,
      borderLeftWidth:0,
      paddingTop:28,paddingBottom:Math.max(6,insets.bottom+6),
      overflow:'hidden',...glassEffects,
    }}>
      {currentDream?.image?<Image pointerEvents="none"
        source={{uri:currentDream.image}} resizeMode="cover"
        style={{position:'absolute',top:-28,bottom:-28,left:-28,right:-28,
          width:'125%',height:'110%',
          opacity:theme.dark?.26:.32,
          ...(Platform.OS==='web'?({filter:'blur(28px) saturate(125%)'} as any):{})}}/>:null}
      <BlurView pointerEvents="none" intensity={25}
        tint={theme.dark?'systemUltraThinMaterialDark':'systemUltraThinMaterialLight'}
        style={{position:'absolute',top:0,left:0,right:0,bottom:0,
          opacity:theme.dark?.10:.07}}/>
      <Svg pointerEvents="none" width="100%" height="100%"
        style={{position:'absolute',top:0,right:0,bottom:0,left:0}}>
        <Defs>
          <LinearGradient id="jenlow-premium-desktop-glass"
            x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={theme.dark?'#102522':'#FAFAF8'}
              stopOpacity={theme.dark?.43:.40}/>
            <Stop offset="43%" stopColor={theme.dark?'#182923':'#E8ECE7'}
              stopOpacity={theme.dark?.18:.19}/>
            <Stop offset="100%" stopColor={theme.dark?'#16201E':'#F8F9F5'}
              stopOpacity={theme.dark?.53:.44}/>
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#jenlow-premium-desktop-glass)"/>
      </Svg>
      <View style={{flex:1,minHeight:0,gap:16}}>
        <View style={{paddingHorizontal:collapsed?13:20,
          flexDirection:'row',alignItems:'center',
          justifyContent:collapsed?'center':'space-between',height:43}}>
          {!collapsed?<Pressable onPress={()=>router.replace('/discover')}
            accessibilityRole="button" accessibilityLabel="JenLow · Accueil Découvrir"
            style={{flexDirection:'row',alignItems:'center',gap:9,
              paddingVertical:8,paddingHorizontal:2}}>
            <NetworkMark size={19} color="#CB245C"/>
            <Text style={{fontWeight:'800',fontSize:15,letterSpacing:1.7,
              color:theme.foreground}}>JENLOW</Text>
          </Pressable>:null}
          <Pressable onPress={()=>setCollapsed(value=>!value)}
            accessibilityRole="button"
            accessibilityLabel={collapsed?'Développer la navigation':'Réduire la navigation'}
            style={{width:32,height:32,justifyContent:'center',
              alignItems:'center',borderRadius:8}}>
            <Ionicons name={collapsed?'chevron-back-outline':'chevron-forward-outline'}
              size={17} color={theme.muted}/>
          </Pressable>
        </View>
        <ScrollView style={{flex:1,minHeight:0}} nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{gap:4,paddingBottom:12}}>
          {mainLinks.map(item=><React.Fragment key={item.path}>
            {renderEntry(item)}
            {item.path==='/music-hub'&&currentSong?
              <View style={{marginLeft:collapsed?10:35,
                marginRight:collapsed?8:13,marginBottom:8,
                borderLeftWidth:collapsed?0:1,
                borderLeftColor:theme.dark?'rgba(240,240,244,.27)':
                  'rgba(73,77,82,.24)',
                paddingLeft:collapsed?0:8}}>
                <Pressable accessibilityRole="button"
                  accessibilityLabel={'Morceau actuel : '+currentSong.title}
                  accessibilityState={{expanded:!collapsed&&songTreeOpen}}
                  onPress={()=>{
                    if(collapsed)router.replace({pathname:'/music-workspace/[id]',
                      params:{id:currentSong.id}});
                    else setSongTreeOpen(value=>!value);
                  }}
                  style={{flexDirection:'row',alignItems:'center',gap:9,
                    paddingVertical:7,paddingHorizontal:collapsed?2:5}}>
                  <MusicFolderCover project={currentSong} size={collapsed?39:34}/>
                  {!collapsed?<View style={{flex:1,gap:3,minWidth:0}}>
                    <Text style={{fontWeight:'700',fontSize:12,
                      color:theme.foreground}} numberOfLines={2}>
                      {currentSong.title}
                    </Text>
                    <Text style={{fontSize:10,color:theme.muted}}
                      numberOfLines={1}>
                      {songState?.versions.length
                        ? songState.versions.length+' version'+
                          (songState.versions.length>1?'s':'')
                        : 'Aucune version'}
                    </Text>
                  </View>:null}
                  {!collapsed?<Ionicons
                    name={songTreeOpen?'chevron-up':'chevron-down'}
                    color={theme.muted} size={14}/>:null}
                </Pressable>
                {!collapsed&&songTreeOpen?<View style={{marginLeft:10,
                  paddingLeft:9,borderLeftWidth:1,borderLeftColor:theme.border,
                  gap:2,marginBottom:4}}>
                  <Pressable accessibilityRole="button"
                    accessibilityLabel="Ouvrir Capturer"
                    accessibilityState={{selected:params.tab==='capture'&&path.startsWith('/music-workspace/')}}
                    onPress={()=>openMusicArea('capture')}
                    style={{minHeight:36,flexDirection:'row',alignItems:'center',
                      gap:9,paddingHorizontal:7,borderRadius:7}}>
                    <Ionicons name="mic-outline" size={16} color={theme.foreground}/>
                    <Text style={{fontSize:11,fontWeight:'700',color:theme.foreground}}>Capturer</Text>
                  </Pressable>
                  {([
                    {key:'thought',title:'Pensées · notes et paroles',icon:'chatbox-ellipses-outline'},
                    {key:'record',title:'Son · enregistrer',icon:'mic-circle-outline'},
                    {key:'doc',title:'Document · importer',icon:'document-text-outline'},
                    {key:'idea',title:'Idée · clavier et pads',icon:'bulb-outline'},
                  ] as const).map(action=>{
                    const active=action.key==='thought'?path.startsWith('/music-lyrics/'):
                      action.key==='idea'?path.startsWith('/music-composer/'):
                      path.startsWith('/music-workspace/')&&params.intent===(action.key==='doc'?'upload':'record');
                    return <Pressable key={action.key}
                      onPress={()=>{
                        if(action.key==='thought')router.push({pathname:'/music-lyrics/[id]',params:{id:currentSong.id}});
                        else if(action.key==='idea')router.push({pathname:'/music-composer/[id]',params:{id:currentSong.id}});
                        else openMusicArea('capture',action.key==='doc'?'upload':'record');
                      }}
                      accessibilityRole="button" accessibilityLabel={action.title}
                      accessibilityState={{selected:active}}
                      style={{minHeight:34,flexDirection:'row',alignItems:'center',gap:9,
                        paddingHorizontal:7,borderRadius:7,
                        backgroundColor:active?'rgba(203,36,92,.10)':'transparent'}}>
                      <Ionicons name={action.icon} size={16}
                        color={active?'#CB245C':theme.muted}/>
                      <Text numberOfLines={1} style={{flex:1,minWidth:0,fontSize:11,
                        fontWeight:active?'700':'500',
                        color:active?'#CB245C':theme.foreground}}>{action.title}</Text>
                    </Pressable>;
                  })}
                  <View style={{flexDirection:'row',alignItems:'center'}}>
                    <Pressable accessibilityRole="button"
                      accessibilityLabel="Ouvrir les versions du morceau"
                      onPress={()=>{setVersionsTreeOpen(true);openMusicArea('create');}}
                      style={{flex:1,minWidth:0,minHeight:34,flexDirection:'row',
                        alignItems:'center',gap:8,paddingHorizontal:7}}>
                      <Ionicons name="albums-outline" size={15}
                        color={params.tab==='create'?'#CB245C':theme.muted}/>
                      <Text numberOfLines={1} style={{fontSize:11,
                        fontWeight:params.tab==='create'?'700':'500',
                        color:params.tab==='create'?'#CB245C':theme.foreground}}>
                        Versions
                      </Text>
                      <Text style={{fontSize:10,color:theme.muted}}>
                        {songState?.versions.length||0}
                      </Text>
                    </Pressable>
                    <Pressable accessibilityRole="button"
                      accessibilityLabel="Nouvelle version"
                      onPress={()=>openMusicArea('capture','new-version')}
                      style={{minHeight:34,minWidth:24,alignItems:'center',
                        justifyContent:'center'}}>
                      <Ionicons name="add" size={17} color={theme.muted}/>
                    </Pressable>
                    <Pressable accessibilityRole="button"
                      accessibilityLabel={versionsTreeOpen?'Masquer les versions':'Afficher les versions'}
                      accessibilityState={{expanded:versionsTreeOpen}}
                      onPress={()=>setVersionsTreeOpen(open=>!open)}
                      style={{minHeight:34,minWidth:28,alignItems:'center',
                        justifyContent:'center'}}>
                      <Ionicons name={versionsTreeOpen?'chevron-up':'chevron-down'}
                        size={13} color={theme.muted}/>
                    </Pressable>
                  </View>
                  {versionsTreeOpen?<View style={{marginLeft:13,paddingLeft:8,
                    borderLeftWidth:1,borderLeftColor:theme.border,gap:1}}>
                    {songState?.versions.length?songState.versions.map(version=>{
                      const active=version.id===activeVersion?.id&&params.tab==='create';
                      return <Pressable key={version.id} accessibilityRole="button"
                        accessibilityLabel={'Ouvrir '+version.title}
                        accessibilityState={{selected:active}}
                        onPress={()=>openMusicVersion(version.id)}
                        style={{minHeight:30,justifyContent:'center',
                          paddingHorizontal:7,borderRadius:7,
                          backgroundColor:active?'rgba(203,36,92,.12)':'transparent'}}>
                        <Text numberOfLines={1} style={{fontSize:11,
                          fontWeight:active?'700':'400',
                          color:active?'#CB245C':theme.muted}}>{version.title}</Text>
                      </Pressable>;
                    }):<Text style={{fontSize:11,color:theme.muted,
                      paddingHorizontal:7,paddingVertical:6}}>Aucune version</Text>}
                  </View>:null}
                  <Pressable accessibilityRole="button"
                    accessibilityLabel={'Demandes de collaboration'+
                      (pendingRequests?' · '+pendingRequests+' en attente':'')}
                    accessibilityState={{selected:params.tab==='collaborate'}}
                    onPress={()=>openMusicArea('collaborate')}
                    style={{minHeight:36,flexDirection:'row',alignItems:'center',gap:8,
                      paddingHorizontal:7,borderRadius:7,
                      backgroundColor:params.tab==='collaborate'?
                        'rgba(203,36,92,.10)':'transparent'}}>
                    <Ionicons name="people-outline" size={15}
                      color={params.tab==='collaborate'?'#CB245C':theme.muted}/>
                    <Text numberOfLines={1} style={{flex:1,minWidth:0,fontSize:11,
                      fontWeight:params.tab==='collaborate'?'700':'500',
                      color:params.tab==='collaborate'?'#CB245C':theme.foreground}}>
                      Demandes reçues
                    </Text>
                    {pendingRequests!==null&&pendingRequests>0?
                      <View style={{minWidth:18,height:18,borderRadius:9,
                        paddingHorizontal:4,backgroundColor:'#CB245C',
                        alignItems:'center',justifyContent:'center'}}>
                        <Text style={{color:'#FFFFFF',fontSize:10,fontWeight:'700'}}>
                          {pendingRequests}
                        </Text>
                      </View>:null}
                  </Pressable>
                </View>:null}
              </View>:null}
            {item.path==='/my-space'&&currentDream?
              <View style={{marginLeft:collapsed?10:35,marginRight:collapsed?8:13,
                marginTop:2,marginBottom:9,borderLeftWidth:collapsed?0:1,
                borderLeftColor:theme.dark?'rgba(240,240,244,.18)':
                  'rgba(92,91,100,.14)',paddingLeft:collapsed?0:8}}>
                <Pressable accessibilityRole="button"
                  accessibilityLabel={'Rêve actuel : '+currentDream.title}
                  {...(Platform.OS==='web'?({title:currentDream.title} as any):{})}
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
                    const activeChapter=currentDream.phase===phase;
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
                        fontWeight:selected?'700':'500',
                        fontStyle:reached&&!activeChapter?'italic':'normal'}}>
                        {PHASE_LABELS[phase]}
                      </Text>
                      {!reached?<Ionicons name="lock-closed-outline" size={11}
                        color={theme.muted}/>:null}
                    </Pressable>;
                    // Only the dream's actual current chapter owns navigation children.
                    // Browsing historical read-only phases must not open duplicate submenus.
                    // Semence only exposes personal notes as a workspace shortcut.
                    if(!reached||!activeChapter||phase==='Rêve')return phaseNav;
                    return <React.Fragment key={phase}>
                      {phaseNav}
                      <View style={{marginLeft:14,paddingLeft:10,
                        borderLeftWidth:1,borderLeftColor:theme.dark?
                          'rgba(255,255,255,.15)':'rgba(71,77,78,.15)',
                        gap:1,marginVertical:2}}>
                        {(phase==='Initiation'?[
                            {kind:'notes' as const,title:'Notes personnelles'},
                          ]:[
                            {kind:'library' as const,title:'Documents & Inspirations'},
                            {kind:'resources' as const,title:'Ressources'},
                            {kind:'notes' as const,title:'Notes personnelles'},
                          ]).map(resource=>{
                            const active=phase===currentPhase&&(
                              resource.kind==='notes'&&path.startsWith('/my-dream/notes/')||
                              resource.kind==='library'&&path.startsWith('/my-dream/library/')||
                              resource.kind==='resources'&&params.section==='resources'||
                              resource.kind==='resources'&&params.focus==='resources'
                            );
                            return <Pressable key={resource.kind}
                              onPress={()=>openResource(resource.kind,phase)}
                              accessibilityRole="button"
                              accessibilityLabel={resource.title+' · '+PHASE_LABELS[phase]}
                              accessibilityState={{selected:active}}
                              style={{minHeight:34,justifyContent:'center',
                                paddingHorizontal:6,borderRadius:6,
                                backgroundColor:active?
                                  'rgba(203,36,92,.10)':'transparent'}}>
                              <Text style={{fontSize:11,lineHeight:16,
                                fontWeight:active?'700':'500',
                                color:active?'#CB245C':theme.muted}}>
                                {resource.title}
                              </Text>
                            </Pressable>;
                          })}
                      </View>
                    </React.Fragment>;
                  })}
                </View>:null}
              </View>:null}
          </React.Fragment>)}
        </ScrollView>
      </View>
      <View style={{gap:12,flexShrink:0,marginTop:12}}>
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
      paddingTop: 10, paddingBottom: 8 + insets.bottom,
      height: MOBILE_NAV_HEIGHT + insets.bottom, zIndex: 30,
      overflow: 'hidden',
      borderTopLeftRadius: 18, borderTopRightRadius: 18,
      backgroundColor: theme.dark ? 'rgba(18,29,38,0.10)' : 'rgba(239,248,251,0.10)',
      borderTopWidth: 0,
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

      {links.map(x => (
        <Pressable
          key={x.path}
          accessibilityRole="button"
          accessibilityLabel={x.title}
          accessibilityState={{ selected: x.active }}
          onPress={() => router.replace(x.path)}
          style={{ minWidth: 48, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
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
