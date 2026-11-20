import { Text, TextInput } from '@/i18n/LocalizedText';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NetworkMark } from '@/components/brand/NetworkMark';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { Nav } from '@/components/navigation/Nav';
import { Pill } from '@/components/ui/Pill';
import { TopActions } from '@/components/navigation/TopActions';
import { PublicationGallery } from '@/components/publication/PublicationGallery';
import { useDiscovery } from '@/lib/api/hooks';
import { people, personPath } from '@/mocks/people';
import { Avatar } from '@/components/ui/Avatar';
import { FireHeader } from '@/components/fire/FireHeader';
import { useLocale } from '@/i18n/locale';
import { useAppTheme } from '@/theme/AppTheme';
import { workspaceLayout,PAGE_TITLE_FONT_SIZE,PAGE_TITLE_LINE_HEIGHT } from '@/theme/workspaceLayout';
import { HANDWRITING_FAMILY } from '@/theme/handwriting';
import { matchesForMe, profileTalentStorageKey, type SavedTalent } from '@/domain/personalDiscovery';
const filters = ['Tout', 'Pour moi', 'Rêves', 'Musique', 'Bible', 'Talents'] as const;

/** Deterministic within a visit; a new seed gently varies tile placement on refresh. */
function discoveryRank(id: string, seed = 0): number {
  let hash = 2166136261;
  const key = 'jenlow:discovery:' + seed + ':' + id;
  for (let i = 0; i < key.length; i += 1) {
    hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

export default function Discover() {
  const { tr } = useLocale();
  const theme = useAppTheme();
  const {width}=useWindowDimensions();
  const desktop=Platform.OS==='web'&&workspaceLayout(width).desktop;
  const ws=workspaceLayout(width);
  // Android browser chrome can change the visual viewport independently of
  // useWindowDimensions. Measure the actual gallery container instead.
  const [galleryWidth,setGalleryWidth]=useState(0);
  const params = useLocalSearchParams<{ filter?: string }>();
  // A new page visit gets its own order; filtering and pagination keep it stable.
  const [shuffleSeed] = useState(() => Math.floor(Math.random() * 0x100000000));

  const [filter, setFilter] = useState<(typeof filters)[number]>(
    params.filter === 'Musique' ? 'Musique' : params.filter === 'Talents' ? 'Talents' : params.filter === 'Pour moi' ? 'Pour moi' : 'Tout',
  );
  useEffect(() => {
    if (params.filter === 'Musique') setFilter('Musique');
  }, [params.filter]);
  const [query, setQuery] = useState('');
  const { email } = useApp();
  const [savedTalents, setSavedTalents] = useState<SavedTalent[]>([]);
  const [talentsLoaded, setTalentsLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    setTalentsLoaded(false);
    setSavedTalents([]);
    void AsyncStorage.getItem(profileTalentStorageKey(email)).then(raw => {
      if (!alive) return;
      try {
        const data: unknown = raw ? JSON.parse(raw) : [];
        setSavedTalents(Array.isArray(data) ? data.filter(
          (t): t is SavedTalent => !!t && typeof t === 'object' && typeof t.name === 'string' && t.name.trim().length > 0,
        ) : []);
      } catch { setSavedTalents([]); }
    }).catch(()=>{ if (alive) setSavedTalents([]); }).finally(()=>{ if (alive) setTalentsLoaded(true); });
    return () => { alive = false; };
  }, [email]);
  // Discovery is backed by D1 through the API; there is deliberately no mock fallback.
  const feed = useDiscovery();
  // Preserve the original mixed feed, including Talent posts. Previously the
  // "Tout" view appended all talents *after* all dreams, undoing API interleaving.
  const shuffledFeed = useMemo(() => {
    // Keep the existing editorial distribution. Only vary the order locally
    // in small groups instead of fully randomizing the whole discovery feed.
    const ordered = feed.items
      .filter(p => p.type !== 'dream' || p.phase !== 'Rêve')
      .slice()
      .sort((a, b) => discoveryRank(a.id) - discoveryRank(b.id) || a.id.localeCompare(b.id));
    const groupSize = 6;
    for (let start = 0; start < ordered.length; start += groupSize) {
      const group = ordered.slice(start, start + groupSize);
      group.sort((a, b) => discoveryRank(a.id, shuffleSeed) -
        discoveryRank(b.id, shuffleSeed) || a.id.localeCompare(b.id));
      ordered.splice(start, group.length, ...group);
    }
    return ordered;
  }, [feed.items, shuffleSeed]);
  const publications = useMemo(() => shuffledFeed.filter(p => p.type !== 'talent'), [shuffledFeed]);
  const personPublications = useMemo(() => shuffledFeed.filter(p => p.type === 'talent'), [shuffledFeed]);
  const items = useMemo(
    () =>
      publications.filter(
        p =>
          (filter === 'Tout' ||
            (filter === 'Pour moi' && matchesForMe(p, savedTalents)) ||
            (filter === 'Rêves' && p.type === 'dream') ||
            (filter === 'Musique' && p.type === 'music') ||
            (filter === 'Bible' && p.type === 'bible')) &&
          [p.title, p.author, p.type, p.type === 'dream' ? p.phase : '']
            .join(' ')
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
      ),
    [filter, query, publications, savedTalents],
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        scrollEventThrottle={250}
        onScroll={e => {
          const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
          if (feed.hasMore && layoutMeasurement.height + contentOffset.y > contentSize.height - 900) void feed.loadMore();
        }}
        contentContainerStyle={{
          paddingHorizontal: ws.gutter,
          paddingBottom: 55,
          maxWidth: ws.maxWidth,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <View style={{ paddingTop: 9, paddingBottom: 8 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 34,
              marginBottom: 10,
              paddingBottom: 12,
              borderBottomWidth: 0.5,
              borderBottomColor: theme.dark ? 'rgba(255,255,255,0.32)' : 'rgba(23,23,23,0.30)',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <NetworkMark size={28} color="#E5006E" />
            <Text
              accessibilityLabel="JenLow"
              style={{
                fontSize:PAGE_TITLE_FONT_SIZE,
                lineHeight:PAGE_TITLE_LINE_HEIGHT,
                fontWeight: '800',
                letterSpacing: 2.0,
                color: theme.foreground,
                marginLeft: 5,
              }}
            >
              JENLOW
            </Text>
            </View>
            <TopActions />
          </View>
          <View style={{ alignSelf: 'flex-start', maxWidth: '100%', paddingBottom: 4 }}>
          </View>
        </View>
        <View
          style={{
            height: 39,
            borderWidth: 0,
            backgroundColor: theme.dark ? '#292929' : '#F3ECE2',
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            gap: 9,
            marginBottom: 13,
          }}
        >
          <Ionicons name="search" size={18} color="#777" />
          <TextInput
            style={{ flex: 1, fontSize: 13, color: '#222' }}
            placeholder={tr('searchPlaceholder')}
            value={query}
            onChangeText={setQuery}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 7, paddingBottom: 17 }}
        >
          {filters.map(f => (
            <Pill
              key={f}
              text={
                f === 'Tout'
                  ? tr('all')
                  : f === 'Pour moi'
                    ? 'Pour moi'
                  : f === 'Rêves'
                    ? tr('dreamsFilter')
                    : f === 'Musique'
                      ? tr('musicFilter')
                      : f === 'Bible'
                        ? tr('bibleFilter')
                        : 'Talents'
              }
              active={filter === f}
              onPress={() => setFilter(f)}
            />
          ))}
        </ScrollView>
        <View style={{width:'100%',minWidth:0,overflow:'hidden'}}
          onLayout={e=>{
            const measured=Math.floor(e.nativeEvent.layout.width);
            if(measured>0&&Math.abs(measured-galleryWidth)>1)setGalleryWidth(measured);
          }}>
        {galleryWidth>0?<PublicationGallery
          layout="masonry"
          flushEdges
          personalizedTalents={talentsLoaded ? savedTalents : []}
          contentWidth={galleryWidth}
          items={(filter === 'Talents'
            ? personPublications
            : filter === 'Tout'
              ? shuffledFeed
              : filter === 'Pour moi'
                ? shuffledFeed.filter(p => matchesForMe(p, savedTalents))
                : items
          ).filter(p =>
            [
              p.title,
              p.author,
              p.type,
              ...(p.type === 'talent' ? [p.skill, p.level, ...p.seeking] : []),
            ]
              .join(' ')
              .toLowerCase()
              .includes(query.trim().toLowerCase()),
          )}
        />:null}
        </View>
        {filter === 'Pour moi' && talentsLoaded && savedTalents.length === 0 ? (
          <View style={{padding:23,alignItems:'center',gap:10}}>
            <Ionicons name="sparkles-outline" color={theme.muted} size={24}/>
            <Text style={{color:theme.foreground,fontWeight:'700',fontSize:15}}>Des occasions pensées pour tes talents</Text>
            <Text style={{color:theme.muted,fontSize:12,lineHeight:20,textAlign:'center'}}>
              Renseigne tes talents dans ton profil pour découvrir les demandes qui correspondent à tes compétences.
            </Text>
            <Pressable accessibilityRole="button" onPress={()=>router.push('/profile')} style={{padding:12,borderWidth:1,borderColor:theme.border,borderRadius:9}}>
              <Text style={{color:theme.foreground,fontSize:12,fontWeight:'700'}}>Renseigner mes talents</Text>
            </Pressable>
          </View>
        ) : null}
        {filter === 'Pour moi' && talentsLoaded && savedTalents.length > 0 &&
          !shuffledFeed.some(p => matchesForMe(p, savedTalents)) && feed.state !== 'loading' ? (
          <Text style={{color:theme.muted,fontSize:13,lineHeight:21,textAlign:'center',marginTop:26}}>
            Aucun besoin correspondant à tes talents dans les publications chargées.
            Les demandes de matériel de JenLow Tools ne sont pas encore synchronisées.
          </Text>
        ) : null}
        {feed.state === 'loading' && feed.items.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 30 }} color={theme.foreground} />
        ) : null}
        {feed.state === 'error' ? (
          <View style={{ alignItems: 'center', marginTop: 25, gap: 10 }}>
            <Text style={{ textAlign: 'center', color: '#999' }}>
              Impossible de charger Discovery pour le moment.
            </Text>
            <Pressable accessibilityRole="button" onPress={() => void feed.retry()} style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
              <Text style={{ color: '#D71D77', fontSize: 13 }}>Réessayer</Text>
            </Pressable>
          </View>
        ) : null}
        {feed.state === 'ready' && filter !== 'Talents' && filter !== 'Pour moi' && items.length === 0 && (
          <Text style={{ textAlign: 'center', marginTop: 25, color: '#999' }}>
            Aucune publication trouvée.
          </Text>
        )}
      </ScrollView>
      <Nav />
    </SafeAreaView>
  );
}
