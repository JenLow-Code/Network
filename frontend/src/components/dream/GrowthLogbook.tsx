import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { DreamEntry, DreamHabit, DreamMilestone, DreamResource } from '@/domain/dreamWorkspace';
import { buildGrowthDays, countVerifiedPrayers } from '@/domain/growthTimeline';
import { habitDayKey, habitKey } from '@/domain/habitProgress';
import { useAppTheme } from '@/theme/AppTheme';
import { HANDWRITING_FAMILY } from '@/theme/handwriting';
import { PrayerIcon } from '@/icons/PrayerIcon';

const GREEN='#27845B';
const PINK='#D71D77';
const BLUE='#397F9E';
const LIME='#A1BA44';

const localLabel=(date:string,today:string):string => {
  if(date===today)return 'AUJOURD’HUI';
  const parsed=new Date(date+'T12:00:00');
  return Number.isNaN(parsed.getTime())?date:
    parsed.toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}).toUpperCase();
};
const colorFor=(category:DreamResource['category'])=>
  category==='person'?PINK:category==='financial'?LIME:BLUE;
const categoryTitle=(category:DreamResource['category'])=>
  category==='person'?'Talent':category==='financial'?'Financement':'Ressource';

function HabitMarks({habits,completed}:{habits:DreamHabit[];completed:Set<string>}) {
  return <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,alignItems:'center'}}>
    {habits.map(h=>{
      const yes=completed.has(h.id);
      const hue=h.color||GREEN;
      return <View key={h.id}
        accessibilityLabel={h.title+(yes?' : accompli':' : à faire')}
        style={{width:17,height:17,borderRadius:4,
          backgroundColor:yes?hue:'transparent',
          borderWidth:1,borderColor:yes?hue:'#B8C9BC',
          alignItems:'center',justifyContent:'center'}}>
        {yes?<Ionicons name="checkmark" size={13} color="#FFFFFF"/>:null}
      </View>;
    })}
  </View>;
}

export function GrowthLogbook({
  dream,editable,onWrite,onRetry,onManageHabits,
}:{
  dream:DreamEntry;
  editable:boolean;
  onWrite:()=>void;
  onRetry:(log:DreamMilestone)=>void;
  onManageHabits:()=>void;
}) {
  const theme=useAppTheme();
  const [allOpen,setAllOpen]=useState(false);
  const today=habitDayKey(new Date());
  const habits=dream.habits||[];
  const todayWritten=(dream.milestones||[]).some(log=>log.date===today);
  const timeline=buildGrowthDays(dream);
  // Today's habit check-in is a live view, not a historical invented event.
  if(editable && habits.length && !timeline.some(group=>group.date===today)) {
    timeline.unshift({date:today,notes:[],habits:[],changes:[]});
  }
  const shown=allOpen?timeline:timeline.slice(0,16);
  const prayerCount=countVerifiedPrayers(dream);
  const relevantToday=new Set(habits.filter(h=>{
    const key=habitKey(h.frequency,today);
    return h.completed.some(done=>habitKey(h.frequency,done)===key);
  }).map(h=>h.id));

  return <View style={{gap:12,marginTop:10,marginBottom:22}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:9,
      justifyContent:'space-between'}}>
      <Text style={{color:theme.foreground,fontSize:21,fontWeight:'700'}}>Logbook</Text>
      {editable?<Pressable onPress={onWrite} accessibilityRole="button"
        accessibilityLabel={todayWritten?'Compléter la feuille du jour':'Écrire une feuille aujourd’hui'}
        style={{flexDirection:'row',alignItems:'center',gap:6,
          paddingVertical:8,paddingHorizontal:4}}>
        <Ionicons name="leaf-outline" color={GREEN} size={18}/>
        <Text style={{color:GREEN,fontSize:12,fontWeight:'600'}}>
          {todayWritten?'Compléter aujourd’hui':'Écrire aujourd’hui'}
        </Text>
      </Pressable>:null}
    </View>
    {prayerCount!==null ? (
      <View style={{flexDirection:'row',alignItems:'center',
        paddingVertical:10,paddingHorizontal:12,
        backgroundColor:theme.dark?'#3B2C38':'#FBF1F5',
        borderRadius:11,gap:11}}>
        <PrayerIcon size={19} color={PINK}/>
        <Text style={{fontSize:12,color:theme.foreground,flex:1}}>
          Prières reçues pour ce rêve
        </Text>
        <Text style={{fontSize:15,color:PINK,fontWeight:'700'}}>{prayerCount}</Text>
      </View>
    ):null}
    {habits.length>0 ? (
      <Pressable accessibilityRole="button" onPress={onManageHabits}
        accessibilityLabel="Gérer les habitudes du rêve"
        style={{flexDirection:'row',alignItems:'center',
          gap:8,paddingVertical:5,marginBottom:3}}>
        <Ionicons name="checkbox-outline" color={GREEN} size={18}/>
        <Text style={{fontSize:12,color:theme.foreground,flex:1}}>
          Mes habitudes · {habits.length}
        </Text>
        <Text style={{fontSize:11,color:GREEN,fontWeight:'600'}}>Gérer</Text>
        <Ionicons name="chevron-forward" color={GREEN} size={15}/>
      </Pressable>
    ):editable ? (
      <Pressable accessibilityRole="button" onPress={onManageHabits}
        style={{flexDirection:'row',alignItems:'center',gap:8,
          paddingVertical:8,alignSelf:'flex-start'}}>
        <Ionicons name="add-circle-outline" size={18} color={theme.muted}/>
        <Text style={{fontSize:12,color:theme.muted}}>Créer une habitude</Text>
      </Pressable>
    ):null}
    {shown.length===0 ? (
      <View style={{paddingVertical:21,paddingHorizontal:12,alignItems:'center',gap:9}}>
        <Ionicons name="leaf-outline" color="#8AAE9A" size={29}/>
        <Text style={{fontSize:12,color:theme.muted,textAlign:'center',lineHeight:19}}>
          Les premières étapes de ton rêve apparaîtront ici.
        </Text>
      </View>
    ):null}
    {shown.map((group,index)=>{
      const isToday=group.date===today;
      const completed=isToday?relevantToday:
        new Set(group.habits.map(h=>h.id));
      const visibleHabits=isToday?habits:group.habits;
      return <View key={group.date} style={{flexDirection:'row',gap:10,minHeight:60}}>
        <View style={{width:23,alignItems:'center'}}>
          <Ionicons name="leaf-outline" size={22} color={GREEN}
            style={{marginTop:1}}/>
          {index<shown.length-1?<View style={{
            flex:1,width:1,marginTop:5,marginBottom:-2,
            backgroundColor:'#A4BDAF',
          }}/>:null}
        </View>
        <View style={{flex:1,paddingBottom:20,gap:11}}>
          <Text style={{color:GREEN,fontWeight:'700',fontSize:11,
            letterSpacing:.4,lineHeight:23}}>
            {localLabel(group.date,today)}
          </Text>
          {group.notes.map(log=><View key={log.id} style={{gap:7}}>
            <Text style={{color:theme.foreground,
              fontFamily:HANDWRITING_FAMILY,fontSize:22,lineHeight:31}}>
              {log.title}
            </Text>
            {log.publicationState==='failed'&&editable?(
              <Pressable accessibilityRole="button" onPress={()=>onRetry(log)}
                style={{alignSelf:'flex-start',flexDirection:'row',
                  alignItems:'center',gap:5,paddingVertical:2}}>
                <Ionicons name="refresh-outline" size={13} color={PINK}/>
                <Text style={{color:PINK,fontSize:11}}>Réessayer la publication</Text>
              </Pressable>
            ):null}
          </View>)}
          {visibleHabits.length>0?(
            <Pressable accessibilityRole="button" onPress={()=>router.push('/agenda')}
              style={{flexDirection:'row',alignItems:'center',gap:9,
                paddingVertical:3}}>
              <Ionicons name="checkbox-outline" size={18} color={GREEN}/>
              <View style={{flex:1,gap:5}}>
                <Text style={{fontSize:12,color:theme.foreground}}>
                  Habitudes · {completed.size}{isToday?'/'+habits.length:''}
                  {isToday&&completed.size===habits.length?' · toutes accomplies':''}
                </Text>
                <HabitMarks habits={visibleHabits as DreamHabit[]} completed={completed}/>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.muted}/>
            </Pressable>
          ):null}
          {group.changes.map(event=>{
            const color=colorFor(event.category);
            const icon=event.category==='person'?'people-outline':
              event.category==='financial'?'wallet-outline':'cube-outline';
            const verb=event.kind==='need_added'?'Nouveau besoin':
              event.kind==='need_found'?'Confirmé':'À retrouver';
            return <View key={event.id}
              style={{flexDirection:'row',alignItems:'center',gap:9,
                paddingVertical:2}}>
              <Ionicons name={icon} size={17} color={color}/>
              <Text style={{flex:1,color:theme.foreground,fontSize:12,lineHeight:18}}>
                <Text style={{fontWeight:'700',color}}>
                  {categoryTitle(event.category)} ·
                </Text>
                {' '+event.title+' · '+verb}
              </Text>
            </View>;
          })}
        </View>
      </View>;
    })}
    {!allOpen&&timeline.length>shown.length?(
      <Pressable accessibilityRole="button" onPress={()=>setAllOpen(true)}
        style={{alignSelf:'center',padding:10}}>
        <Text style={{color:GREEN,fontWeight:'600',fontSize:12}}>
          Voir le reste du parcours ({timeline.length-shown.length})
        </Text>
      </Pressable>
    ):null}
  </View>;
}
