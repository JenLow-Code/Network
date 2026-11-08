import { Text } from '@/i18n/LocalizedText';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Share, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import { PrayerIcon } from '@/icons/PrayerIcon';
import { useApp } from '@/context/AppContext';
import { useLocale } from '@/i18n/locale';
import { publications } from '@/mocks/publications';
import { useAppTheme } from '@/theme/AppTheme';
import { AgendaEntry, DEMO_AGENDA } from '@/domain/agendaTypes';
import { publicationPath } from '@/components/publication/PublicationGallery';
import { useDreams } from '@/domain/dreamRepository';
import { habitKey } from '@/domain/habitProgress';
const isoDay = (d: Date) =>
  [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
export default function Agenda() {
  const theme = useAppTheme();
  const { items: trackedDreams, setHabits } = useDreams();
  const { language, tr } = useLocale();
  const { prayersForDate, togglePrayer } = useApp();
  // Future: show a weekly overview of scheduled service / volunteer duty, separately from personal events.
  const [day, setDay] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [measureEdit,setMeasureEdit]=useState<{
    dreamId:string;habitId:string;dateKey:string;title:string;unit:string;target:number;
  }|null>(null);
  const [measureValue,setMeasureValue]=useState('');
  const [events, setEvents] = useState<AgendaEntry[]>(DEMO_AGENDA);
  const activeHabitDreams = trackedDreams.filter(d =>
    d.phase === 'Croissance' && !!d.habits?.length);
  const dateKey = isoDay(day),
    locale = { fr: 'fr-FR', en: 'en-US', de: 'de-DE', pt: 'pt-PT' }[language];
  // Until backend, current prayer saves are not date-scoped. Show them on today only.
  const today = isoDay(new Date()) === dateKey;
  const savedPrayers = prayersForDate(dateKey);
  const prayers = publications.filter(p => savedPrayers.includes(p.id));
  const dateCaption = day.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const shift = (n: number) =>
    setDay(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + n));
  const shownEvents = events.filter(e => e.status !== 'declined' && today);
  function status(id: string, status: 'confirmed' | 'declined') {
    setEvents(xs => xs.map(e => (e.id === id ? { ...e, status } : e)));
  }
  async function exportEvent(e: AgendaEntry) {
    if (e.status !== 'confirmed') return;
    // Example event only: no real date exists in demo AgendaEntry, so never fabricate one.
    await Share.share({
      message: e.title + ' · ' + e.timeLabel + ' · ' + e.place + '\n' + tr('calendarDescription'),
    });
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 17, paddingBottom: 42 }}
      >
        <PageHeader />
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Text style={{ fontSize: 30, fontWeight: '700', color: theme.foreground }}>
            {tr('agendaTitle')}
          </Text>
          
        </View>
        <Text style={{ color: '#888', fontSize: 12, marginTop: 3 }}>{tr('agendaSubtitle')}</Text>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 23,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: '#eee',
          }}
        >
          <Pressable
            onPress={() => shift(-1)}
            accessibilityLabel="Previous day"
            style={{ padding: 8 }}
          >
            <Ionicons name="chevron-back" size={23} />
          </Pressable>
          <Pressable
            onPress={() => setCalendarOpen(x => !x)}
            accessibilityLabel="Choisir une date"
            style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}
          >
            <Ionicons name="calendar-outline" size={20} color="#D71D77" />
            <Text style={{ fontWeight: '700', fontSize: 13, textTransform: 'capitalize' }}>
              {dateCaption}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#777" />
          </Pressable>
          <Pressable onPress={() => shift(1)} accessibilityLabel="Next day" style={{ padding: 8 }}>
            <Ionicons name="chevron-forward" size={23} />
          </Pressable>
        </View>
        {calendarOpen ? (
          <View
            style={{
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#eee',
              marginTop: 8,
              backgroundColor: '#fff',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <Pressable
                onPress={() =>
                  setDay(
                    d => new Date(d.getFullYear(), d.getMonth() - 1, Math.min(d.getDate(), 28)),
                  )
                }
              >
                <Ionicons name="chevron-back" size={21} color="#777" />
              </Pressable>
              <Text style={{ fontWeight: '700' }}>
                {day.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
              </Text>
              <Pressable
                onPress={() =>
                  setDay(
                    d => new Date(d.getFullYear(), d.getMonth() + 1, Math.min(d.getDate(), 28)),
                  )
                }
              >
                <Ionicons name="chevron-forward" size={21} color="#777" />
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {Array.from(
                {
                  length:
                    new Date(day.getFullYear(), day.getMonth(), 1).getDay() === 0
                      ? 6
                      : new Date(day.getFullYear(), day.getMonth(), 1).getDay() - 1,
                },
                (_, i) => (
                  <View key={'empty' + i} style={{ width: '14.285%', height: 38 }} />
                ),
              )}
              {Array.from(
                { length: new Date(day.getFullYear(), day.getMonth() + 1, 0).getDate() },
                (_, i) => i + 1,
              ).map(n => (
                <Pressable
                  key={n}
                  onPress={() => {
                    setDay(new Date(day.getFullYear(), day.getMonth(), n));
                    setCalendarOpen(false);
                  }}
                  style={{
                    width: '14.285%',
                    height: 38,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: n === day.getDate() ? '#f3dce7' : 'transparent',
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ fontSize: 12 }}>{n}</Text>
                  {events.some(
                    e =>
                      'date' in e &&
                      e.date === isoDay(new Date(day.getFullYear(), day.getMonth(), n)) &&
                      e.status !== 'declined',
                  ) ||
                  trackedDreams.some(
                    d => d.goalDate === isoDay(new Date(day.getFullYear(), day.getMonth(), n)),
                  ) ? (
                    <View
                      style={{
                        width: 3,
                        height: 3,
                        borderRadius: 2,
                        backgroundColor: '#CB245C',
                        marginTop: 2,
                      }}
                    />
                  ) : null}
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
        <Pressable onPress={() => setDay(new Date())} style={{ alignSelf: 'center', padding: 7 }}>
          <Text style={{ fontSize: 11, color: '#888' }}>
            {language === 'fr'
              ? "Aujourd'hui"
              : language === 'de'
                ? 'Heute'
                : language === 'pt'
                  ? 'Hoje'
                  : 'Today'}
          </Text>
        </Pressable>
        {activeHabitDreams.length>0 ? (
          <View style={{marginTop:20,marginBottom:10,gap:12}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:9}}>
              <Ionicons name="leaf-outline" size={23} color="#27845B"/>
              <View style={{flex:1,gap:3}}>
                <Text style={{fontSize:17,fontWeight:'700',color:theme.foreground}}>
                  Mes habitudes
                </Text>
                <Text style={{fontSize:11,color:theme.muted}}>
                  Marque tes réalisations à la date sélectionnée.
                </Text>
              </View>
            </View>
            {activeHabitDreams.map(d=>(
              <View key={d.id} style={{gap:9,padding:13,
                borderWidth:1,borderColor:theme.border,borderRadius:12,
                backgroundColor:theme.surface}}>
                <Text numberOfLines={2} style={{fontSize:12,fontWeight:'700',
                  color:theme.foreground}}>{d.title}</Text>
                {(d.habits||[]).map(h=>{
                  const key=habitKey(h.frequency,dateKey);
                  const target=h.target&&h.target>0?h.target:1;
                  const unit=h.unit||'fois';
                  const measured=h.measurements?.[key]??(h.completed.includes(key)?target:0);
                  const checked=measured>=target;
                  const locked=dateKey>isoDay(new Date());
                  const requiresMeasure=target!==1||unit!=='fois';
                  return <Pressable key={h.id}
                    onPress={()=>{
                      if(locked)return;
                      if(requiresMeasure){
                        setMeasureEdit({dreamId:d.id,habitId:h.id,dateKey:key,
                          title:h.title,unit,target});
                        setMeasureValue(measured?String(measured):'');
                        return;
                      }
                      const updated=(d.habits||[]).map(x=>x.id!==h.id?x:{
                        ...x,
                        completed:checked?x.completed.filter(k=>k!==key):[...x.completed,key],
                        measurements:{...x.measurements,[key]:checked?0:target},
                      });
                      setHabits(d.id,updated);
                    }}
                    disabled={locked} accessibilityRole="button"
                    accessibilityState={{disabled:locked}}
                    accessibilityLabel={h.title+', '+measured+' sur '+target+' '+unit+
                      (h.frequency==='weekly'?' cette semaine':' le '+dateKey)}
                    style={{flexDirection:'row',alignItems:'center',gap:11,
                      paddingVertical:10,paddingHorizontal:4,opacity:locked?.5:1}}>
                    <Ionicons name={checked?'checkbox':
                      measured>0?'ellipse-outline':'square-outline'}
                      size={23} color={checked?'#27845B':theme.muted}/>
                    <View style={{flex:1,gap:3}}>
                      <Text style={{color:theme.foreground,fontSize:13,fontWeight:'600'}}>
                        {h.title}
                      </Text>
                      <Text style={{color:theme.muted,fontSize:10}}>
                        {measured} / {target} {unit}
                        {' · '+(h.frequency==='daily'?'par jour':'par semaine')}
                      </Text>
                    </View>
                    {requiresMeasure?<Ionicons name="create-outline" color={theme.muted} size={18}/>:null}
                  </Pressable>;
                })}
              </View>
            ))}
          </View>
        ):null}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 9,
            marginTop: 14,
            marginBottom: 10,
          }}
        >
          <PrayerIcon size={30} />
          <Text style={{ fontSize: 17, fontWeight: '700' }}>{tr('prayersToday')}</Text>
        </View>
        {prayers.length === 0 ? (
          <Text style={{ fontSize: 12, color: '#888', paddingVertical: 14 }}>
            {tr('noPrayers')}
          </Text>
        ) : (
          prayers.map(p => (
            <View
              key={p.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 11,
                borderBottomWidth: 1,
                borderColor: '#f0f0f0',
                gap: 11,
              }}
            >
              <Pressable onPress={() => router.push(publicationPath(p) as any)} style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600' }}>{p.title}</Text>
                <Text style={{ fontSize: 10, color: '#aaa', marginTop: 3 }}>
                  {p.type === 'bible' ? 'Bible' : p.type === 'dream' ? 'Dream' : 'Music'}
                </Text>
              </Pressable>
              <Pressable onPress={() => togglePrayer(p.id)} accessibilityLabel="Remove prayer">
                <Ionicons name="checkmark-circle" size={22} color="#64936f" />
              </Pressable>
            </View>
          ))
        )}
        <Text style={{ fontSize: 17, fontWeight: '700', marginTop: 29, marginBottom: 15 }}>
          {tr('appointments')}
        </Text>
        {shownEvents.length === 0 ? (
          <Text style={{ fontSize: 12, color: '#888' }}>{tr('emptyAgenda')}</Text>
        ) : (
          shownEvents.map(e => (
            <View
              key={e.id}
              style={{
                borderWidth: 1,
                borderColor: '#e9e9e9',
                padding: 14,
                borderRadius: 12,
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700' }}>{e.title}</Text>
              <Text style={{ fontSize: 11, color: '#777', marginTop: 6 }}>
                {e.timeLabel} · {e.place} · {e.partner}
              </Text>
              <Text style={{ fontSize: 11, color: '#888', marginTop: 6 }}>
                {e.status === 'pending' ? tr('pending') : tr('confirmed')}
              </Text>
              {e.status === 'pending' ? (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <Pressable
                    onPress={() => status(e.id, 'declined')}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      padding: 10,
                      backgroundColor: '#eee',
                      borderRadius: 8,
                    }}
                  >
                    <Text>{tr('decline')}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => status(e.id, 'confirmed')}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      padding: 10,
                      backgroundColor: '#111',
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ color: '#fff' }}>{tr('accept')}</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => void exportEvent(e)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 13 }}
                >
                  <Ionicons name="calendar-outline" size={17} color="#D71D77" />
                  <Text style={{ color: '#D71D77', fontSize: 12 }}>{tr('exportCalendar')}</Text>
                </Pressable>
              )}
            </View>
          ))
        )}
        <Text style={{ color: '#aaa', fontSize: 11, marginTop: 20, lineHeight: 17 }}>
          Demo: prayer records and appointments are not yet synchronized to a calendar provider.
          When real event dates exist, native calendars can receive an event or subscribe to a
          private ICS feed. Google and Outlook OAuth sync requires separate consent.
        </Text>
      </ScrollView>
      <Modal visible={measureEdit!==null} transparent animationType="fade"
        onRequestClose={()=>setMeasureEdit(null)}>
        <View style={{flex:1,justifyContent:'center',padding:19,
          backgroundColor:'rgba(0,0,0,.54)'}}>
          <Pressable onPress={()=>setMeasureEdit(null)}
            style={{position:'absolute',top:0,right:0,left:0,bottom:0}}/>
          <View style={{padding:20,borderRadius:15,backgroundColor:theme.surface,
            width:'100%',maxWidth:420,alignSelf:'center',gap:12}}>
            <Text style={{fontSize:19,fontWeight:'700',color:theme.foreground}}>
              {measureEdit?.title}
            </Text>
            <Text style={{fontSize:12,color:theme.muted}}>
              Objectif : {measureEdit?.target} {measureEdit?.unit}
            </Text>
            <TextInput value={measureValue} onChangeText={setMeasureValue}
              accessibilityLabel="Quantité accomplie"
              autoFocus keyboardType="decimal-pad"
              placeholder="Quantité accomplie" placeholderTextColor={theme.muted}
              style={{padding:13,borderWidth:1,borderColor:theme.border,
                borderRadius:10,color:theme.foreground,fontSize:16}}/>
            <Pressable accessibilityRole="button" onPress={()=>{
              if(!measureEdit)return;
              const amount=Number(measureValue.replace(',','.'));
              if(!Number.isFinite(amount)||amount<0||amount>100000)return;
              const d=trackedDreams.find(x=>x.id===measureEdit.dreamId);
              if(!d)return;
              setHabits(d.id,(d.habits||[]).map(h=>{
                if(h.id!==measureEdit.habitId)return h;
                const checked=amount>=measureEdit.target;
                return {...h,measurements:{...h.measurements,[measureEdit.dateKey]:amount},
                  completed:checked
                    ? Array.from(new Set([...h.completed,measureEdit.dateKey]))
                    : h.completed.filter(k=>k!==measureEdit.dateKey)};
              }));
              setMeasureEdit(null);
            }} style={{backgroundColor:'#242322',minHeight:47,borderRadius:10,
              alignItems:'center',justifyContent:'center'}}>
              <Text style={{color:'#FFFFFF',fontWeight:'700',fontSize:13}}>
                Enregistrer
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={()=>setMeasureEdit(null)}
              style={{alignItems:'center',padding:7}}>
              <Text style={{fontSize:12,color:theme.muted}}>Annuler</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Nav />
    </SafeAreaView>
  );
}
