import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, PanResponder, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import { isPublishedFlower, type DreamEntry } from '@/domain/dreamWorkspace';
import type { DreamPhase } from '@/domain/publication';
import { useDreams } from '@/domain/dreamRepository';
import { useAppTheme } from '@/theme/AppTheme';
import {workspaceCanvas,workspaceLayout} from '@/theme/workspaceLayout';
import DreamQuickActions from '@/components/dream/DreamQuickActions';
import {DreamPhaseIcon} from '@/icons/DreamPhaseIcon';

type ViewFilter = 'Liste' | 'Grille';
type RoleFilter = 'all' | 'frozen' | 'creator' | 'co_owner' | 'participant';
const ROLE_OPTIONS: {key:RoleFilter;label:string;empty:string}[] = [
  {key:'all',label:'Tous les projets',empty:'Tout commence par une semence'},
  {key:'frozen',label:'Congelés',empty:'Aucun projet congelé pour le moment'},
  {key:'creator',label:'Créés par moi',empty:'Aucun projet créé pour le moment'},
  {key:'co_owner',label:'Co-propriétaire',empty:'Aucun projet en copropriété pour le moment'},
  {key:'participant',label:'Mes participations',empty:'Aucune participation pour le moment'},
];
/** Derived from trusted membership when connected; local dreams belong to the creator.
 * Never derive participant status from encouragements, prayers or "Moi aussi".
 */
const viewerRole = (dream:DreamEntry) => dream.viewerRole || 'creator';
// Published fruits appear in the gallery; these panels show unpublished projects.
// Phase identity combines a light illustration, horizontal lettering and a left-to-right colour wash.
const phasePanels: {
  phase: DreamPhase; title: string; lightTint: string; darkTint: string;
  lightBorder: string; darkBorder: string; accent: string;
}[] = [
  {
    phase: 'Rêve', title: 'Mes semences',
    lightTint: 'rgba(166,114,76,0.055)', darkTint: 'rgba(190,138,93,0.13)',
    lightBorder: 'rgba(166,114,76,0.10)', darkBorder: 'rgba(190,138,93,0.21)',
    accent: '#B88962',
  },
  {
    phase: 'Initiation', title: 'En germination',
    lightTint: 'rgba(154,185,64,0.062)', darkTint: 'rgba(154,185,64,0.12)',
    lightBorder: 'rgba(134,164,53,0.11)', darkBorder: 'rgba(154,185,64,0.19)',
    accent: '#A1BA44',
  },
  {
    phase: 'Croissance', title: 'En croissance',
    lightTint: 'rgba(39,132,91,0.052)', darkTint: 'rgba(47,153,107,0.12)',
    lightBorder: 'rgba(39,132,91,0.10)', darkBorder: 'rgba(47,153,107,0.20)',
    accent: '#27845B',
  },
  {
    phase: 'Témoignage', title: 'En floraison',
    lightTint: 'rgba(215,29,119,0.047)', darkTint: 'rgba(215,29,119,0.115)',
    lightBorder: 'rgba(215,29,119,0.10)', darkBorder: 'rgba(215,29,119,0.19)',
    accent: '#D71D77',
  },
];
/** In "Tout", active dreams open their current workspace directly.
 * Published Fruit remains the intentional immersive result cover. */
const open = (dream: DreamEntry) => {
  if (dream.phase === 'Témoignage') {
    if (isPublishedFlower(dream)) router.push({pathname:'/my-dream/[id]',params:{id:dream.id}});
    else router.push({pathname:'/my-dream/flower/[id]',params:{id:dream.id}});
  } else {
    router.push({pathname:'/my-dream/[id]',params:{id:dream.id,view:dream.phase}});
  }
};
const frozen = (dream: DreamEntry) =>
  (dream.phase === 'Initiation' || dream.phase === 'Croissance') &&
  !!dream.paused && !!dream.pauseUntil &&
  dream.pauseUntil >= new Date().toISOString().slice(0, 10);
const coverImage = (d: DreamEntry) => {
  if (d.phase !== 'Témoignage') return d.image;
  return isPublishedFlower(d)
    ? d.resultImage || d.image
    : d.flowerDraft?.attachments?.find(media=>media.kind==='photo')?.uri || d.image;
};

function PictureCard({ dream, width, height, onLongPress, presentation = 'card' }: {
  dream: DreamEntry; width: number; height: number; onLongPress:()=>void;
  presentation?: 'card' | 'banner' | 'phase';
}) {
  const theme = useAppTheme();
  const photo = coverImage(dream);
  const isBanner = presentation === 'banner';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={'Ouvrir ' + dream.title}
      onPress={() => open(dream)} onLongPress={onLongPress} delayLongPress={460}
      accessibilityHint="Maintenir pour voir les actions et la date objectif"
      style={{ width, height, borderRadius: isBanner || presentation === 'phase' ? 0 : 11, overflow: 'hidden', backgroundColor: theme.surface }}>
      {photo ? <Image source={{ uri: photo }} resizeMode="cover" style={{ width: '100%', height: '100%' }} /> : null}
      {isBanner ? (
        <Svg pointerEvents="none" width="100%" height="100%" style={{
          position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
        }}>
          <Defs>
            <LinearGradient id="fruit-banner-shade" x1="0%" y1="0%" x2="100%" y2="0%">
              {/* Readable light left side, unobstructed photography on the right. */}
              <Stop offset="0%" stopColor={theme.dark?'#141414':'#FAF8F5'} stopOpacity={0.99}/>
              <Stop offset={width<600?'66%':'44%'}
                stopColor={theme.dark?'#141414':'#FAF8F5'} stopOpacity={width<600?0.94:0.9}/>
              <Stop offset={width<600?'100%':'72%'}
                stopColor={theme.dark?'#141414':'#FAF8F5'} stopOpacity={width<600?0.66:0.24}/>
              <Stop offset="100%" stopColor={theme.dark?'#141414':'#FAF8F5'}
                stopOpacity={width<600?0.66:0.01}/>
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#fruit-banner-shade)" />
        </Svg>
      ) : (
        <View pointerEvents="none" style={{
          position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
          backgroundColor: 'rgba(0,0,0,0.24)',
        }} />
      )}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: isBanner ? (width < 540 ? 20 : width < 800 ? 30 : 46) : 13,
        paddingTop: isBanner ? 12 : 36,
        paddingBottom: isBanner ? (width < 540 ? 78 : 81) : 12,
        backgroundColor: isBanner ? 'transparent' : 'rgba(0,0,0,0.30)',
      }}>
        {!isBanner && isPublishedFlower(dream) ? (
          <View style={{flexDirection:'row',alignItems:'center',gap:5,marginBottom:6}}>
            <Ionicons name="nutrition-outline" size={13} color="#F3D9AD"/>
            <Text style={{color:'#F7E7C7',fontSize:10,fontWeight:'700',letterSpacing:1.1}}>FRUIT</Text>
          </View>
        ) : null}
        <Text style={{
          fontFamily:isBanner?'Georgia':undefined,
          fontSize:isBanner?(width<380?27:width<540?32:width<780?38:46)
            :(width<230?13:18),
          lineHeight:isBanner?(width<380?34:width<540?40:width<780?47:56)
            :(width<230?18:24),
          letterSpacing:isBanner?-0.8:0,
          color:isBanner?(theme.dark?'#FFFFFF':'#181716'):'#FFFFFF',
          fontWeight:isBanner?'400':'800',
          textShadowColor:'transparent',textShadowRadius:0,
        }} numberOfLines={isBanner?2:3}>{dream.title}</Text>
        {isBanner ? (
          <Text numberOfLines={2} style={{
            color:theme.dark?'#F8F7F6':'#282523',
            fontSize:width<540?12:15,lineHeight:width<540?18:23,
            marginTop:width<540?7:11,
            maxWidth:width<540?'98%':'68%',
            fontWeight:'400',textShadowColor:'transparent',
            textShadowRadius:0,
          }}>{dream.testimony?.comment || dream.summary ||
            'Une histoire accomplie, à découvrir et à partager.'}</Text>
        ) : null}
        {isBanner ? (
          <View style={{flexDirection:'row',alignItems:'center',gap:7,marginTop:width<540?13:18}}>
            <Text style={{color:theme.dark?'#FFFFFF':'#181716',
              fontSize:width<540?11:12,fontWeight:'600'}}>
              Découvrir cette histoire
            </Text>
            <Ionicons name="arrow-forward-outline" size={width<540?15:17}
              color={theme.dark?'#FFFFFF':'#181716'}/>
          </View>
        ) : null}
      </View>
      {frozen(dream) ? (
        <View style={{
          position: 'absolute', top: 11, right: 11, width: 27, height: 27,
          borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.90)',
          justifyContent: 'center', alignItems: 'center',
        }}>
          <Ionicons name="snow" size={16} color="#427FA6" />
        </View>
      ) : null}
    </Pressable>
  );
}


/** Layered project cards: one foreground card, the next visibly tucked
 * underneath it, with horizontal swipe/scroll and explicit mouse arrows.
 * Confined to the existing phase panel, without changing its dimensions. */
function PhaseProjectCarousel({dreams,cardWidth,cardHeight,viewportWidth,gap,compact,onLongPress}:{
  dreams:DreamEntry[];cardWidth:number;cardHeight:number;viewportWidth:number;
  gap:number;compact:boolean;onLongPress:(dream:DreamEntry)=>void;
}){
  const theme=useAppTheme();
  const scrollRef=useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [position,setPosition]=useState(0);
  const identities=dreams.map(d=>d.id).join('|');
  const visibleCardWidth=dreams.length===1?viewportWidth:cardWidth;
  const step=visibleCardWidth+gap;
  const lastPosition=Math.max(0,dreams.length-1);
  const contentWidth=dreams.length*visibleCardWidth+Math.max(0,dreams.length-1)*gap;
  const maxOffset=Math.max(0,contentWidth-viewportWidth);
  useEffect(()=>{
    scrollRef.current?.scrollTo({x:0,animated:false});
    setPosition(0);
  },[identities,visibleCardWidth,viewportWidth]);
  const go=(direction:number)=>{
    const next=Math.max(0,Math.min(lastPosition,position+direction));
    scrollRef.current?.scrollTo({x:Math.min(maxOffset,next*step),animated:true});
    setPosition(next);
  };
  return <View style={{width:'100%',gap:9}}>
    <ScrollView ref={scrollRef} horizontal decelerationRate="fast"
      snapToInterval={step} showsHorizontalScrollIndicator={false}
      scrollEventThrottle={32}
      onScroll={e=>{
        const offset=e.nativeEvent.contentOffset.x;
        const next=maxOffset>0 && offset>=maxOffset-1?lastPosition:
          Math.max(0,Math.min(lastPosition,Math.round(offset/step)));
        setPosition(current=>current===next?current:next);
      }}
      style={{width:'100%',flexGrow:0}}
      contentContainerStyle={{gap}}>
      {dreams.map(d=><PictureCard key={d.id} dream={d}
        width={visibleCardWidth} height={cardHeight} presentation="phase"
        onLongPress={()=>onLongPress(d)}/>)}
    </ScrollView>
    {dreams.length>1?(
      <View style={{flexDirection:'row',alignItems:'center',
        justifyContent:'flex-end',minHeight:27}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:7}}>
          <Text style={{fontSize:10,color:theme.muted,
            fontVariant:['tabular-nums']}}>
            {position+1} / {dreams.length}
          </Text>
          {([-1,1] as const).map(direction=>{
            const disabled=direction<0?position===0:position===lastPosition;
            return <Pressable key={direction} disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={direction<0?'Projets précédents':'Projets suivants'}
              accessibilityState={{disabled}}
              onPress={()=>go(direction)}
              style={{width:27,height:27,borderRadius:14,borderWidth:1,
                borderColor:theme.border,backgroundColor:theme.surface,
                justifyContent:'center',alignItems:'center',
                opacity:disabled?.37:1}}>
              <Ionicons name={direction<0?'chevron-back':'chevron-forward'}
                size={15} color={theme.foreground}/>
            </Pressable>;
          })}
        </View>
      </View>
    ):null}
  </View>;
}


/**
 * A single, foreground project and the edge of the next project underneath:
 * discoverable horizontal swiping in each phase, not vertical stacks.
 * Kept inside the slim phase banner to preserve swipe gestures.
 */
function PhaseMobileOverlap({dreams,viewportWidth,cardHeight,onLongPress}:{
  dreams:DreamEntry[];viewportWidth:number;cardHeight:number;
  onLongPress:(dream:DreamEntry)=>void;
}){
  const theme=useAppTheme();
  const [current,setCurrent]=useState(0);
  const currentRef=useRef(current);
  currentRef.current=current;
  const busy=useRef(false);
  const dragX=useRef(new Animated.Value(0)).current;
  const ids=dreams.map(d=>d.id).join('|');
  const lastIndex=Math.max(0,dreams.length-1);
  const lastIndexRef=useRef(lastIndex);
  lastIndexRef.current=lastIndex;
  const frontWidth=dreams.length>1
    ?Math.max(64,Math.round(viewportWidth*.83)):viewportWidth;
  const peekInset=10;

  useEffect(()=>{
    currentRef.current=0;
    setCurrent(0);
    dragX.stopAnimation();
    dragX.setValue(0);
    busy.current=false;
  },[ids,viewportWidth,dragX]);

  // Intercept horizontal drags from the nested project card while leaving
  // vertical page scrolling and ordinary project taps untouched.
  const switchTo=(next:number,direction:number)=>{
    if(busy.current||next===currentRef.current)return;
    busy.current=true;
    Animated.timing(dragX,{
      toValue:direction*viewportWidth,duration:140,
      useNativeDriver:false,
    }).start(()=>{
      currentRef.current=next;
      setCurrent(next);
      dragX.setValue(0);
      busy.current=false;
    });
  };
  const snapBack=()=>{
    Animated.spring(dragX,{
      toValue:0,tension:100,friction:12,useNativeDriver:false,
    }).start();
  };
  const panResponder=React.useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder:()=>false,
    onMoveShouldSetPanResponderCapture:(_,g)=>
      Math.abs(g.dx)>10&&Math.abs(g.dx)>Math.abs(g.dy)*1.3,
    onMoveShouldSetPanResponder:(_,g)=>
      Math.abs(g.dx)>10&&Math.abs(g.dx)>Math.abs(g.dy)*1.3,
    onPanResponderTerminationRequest:()=>false,
    onPanResponderMove:(_,g)=>{
      if(!busy.current)dragX.setValue(
        Math.max(-viewportWidth,Math.min(viewportWidth,g.dx)));
    },
    onPanResponderRelease:(_,g)=>{
      const distance=Math.min(36,viewportWidth*.22);
      if(g.dx<-distance&&currentRef.current<lastIndexRef.current)
        switchTo(currentRef.current+1,-1);
      else if(g.dx>distance&&currentRef.current>0)
        switchTo(currentRef.current-1,1);
      else snapBack();
    },
    onPanResponderTerminate:()=>snapBack(),
  }),[dragX,viewportWidth]);

  const nextDream=dreams[current+1];
  const nextPhoto=nextDream?coverImage(nextDream):undefined;
  const activeDream=dreams[current];
  if(!activeDream)return null;
  return <View style={{width:'100%',gap:4}}>
    <View {...panResponder.panHandlers}
      style={[{width:viewportWidth,height:cardHeight,
        overflow:'hidden',position:'relative'},
        Platform.OS==='web'?({touchAction:'pan-y'} as any):undefined]}>
      {nextDream?<View pointerEvents="none" accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={{position:'absolute',left:frontWidth-peekInset,right:0,
          top:5,bottom:5,borderRadius:0,overflow:'hidden',
          backgroundColor:theme.surface}}>
        {nextPhoto?<Image source={{uri:nextPhoto}} resizeMode="cover"
          style={{width:'100%',height:'100%'}}/>:null}
      </View>:null}
      <Animated.View style={{position:'absolute',top:0,left:0,
        transform:[{translateX:dragX}]}}>
        <PictureCard dream={activeDream} width={frontWidth}
          height={cardHeight} presentation="phase"
          onLongPress={()=>onLongPress(activeDream)}/>
      </Animated.View>
    </View>
    {dreams.length>1?(
      <View style={{minHeight:28,flexDirection:'row',
        alignItems:'center',justifyContent:'flex-end',gap:4}}>
        <Text style={{fontSize:10,fontWeight:'500',
          color:theme.dark?'#FFFFFF':'#000000',
          fontVariant:['tabular-nums'],marginRight:3}}>
          {current+1}/{dreams.length}
        </Text>
        {([-1,1] as const).map(direction=>{
          const disabled=direction<0?current===0:current===lastIndex;
          return <Pressable key={direction}
            onPress={()=>switchTo(currentRef.current+direction,direction<0?1:-1)}
            disabled={disabled} accessibilityRole="button"
            accessibilityLabel={direction<0?'Projet précédent':'Projet suivant'}
            accessibilityState={{disabled}}
            style={{width:27,height:28,justifyContent:'center',
              alignItems:'center',opacity:disabled?.35:1}}>
            <Ionicons name={direction<0?'chevron-back':'chevron-forward'}
              size={16} color={theme.dark?'#FFFFFF':'#000000'}/>
          </Pressable>;
        })}
      </View>
    ):null}
  </View>;
}

function DreamListRow({ dream, onLongPress }: { dream: DreamEntry; onLongPress:()=>void }) {
  const theme = useAppTheme();
  const photo = coverImage(dream);
  return (
    <Pressable accessibilityRole="button" onLongPress={onLongPress} delayLongPress={460}
      accessibilityHint="Maintenir pour voir les actions du rêve" onPress={() => {
      if(dream.phase==='Témoignage') { open(dream); return; }
      router.push({pathname:'/my-dream/[id]',params:{id:dream.id,view:dream.phase}});
    }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 13,
        paddingVertical: 12, borderBottomWidth: 1, borderColor: theme.border }}>
      {photo ? <Image source={{ uri: photo }} style={{ width: 61, height: 61, borderRadius: 8 }} /> :
        <View style={{ width: 61, height: 61, borderRadius: 8, backgroundColor: theme.surface }} />}
      <View style={{ flex: 1, gap: 5 }}>
        <Text numberOfLines={2} style={{ fontSize: 14, lineHeight: 19,
          fontWeight: '700', color: theme.foreground }}>{dream.title}</Text>
        <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 11 }}>
          {frozen(dream) ? 'Congelé jusqu’au ' + dream.pauseUntil : dream.summary || 'Ouvrir mon projet'}
        </Text>
      </View>
      {frozen(dream) ? <Ionicons name="snow" size={17} color="#427FA6" /> : null}
      <Ionicons name="chevron-forward" size={16} color={theme.muted} />
    </Pressable>
  );
}

export default function MySpace() {
  const theme = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const compact = windowWidth < 600;
  const ws=workspaceLayout(windowWidth);
  const { items } = useDreams();
  const [view, setView] = useState<ViewFilter>('Grille');
  const [roleFilter,setRoleFilter]=useState<RoleFilter>('all');
  const [roleMenuOpen,setRoleMenuOpen]=useState(false);
  const [activeTestimony, setActiveTestimony] = useState(0);
  const galleryRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [longDream,setLongDream]=useState<DreamEntry|null>(null);
  // Read the actual centered canvas width, never infer the sidebar width.
  const [measuredCanvasWidth,setMeasuredCanvasWidth]=useState(0);
  const side=ws.contentGutter;
  const right=ws.gutter;
  // The hero and the four panels share the same measured inner bounds.
  // A window-width guess can push the hero into the sidebar on desktop.
  const fallbackCanvasWidth=Math.min(windowWidth,ws.maxWidth??windowWidth);
  const canvasWidth=measuredCanvasWidth||fallbackCanvasWidth;
  const innerWidth=Math.max(0,canvasWidth-side-right);
  // Align the hero gallery with the shared inset content grid on all devices.
  // The carousel page width must match the visible banner width exactly.
  const galleryWidth=innerWidth;
  const galleryHeight=compact
    ? Math.min(294,Math.max(252,Math.round(galleryWidth*.64)))
    : Math.min(318,Math.max(282,Math.round(galleryWidth*.29)));
  // Four equal, square-edged phase columns on desktop; keep two readable
  // columns for touch/tablet widths. All edges share the hero's content rail.
  const phaseColumns=ws.desktop?4:2;
  const phaseGridGap=compact?10:ws.tablet?14:12;
  const phasePanelWidth=Math.max(0,
    (innerWidth-(phaseColumns-1)*phaseGridGap)/phaseColumns);
  const panelInset=compact?9:12;
  const phaseCardGap=compact?8:9;
  const phaseViewportWidth=Math.max(0,phasePanelWidth-2*panelInset-2);
  // A full-size primary card with a visible next-card edge, not two
  // unreadably small cards squeezed into each narrow desktop column.
  const phaseTileWidth=compact?phaseViewportWidth:
    Math.max(1,Math.floor(phaseViewportWidth*.84));
  const phaseTileHeight=compact
    ? Math.min(155,Math.max(105,Math.round(phaseViewportWidth*.92)))
    : Math.min(170,Math.max(125,Math.round(phaseViewportWidth*.74)));
  const heroGlass=Platform.OS==='web'
    ? ({backdropFilter:'blur(14px) saturate(125%)',
        WebkitBackdropFilter:'blur(14px) saturate(125%)'} as any)
    : {};
  const heroControlBase={
    height:36,justifyContent:'center' as const,alignItems:'center' as const,
    borderWidth:1,borderColor:'rgba(255,255,255,.28)',
    shadowColor:'#000000',shadowOpacity:.07,shadowRadius:5,
    shadowOffset:{width:0,height:1},elevation:1,
  };
  const tileWidth = compact ? Math.max(137, Math.min(205, Math.floor(innerWidth * .48))) : 210;
  const list = view === 'Liste';
  const matchingRole = roleFilter === 'all' || roleFilter === 'frozen' ? items :
    items.filter(dream => viewerRole(dream) === roleFilter);
  const visible = roleFilter === 'frozen' ? matchingRole.filter(frozen) : matchingRole;
  const roleOption = ROLE_OPTIONS.find(option=>option.key===roleFilter)!;
  // Keep the gallery visible when switching to List or Frozen work modes.
  const testimonies = matchingRole.filter(isPublishedFlower);
  useEffect(()=>{
    setActiveTestimony(0);
    galleryRef.current?.scrollTo({x:0,animated:false});
  },[roleFilter,galleryWidth]);
  const goToFruit=(direction:number)=>{
    if(testimonies.length<2)return;
    const index=(activeTestimony+direction+testimonies.length)%testimonies.length;
    galleryRef.current?.scrollTo({x:index*galleryWidth,animated:true});
    setActiveTestimony(index);
  };
  const inFlower = (d:DreamEntry) => d.phase==='Témoignage' && !isPublishedFlower(d);
  const unfinished = visible.filter(inFlower);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{
        ...workspaceCanvas(windowWidth), paddingHorizontal:0, paddingBottom:64,
        paddingTop:12,
      }}>
        <View style={{width:'100%'}} onLayout={event=>{
          const measured=Math.round(event.nativeEvent.layout.width);
          if(measured>0)setMeasuredCanvasWidth(current=>current===measured?current:measured);
        }}>
        <View style={{paddingLeft:side,paddingRight:right}}>
          <PageHeader title="Mes projets" />
        </View>

        {/* A shallow, inset gallery aligned with the common page margins. */}
        <View style={{marginTop:compact?8:12,marginBottom:compact?19:25,
          paddingLeft:side,paddingRight:right}}>
          <View style={{width:galleryWidth,height:galleryHeight,alignSelf:'flex-start',overflow:'visible'}}>
            {testimonies.length>0 ? (
              <ScrollView key={roleFilter+'-'+Math.round(galleryWidth)}
                ref={galleryRef} horizontal pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={32}
                onMomentumScrollEnd={e=>setActiveTestimony(Math.max(0,Math.min(
                  testimonies.length-1,Math.round(e.nativeEvent.contentOffset.x/galleryWidth),
                )))}
                style={{width:galleryWidth,height:galleryHeight}}>
                {testimonies.map(d=>(
                  <PictureCard key={d.id} dream={d} width={galleryWidth}
                    height={galleryHeight} presentation="banner"
                    onLongPress={()=>setLongDream(d)}/>
                ))}
              </ScrollView>
            ):(
              <View style={{width:galleryWidth,height:galleryHeight,
                paddingHorizontal:compact?16:24,paddingBottom:compact?63:68,
                backgroundColor:theme.dark?'#343137':'#E9E4E0',
                justifyContent:'flex-end'}}>
                <Text style={{color:theme.foreground,fontSize:compact?21:28,
                  lineHeight:compact?27:35,fontWeight:'700'}}>
                  De nouveaux fruits à découvrir.
                </Text>
                <Text style={{color:theme.muted,fontSize:11,lineHeight:18,marginTop:5}}>
                  Les projets accomplis et publiés apparaîtront ici.
                </Text>
              </View>
            )}

            {/* Swipe on touch devices, click the side arrows on desktop. */}
            {testimonies.length>1 && !compact ? (
              <View style={{position:'absolute',right:18,top:'50%',marginTop:-17,
                flexDirection:'row',alignItems:'center',gap:7,zIndex:7}}>
                {([-1,1] as const).map(direction=>(
                  <Pressable key={direction} accessibilityRole="button"
                    accessibilityLabel={direction<0?'Fruit précédent':'Fruit suivant'}
                    onPress={()=>goToFruit(direction)}
                    style={{width:34,height:34,borderRadius:17,
                      justifyContent:'center',alignItems:'center',
                      backgroundColor:'rgba(0,0,0,.34)',
                      borderWidth:1,borderColor:'rgba(255,255,255,.5)'}}>
                    <Ionicons name={direction<0?'chevron-back':'chevron-forward'}
                      size={19} color="#FFFFFF"/>
                  </Pressable>
                ))}
              </View>
            ):null}

            {/* Purpose-designed gallery action bar: dark glass controls and a clear primary CTA. */}
            <View style={{position:'absolute',zIndex:10,
              bottom:compact?12:17,left:compact?12:24,right:compact?12:24}}>
              <View style={{flexDirection:'row',alignItems:'center',gap:compact?5:8}}>
                <Pressable onPress={()=>setRoleMenuOpen(current=>!current)}
                  accessibilityRole="button"
                  accessibilityLabel={'Filtrer mes projets : '+roleOption.label}
                  accessibilityState={{expanded:roleMenuOpen}}
                  style={({pressed})=>[heroControlBase,{
                    flexDirection:'row',flexShrink:1,minWidth:0,gap:7,
                    paddingHorizontal:compact?9:12,borderRadius:9,
                    backgroundColor:theme.dark?
                      (pressed?'rgba(32,32,32,.92)':'rgba(20,20,20,.78)'):
                      (pressed?'rgba(255,255,255,.97)':'rgba(255,255,255,.86)'),
                    borderColor:theme.dark?'rgba(255,255,255,.24)':'rgba(25,25,25,.27)',
                  }]}>
                  <Ionicons name="options-outline" size={compact?14:16}
                    color={theme.dark?'#FFFFFF':'#181716'}/>
                  <Text numberOfLines={1} style={{
                    flexShrink:1,fontSize:compact?10:11,fontWeight:'600',
                    color:theme.dark?'#FFFFFF':'#181716',
                  }}>{roleOption.label}</Text>
                  <Ionicons name={roleMenuOpen?'chevron-up':'chevron-down'}
                    size={13} color={theme.dark?'#FFFFFF':'#181716'}/>
                </Pressable>
                {!compact?(
                  <Pressable onPress={()=>router.push('/my-dream/new')}
                    accessibilityRole="button" accessibilityLabel="Créer un projet"
                    style={({pressed})=>[heroControlBase,{
                      flexDirection:'row',gap:6,paddingHorizontal:12,borderRadius:9,
                      borderColor:'rgba(255,255,255,.25)',
                      backgroundColor:pressed?'#BD1465':'#D71D77',
                    }]}>
                    <Ionicons name="add" size={17} color="#FFFFFF"/>
                    <Text style={{fontSize:11,fontWeight:'600',color:'#FFFFFF',
                      letterSpacing:.15}}>
                      Créer un projet
                    </Text>
                  </Pressable>
                ):null}
                <View style={{flex:1,minWidth:0}}/>
                <View style={[{
                  height:38,flexDirection:'row',alignItems:'center',
                  gap:3,padding:3,borderRadius:10,borderWidth:1,
                  borderColor:'rgba(255,255,255,.28)',
                  backgroundColor:'rgba(23,26,29,.62)',
                },heroGlass]}>
                  {(['Liste','Grille'] as ViewFilter[]).map(choice=>(
                    <Pressable key={choice}
                      onPress={()=>setView(choice)}
                      accessibilityRole="button"
                      accessibilityState={{selected:view===choice}}
                      accessibilityLabel={choice==='Liste'?'Afficher en liste':'Afficher en grille par étape'}
                      style={({pressed})=>({
                        height:30,minWidth:compact?48:62,
                        paddingHorizontal:compact?8:11,
                        justifyContent:'center',alignItems:'center',borderRadius:8,
                        backgroundColor:view===choice?'rgba(255,255,255,.96)':
                          pressed?'rgba(255,255,255,.18)':'transparent',
                      })}>
                      <Text style={{
                        fontSize:compact?10:11,fontWeight:'600',
                        color:view===choice?'#202126':'#FFFFFF',
                      }}>{choice}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              {roleMenuOpen?(
                <View style={{position:'absolute',bottom:51,left:0,zIndex:20,
                  width:Math.min(galleryWidth-24,246),
                  backgroundColor:theme.surface,borderRadius:12,
                  borderWidth:1,borderColor:theme.border,
                  paddingVertical:compact?2:5,overflow:'hidden'}}>
                  {ROLE_OPTIONS.map(option=>(
                    <Pressable key={option.key} accessibilityRole="button"
                      accessibilityState={{selected:option.key===roleFilter}}
                      onPress={()=>{
                        setRoleFilter(option.key);
                        setActiveTestimony(0);
                        setRoleMenuOpen(false);
                      }}
                      style={{minHeight:compact?33:40,paddingHorizontal:13,
                        flexDirection:'row',alignItems:'center',gap:10}}>
                      <Text style={{flex:1,color:option.key===roleFilter?theme.foreground:theme.muted,
                        fontSize:12,fontWeight:option.key===roleFilter?'700':'500'}}>
                        {option.label}
                      </Text>
                      {option.key===roleFilter?(
                        <Ionicons name="checkmark" size={16} color={theme.foreground}/>
                      ):null}
                    </Pressable>
                  ))}
                </View>
              ):null}
            </View>
            {/* Hide the thin lower edge of the image (not the controls). */}
            <View pointerEvents="none" style={{
              position:'absolute',bottom:0,left:0,right:0,height:2,
              backgroundColor:theme.background,zIndex:11,
            }}/>
          </View>
        </View>

        {compact?(
          <View style={{paddingLeft:side,paddingRight:right,alignItems:'flex-end',
            marginTop:-11,marginBottom:10}}>
            <Pressable onPress={()=>router.push('/my-dream/new')}
              accessibilityRole="button" accessibilityLabel="Créer un projet"
              style={({pressed})=>({
                flexDirection:'row',alignItems:'center',gap:6,
                minHeight:40,paddingHorizontal:6,
                backgroundColor:pressed?'rgba(215,29,119,.08)':'transparent',
              })}>
              <Ionicons name="add" size={18} color="#D71D77"/>
              <Text style={{fontSize:12,color:'#D71D77',fontWeight:'700'}}>
                Créer un projet
              </Text>
            </Pressable>
          </View>
        ):null}

        {visible.length === 0 && (list || roleFilter==='frozen') ? (
          <View style={{ marginTop: 44, alignItems: 'center', paddingHorizontal: 30, gap: 10 }}>
            <Ionicons name={roleFilter==='frozen' ? 'snow' : 'sparkles-outline'} size={27}
              color={roleFilter==='frozen' ? '#427FA6' : theme.muted} />
            <Text style={{ color: theme.foreground, fontWeight: '700', fontSize: 16 }}>
              {roleFilter==='frozen' ? 'Aucun projet congelé' : roleOption.empty}
            </Text>
            <Text style={{ color: theme.muted, fontSize: 12, textAlign: 'center', lineHeight: 19 }}>
              {roleFilter==='frozen'
                ? 'Les projets mis en pause apparaîtront ici.'
                : roleFilter==='participant'?'Les projets auxquels tu contribues apparaîtront après acceptation de ta ressource.'
                : roleFilter==='co_owner'?'Les projets partagés apparaîtront après acceptation d’une invitation de copropriété.'
                : 'Plante une semence ou retrouve tes projets existants.'}
            </Text>
          </View>
        ) : list ? (
          // List mode remains a single flat list, without phase sections.
          <View style={{ paddingLeft: side,paddingRight:right }}>
            {visible.map(d => <DreamListRow key={d.id} dream={d} onLongPress={()=>setLongDream(d)}/>)}
          </View>
        ) : (
          // Four horizontal phase columns on desktop, two on smaller screens.
          // The next project remains accessible within its phase carousel.
          <View style={{
            paddingLeft:side,paddingRight:right,flexDirection:'row',flexWrap:'wrap',
            columnGap:phaseGridGap,rowGap:phaseGridGap,
            paddingBottom:compact?20:26,
          }}>
            {phasePanels.map((panel,index)=>{
              const dreams=visible.filter(d=>panel.phase==='Témoignage'
                ? inFlower(d) : d.phase===panel.phase);
              return (
                <View key={panel.phase} style={{
                  width:phasePanelWidth,minHeight:compact?220:258,
                  paddingHorizontal:panelInset,paddingTop:compact?12:16,
                  paddingBottom:compact?12:16,
                  position:'relative',overflow:'hidden',
                  borderRadius:0,borderWidth:1,
                  borderColor:theme.dark?panel.darkBorder:panel.lightBorder,
                  backgroundColor:theme.background,
                }}>
                  {/* Strong phase colour on the LEFT; fade into the regular
                      page background at the RIGHT, not the reverse. */}
                  <Svg pointerEvents="none" width="100%" height="100%"
                    style={{position:'absolute',top:0,bottom:0,left:0,right:0}}>
                    <Defs>
                      <LinearGradient id={'phase-wash-'+index}
                        x1="0%" y1="0%" x2="100%" y2="0%">
                        <Stop offset="0%" stopColor={panel.accent}
                          stopOpacity={theme.dark?0.34:0.29}/>
                        <Stop offset="44%" stopColor={panel.accent}
                          stopOpacity={theme.dark?0.19:0.14}/>
                        <Stop offset="100%" stopColor={panel.accent}
                          stopOpacity={0}/>
                      </LinearGradient>
                    </Defs>
                    <Rect width="100%" height="100%"
                      fill={'url(#phase-wash-'+index+')'}/>
                  </Svg>
                  {/* Retain the soft symbolic phase illustration behind the
                      project cards; it must never intercept interaction. */}
                  <View pointerEvents="none" accessible={false}
                    importantForAccessibility="no-hide-descendants"
                    style={{position:'absolute',top:0,bottom:0,left:0,right:0,
                      alignItems:'center',justifyContent:'center',
                      opacity:theme.dark?0.13:0.10}}>
                    <DreamPhaseIcon phase={panel.phase}
                      size={compact?62:92} artworkScale={1}/>
                  </View>
                  <View style={{minHeight:compact?43:49,
                    flexDirection:'row',alignItems:'flex-start',
                    justifyContent:'space-between',gap:5}}>
                    <View style={{flex:1,minWidth:0,gap:6}}>
                      <View style={{width:27,height:3,
                        backgroundColor:panel.accent}}/>
                      <Text numberOfLines={2} style={{
                        color:theme.foreground,fontSize:compact?10:12,
                        lineHeight:compact?14:17,fontWeight:'700',
                        letterSpacing:compact?0.4:0.9}}>
                        {panel.title.toLocaleUpperCase('fr-FR')}
                      </Text>
                    </View>
                    <Text style={{fontSize:10,fontWeight:'600',
                      color:theme.foreground}}>
                      {dreams.length}
                    </Text>
                  </View>
                  <View style={{width:phaseViewportWidth,minWidth:0,
                    justifyContent:'center',marginTop:compact?8:12}}>
                    {dreams.length>0 ? (
                      compact?
                        <PhaseMobileOverlap dreams={dreams}
                          viewportWidth={phaseViewportWidth}
                          cardHeight={phaseTileHeight}
                          onLongPress={setLongDream}/>:
                        <PhaseProjectCarousel dreams={dreams}
                          cardWidth={phaseTileWidth} cardHeight={phaseTileHeight}
                          viewportWidth={phaseViewportWidth} gap={phaseCardGap}
                          compact={compact} onLongPress={setLongDream}/>
                    ):(
                      <View style={{minHeight:phaseTileHeight,
                        width:'100%',alignItems:'center',
                        justifyContent:'center',paddingHorizontal:5}}>
                        <Text style={{fontSize:compact?10:12,
                          color:theme.muted,lineHeight:compact?15:18,
                          textAlign:'center'}}>
                          {panel.phase==='Témoignage'
                            ? 'Aucune floraison en préparation.'
                            : 'Aucun projet dans cette étape.'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
        </View>

      </ScrollView>
      <DreamQuickActions dream={longDream} onClose={()=>setLongDream(null)}/>
      <Nav />
    </SafeAreaView>
  );
}
