import React, { useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
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
// Unpublished Floraison projects are still workspaces; published fruits belong
// exclusively to the gallery. Tints stay quiet in both light and dark themes.
const phasePanels: {
  phase: DreamPhase; title: string; sub: string; lightTint: string; darkTint: string;
  lightBorder: string; darkBorder: string; accent: string;
}[] = [
  {
    phase: 'Rêve', title: 'Mes semences', sub: 'Les idées que je cultive.',
    lightTint: 'rgba(166,114,76,0.055)', darkTint: 'rgba(190,138,93,0.13)',
    lightBorder: 'rgba(166,114,76,0.10)', darkBorder: 'rgba(190,138,93,0.21)',
    accent: '#B88962',
  },
  {
    phase: 'Initiation', title: 'En germination', sub: 'Les projets que je prépare.',
    lightTint: 'rgba(154,185,64,0.062)', darkTint: 'rgba(154,185,64,0.12)',
    lightBorder: 'rgba(134,164,53,0.11)', darkBorder: 'rgba(154,185,64,0.19)',
    accent: '#A1BA44',
  },
  {
    phase: 'Croissance', title: 'En croissance', sub: 'Les rêves qui prennent vie.',
    lightTint: 'rgba(39,132,91,0.052)', darkTint: 'rgba(47,153,107,0.12)',
    lightBorder: 'rgba(39,132,91,0.10)', darkBorder: 'rgba(47,153,107,0.20)',
    accent: '#27845B',
  },
  {
    phase: 'Témoignage', title: 'Floraison', sub: 'Prépare et partage le résultat de ton rêve.',
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
  presentation?: 'card' | 'banner';
}) {
  const theme = useAppTheme();
  const photo = coverImage(dream);
  const isBanner = presentation === 'banner';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={'Ouvrir ' + dream.title}
      onPress={() => open(dream)} onLongPress={onLongPress} delayLongPress={460}
      accessibilityHint="Maintenir pour voir les actions et la date objectif"
      style={{ width, height, borderRadius: isBanner ? 0 : 11, overflow: 'hidden', backgroundColor: theme.surface }}>
      {photo ? <Image source={{ uri: photo }} resizeMode="cover" style={{ width: '100%', height: '100%' }} /> : null}
      {isBanner ? (
        <Svg pointerEvents="none" width="100%" height="100%" style={{
          position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
        }}>
          <Defs>
            <LinearGradient id="fruit-banner-shade" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#000000" stopOpacity={theme.dark ? 0.13 : 0.11}/>
              <Stop offset="38%" stopColor="#000000" stopOpacity={theme.dark ? 0.26 : 0.27}/>
              <Stop offset="100%" stopColor="#000000" stopOpacity={theme.dark ? 0.91 : 0.88}/>
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
        paddingHorizontal: isBanner ? (width < 540 ? 18 : 28) : 13,
        paddingTop: isBanner ? 18 : 36,
        paddingBottom: isBanner ? (width < 540 ? 77 : 93) : 12,
        backgroundColor: isBanner ? 'transparent' : 'rgba(0,0,0,0.30)',
      }}>
        {!isBanner && isPublishedFlower(dream) ? (
          <View style={{flexDirection:'row',alignItems:'center',gap:5,marginBottom:6}}>
            <Ionicons name="nutrition-outline" size={13} color="#F3D9AD"/>
            <Text style={{color:'#F7E7C7',fontSize:10,fontWeight:'700',letterSpacing:1.1}}>FRUIT</Text>
          </View>
        ) : null}
        <Text style={{
          fontSize: isBanner ? (width < 380 ? 23 : width < 540 ? 27 : width < 780 ? 34 : 40) : (width < 230 ? 13 : 18),
          lineHeight: isBanner ? (width < 380 ? 29 : width < 540 ? 33 : width < 780 ? 40 : 47) : (width < 230 ? 18 : 24),
          letterSpacing: isBanner ? -1.0 : 0,
          color: '#FFFFFF', fontWeight: '800',
          textShadowColor: isBanner ? 'rgba(0,0,0,.26)' : 'transparent',
          textShadowRadius: isBanner ? 9 : 0,
        }} numberOfLines={isBanner ? 2 : 3}>{dream.title}</Text>
        {isBanner && !!(dream.testimony?.comment || dream.summary) ? (
          <Text numberOfLines={1} style={{
            color:'rgba(255,255,255,.90)',fontSize:width<540?11:13,
            lineHeight:width<540?16:19,marginTop:8,maxWidth:width<540?'90%':'75%',
          }}>{dream.testimony?.comment || dream.summary}</Text>
        ) : null}
        {isBanner ? (
          <View style={{flexDirection:'row',alignItems:'center',gap:7,marginTop:width<540?10:14}}>
            <Text style={{color:'#FFFFFF',fontSize:width<540?12:13,fontWeight:'800'}}>
              Découvrir cette histoire
            </Text>
            <Ionicons name="arrow-forward-outline" size={width<540?15:17} color="#FFFFFF"/>
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
  const side=ws.gutter;
  const workspaceViewport=Math.max(0,windowWidth-(ws.desktop?212:0));
  const contentWidth=Math.min(workspaceViewport,ws.maxWidth??workspaceViewport);
  const innerWidth=Math.max(0,contentWidth-2*side);
  // The gallery spans the entire page canvas on phones, while aligning with
  // the inset content grid on desktop. Carousel page width matches this exactly.
  const galleryWidth=compact?contentWidth:innerWidth;
  const galleryHeight=compact
    ? Math.min(294,Math.max(252,Math.round(galleryWidth*.64)))
    : Math.min(318,Math.max(282,Math.round(galleryWidth*.29)));
  const phaseGridGap=compact?10:ws.tablet?14:18;
  const phasePanelWidth=Math.max(0,(innerWidth-phaseGridGap)/2);
  const panelInset=compact?10:17;
  const phaseTileWidth=Math.min(183,Math.max(92,phasePanelWidth-2*panelInset));
  const phaseTileHeight=compact?118:146;
  const heroGlass=Platform.OS==='web'
    ? ({backdropFilter:'blur(14px) saturate(125%)',
        WebkitBackdropFilter:'blur(14px) saturate(125%)'} as any)
    : {};
  const heroControlBase={
    height:42,justifyContent:'center' as const,alignItems:'center' as const,
    borderWidth:1,borderColor:'rgba(255,255,255,.28)',
    shadowColor:'#000000',shadowOpacity:.13,shadowRadius:8,
    shadowOffset:{width:0,height:2},elevation:2,
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
        <View style={{paddingHorizontal:side}}>
          <PageHeader title="Mes projets" />
        </View>

        {/* A shallow, edge-to-edge gallery. Filters float over the image. */}
        <View style={{marginTop:compact?8:12,marginBottom:compact?19:25}}>
          <View style={{width:galleryWidth,height:galleryHeight,alignSelf:'center',overflow:'visible'}}>
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
              bottom:compact?13:19,left:compact?12:24,right:compact?12:24}}>
              <View style={{flexDirection:'row',alignItems:'center',gap:compact?6:10}}>
                <Pressable onPress={()=>setRoleMenuOpen(current=>!current)}
                  accessibilityRole="button"
                  accessibilityLabel={'Filtrer mes projets : '+roleOption.label}
                  accessibilityState={{expanded:roleMenuOpen}}
                  style={({pressed})=>[heroControlBase,{
                    flexDirection:'row',flexShrink:1,minWidth:0,gap:7,
                    paddingHorizontal:compact?11:15,borderRadius:10,
                    backgroundColor:pressed?'rgba(27,29,31,.83)':'rgba(23,26,29,.62)',
                  },heroGlass]}>
                  <Ionicons name="options-outline" size={compact?15:17} color="#FFFFFF"/>
                  <Text numberOfLines={1} style={{
                    flexShrink:1,fontSize:compact?11:12,fontWeight:'700',color:'#FFFFFF',
                  }}>{roleOption.label}</Text>
                  <Ionicons name={roleMenuOpen?'chevron-up':'chevron-down'}
                    size={13} color="rgba(255,255,255,.9)"/>
                </Pressable>
                {!compact?(
                  <Pressable onPress={()=>router.push('/my-dream/new')}
                    accessibilityRole="button" accessibilityLabel="Créer un projet"
                    style={({pressed})=>[heroControlBase,{
                      flexDirection:'row',gap:8,paddingHorizontal:17,borderRadius:10,
                      borderColor:'rgba(255,255,255,.25)',
                      backgroundColor:pressed?'#BD1465':'#D71D77',
                    }]}>
                    <Ionicons name="add" size={20} color="#FFFFFF"/>
                    <Text style={{fontSize:12,fontWeight:'800',color:'#FFFFFF',
                      letterSpacing:.15}}>
                      Créer un projet
                    </Text>
                  </Pressable>
                ):null}
                <View style={{flex:1,minWidth:0}}/>
                <View style={[{
                  height:44,flexDirection:'row',alignItems:'center',
                  gap:3,padding:3,borderRadius:11,borderWidth:1,
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
                        height:36,minWidth:compact?56:70,
                        paddingHorizontal:compact?9:14,
                        justifyContent:'center',alignItems:'center',borderRadius:8,
                        backgroundColor:view===choice?'rgba(255,255,255,.96)':
                          pressed?'rgba(255,255,255,.18)':'transparent',
                      })}>
                      <Text style={{
                        fontSize:compact?11:12,fontWeight:'700',
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
          </View>
        </View>

        {compact?(
          <View style={{paddingHorizontal:side,alignItems:'flex-end',
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
          <View style={{ paddingHorizontal: side }}>
            {visible.map(d => <DreamListRow key={d.id} dream={d} onLongPress={()=>setLongDream(d)}/>)}
          </View>
        ) : (
          // Four phase zones, in two columns on phones as well as desktop.
          // Compact mobile panels keep the same subtle, theme-aware colors.
          <View style={{
            paddingHorizontal:side,flexDirection:'row',flexWrap:'wrap',
            columnGap:phaseGridGap,rowGap:phaseGridGap,
            paddingBottom:compact?20:26,
          }}>
            {phasePanels.map(panel=>{
              const dreams=visible.filter(d=>panel.phase==='Témoignage'
                ? inFlower(d) : d.phase===panel.phase);
              return (
                <View key={panel.phase} style={{
                  width:phasePanelWidth,minHeight:compact?214:242,
                  paddingHorizontal:panelInset,paddingTop:compact?12:16,
                  paddingBottom:compact?11:17,
                  borderRadius:3,borderWidth:1,
                  borderColor:theme.dark?panel.darkBorder:panel.lightBorder,
                  backgroundColor:theme.dark?panel.darkTint:panel.lightTint,
                }}>
                  <View style={{height:2,width:compact?20:26,borderRadius:2,
                    marginBottom:compact?10:12,
                    backgroundColor:panel.accent,opacity:0.66}}/>
                  <View style={{flexDirection:'row',alignItems:'flex-start',
                    justifyContent:'space-between',gap:compact?5:12,
                    marginBottom:compact?11:14}}>
                    <View style={{flex:1,minWidth:0}}>
                      <Text style={{color:theme.foreground,fontWeight:'700',
                        fontSize:compact?14:17,lineHeight:compact?19:22}}>
                        {panel.title}
                      </Text>
                      {!compact?(
                        <Text style={{color:theme.muted,fontSize:11,
                          lineHeight:16,marginTop:4}}>{panel.sub}</Text>
                      ):null}
                    </View>
                    {dreams.length>0?(
                      <Text style={{color:theme.muted,fontSize:11,
                        marginTop:4}}>{dreams.length}</Text>
                    ):null}
                  </View>
                  {dreams.length>0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}
                      style={{flexGrow:0,width:'100%'}}
                      contentContainerStyle={{gap:11,paddingRight:2}}>
                      {dreams.map(d=>(
                        <PictureCard key={d.id} dream={d}
                          width={phaseTileWidth} height={phaseTileHeight}
                          onLongPress={()=>setLongDream(d)}/>
                      ))}
                    </ScrollView>
                  ):(
                    <View style={{minHeight:phaseTileHeight,alignItems:'flex-start',
                      justifyContent:'center',paddingHorizontal:compact?1:4}}>
                      <Text style={{fontSize:compact?10:12,color:theme.muted,
                        lineHeight:compact?15:18}}>
                        {panel.phase==='Témoignage'
                          ? 'Aucune floraison en préparation.'
                          : 'Aucun projet dans cette étape.'}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

      </ScrollView>
      <DreamQuickActions dream={longDream} onClose={()=>setLongDream(null)}/>
      <Nav />
    </SafeAreaView>
  );
}
