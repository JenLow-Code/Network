import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
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

type ViewFilter = 'Tout' | 'Liste' | 'Congelés';
type RoleFilter = 'all' | 'creator' | 'co_owner' | 'participant';
const ROLE_OPTIONS: {key:RoleFilter;label:string;empty:string}[] = [
  {key:'all',label:'Tous les projets',empty:'Tout commence par une semence'},
  {key:'creator',label:'Créés par moi',empty:'Aucun projet créé pour le moment'},
  {key:'co_owner',label:'Co-propriétaire',empty:'Aucun projet en copropriété pour le moment'},
  {key:'participant',label:'Mes participations',empty:'Aucune participation pour le moment'},
];
/** Derived from trusted membership when connected; local dreams belong to the creator.
 * Never derive participant status from encouragements, prayers or "Moi aussi".
 */
const viewerRole = (dream:DreamEntry) => dream.viewerRole || 'creator';
const series: { phase: DreamPhase; title: string; sub: string }[] = [
  { phase: 'Témoignage', title: 'Fruits potentiels', sub: 'Des rêves accomplis, de possibles nouvelles semences.' },
  { phase: 'Rêve', title: 'Mes semences', sub: 'Les idées que je cultive.' },
  { phase: 'Initiation', title: 'En germination', sub: 'Les projets que je prépare.' },
  { phase: 'Croissance', title: 'En croissance', sub: 'Les rêves qui prennent vie.' },
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
const coverImage = (d: DreamEntry) => d.phase === 'Témoignage' ? d.resultImage || d.image : d.image;

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
              <Stop offset="0%" stopColor="#000000" stopOpacity={0.02}/>
              <Stop offset="48%" stopColor="#000000" stopOpacity={0.13}/>
              <Stop offset="100%" stopColor="#000000" stopOpacity={0.82}/>
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
        paddingHorizontal: isBanner ? (width < 500 ? 16 : 24) : 13,
        paddingTop: isBanner ? 50 : 36,
        paddingBottom: isBanner ? (width < 500 ? 18 : 23) : 12,
        backgroundColor: isBanner ? 'transparent' : 'rgba(0,0,0,0.30)',
      }}>
        {isPublishedFlower(dream) ? (
          <View style={{flexDirection:'row',alignItems:'center',gap:5,marginBottom:6}}>
            <Ionicons name="nutrition-outline" size={13} color="#F3D9AD"/>
            <Text style={{color:'#F7E7C7',fontSize:10,fontWeight:'700',letterSpacing:1.1}}>FRUIT</Text>
          </View>
        ) : null}
        <Text style={{
          fontSize: isBanner ? (width < 540 ? 30 : 43) : (width < 230 ? 13 : 18),
          lineHeight: isBanner ? (width < 540 ? 37 : 51) : (width < 230 ? 18 : 24),
          letterSpacing: isBanner ? -0.8 : 0,
          color: '#FFFFFF', fontWeight: '700',
        }} numberOfLines={isBanner ? 2 : 3}>{dream.title}</Text>
        {isBanner && !!(dream.testimony?.comment || dream.summary) ? (
          <Text numberOfLines={2} style={{
            color:'rgba(255,255,255,.86)',fontSize:width<540?12:14,
            lineHeight:width<540?18:22,marginTop:9,maxWidth:width<540?'88%':'65%',
          }}>{dream.testimony?.comment || dream.summary}</Text>
        ) : null}
        {isBanner ? (
          <View style={{flexDirection:'row',alignItems:'center',gap:7,marginTop:width<540?12:20}}>
            <Text style={{color:'#FFFFFF',fontSize:width<540?12:13,fontWeight:'700'}}>
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
  const [view, setView] = useState<ViewFilter>('Tout');
  const [roleFilter,setRoleFilter]=useState<RoleFilter>('all');
  const [roleMenuOpen,setRoleMenuOpen]=useState(false);
  const [activeTestimony, setActiveTestimony] = useState(0);
  const galleryRef = useRef<ScrollView>(null);
  const [longDream,setLongDream]=useState<DreamEntry|null>(null);
  const side=ws.gutter;
  const workspaceViewport=Math.max(0,windowWidth-(ws.desktop?212:0));
  const contentWidth=Math.min(workspaceViewport,ws.maxWidth??workspaceViewport);
  const innerWidth=Math.max(0,contentWidth-2*side);
  // The gallery is full-bleed inside the workspace; stage cards keep their inset.
  const galleryWidth=contentWidth;
  const galleryHeight=compact
    ? Math.min(365,Math.max(275,Math.round(galleryWidth*.80)))
    : Math.min(495,Math.max(350,Math.round(galleryWidth*.42)));
  const tileWidth = compact ? Math.max(137, Math.min(205, Math.floor(innerWidth * .48))) : 210;
  const list = view === 'Liste';
  const matchingRole = roleFilter === 'all' ? items :
    items.filter(dream => viewerRole(dream) === roleFilter);
  const visible = view === 'Congelés' ? matchingRole.filter(frozen) : matchingRole;
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

        {/* Editorial gallery: published fruits are viewed, not edited. */}
        <View style={{marginTop:compact?10:16,marginBottom:compact?12:18}}>
          {testimonies.length>0 ? (
            <View style={{width:galleryWidth,height:galleryHeight,alignSelf:'center',overflow:'hidden'}}>
              <ScrollView key={roleFilter+'-'+Math.round(galleryWidth)}
                ref={galleryRef} horizontal pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={32}
                onScroll={e=>setActiveTestimony(Math.max(0,Math.min(
                  testimonies.length-1,Math.round(e.nativeEvent.contentOffset.x/galleryWidth),
                )))}
                style={{width:galleryWidth,height:galleryHeight}}>
                {testimonies.map(d=>(
                  <PictureCard key={d.id} dream={d} width={galleryWidth}
                    height={galleryHeight} presentation="banner"
                    onLongPress={()=>setLongDream(d)}/>
                ))}
              </ScrollView>
              <View pointerEvents="none" style={{
                position:'absolute',top:compact?17:25,
                left:compact?17:26,right:compact?17:28,
                flexDirection:'row',alignItems:'center',justifyContent:'space-between',
              }}>
                <Text style={{color:'#FFFFFF',fontSize:compact?11:12,
                  fontWeight:'800',letterSpacing:1.5,
                  textShadowColor:'rgba(0,0,0,.55)',textShadowRadius:7}}>
                  FRUITS POTENTIELS
                </Text>
                <Text style={{color:'#FFFFFF',fontSize:12,fontWeight:'700',
                  letterSpacing:1.3,textShadowColor:'rgba(0,0,0,.55)',textShadowRadius:7}}>
                  {String(activeTestimony+1).padStart(2,'0')} / {String(testimonies.length).padStart(2,'0')}
                </Text>
              </View>
              {testimonies.length>1 ? (
                <>
                  {([-1,1] as const).map(direction=>(
                    <Pressable key={direction} accessibilityRole="button"
                      accessibilityLabel={direction<0?'Fruit précédent':'Fruit suivant'}
                      onPress={()=>goToFruit(direction)}
                      style={{position:'absolute',top:'50%',
                        [direction<0?'left':'right']:compact?9:16,
                        marginTop:-21,width:42,height:42,borderRadius:22,
                        alignItems:'center',justifyContent:'center',
                        backgroundColor:'rgba(0,0,0,.28)',
                        borderWidth:1,borderColor:'rgba(255,255,255,.38)'}}>
                      <Ionicons name={direction<0?'chevron-back':'chevron-forward'}
                        size={23} color="#FFFFFF"/>
                    </Pressable>
                  ))}
                  <View style={{position:'absolute',bottom:compact?17:26,
                    right:compact?17:26,flexDirection:'row',alignItems:'center',gap:5}}>
                    {testimonies.map((d,i)=>(
                      <Pressable key={d.id} accessibilityRole="button"
                        accessibilityLabel={'Voir le fruit '+(i+1)+' sur '+testimonies.length}
                        accessibilityState={{selected:activeTestimony===i}}
                        onPress={()=>{
                          galleryRef.current?.scrollTo({x:i*galleryWidth,animated:true});
                          setActiveTestimony(i);
                        }}
                        style={{height:26,minWidth:22,alignItems:'center',justifyContent:'center'}}>
                        <View style={{height:3,width:activeTestimony===i?22:11,
                          backgroundColor:activeTestimony===i?'#FFFFFF':'rgba(255,255,255,.45)'}}/>
                      </Pressable>
                    ))}
                  </View>
                </>
              ):null}
            </View>
          ):(
            <View style={{alignSelf:'center',width:galleryWidth,height:compact?205:238,
              paddingHorizontal:compact?21:30,paddingVertical:compact?24:31,
              backgroundColor:theme.dark?'#343137':'#E9E4E0',
              justifyContent:'space-between'}}>
              <Text style={{color:theme.foreground,fontSize:12,fontWeight:'800',
                letterSpacing:1.5}}>FRUITS POTENTIELS</Text>
              <View style={{gap:8}}>
                <Text style={{color:theme.foreground,fontSize:compact?23:30,
                  lineHeight:compact?30:38,fontWeight:'700'}}>
                  De nouveaux fruits à découvrir.
                </Text>
                <Text style={{color:theme.muted,fontSize:12,lineHeight:19}}>
                  Les résultats publiés de tes projets apparaîtront ici.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Working controls belong below the gallery, never over its stories. */}
        <View style={{paddingHorizontal:side,marginBottom:compact?21:28}}>
          <View style={{flexDirection:'row',alignItems:'center',
            gap:compact?5:8,paddingBottom:compact?15:17,
            borderBottomWidth:1,borderBottomColor:theme.border}}>
            <Pressable onPress={()=>setRoleMenuOpen(current=>!current)}
              accessibilityRole="button"
              accessibilityLabel={'Filtrer mes projets : '+roleOption.label}
              accessibilityState={{expanded:roleMenuOpen}}
              style={{flexDirection:'row',alignItems:'center',gap:compact?4:7,
                flexShrink:1,minWidth:0,paddingHorizontal:compact?9:11,
                minHeight:37,borderRadius:19,borderWidth:1,
                borderColor:theme.border,backgroundColor:theme.surface}}>
              <Ionicons name="filter-outline" size={15} color={theme.muted}/>
              <Text numberOfLines={1} style={{flexShrink:1,fontSize:11,fontWeight:'600',
                color:theme.foreground}}>{roleOption.label}</Text>
              <Ionicons name={roleMenuOpen?'chevron-up':'chevron-down'}
                size={13} color={theme.muted}/>
            </Pressable>
            <View style={{flex:1,minWidth:0}}/>
            {(['Liste','Congelés'] as ViewFilter[]).map(choice=>(
              <Pressable key={choice} onPress={()=>setView(current=>current===choice?'Tout':choice)}
                accessibilityRole="button"
                accessibilityState={{selected:view===choice}}
                accessibilityLabel={choice==='Liste'?'Afficher en liste':'Afficher les projets gelés'}
                style={{paddingHorizontal:compact?8:13,minHeight:37,
                  alignItems:'center',justifyContent:'center',borderRadius:19,
                  borderWidth:1,borderColor:view===choice?theme.foreground:theme.border,
                  backgroundColor:view===choice?theme.foreground:'transparent'}}>
                <Text style={{fontSize:11,fontWeight:'600',
                  color:view===choice?theme.background:theme.foreground}}>
                  {choice}
                </Text>
              </Pressable>
            ))}
            <Pressable onPress={()=>router.push('/my-dream/new')}
              accessibilityRole="button" accessibilityLabel="Créer un projet"
              style={{width:39,height:39,borderRadius:12,
                backgroundColor:'#D71D77',alignItems:'center',justifyContent:'center'}}>
              <Ionicons name="add" size={22} color="#FFFFFF"/>
            </Pressable>
          </View>
          {roleMenuOpen ? <View style={{marginTop:9,maxWidth:300,
            borderWidth:1,borderColor:theme.border,borderRadius:12,
            backgroundColor:theme.surface,paddingVertical:5}}>
            {ROLE_OPTIONS.map(option=><Pressable key={option.key}
              accessibilityRole="button"
              accessibilityState={{selected:option.key===roleFilter}}
              onPress={()=>{setRoleFilter(option.key);setActiveTestimony(0);setRoleMenuOpen(false);}}
              style={{minHeight:41,paddingHorizontal:13,flexDirection:'row',
                alignItems:'center',gap:10}}>
              <Text style={{flex:1,color:option.key===roleFilter?theme.foreground:theme.muted,
                fontSize:12,fontWeight:option.key===roleFilter?'700':'500'}}>
                {option.label}
              </Text>
              {option.key===roleFilter?<Ionicons name="checkmark" size={16}
                color={theme.foreground}/>:null}
            </Pressable>)}
          </View>:null}
        </View>

        {visible.length === 0 ? (
          <View style={{ marginTop: 44, alignItems: 'center', paddingHorizontal: 30, gap: 10 }}>
            <Ionicons name={view === 'Congelés' ? 'snow' : 'sparkles-outline'} size={27}
              color={view === 'Congelés' ? '#427FA6' : theme.muted} />
            <Text style={{ color: theme.foreground, fontWeight: '700', fontSize: 16 }}>
              {view === 'Congelés' ? 'Aucun projet gelé dans cette catégorie' : roleOption.empty}
            </Text>
            <Text style={{ color: theme.muted, fontSize: 12, textAlign: 'center', lineHeight: 19 }}>
              {view === 'Congelés'
                ? 'Les projets gelés apparaîtront ici.'
                : roleFilter==='participant'?'Les projets auxquels tu contribues apparaîtront après acceptation de ta ressource.'
                : roleFilter==='co_owner'?'Les projets partagés apparaîtront après acceptation d’une invitation de copropriété.'
                : 'Plante une semence ou retrouve tes projets existants.'}
            </Text>
          </View>
        ) : list ? (
          // List mode is a single flat list: no phase headings or category sections.
          <View style={{ paddingHorizontal: side }}>
            {visible.map(d => <DreamListRow key={d.id} dream={d} onLongPress={()=>setLongDream(d)}/>)}
          </View>
        ) : (
          <>
            {series.filter(g => g.phase !== 'Témoignage').map(group => {
              const dreams = visible.filter(d => d.phase === group.phase);
              if (!dreams.length) return null;
              return (
                <View key={group.phase} style={{ marginBottom: compact ? 27 : 36 }}>
                  <View style={{ paddingHorizontal: side, flexDirection: 'row',
                    alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.foreground, fontWeight: '700', fontSize: 17 }}>{group.title}</Text>
                      <Text style={{ color: theme.muted, fontSize: 11, marginTop: 4 }}>{group.sub}</Text>
                    </View>
                    <Text style={{ color: theme.muted, fontSize: 11 }}>{dreams.length}</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: side, gap: 11 }}>
                    {dreams.map(d => <PictureCard key={d.id} dream={d} width={tileWidth} height={compact ? 137 : 165} onLongPress={()=>setLongDream(d)}/>)}
                  </ScrollView>
                </View>
              );
            })}
          </>
        )}

        {view==='Tout' && roleFilter!=='participant' && unfinished.length>0 ? (
          <View style={{marginTop:6,marginBottom:26}}>
            <View style={{paddingHorizontal:side,marginBottom:12}}>
              <Text style={{fontSize:17,fontWeight:'700',color:theme.foreground}}>Floraison</Text>
              <Text style={{fontSize:11,color:theme.muted,marginTop:4}}>Prépare et partage le résultat de ton rêve.</Text>
            </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{paddingHorizontal:side,gap:11}}>
                {unfinished.map(d=><Pressable key={d.id} accessibilityRole="button"
                  onLongPress={()=>setLongDream(d)} delayLongPress={460}
                  accessibilityHint="Maintenir pour voir les actions du rêve"
                  accessibilityLabel={'Reprendre ma Floraison : '+d.title}
                  onPress={()=>open(d)}
                  style={{width:tileWidth,height:compact?137:165,borderRadius:11,overflow:'hidden'}}>
                  <Image source={{uri:d.flowerDraft?.attachments?.find(m=>m.kind==='photo')?.uri||d.image}}
                    resizeMode="cover" style={{width:'100%',height:'100%'}}/>
                  <View style={{position:'absolute',left:0,right:0,top:0,bottom:0,
                    backgroundColor:'rgba(0,0,0,.32)'}}/>
                  <Text numberOfLines={2} style={{position:'absolute',bottom:12,left:12,right:12,
                    color:'#FFFFFF',fontWeight:'700',fontSize:14}}>{d.title}</Text>
                </Pressable>)}
              </ScrollView>
          </View>
        ):null}
      </ScrollView>
      <DreamQuickActions dream={longDream} onClose={()=>setLongDream(null)}/>
      <Nav />
    </SafeAreaView>
  );
}
