import { Text } from '@/i18n/LocalizedText';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Share, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Nav } from '@/components/navigation/Nav';
import { PageHeader } from '@/components/navigation/PageHeader';
import { PrayerIcon } from '@/icons/PrayerIcon';
import { useApp } from '@/context/AppContext';
import { useLocale } from '@/i18n/locale';
import { useAppTheme } from '@/theme/AppTheme';
import {workspaceCanvas} from '@/theme/workspaceLayout';
import type { AgendaEntry } from '@/domain/agendaTypes';
import { dreamCalendarItems, dreamItemsForDay, markedDreamDays } from '@/domain/agendaOverview';
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
  const {width}=useWindowDimensions();
  const { items: trackedDreams, personalHabits, setPersonalHabits, setHabits } = useDreams();
  const { language, tr } = useLocale();
  const { prayerPublications:publications,prayersForDate, togglePrayer } = useApp();
  // Future: show a weekly overview of scheduled service / volunteer duty, separately from personal events.
  const [day, setDay] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [measureEdit,setMeasureEdit]=useState<{
    dreamId:string;habitId:string;dateKey:string;title:string;unit:string;target:number;
  }|null>(null);
  const [measureValue,setMeasureValue]=useState('');
  // Appointments require real, dated invitations from the future backend.
  // Do not show or accept fake appointments in a personal calendar.
  const [events, setEvents] = useState<AgendaEntry[]>([]);
  const activeHabitDreams = [
    ...trackedDreams.filter(d =>
      d.phase === 'Croissance' && !!d.habits?.length &&
      (!d.growthStartedAt || d.growthStartedAt.slice(0,10) <= isoDay(day)) &&
      !(d.paused && d.pauseUntil && d.pauseUntil >= isoDay(day))),
    ...(personalHabits.length?[{
      id:'__personal__',title:'Mes habitudes personnelles',habits:personalHabits,
    }]:[]),
  ];
  const updateGroupHabits=(dreamId:string,updated:typeof personalHabits)=>{
    if(dreamId==='__personal__')setPersonalHabits(updated);
    else setHabits(dreamId,updated);
  };
  const dateKey = isoDay(day),
    locale = { fr: 'fr-FR', en: 'en-US', de: 'de-DE', pt: 'pt-PT' }[language];
  // Prayer records are filtered by the selected local day, not by a simulated appointment.
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
  const dreamEvents = useMemo(() => dreamCalendarItems(trackedDreams), [trackedDreams]);
  const selectedDreamEvents = useMemo(() => dreamItemsForDay(dreamEvents, dateKey), [dreamEvents, dateKey]);
  const markedDays = useMemo(() => markedDreamDays(dreamEvents, day.getFullYear(), day.getMonth()), [dreamEvents, day]);
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
        contentContainerStyle={{ ...workspaceCanvas(width), paddingTop:12, paddingBottom:55 }}
      >
        <PageHeader title={tr('agendaTitle')} />
        <Text style={{ color: theme.muted, fontSize: 12, marginTop: 3 }}>{tr('agendaSubtitle')}</Text>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 23,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Pressable
            onPress={() => shift(-1)}
            accessibilityLabel="Previous day"
            style={{ padding: 8 }}
          >
            <Ionicons name="chevron-back" size={23} color={theme.foreground} />
          </Pressable>
          <Pressable
            onPress={() => setCalendarOpen(x => !x)}
            accessibilityLabel="Choisir une date"
            style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}
          >
            <Ionicons name="calendar-outline" size={20} color={theme.accent} />
            <Text style={{ color: theme.foreground, fontWeight: '700', fontSize: 13, textTransform: 'capitalize' }}>
              {dateCaption}
            </Text>
            <Ionicons name="chevron-down" size={14} color={theme.muted} />
          </Pressable>
          <Pressable onPress={() => shift(1)} accessibilityLabel="Next day" style={{ padding: 8 }}>
            <Ionicons name="chevron-forward" size={23} color={theme.foreground} />
          </Pressable>
        </View>
        {calendarOpen ? (
          <View
            style={{
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              marginTop: 8,
              backgroundColor: theme.surface,
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
                <Ionicons name="chevron-back" size={21} color={theme.foreground} />
              </Pressable>
              <Text style={{ color: theme.foreground, fontWeight: '700' }}>
                {day.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
              </Text>
              <Pressable
                onPress={() =>
                  setDay(
                    d => new Date(d.getFullYear(), d.getMonth() + 1, Math.min(d.getDate(), 28)),
                  )
                }
              >
                <Ionicons name="chevron-forward" size={21} color={theme.foreground} />
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 7 }}>
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((label, index) => (
                <Text key={index} style={{ width: '14.285%', textAlign: 'center', color: theme.muted, fontSize: 10, fontWeight: '600' }}>{label}</Text>
              ))}
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
                    backgroundColor: n === day.getDate() ? (theme.dark ? '#593348' : '#f3dce7') : 'transparent',
                    borderRadius: 6,
                  }}
                >
                  <Text style={{ fontSize: 12, color: theme.foreground, fontWeight: n === day.getDate() ? '700' : '400' }}>{n}</Text>
                  {markedDays.has(isoDay(new Date(day.getFullYear(), day.getMonth(), n))) ? (
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
          <Text style={{ fontSize: 11, color: theme.muted }}>
            {language === 'fr'
              ? "Aujourd'hui"
              : language === 'de'
                ? 'Heute'
                : language === 'pt'
                  ? 'Hoje'
                  : 'Today'}
          </Text>
        </Pressable>
        <View style={{marginTop:22,marginBottom:8,gap:10}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:9}}>
            <Ionicons name="flag-outline" size={22} color={theme.accent}/>
            <Text style={{color:theme.foreground,fontSize:17,fontWeight:'700',flex:1}}>
              Mes rêves · {selectedDreamEvents.length}
            </Text>
          </View>
          {selectedDreamEvents.length ? selectedDreamEvents.map(item => (
            <Pressable key={item.id}
              accessibilityRole="button" accessibilityLabel={item.description+' : '+item.title}
              onPress={()=>router.push({pathname:'/my-dream/[id]',params:{id:item.dreamId}})}
              style={{flexDirection:'row',alignItems:'center',gap:12,padding:13,
                borderWidth:1,borderColor:theme.border,borderRadius:12,
                backgroundColor:theme.surface}}>
              <View style={{width:36,height:36,borderRadius:10,alignItems:'center',
                justifyContent:'center',backgroundColor:theme.dark?'#3B2A33':'#F9E9EF'}}>
                <Ionicons color={theme.dark?'#FF91BE':'#B72960'} size={18}
                  name={item.kind==='goal'?'flag-outline':
                    item.kind==='achievement'?'flower-outline':
                    item.kind==='milestone'?'book-outline':
                    item.kind==='resource'?'people-outline':
                    item.kind==='resume'?'snow-outline':'alarm-outline'}/>
              </View>
              <View style={{flex:1,minWidth:0,gap:4}}>
                <Text numberOfLines={2} style={{color:theme.foreground,
                  fontSize:13,fontWeight:'700'}}>{item.title}</Text>
                <Text style={{color:theme.muted,fontSize:11}}>{item.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={theme.muted}/>
            </Pressable>
          )) : (
            <Text style={{fontSize:12,color:theme.muted,paddingVertical:7}}>
              Aucun événement lié à tes rêves à cette date.
            </Text>
          )}
        </View>
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
                  if(h.startedAt && dateKey < h.startedAt.slice(0,10))return null;
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
                        achievedOn:x.frequency==='weekly' ? {
                          ...x.achievedOn,[key]:checked?'':dateKey,
                        } : x.achievedOn,
                      });
                      updateGroupHabits(d.id,updated);
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
          <Text style={{ fontSize: 17, fontWeight: '700', color: theme.foreground }}>{tr('prayersToday')}</Text>
        </View>
        {prayers.length === 0 ? (
          <Text style={{ fontSize: 12, color: theme.muted, paddingVertical: 14 }}>
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
                borderColor: theme.border,
                gap: 11,
              }}
            >
              <Pressable onPress={() => router.push(publicationPath(p) as any)} style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: theme.foreground }}>{p.title}</Text>
                <Text style={{ fontSize: 10, color: theme.muted, marginTop: 3 }}>
                  {p.type === 'bible' ? 'Bible' : p.type === 'dream' ? 'Aspiration' : 'Music'}
                </Text>
              </Pressable>
              <Pressable onPress={() => togglePrayer(p.id)} accessibilityLabel="Remove prayer">
                <Ionicons name="checkmark-circle" size={22} color="#64936f" />
              </Pressable>
            </View>
          ))
        )}
        <Text style={{ color: theme.foreground, fontSize: 17, fontWeight: '700', marginTop: 29, marginBottom: 15 }}>
          {tr('appointments')}
        </Text>
        {shownEvents.length === 0 ? (
          <Text style={{ fontSize: 12, color: theme.muted }}>{tr('emptyAgenda')}</Text>
        ) : (
          shownEvents.map(e => (
            <View
              key={e.id}
              style={{
                borderWidth: 1,
                borderColor: theme.border,
                padding: 14,
                borderRadius: 12,
                marginBottom: 12,
              }}
            >
              <Text style={{ color: theme.foreground, fontSize: 14, fontWeight: '700' }}>{e.title}</Text>
              <Text style={{ fontSize: 11, color: theme.muted, marginTop: 6 }}>
                {e.timeLabel} · {e.place} · {e.partner}
              </Text>
              <Text style={{ fontSize: 11, color: theme.muted, marginTop: 6 }}>
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
                      backgroundColor: theme.dark ? '#3D3F44' : '#EFEDEA',
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{color:theme.foreground}}>{tr('decline')}</Text>
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
                  <Ionicons name="calendar-outline" size={17} color={theme.accent} />
                  <Text style={{ color: theme.accent, fontSize: 12 }}>{tr('exportCalendar')}</Text>
                </Pressable>
              )}
            </View>
          ))
        )}
        <Text style={{ color: theme.muted, fontSize: 11, marginTop: 20, lineHeight: 17 }}>
          Les dates des rêves, les étapes du journal et les habitudes sont affichées
          depuis tes espaces de travail. La synchronisation avec Google, Apple ou
          Outlook nécessitera une connexion et ton accord explicite.
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
              const d=activeHabitDreams.find(x=>x.id===measureEdit.dreamId);
              if(!d)return;
              updateGroupHabits(d.id,(d.habits||[]).map(h=>{
                if(h.id!==measureEdit.habitId)return h;
                const checked=amount>=measureEdit.target;
                return {...h,measurements:{...h.measurements,[measureEdit.dateKey]:amount},
                  completed:checked
                    ? Array.from(new Set([...h.completed,measureEdit.dateKey]))
                    : h.completed.filter(k=>k!==measureEdit.dateKey),
                  achievedOn:h.frequency==='weekly'
                    ? {...h.achievedOn,[measureEdit.dateKey]:checked
                      ? h.achievedOn?.[measureEdit.dateKey] || dateKey : ''}
                    : h.achievedOn,
                };
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
