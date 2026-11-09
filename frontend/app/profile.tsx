import { Text, TextInput } from '@/i18n/LocalizedText';
import React, { useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Avatar } from '@/components/ui/Avatar';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthProvider';
import { useAppTheme } from '@/theme/AppTheme';
import { ProfileTalentTile } from '@/components/talent/ProfileTalentTile';
import { ProfilePublicationFeed } from '@/components/publication/PublicationGallery';
import { useDreams } from '@/domain/dreamRepository';
import { PHASE_LABELS, PHASE_COLORS } from '@/domain/publication';
import { publications } from '@/mocks/publications';
import type { TalentIllustration } from '@/components/talent/TalentArt';
type Talent = { name: string; level: number; interests: string[]; description?: string };
const initial: Talent[] = [
  { name: 'Batterie', level: 2, interests: ['Tandem', 'Enseigner'] },
  { name: 'Chant', level: 1, interests: ['Tandem', 'Apprendre'] },
  { name: 'Piano', level: 3, interests: ['Tandem', 'Enseigner'] },
];
const levels = [
  { name: 'Grand débutant', color: '#287D58' },
  { name: 'Quelques notions', color: '#2ECA65' },
  { name: 'Intermédiaire', color: '#EAC000' },
  { name: 'Avancé', color: '#F38A24' },
  { name: 'Professionnel', color: '#CB245C' },
];
const interests = ['Tandem', 'Enseigner', 'Apprendre'];
const talentArt = (name: string): TalentIllustration | undefined => {
 const s=name.toLocaleLowerCase('fr');
 if(s.includes('batt'))return 'drums';
 if(s.includes('chant')||s.includes('voix'))return 'singing';
 if(s.includes('piano'))return 'piano';
 if(s.includes('photo'))return 'camera';
 if(s.includes('guit'))return 'acoustic-guitar';
 if(s.includes('violon'))return 'violin';
 if(s.includes('basse'))return 'bass';
 if(s.includes('saxo'))return 'saxophone';
 if(s.includes('tromp'))return 'trumpet';
 if(s.includes('violoncelle'))return 'cello';
 if(s.includes('ukul'))return 'ukulele';
 return undefined;
};
export default function Profile() {
  const app = useApp(),
    auth = useAuth(),
    theme = useAppTheme();
  const { width } = useWindowDimensions();
  const { items: workspaceDreams } = useDreams();
  const [edit, setEdit] = useState<'bio' | 'city' | 'church' | null>(null);
  const [draft, setDraft] = useState('');
  const [talents, setTalents] = useState<Talent[]>(initial);
  const [loaded, setLoaded] = useState(false);
  const [newTalent, setNewTalent] = useState('');
  const [addTalentOpen,setAddTalentOpen]=useState(false);
  const scrollRef=useRef<any>(null);
  const talentY=useRef(0);
  const postsY=useRef(0);
  const scrollTo=(y:number)=>scrollRef.current?.scrollTo({y:Math.max(0,y-18),animated:true});
  const [selectedTalent, setSelectedTalent] = useState<number | null>(null);
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const pinKey='jenlow.public-profile.featured.v1.'+app.name;
  useEffect(()=>{let active=true;void AsyncStorage.getItem(pinKey).then(x=>{if(active)setFeaturedId(x);}).catch(()=>{});return ()=>{active=false;};},[pinKey]);
  const feature=(id:string|null)=>{setFeaturedId(id);if(id)void AsyncStorage.setItem(pinKey,id).catch(()=>{});else void AsyncStorage.removeItem(pinKey).catch(()=>{});};
  const storage = 'jenlow.profile.talents.' + (app.email || 'guest').toLowerCase();
  useEffect(() => {
    let active = true;
    setLoaded(false);
    void AsyncStorage.getItem(storage)
      .then(raw => {
        if (!active) return;
        if (raw) {
          try {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) setTalents(list);
          } catch {
            setTalents(initial);
          }
        } else setTalents(initial);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [storage]);
  useEffect(() => {
    if (loaded) void AsyncStorage.setItem(storage, JSON.stringify(talents)).catch(() => {});
  }, [storage, loaded, talents]);
  const start = (key: 'bio' | 'city' | 'church') => {
    setEdit(key);
    setDraft(app[key] || '');
  };
  const save = () => {
    if (edit) app.edit({ [edit]: draft });
    setEdit(null);
  };
  const field = (key: 'bio' | 'city' | 'church', label: string) => (
    <View style={{ marginTop: 16, width: '100%' }}>
      <Text style={{ fontSize: 12, color: theme.muted, marginBottom: 5 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        {edit === key ? (
          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline={key === 'bio'}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 9,
              padding: 10,
              color: theme.foreground,
              minHeight: key === 'bio' ? 70 : 40,
            }}
          />
        ) : (
          <Text style={{ flex: 1, color: theme.foreground, fontSize: 14, lineHeight: 21 }}>
            {app[key] || 'À compléter'}
          </Text>
        )}
        <Pressable
          onPress={edit === key ? save : () => start(key)}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons
            name={edit === key ? 'checkmark' : 'pencil-outline'}
            size={19}
            color={theme.foreground}
          />
        </Pressable>
      </View>
    </View>
  );
  const updateTalent = (index: number, patch: Partial<Talent>) =>
    setTalents(items => items.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  const avatar =
    typeof auth.user?.user_metadata?.avatar_url === 'string'
      ? auth.user.user_metadata.avatar_url
      : undefined;
  const areaWidth=Math.min(width-36,860);
  const columns=areaWidth<350?2:3;
  const cardWidth=Math.floor((areaWidth-10*(columns-1))/columns);
  const myPublicPosts=publications.filter(p=>p.author===app.name);
  const myLocalDreams=workspaceDreams.filter(d=>d.id.startsWith('local-') && d.ownerIds?.includes('demo-user'));
  const privateDreams=myLocalDreams.filter(d=>d.visibility!=='public');
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView ref={scrollRef}
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 12,
          paddingBottom: 55,
          maxWidth: 900,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <PageHeader />
        <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
          <Text style={{fontSize:29,fontWeight:'800',color:theme.foreground}}>Mon profil</Text>
          <Pressable onPress={()=>router.push('/profile-preview')} accessibilityRole="button"
            style={{padding:11,borderWidth:1,borderColor:theme.border,borderRadius:10,
              flexDirection:'row',alignItems:'center',gap:7}}>
            <Ionicons name="eye-outline" size={18} color={theme.foreground}/>
            <Text style={{fontSize:12,color:theme.foreground,fontWeight:'700'}}>Aperçu</Text>
          </Pressable>
        </View>
        <View style={{ alignItems: 'center', marginTop: 23 }}>
          {avatar ? (
            <Image
              source={{ uri: avatar }}
              style={{
                width: 94,
                height: 94,
                borderRadius: 47,
                borderWidth: 2,
                borderColor: theme.border,
              }}
            />
          ) : (
            <Avatar size={94} />
          )}
          <Text style={{ fontSize: 22, fontWeight: '700', color: theme.foreground, marginTop: 12 }}>
            {app.name}
          </Text>
        </View>
        <View style={{alignItems:'center',marginTop:12,gap:4}}>
          <Text style={{fontSize:14,color:theme.muted,textAlign:'center',maxWidth:440}}>{app.bio || 'Ajouter une description personnelle'}</Text>
          <Text style={{fontSize:12,color:theme.muted}}>{app.church || 'Église non renseignée'}</Text>
          <Pressable onPress={()=>start('bio')} style={{padding:9}}><Text style={{fontSize:12,color:'#D71D77'}}>Modifier ma présentation</Text></Pressable>
        </View>
        {edit!==null?<View style={{backgroundColor:theme.surface,borderWidth:1,borderColor:theme.border,borderRadius:12,padding:15,marginTop:10}}>
          {field('bio','Ma description')}{field('city','Ma ville')}{field('church','Ma communauté')}
          <Pressable onPress={()=>setEdit(null)} style={{padding:10,alignItems:'center'}}><Text style={{color:theme.muted}}>Fermer</Text></Pressable>
        </View>:null}
        <View style={{marginTop:28,marginBottom:18}}>
          <Text style={{fontSize:11,color:theme.muted,fontWeight:'700',letterSpacing:1.25,marginBottom:12}}>MON ESPACE PERSONNEL</Text>
          <View style={{flexDirection:'row',gap:10,flexWrap:'wrap'}}>
            {([
              {title:'Mes talents',subtitle:'Compétences et niveaux',icon:'sparkles-outline',path:'talents',color:'#27845B'},
              {title:'Mes publications',subtitle:'Ce que je partage',icon:'albums-outline',path:'publications',color:'#CB245C'},
              {title:'Mes musiques',subtitle:'Mes morceaux',icon:'musical-note-outline',path:'music',color:'#7364A6'},
              {title:'Mes prières',subtitle:'Intentions & suivis',icon:'heart-outline',path:'/prayers',color:'#C83D77'},
              {title:'Ma Bible',subtitle:'Lire, télécharger, partager',icon:'book-outline',path:'/bible-library',color:'#B88962'},
              {title:'Paramètres',subtitle:'Compte & préférences',icon:'settings-outline',path:'/settings',color:'#647A8D'},
            ] as const).map(link => (
              <Pressable key={link.path} accessibilityRole="button" accessibilityLabel={link.title}
                onPress={()=>link.path==='talents'?scrollTo(talentY.current):link.path==='publications'?scrollTo(postsY.current):link.path==='music'?router.push({pathname:'/music-hub',params:{mine:'1'}}):router.push(link.path as '/prayers' | '/settings' | '/bible-library')}
                style={{
                  width:width<570?'100%':'31.8%',padding:13,borderWidth:1,borderColor:theme.border,
                  borderRadius:12,backgroundColor:theme.surface,flexDirection:'row',alignItems:'center',gap:13,
                  minHeight:70,
                }}>
                <View style={{width:38,height:38,borderRadius:11,backgroundColor:theme.background,
                  justifyContent:'center',alignItems:'center'}}>
                  <Ionicons name={link.icon} size={21} color={link.color}/>
                </View>
                <View style={{flex:1,gap:4}}>
                  <Text style={{color:theme.foreground,fontWeight:'700',fontSize:14}}>{link.title}</Text>
                  <Text style={{color:theme.muted,fontSize:11}}>{link.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={17} color={theme.muted}/>
              </Pressable>
            ))}
          </View>
        </View>
        <View onLayout={e=>{talentY.current=e.nativeEvent.layout.y;}}>
          <Text style={{fontSize:19,fontWeight:'800',color:theme.foreground,marginTop:24,marginBottom:7}}>Mes talents</Text>
        </View>
        <Text style={{ fontSize: 12, color: theme.muted, lineHeight: 18 }}>
          Choisis ton niveau et ce que tu souhaites partager. Les talents seront visibles dans
          Découvrir lorsque les profils seront publiés.
        </Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:16}}>
          {talents.map((t,index)=><ProfileTalentTile key={index} title={t.name} level={levels[t.level]?.name||'À définir'} art={talentArt(t.name)} width={cardWidth} onPress={()=>setSelectedTalent(index)}/>)}
          <Pressable accessibilityRole="button" accessibilityLabel="Ajouter un talent" onPress={()=>setAddTalentOpen(true)}
            style={{width:cardWidth,height:cardWidth,borderRadius:10,borderWidth:1.5,
              borderStyle:'dashed',borderColor:'#27845B',backgroundColor:theme.surface,
              alignItems:'center',justifyContent:'center'}}>
            <Ionicons name="add" size={27} color="#27845B"/>
          </Pressable>
        </View>
        <View onLayout={e=>{postsY.current=e.nativeEvent.layout.y;}}>
          <Text style={{fontSize:19,fontWeight:'800',color:theme.foreground,marginTop:25,marginBottom:14}}>Mes publications</Text>
        </View>
        {myLocalDreams.length>0 ? (
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:18}}>
            {myLocalDreams.map(d=><Pressable key={d.id}
              onPress={()=>router.push({pathname:'/my-dream/[id]',params:{id:d.id}})}
              accessibilityRole="button" accessibilityLabel={d.title+(d.visibility==='public'?', public':', privé')}
              style={{width:cardWidth,height:Math.max(145,Math.round(cardWidth*1.10)),
                borderRadius:10,overflow:'hidden',backgroundColor:theme.surface}}>
              {d.image?<Image source={{uri:d.resultImage||d.image}} resizeMode="cover"
                style={{position:'absolute',width:'100%',height:'100%'}}/>:null}
              <View style={{position:'absolute',top:0,bottom:0,left:0,right:0,
                backgroundColor:'rgba(0,0,0,.39)'}}/>
              <View style={{position:'absolute',top:9,right:9}}>
                <Ionicons name={d.visibility==='public'?'globe-outline':'lock-closed'}
                  size={16} color="#FFFFFF"/>
              </View>
              <Text numberOfLines={3} style={{color:'#FFFFFF',fontWeight:'700',fontSize:13,
                position:'absolute',bottom:12,left:10,right:10}}>{d.title}</Text>
            </Pressable>)}
          </View>
        ):null}
        {myPublicPosts.length?<ProfilePublicationFeed grid items={myPublicPosts} contentWidth={areaWidth} featuredId={featuredId} onFeature={feature}/>:<Text style={{color:theme.muted,fontSize:13}}>{myLocalDreams.length?'Aucune autre publication publique pour le moment.':'Aucune publication pour le moment.'}</Text>}
      </ScrollView>
      <Modal visible={addTalentOpen} transparent animationType="fade"
        onRequestClose={()=>setAddTalentOpen(false)}>
        <View style={{flex:1,backgroundColor:'rgba(0,0,0,.56)',justifyContent:'center',padding:19}}>
          <Pressable onPress={()=>setAddTalentOpen(false)}
            style={{position:'absolute',top:0,bottom:0,left:0,right:0}}/>
          <View style={{backgroundColor:theme.surface,maxWidth:430,width:'100%',
            alignSelf:'center',padding:21,borderRadius:15,gap:15}}>
            <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
              <Text style={{fontSize:20,fontWeight:'700',color:theme.foreground}}>Ajouter un talent</Text>
              <Pressable onPress={()=>setAddTalentOpen(false)} accessibilityLabel="Fermer">
                <Ionicons name="close-outline" size={23} color={theme.foreground}/>
              </Pressable>
            </View>
            <TextInput value={newTalent} onChangeText={setNewTalent} maxLength={70}
              placeholder="Ex. Guitare, photographie, chant…"
              style={{borderWidth:1,borderColor:theme.border,borderRadius:10,
                padding:13,color:theme.foreground,fontSize:14}}/>
            <Pressable accessibilityRole="button" onPress={()=>{
              if(!newTalent.trim())return;
              setTalents(items=>[...items,{name:newTalent.trim(),level:0,interests:[]}]);
              setNewTalent('');setAddTalentOpen(false);
            }} style={{backgroundColor:'#242322',borderRadius:10,padding:14,alignItems:'center'}}>
              <Text style={{color:'#FFFFFF',fontSize:13,fontWeight:'700'}}>Ajouter à mon profil</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal visible={selectedTalent!==null} transparent animationType="fade" onRequestClose={()=>setSelectedTalent(null)}>
        <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'center',padding:18}}>
          <ScrollView style={{backgroundColor:theme.surface,borderRadius:14,maxWidth:470,width:'100%',alignSelf:'center',maxHeight:'85%'}} contentContainerStyle={{padding:20,gap:14}}>
            <Pressable onPress={()=>setSelectedTalent(null)} style={{alignSelf:'flex-end',padding:6}}><Ionicons name="close" size={23} color={theme.foreground}/></Pressable>
            {selectedTalent!==null&&talents[selectedTalent] ? <>
              <Text style={{fontSize:24,fontWeight:'700',color:theme.foreground,textAlign:'center'}}>{talents[selectedTalent].name}</Text>
              <Text style={{color:theme.muted,textAlign:'center'}}>Niveau : {levels[talents[selectedTalent].level]?.name}</Text>
              <View style={{flexDirection:'row',justifyContent:'center',gap:12}}>{levels.map((l,i)=><Pressable key={l.name} onPress={()=>updateTalent(selectedTalent,{level:i})} style={{width:24,height:24,borderRadius:12,backgroundColor:i<=talents[selectedTalent].level?l.color:theme.border,borderWidth:i===talents[selectedTalent].level?2:0,borderColor:theme.foreground}} accessibilityLabel={l.name}/>)}</View>
              <Text style={{fontWeight:'700',color:theme.foreground}}>Ma présentation</Text>
              <TextInput multiline value={talents[selectedTalent].description||''} onChangeText={description=>updateTalent(selectedTalent,{description})} placeholder="Ce que je peux partager, mon expérience…" style={{minHeight:90,borderWidth:1,borderColor:theme.border,borderRadius:9,padding:12,color:theme.foreground,textAlignVertical:'top'}}/>
              <Text style={{fontWeight:'700',color:theme.foreground}}>Je souhaite</Text>
              <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{interests.map(interest=><Pressable key={interest} onPress={()=>{const t=talents[selectedTalent];updateTalent(selectedTalent,{interests:t.interests.includes(interest)?t.interests.filter(x=>x!==interest):[...t.interests,interest]});}} style={{padding:11,borderWidth:1,borderColor:talents[selectedTalent].interests.includes(interest)?'#D71D77':theme.border,borderRadius:9}}><Text style={{color:theme.foreground}}>{interest}</Text></Pressable>)}</View>
              <Pressable onPress={()=>{setTalents(x=>x.filter((_,i)=>i!==selectedTalent));setSelectedTalent(null);}} style={{alignItems:'center',padding:12}}><Text style={{color:'#C34D65'}}>Retirer ce talent</Text></Pressable>
              <Pressable onPress={()=>setSelectedTalent(null)} style={{backgroundColor:'#D71D77',borderRadius:9,padding:13,alignItems:'center'}}><Text style={{color:'#fff',fontWeight:'700'}}>Terminer</Text></Pressable>
            </>:null}
          </ScrollView>
        </View>
      </Modal>
      <Nav />
    </SafeAreaView>
  );
}
