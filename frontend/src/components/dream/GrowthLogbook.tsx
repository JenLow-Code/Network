import React, { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { DreamEntry, DreamGrowthEvent, DreamHabit, DreamMilestone, DreamResource } from '@/domain/dreamWorkspace';
import { buildGrowthDays, canEditGrowthLog, countVerifiedPrayers, type GrowthDay } from '@/domain/growthTimeline';
import { habitDayKey, habitDreamProgress, habitKey } from '@/domain/habitProgress';
import { canPreviewGrowth, isSeedGrowthPreview, sampleGrowthPreview } from '@/domain/mockGrowthPreview';
import { useAppTheme } from '@/theme/AppTheme';
import { HANDWRITING_FAMILY } from '@/theme/handwriting';
import { PrayerIcon } from '@/icons/PrayerIcon';
import { HabitSquareGrid } from './HabitSquareGrid';

const GREEN = '#27845B';
const PINK = '#D71D77';
const SEED_BROWN = '#B88962';
const BLUE = '#397F9E';
const LIME = '#A1BA44';

const localLabel = (date: string, today: string): string => {
  if (date === today) return 'AUJOURD’HUI';
  const parsed = new Date(date + 'T12:00:00');
  return Number.isNaN(parsed.getTime()) ? date :
    parsed.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
};

const colorFor = (category: DreamResource['category']) =>
  category === 'person' ? PINK : category === 'financial' ? LIME : BLUE;
const categoryTitle = (category: DreamResource['category']) =>
  category === 'person' ? 'Talent' : category === 'financial' ? 'Financement' : 'Ressource';

type PreviewEvent = { id: string; date: string; title: string; kind: 'resource' | 'document' };
type ActivityCount = { delta?: number; total?: number };
type DaySocial = { prayers?: ActivityCount; encouragements?: ActivityCount; fictitious?: boolean };
type LogbookDay = GrowthDay & { previewEvents: PreviewEvent[]; social?: DaySocial };

const validCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;
const positiveCount = (value: unknown): value is number =>
  validCount(value) && value > 0;
const validDay = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date);

function SocialLine({title,icon,color,value}:{
  title:string;icon:'prayer'|'heart';color:string;value:ActivityCount;
}){
  const theme=useAppTheme();
  const today=positiveCount(value.delta)?value.delta:null;
  const total=validCount(value.total)?value.total:null;
  if(today===null && total===null)return null;
  const bg=color===SEED_BROWN?'#F6EFE7':'#FCEBF3';
  const description=today!==null
    ?icon==='prayer'
      ?(today===1?'1 personne a prié':''
        +today+' personnes ont prié')+' pour ce rêve aujourd’hui'
      :(today===1?'1 personne t’a encouragé':''
        +today+' personnes t’ont encouragé')+' aujourd’hui'
    :icon==='prayer'
      ?(total===1?'1 prière reçue':''
        +total+' prières reçues')
      :(total===1?'1 encouragement reçu':''
        +total+' encouragements reçus');
  return <View style={{alignSelf:'flex-start',flexDirection:'row',
    alignItems:'center',gap:8,borderRadius:15,
    paddingHorizontal:11,paddingVertical:7,maxWidth:'100%',
    backgroundColor:theme.dark?theme.surface:bg}}>
    {icon==='prayer'?<PrayerIcon size={15} color={color} filled/>:
      <Ionicons name="heart" size={16} color={color}/>}
    <View style={{gap:2,flexShrink:1}}>
      <Text style={{fontSize:11,lineHeight:16,color:theme.foreground}}>
        {description}
      </Text>
      {today!==null&&total!==null?<Text style={{fontSize:10,fontWeight:'600',
        color}}>{total} au total</Text>:null}
    </View>
  </View>;
}
/** Each habit is a compact line and one row of its own colored squares. */
function CurrentHabitSummary({
  dream,editable,onManage,onEdit,onDelete,onDetach,onCheckIn,
}:{
  dream:DreamEntry;editable:boolean;onManage:()=>void;
  onEdit:(habit:DreamHabit)=>void;
  onDelete:(habit:DreamHabit)=>void;
  onDetach:(habit:DreamHabit)=>void;
  onCheckIn:(habit:DreamHabit,quantity:number)=>void;
}){
  const theme=useAppTheme();
  const habits=dream.habits||[];
  const [menuHabit,setMenuHabit]=useState<DreamHabit|null>(null);
  const [checkHabit,setCheckHabit]=useState<DreamHabit|null>(null);
  const [measureValue,setMeasureValue]=useState('');
  const [invalid,setInvalid]=useState(false);
  if(!habits.length)return null;
  const visible=habits.slice(0,3);
  const today=habitDayKey(new Date());
  const currentQuantity=(habit:DreamHabit)=>{
    const key=habitKey(habit.frequency,today);
    const target=habit.target&&habit.target>0?habit.target:1;
    const measured=habit.measurements?.[key];
    const marked=(habit.completed||[]).some(d=>habitKey(habit.frequency,d)===key);
    return Math.max(0,measured??(marked?target:0));
  };
  const openCheckIn=(habit:DreamHabit)=>{
    if(!editable)return;
    const target=habit.target&&habit.target>0?habit.target:1;
    setCheckHabit(habit);
    setMeasureValue(String(currentQuantity(habit)||target));
    setInvalid(false);
  };
  const confirmCheckIn=()=>{
    if(!checkHabit)return;
    const amount=Number(measureValue.replace(',','.'));
    if(!Number.isFinite(amount)||amount<0||amount>100000){
      setInvalid(true);return;
    }
    onCheckIn(checkHabit,amount);
    setCheckHabit(null);
  };
  const selectedTarget=checkHabit?.target&&checkHabit.target>0?checkHabit.target:1;
  const selectedQuantity=checkHabit?currentQuantity(checkHabit):0;
  return <View style={{marginTop:2,gap:11}}>
    {visible.map(habit=>{
      const progress=habitDreamProgress(habit,dream.goalDate,dream.growthStartedAt);
      const color=habit.color||GREEN;
      const target=habit.target&&habit.target>0?habit.target:1;
      const todayDone=currentQuantity(habit)>=target;
      return <View key={habit.id} style={{gap:4}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:7}}>
          <View style={{width:26,height:26,borderWidth:1.5,borderColor:color,
            borderRadius:15,alignItems:'center',justifyContent:'center'}}>
            <Text style={{fontSize:14,lineHeight:19}}>{habit.emoji||'🌱'}</Text>
          </View>
          <View style={{flex:1,gap:0,minWidth:0,marginLeft:4}}>
            <Text numberOfLines={1} style={{color:theme.foreground,
              fontSize:12,lineHeight:16,fontWeight:'600'}}>{habit.title}</Text>
            <Pressable accessibilityRole="link" onPress={()=>router.push('/agenda')}
              style={{alignSelf:'flex-start',paddingVertical:0}}>
              <Text style={{color,fontSize:10,lineHeight:14,
                fontWeight:'600'}}>Voir dans le calendrier</Text>
            </Pressable>
          </View>
          <View style={{backgroundColor:theme.dark?theme.surface:'#EDF5F2',
            borderRadius:14,paddingVertical:5,paddingHorizontal:8,alignItems:'center',
            justifyContent:'center'}}>
            <Text style={{fontSize:11,fontWeight:'700',color,
              fontVariant:['tabular-nums']}}>
              {progress.planned===null?progress.completed:
                progress.completed+' / '+progress.planned}
            </Text>
          </View>
          <View style={{flexDirection:'row',alignItems:'center',gap:2}}
            accessibilityLabel={'Série de '+progress.streak+
              (habit.frequency==='weekly'?' semaines':' jours')+' consécutifs'}>
            <Text style={{fontSize:15,lineHeight:19}}>🔥</Text>
            <Text style={{fontSize:11,fontWeight:'700',color:theme.foreground}}>
              {progress.streak}
            </Text>
          </View>
          {editable?<Pressable accessibilityRole="button"
            accessibilityLabel={'Options pour '+habit.title}
            onPress={()=>setMenuHabit(habit)}
            style={{paddingHorizontal:4,paddingVertical:8}}>
            <Ionicons name="ellipsis-horizontal" size={17} color={theme.foreground}/>
          </Pressable>:null}
        </View>
        <HabitSquareGrid habit={habit} goalDate={dream.goalDate}
          dreamStartedAt={dream.growthStartedAt}
          plannedSessions={progress.planned}
          color={color} editable={editable}
          onTodayPress={()=>openCheckIn(habit)}/>
      </View>;
    })}
    {habits.length>visible.length?<Pressable accessibilityRole="button"
      onPress={onManage} style={{alignSelf:'flex-end',paddingVertical:5}}>
      <Text style={{color:GREEN,fontSize:11}}>
        Voir les {habits.length-visible.length} autres habitudes
      </Text>
    </Pressable>:null}
    <Modal visible={menuHabit!==null} transparent animationType="fade"
      onRequestClose={()=>setMenuHabit(null)}>
      <View style={{flex:1,justifyContent:'center',padding:20,
        backgroundColor:'rgba(0,0,0,.48)'}}>
        <Pressable onPress={()=>setMenuHabit(null)}
          style={{position:'absolute',top:0,bottom:0,left:0,right:0}}/>
        <View style={{backgroundColor:theme.surface,borderRadius:14,padding:18,
          maxWidth:400,width:'100%',alignSelf:'center',gap:4}}>
          <Text style={{fontSize:17,fontWeight:'700',
            color:theme.foreground,marginBottom:6}}>{menuHabit?.title}</Text>
          {([
            {label:'Modifier l’habitude',icon:'pencil-outline',action:onEdit},
            {label:'Détacher du rêve (garder dans l’agenda)',
              icon:'unlink-outline',action:onDetach},
            {label:'Supprimer l’habitude',icon:'trash-outline',action:onDelete},
          ] as const).map(option=>(
            <Pressable key={option.label} accessibilityRole="button"
              onPress={()=>{
                const target=menuHabit;setMenuHabit(null);
                if(target)option.action(target);
              }}
              style={{flexDirection:'row',alignItems:'center',
                gap:11,minHeight:46,paddingHorizontal:7}}>
              <Ionicons name={option.icon} size={18}
                color={option.label.startsWith('Supprimer')?'#B55164':theme.foreground}/>
              <Text style={{fontSize:12,color:option.label.startsWith('Supprimer')
                ?'#B55164':theme.foreground,flex:1}}>{option.label}</Text>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" onPress={()=>setMenuHabit(null)}
            style={{alignSelf:'center',padding:10}}>
            <Text style={{fontSize:12,color:theme.muted}}>Annuler</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
    <Modal visible={checkHabit!==null} transparent animationType="slide"
      statusBarTranslucent onRequestClose={()=>setCheckHabit(null)}>
      <View style={{flex:1,justifyContent:'flex-end',
        backgroundColor:'rgba(20,26,23,0.36)'}}>
        <Pressable onPress={()=>setCheckHabit(null)}
          accessibilityLabel="Fermer la validation"
          style={{position:'absolute',top:0,bottom:0,left:0,right:0}}/>
        <View style={{backgroundColor:theme.background,
          borderTopLeftRadius:27,borderTopRightRadius:27,
          paddingHorizontal:24,paddingTop:12,paddingBottom:40,
          width:'100%',alignSelf:'center',maxWidth:520,
          borderWidth:1,borderColor:theme.border,gap:17}}>
          <View style={{width:38,height:4,borderRadius:3,alignSelf:'center',
            backgroundColor:theme.border,marginBottom:7}}/>
          <View style={{flexDirection:'row',alignItems:'center',gap:13}}>
            <View style={{height:48,width:48,borderRadius:25,
              borderWidth:2,borderColor:checkHabit?.color||GREEN,
              alignItems:'center',justifyContent:'center'}}>
              <Text style={{fontSize:24,lineHeight:33}}>
                {checkHabit?.emoji||'🌱'}
              </Text>
            </View>
            <View style={{flex:1,gap:3}}>
              <Text style={{fontSize:10,letterSpacing:1.4,fontWeight:'700',
                color:checkHabit?.color||GREEN}}>MON HABITUDE</Text>
              <Text style={{fontSize:22,lineHeight:28,fontFamily:'serif',
                color:theme.foreground}}>{checkHabit?.title}</Text>
            </View>
            <Pressable accessibilityRole="button"
              accessibilityLabel="Fermer"
              onPress={()=>setCheckHabit(null)}
              style={{alignSelf:'flex-start',padding:6}}>
              <Ionicons name="close" size={21} color={theme.muted}/>
            </Pressable>
          </View>
          <View style={{height:1,backgroundColor:theme.border}}/>
          <View style={{gap:6}}>
            <Text style={{fontSize:13,fontWeight:'600',color:theme.foreground}}>
              {checkHabit?.frequency==='weekly'?'Cette semaine':'Aujourd’hui'}
            </Text>
            <Text style={{fontSize:12,lineHeight:20,color:theme.muted}}>
              {selectedQuantity>=selectedTarget
                ?'Cette habitude est déjà accomplie pour cette période. Tu peux ajuster ou annuler ta réalisation.'
                :'Un petit pas de plus vers ton rêve.'}
            </Text>
          </View>
          {(selectedTarget!==1||checkHabit?.unit!=='fois')?
            <View style={{gap:8}}>
              <Text style={{fontSize:11,fontWeight:'600',color:theme.muted}}>
                QUANTITÉ RÉALISÉE · {checkHabit?.unit||'fois'}
              </Text>
              <View style={{flexDirection:'row',alignItems:'center',
                borderBottomWidth:1.5,borderColor:invalid?'#D71D77':checkHabit?.color||GREEN,
                paddingVertical:4,gap:8}}>
                <TextInput value={measureValue} onChangeText={value=>{
                  setMeasureValue(value);setInvalid(false);
                }} keyboardType="decimal-pad"
                  selectTextOnFocus accessibilityLabel="Quantité accomplie"
                  placeholder="0" placeholderTextColor={theme.muted}
                  style={{minWidth:92,flex:1,paddingVertical:6,
                    color:theme.foreground,fontSize:29,fontWeight:'600'}}/>
                <Text style={{fontSize:13,color:theme.muted}}>
                  / {selectedTarget} {checkHabit?.unit||'fois'}
                </Text>
              </View>
              {invalid?<Text style={{fontSize:11,color:'#D71D77'}}>
                Indique une quantité valide.
              </Text>:null}
            </View>:null}
          <Pressable accessibilityRole="button"
            onPress={()=>{
              if(checkHabit?.unit==='fois'&&selectedTarget===1){
                onCheckIn(checkHabit,1);setCheckHabit(null);
              }else confirmCheckIn();
            }}
            style={{minHeight:52,borderRadius:13,backgroundColor:checkHabit?.color||GREEN,
              alignItems:'center',justifyContent:'center',
              flexDirection:'row',gap:9}}>
            <Ionicons name="checkmark" size={19} color="#FFFFFF"/>
            <Text style={{fontWeight:'700',fontSize:13,color:'#FFFFFF'}}>
              {selectedQuantity>=selectedTarget?'Enregistrer la réalisation':'Marquer comme accompli'}
            </Text>
          </Pressable>
          {selectedQuantity>0?<Pressable accessibilityRole="button"
            onPress={()=>{if(checkHabit)onCheckIn(checkHabit,0);setCheckHabit(null);}}
            style={{alignSelf:'center',padding:7}}>
            <Text style={{fontSize:12,color:theme.muted}}>
              Annuler la réalisation
            </Text>
          </Pressable>:null}
        </View>
      </View>
    </Modal>
  </View>;
}

export function GrowthLogbook({
  dream, editable, onWrite, onEditLog, onRetry, onManageHabits,
  onEditHabit,onDeleteHabit,onDetachHabit,onCheckIn,
}: {
  dream: DreamEntry;
  editable: boolean;
  onWrite: () => void;
  onEditLog: (log: DreamMilestone) => void;
  onRetry: (log: DreamMilestone) => void;
  onManageHabits: () => void;
  onEditHabit: (habit:DreamHabit) => void;
  onDeleteHabit: (habit:DreamHabit) => void;
  onDetachHabit: (habit:DreamHabit) => void;
  onCheckIn: (habit:DreamHabit,quantity:number) => void;
}) {
  const theme = useAppTheme();
  const [allOpen, setAllOpen] = useState(false);
  const [preview, setPreview] = useState(() => isSeedGrowthPreview(dream));
  const showPreview = canPreviewGrowth(dream) && preview;
  const example = showPreview ? sampleGrowthPreview() : null;
  const now = new Date();
  const today = habitDayKey(now);
  const todayWritten = (dream.milestones || []).some(log => log.date === today);

  // Leaves are generated only by actual dated events or explicitly labelled demo activity.
  // Routine habit check-ins NEVER create their own daily leaves.
  const byDate = new Map<string, LogbookDay>(
    buildGrowthDays(dream).map(day => [day.date, { ...day, previewEvents: [] }]),
  );
  const getDay = (date: string): LogbookDay => {
    let day = byDate.get(date);
    if (!day) {
      day = { date, notes: [], changes: [], documents: [], previewEvents: [] };
      byDate.set(date, day);
    }
    return day;
  };

  if (example) {
    getDay(today).social = {
      prayers: { delta: example.prayers.today, total: example.prayers.total },
      encouragements: { delta: example.encouragements.today, total: example.encouragements.total },
      fictitious: true,
    };
    for (const event of example.events) {
      getDay(event.date).previewEvents.push(event);
    }
  } else {
    // These optional records can only come from trusted dated source events.
    // The all-time totals alone are NOT evidence that something happened today.
    for (const stats of dream.socialDailyActivity || []) {
      // Historical prayer/encouragement changes never spawn repetitive leaves.
      // Only today's currently verified activity belongs in the current leaf.
      if (stats.date !== today || !validDay(stats.date) ||
        (!positiveCount(stats.prayers) && !positiveCount(stats.encouragements))) continue;
      const day = getDay(stats.date);
      const previous = day.social || {};
      day.social = {
        prayers: positiveCount(stats.prayers) ? {
          delta: (previous.prayers?.delta || 0) + stats.prayers,
          total: validCount(stats.prayerTotal) ? stats.prayerTotal : previous.prayers?.total,
        } : previous.prayers,
        encouragements: positiveCount(stats.encouragements) ? {
          delta: (previous.encouragements?.delta || 0) + stats.encouragements,
          total: validCount(stats.encouragementTotal) ? stats.encouragementTotal :
            previous.encouragements?.total,
        } : previous.encouragements,
      };
    }
    // If another event already created today's leaf, show verified aggregate totals
    // without inventing today's increment. Never create a new leaf from these totals.
    const activeToday = byDate.get(today);
    if (activeToday) {
      const verifiedPrayers = countVerifiedPrayers(dream);
      const verifiedEncouragements = validCount(dream.encouragementCount)
        ? dream.encouragementCount : null;
      const existing = activeToday.social || {};
      if (verifiedPrayers !== null && !existing.prayers?.total) {
        existing.prayers = { ...existing.prayers, total: verifiedPrayers };
      }
      if (verifiedEncouragements !== null && !existing.encouragements?.total) {
        existing.encouragements = { ...existing.encouragements, total: verifiedEncouragements };
      }
      activeToday.social = existing;
    }
  }

  const timeline = Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date));
  const shown = allOpen ? timeline : timeline.slice(0, 12);
  const todayHasActivity = byDate.has(today);

  return <View style={{ gap: 11, marginTop: 10, marginBottom: 22 }}>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
      <Text style={{color:theme.foreground,fontSize:21,fontWeight:'700'}}>Logbook</Text>
      {editable && !byDate.has(today) ? <Pressable accessibilityRole="button"
        accessibilityLabel="Ajouter une note aujourd’hui"
        onPress={onWrite} hitSlop={9}
        style={{padding:8}}>
        <Ionicons name="add" size={20} color={GREEN}/>
      </Pressable>:null}
    </View>
    {canPreviewGrowth(dream) ? <Pressable accessibilityRole="button"
      onPress={() => setPreview(!preview)}
      style={{ alignSelf: 'flex-start', paddingVertical: 3, flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      <Ionicons name="flask-outline" color={theme.muted} size={14} />
      <Text style={{ fontSize: 10, color: theme.muted }}>
        {showPreview ? 'Aperçu fictif actif · masquer' : 'Afficher des événements fictifs pour tester'}
      </Text>
    </Pressable> : null}
    {shown.length === 0 ? <View style={{ paddingVertical: 15, gap: 7, alignItems: 'center' }}>
      <Text style={{ fontSize: 12, color: theme.muted, textAlign: 'center', lineHeight: 19 }}>
        Les moments vécus dans ce rêve apparaîtront ici.
      </Text>
    </View> : null}
    {shown.map((group, index) => <View key={group.date} style={{
      flexDirection: 'row', gap: 10, minHeight: 53,
    }}>
      <View style={{ width: 23, alignItems: 'center' }}>
        <Ionicons name="leaf-outline" size={22} color={GREEN} style={{ marginTop: 1 }} />
        {index < shown.length - 1 ? <View style={{
          flex: 1, width: 1, marginTop: 4, marginBottom: -2,
          backgroundColor: '#A4BDAF',
        }} /> : null}
      </View>
      <View style={{ flex: 1, paddingBottom: 18, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Text style={{color:GREEN,fontWeight:'700',fontSize:11,
            letterSpacing:.4,lineHeight:23}}>
            {localLabel(group.date,today)}
          </Text>
          {group.date===today && editable?<Pressable accessibilityRole="button"
            accessibilityLabel="Ajouter une note au journal aujourd’hui"
            onPress={onWrite} hitSlop={9}
            style={{paddingHorizontal:7,paddingVertical:4}}>
            <Ionicons name="add" size={16} color={GREEN}/>
          </Pressable>:null}
          {group.social?.fictitious ? <Text style={{
            fontSize: 9, color: theme.muted,
          }}>DÉMO</Text> : null}
        </View>
        {group.notes.map(log => {
          const canModify=editable&&canEditGrowthLog(log);
          return <View key={log.id} style={{gap:6}}>
            <Pressable disabled={!canModify} accessibilityRole={canModify?'button':undefined}
              accessibilityLabel={canModify?'Modifier la feuille du journal':undefined}
              onPress={()=>onEditLog(log)}
              style={{flexDirection:'row',alignItems:'flex-start',gap:7}}>
              <Text style={{flex:1,color:theme.foreground,
                fontFamily:HANDWRITING_FAMILY,fontSize:22,lineHeight:31}}>
                {log.title}
              </Text>
              {canModify?<Ionicons name="pencil-outline" size={14}
                color={theme.muted} style={{marginTop:5}}/>:null}
            </Pressable>
            {log.publicationState === 'failed' && editable ? <Pressable accessibilityRole="button"
              onPress={() => onRetry(log)}
              style={{alignSelf:'flex-start',flexDirection:'row',alignItems:'center',gap:5}}>
              <Ionicons name="refresh-outline" size={13} color={PINK}/>
              <Text style={{color:PINK,fontSize:11}}>Réessayer la publication</Text>
            </Pressable> : null}
          </View>;
        })}
        {(group.social?.prayers||group.social?.encouragements)?<View
          style={{gap:3,width:'100%'}}>
          {group.social.prayers?<SocialLine title="Prières" icon="prayer" color={SEED_BROWN}
            value={group.social.prayers}/>:null}
          {group.social.encouragements?<SocialLine title="Encouragements" icon="heart" color={PINK}
            value={group.social.encouragements}/>:null}
        </View>:null}
        {/* One compact habit grid in today's meaningful leaf only; older days never repeat it. */}
        {group.date === today && todayHasActivity && (dream.habits || []).length > 0 ?
          <CurrentHabitSummary dream={dream} editable={editable}
            onManage={onManageHabits}
            onEdit={onEditHabit} onDelete={onDeleteHabit}
            onDetach={onDetachHabit} onCheckIn={onCheckIn}/> : null}
        {group.changes.map((event: DreamGrowthEvent) => {
          const color = colorFor(event.category);
          const icon = event.category === 'person' ? 'people-outline' :
            event.category === 'financial' ? 'wallet-outline' : 'cube-outline';
          const label = event.kind === 'need_added' ? 'Nouveau besoin' :
            event.kind === 'need_found' ? 'Trouvé' : 'À retrouver';
          return <View key={event.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name={icon} size={17} color={color} />
            <Text style={{ color: theme.foreground, fontSize: 12, lineHeight: 19, flex: 1 }}>
              <Text style={{ fontWeight: '700', color }}>{categoryTitle(event.category)} · </Text>
              {event.title + ' · ' + label}
            </Text>
          </View>;
        })}
        {group.documents.map(doc => <Pressable key={doc.id} accessibilityRole="button"
          onPress={() => router.push({ pathname: '/my-dream/library/[id]', params: { id: dream.id } })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="document-text-outline" size={17} color={BLUE} />
          <Text style={{ color: theme.foreground, fontSize: 12, lineHeight: 19, flex: 1 }}>
            <Text style={{ fontWeight: '700', color: BLUE }}>Document · </Text>
            {doc.title + (doc.version > 1 ? ' · v' + doc.version : '') + ' ajouté'}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={theme.muted} />
        </Pressable>)}
        {group.previewEvents.map(event => <View key={event.id}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name={event.kind === 'document' ? 'document-text-outline' : 'cube-outline'}
            size={17} color={BLUE} />
          <Text style={{ fontSize: 12, lineHeight: 19, color: theme.foreground, flex: 1 }}>
            {event.title}
          </Text>
          <Text style={{ fontSize: 9, color: theme.muted }}>Démo</Text>
        </View>)}
      </View>
    </View>)}
    {!allOpen && timeline.length > shown.length ? <Pressable accessibilityRole="button"
      onPress={() => setAllOpen(true)} style={{ alignSelf: 'center', padding: 10 }}>
      <Text style={{ color: GREEN, fontSize: 12, fontWeight: '600' }}>
        Voir le reste du parcours ({timeline.length - shown.length})
      </Text>
    </Pressable> : null}
  </View>;
}
