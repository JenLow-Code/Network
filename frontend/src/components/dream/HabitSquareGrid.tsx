import React, { useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DreamHabit } from '@/domain/dreamWorkspace';
import { habitDayKey, habitKey, habitScheduleStart } from '@/domain/habitProgress';
import { useAppTheme } from '@/theme/AppTheme';

type Period = { key:string; completed:boolean; isToday:boolean; future:boolean };

function chronologicalPeriods(
  habit:DreamHabit, goalDate?:string, dreamStartedAt?:string,
  plannedSessions?:number|null, now:Date=new Date(),
):Period[] {
  const today=habitDayKey(now);
  const periodToday=habitKey(habit.frequency,today);
  const validDate=(value?:string):value is string=>
    !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(new Date(value+'T12:00:00').getTime());
  const scheduledStart=habitScheduleStart(habit,dreamStartedAt,now);
  const olderRecorded=[...(habit.completed||[]),...Object.keys(habit.measurements||{})]
    .filter(validDate).map(date=>habitKey(habit.frequency,date)).sort()[0];
  // Historical activity is credited at its real dates, but it must NOT
  // change the number of goal squares. 4 / 83 must always mean 83 tiles.
  const start=olderRecorded && olderRecorded<scheduledStart?olderRecorded:scheduledStart;
  const target=habit.target&&habit.target>0?habit.target:1;
  const step=habit.frequency==='weekly'?7:1;
  let periodCount=28;
  if(plannedSessions!==null && plannedSessions!==undefined &&
     Number.isFinite(plannedSessions)) {
    periodCount=Math.max(0,Math.ceil(plannedSessions/target));
  } else if(validDate(goalDate)) {
    const first=new Date(scheduledStart+'T12:00:00');
    const last=new Date(habitKey(habit.frequency,goalDate)+'T12:00:00');
    periodCount=Math.max(0,1+Math.round((last.getTime()-first.getTime())/(step*86400000)));
  }
  // In exceptional goals exceeding 336 periods, the UI is intentionally
  // a bounded preview. Normal goals such as 83 show EXACTLY 83 squares.
  const count=Math.min(336,periodCount);
  const startDate=new Date(start+'T12:00:00');
  const done=new Set((habit.completed||[]).map(date=>habitKey(habit.frequency,date)));
  return Array.from({length:count},(_,i)=>{
    const date=new Date(startDate);
    date.setDate(startDate.getDate()+i*step);
    const key=habitDayKey(date);
    const amount=habit.measurements?.[key];
    return {key,completed:amount!==undefined?amount>=target:done.has(key),
      isToday:key===periodToday,future:key>periodToday};
  });
}

/**
 * Each square records a dated opportunity for this habit (day or week).
 * The planned number of opportunities is kept stable even when historical
 * completions predate the scheduled start date. Streaks use actual dates.
 */
export function HabitSquareGrid({
  habit, goalDate, dreamStartedAt, plannedSessions, color, editable, onTodayPress,
}: {
  habit:DreamHabit;
  goalDate?:string;
  dreamStartedAt?:string;
  plannedSessions?:number|null;
  color:string;
  editable:boolean;
  onTodayPress:()=>void;
}) {
  const theme=useAppTheme();
  const {width:screenWidth}=useWindowDimensions();
  const [expanded,setExpanded]=useState(false);
  const [measuredWidth,setMeasuredWidth]=useState(0);
  const gap=4;
  const available=Math.max(160,measuredWidth||Math.min(screenWidth-130,500));
  const columns=Math.max(8,Math.min(30,Math.floor((available+gap)/18)));
  const cellSize=Math.max(8,(available-(columns-1)*gap)/columns);
  const periods=chronologicalPeriods(habit,goalDate,dreamStartedAt,plannedSessions);
  const todayIndex=periods.findIndex(period=>period.isToday);
  const canExpand=periods.length>columns;
  // The single-row preview ends at today, so the preceding successful days
  // remain visible even when today sits at a grid row boundary.
  const previewStart=canExpand&&todayIndex>=0
    ?Math.max(0,Math.min(periods.length-columns,todayIndex-columns+1))
    :Math.max(0,periods.length-columns);
  const visible=expanded||!canExpand?periods:periods.slice(previewStart,previewStart+columns);
  return <View style={{width:'100%'}} onLayout={event=>{
    const width=event.nativeEvent.layout.width;
    if(width>0&&Math.abs(width-measuredWidth)>1)setMeasuredWidth(width);
  }}>
    <View style={{gap:4,paddingVertical:4}}>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap,width:'100%'}}>
        {visible.map(period=>{
          const size={
            width:cellSize,height:cellSize,
            borderRadius:Math.min(4,cellSize/3),
          };
          if(period.isToday){
            return <Pressable key={period.key} accessibilityRole="button"
              disabled={!editable}
              accessibilityLabel={habit.title+', '+(period.completed?'réalisé':'à faire')+
                ' '+(habit.frequency==='weekly'?'cette semaine':"aujourd'hui")+
                '. Appuyer pour enregistrer.'}
              onPress={onTodayPress} hitSlop={6}
              style={{...size,borderWidth:1.7,borderColor:color,
                backgroundColor:period.completed?color:'transparent',
                alignItems:'center',justifyContent:'center'}}>
              {!period.completed?<View style={{
                width:Math.max(2,cellSize-6),height:Math.max(2,cellSize-6),
                borderRadius:2,backgroundColor:color,opacity:.17,
              }}/>:null}
            </Pressable>;
          }
          if(period.completed){
            // Only a successful day receives the fully saturated habit color.
            return <View key={period.key} accessibilityLabel={period.key+' · accompli'}
              style={{...size,backgroundColor:color}}/>;
          }
          if(period.future){
            // Not attempted: neutral grey, independent of the habit's chosen color.
            return <View key={period.key} accessibilityLabel={period.key+' · à venir'}
              style={{...size,backgroundColor:theme.dark?'#444B48':'#E8EBE9'}}/>;
          }
          // Missed: a LIGHT tint of the habit color, with a knock-out cross
          // in the page background color (visually transparent, never a dark X).
          return <View key={period.key} accessibilityLabel={period.key+' · manqué'}
            style={{...size,backgroundColor:theme.background,
              alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
            <View style={{position:'absolute',top:0,bottom:0,left:0,right:0,
              backgroundColor:color,opacity:.40,borderRadius:size.borderRadius}}/>
            <Ionicons name="close" color={theme.background}
              size={Math.max(10,Math.round(cellSize*.82))}/>
          </View>;
        })}
      </View>
      {canExpand?<Pressable accessibilityRole="button"
        accessibilityState={{expanded}}
        accessibilityLabel={expanded?'Réduire la chronologie':'Voir toute la chronologie'}
        onPress={()=>setExpanded(value=>!value)}
        style={{alignSelf:'flex-end',flexDirection:'row',alignItems:'center',
          gap:4,paddingVertical:5,paddingHorizontal:3}}>
        <Text style={{fontSize:10,color:theme.muted}}>
          {expanded?'Réduire':'Voir tous les carrés'}
        </Text>
        <Ionicons name={expanded?'chevron-up':'chevron-down'} size={13} color={theme.muted}/>
      </Pressable>:null}

    </View>
  </View>;
}
