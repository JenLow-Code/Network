import React, { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import type { DreamEntry } from '@/domain/dreamWorkspace';
import type { DreamPhase } from '@/domain/publication';
import { useDreams } from '@/domain/dreamRepository';
import { useAppTheme } from '@/theme/AppTheme';

type ViewFilter = 'Tout' | 'Liste' | 'Congelés';
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
    router.push({pathname:'/my-dream/[id]',params:{id:dream.id}});
  } else if (dream.phase === 'Croissance' &&
    (dream.flowerStartedAt || dream.flowerDraft?.story?.trim() || dream.flowerDraft?.attachments?.length)) {
    router.push({pathname:'/my-dream/flower/[id]',params:{id:dream.id}});
  } else {
    router.push({pathname:'/my-dream/[id]',params:{id:dream.id,view:dream.phase}});
  }
};
const frozen = (dream: DreamEntry) =>
  dream.phase === 'Initiation' && !!dream.paused && !!dream.pauseUntil &&
  dream.pauseUntil >= new Date().toISOString().slice(0, 10);
const coverImage = (d: DreamEntry) => d.phase === 'Témoignage' ? d.resultImage || d.image : d.image;

function PictureCard({ dream, width, height }: { dream: DreamEntry; width: number; height: number }) {
  const theme = useAppTheme();
  const photo = coverImage(dream);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={'Ouvrir ' + dream.title}
      onPress={() => open(dream)} style={{ width, height, borderRadius: 11, overflow: 'hidden', backgroundColor: theme.surface }}>
      {photo ? <Image source={{ uri: photo }} resizeMode="cover" style={{ width: '100%', height: '100%' }} /> : null}
      <View pointerEvents="none" style={{
        position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(0,0,0,0.24)',
      }} />
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 13, paddingTop: 36, paddingBottom: 12,
        backgroundColor: 'rgba(0,0,0,0.30)',
      }}>
        {dream.phase === 'Témoignage' ? (
          <View style={{flexDirection:'row',alignItems:'center',gap:5,marginBottom:6}}>
            <Ionicons name="nutrition-outline" size={13} color="#F3D9AD"/>
            <Text style={{color:'#F7E7C7',fontSize:10,fontWeight:'700',letterSpacing:1.1}}>FRUIT</Text>
          </View>
        ) : null}
        <Text style={{ fontSize: width < 230 ? 13 : 18, lineHeight: width < 230 ? 18 : 24,
          color: '#FFFFFF', fontWeight: '700' }} numberOfLines={3}>{dream.title}</Text>
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

function DreamListRow({ dream }: { dream: DreamEntry }) {
  const theme = useAppTheme();
  const photo = coverImage(dream);
  return (
    <Pressable accessibilityRole="button" onPress={() => {
      if(dream.phase==='Témoignage') { open(dream); return; }
      if(dream.phase==='Croissance' &&
        (dream.flowerStartedAt||dream.flowerDraft?.story?.trim()||dream.flowerDraft?.attachments?.length)){
        router.push({pathname:'/my-dream/flower/[id]',params:{id:dream.id}});
        return;
      }
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
          {frozen(dream) ? 'Congelé jusqu’au ' + dream.pauseUntil : dream.summary || 'Ouvrir mon rêve'}
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
  const { items } = useDreams();
  const [view, setView] = useState<ViewFilter>('Tout');
  const [activeTestimony, setActiveTestimony] = useState(0);
  const side = compact ? 18 : 28;
  const contentWidth = Math.min(windowWidth, 900);
  const innerWidth = contentWidth - side * 2;
  const tileWidth = compact ? Math.max(137, Math.min(205, Math.floor(innerWidth * .48))) : 210;
  const list = view === 'Liste';
  const visible = view === 'Congelés' ? items.filter(frozen) : items;
  const testimonies = visible.filter(d => d.phase === 'Témoignage');
  const inFlower = (d:DreamEntry) => d.phase==='Croissance' &&
    (!!d.flowerStartedAt || !!d.flowerDraft?.story?.trim() || !!d.flowerDraft?.attachments?.length);
  const unfinished = visible.filter(inFlower);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{
        width: '100%', maxWidth: 900, alignSelf: 'center', paddingBottom: 64,
        paddingTop: compact ? 13 : 27,
      }}>
        <View style={{ paddingHorizontal: side }}>
          <PageHeader />
          <View style={{ marginTop: compact ? 15 : 25, marginBottom: 21 }}>
            <Text style={{ fontWeight: '700', fontSize: compact ? 30 : 33,
              lineHeight: 40, color: theme.foreground }}>Mes rêves</Text>
            <Text style={{ color: theme.muted, fontSize: 12, marginTop: 3 }}>
              Des premières idées aux histoires accomplies.
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 24 }}>
            {(['Tout', 'Liste', 'Congelés'] as ViewFilter[]).map(choice => (
              <Pressable key={choice} accessibilityRole="button"
                accessibilityState={{ selected: view === choice }}
                onPress={() => setView(choice)}
                style={{
                  paddingHorizontal: compact ? 10 : 16, paddingVertical: 10,
                  borderRadius: 22, borderWidth: 1,
                  borderColor: view === choice ? theme.foreground : theme.border,
                  backgroundColor: view === choice ? theme.foreground : 'transparent',
                }}>
                <Text style={{ fontSize: 11, fontWeight: '700',
                  color: view === choice ? theme.background : theme.foreground }}>{choice}</Text>
              </Pressable>
            ))}
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => router.push('/my-dream/new')}
              accessibilityRole="button" accessibilityLabel="Planter une semence"
              style={{ width: 42, height: 42, borderRadius: 12,
                backgroundColor: '#D71D77', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {visible.length === 0 ? (
          <View style={{ marginTop: 44, alignItems: 'center', paddingHorizontal: 30, gap: 10 }}>
            <Ionicons name={view === 'Congelés' ? 'snow' : 'sparkles-outline'} size={27}
              color={view === 'Congelés' ? '#427FA6' : theme.muted} />
            <Text style={{ color: theme.foreground, fontWeight: '700', fontSize: 16 }}>
              {view === 'Congelés' ? 'Aucun rêve congelé' : 'Tout commence par une semence'}
            </Text>
            <Text style={{ color: theme.muted, fontSize: 12, textAlign: 'center', lineHeight: 19 }}>
              {view === 'Congelés' ? 'Les germinations congelées apparaîtront ici.' : 'Plante ta première idée.'}
            </Text>
          </View>
        ) : list ? (
          // List mode is a single flat list: no phase headings or category sections.
          <View style={{ paddingHorizontal: side }}>
            {visible.map(d => <DreamListRow key={d.id} dream={d} />)}
          </View>
        ) : (
          <>
            {testimonies.length > 0 ? (
              <View style={{ marginBottom: 30 }}>
                <View style={{ paddingHorizontal: side, marginBottom: 13, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 18, color: theme.foreground, fontWeight: '700', flex: 1 }}>Fruits potentiels</Text>
                  <Text style={{ color: theme.muted, fontSize: 12 }}>{testimonies.length}</Text>
                </View>
                <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={e => setActiveTestimony(Math.max(0, Math.min(
                    testimonies.length - 1, Math.round(e.nativeEvent.contentOffset.x / innerWidth),
                  )))}
                  contentContainerStyle={{ paddingHorizontal: side }}>
                  {testimonies.map(d => (
                    <View key={d.id} style={{ width: innerWidth }}>
                      <PictureCard dream={d} width={innerWidth - 7} height={compact ? 183 : 257} />
                    </View>
                  ))}
                </ScrollView>
                {testimonies.length > 1 ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10 }}>
                    {testimonies.map((d, i) => <View key={d.id} style={{
                      height: 5, width: activeTestimony === i ? 15 : 5, borderRadius: 4,
                      backgroundColor: activeTestimony === i ? theme.foreground : theme.border,
                    }}/>)}
                  </View>
                ) : null}
              </View>
            ) : null}
            {series.filter(g => g.phase !== 'Témoignage').map(group => {
              const dreams = visible.filter(d => d.phase === group.phase &&
    (group.phase!=='Croissance' || !inFlower(d)));
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
                    {dreams.map(d => <PictureCard key={d.id} dream={d} width={tileWidth} height={compact ? 137 : 165} />)}
                  </ScrollView>
                </View>
              );
            })}
          </>
        )}

        {view==='Tout' ? (
          <View style={{marginTop:6,marginBottom:26}}>
            <View style={{paddingHorizontal:side,marginBottom:12}}>
              <Text style={{fontSize:17,fontWeight:'700',color:theme.foreground}}>Floraison</Text>
              <Text style={{fontSize:11,color:theme.muted,marginTop:4}}>Prépare et partage le résultat de ton rêve.</Text>
            </View>
            {unfinished.length===0?(
              <View style={{marginHorizontal:side,paddingVertical:17,paddingHorizontal:15,borderWidth:1,borderColor:theme.border,borderRadius:11}}>
                <Text style={{fontSize:12,color:theme.muted,lineHeight:19}}>
                  Les fleurs que tu prépares apparaîtront ici, avant leur publication.
                </Text>
              </View>
            ):(
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{paddingHorizontal:side,gap:11}}>
                {unfinished.map(d=><Pressable key={d.id} accessibilityRole="button"
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
            )}
          </View>
        ):null}
      </ScrollView>
      <Nav />
    </SafeAreaView>
  );
}
