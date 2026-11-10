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
  const gap=6;
  // One week = seven squares, Monday to Sunday. Indent this visual beneath
  // the habit's title, aligned with its "Voir dans le calendrier" subtitle.
  const columns=7;
  const indent=33;
  const available=measuredWidth>0
    ?Math.max(100,measuredWidth-indent)
    :Math.max(100,Math.min(screenWidth-155,500));
  const cellSize=Math.max(12,Math.min(27,(available-(columns-1)*gap)/columns));
  const periods=chronologicalPeriods(habit,goalDate,dreamStartedAt,plannedSessions);
  const mondayKey=(dateKey:string):string=>{
    const date=new Date(dateKey+'T12:00:00');
    date.setDate(date.getDate()-((date.getDay()+6)%7));
    return habitDayKey(date);
  };
  type WeekRow={key:string;slots:(Period|null)[]};
  const rows:WeekRow[]=[];
  if(habit.frequency==='daily'){
    for(const period of periods){
      const monday=mondayKey(period.key);
      let week=rows[rows.length-1];
      if(!week||week.key!==monday){
        week={key:monday,slots:Array<Period|null>(columns).fill(null)};
        rows.push(week);
      }
      const weekday=(new Date(period.key+'T12:00:00').getDay()+6)%7;
      week.slots[weekday]=period;
    }
  }else{
    for(let i=0;i<periods.length;i+=columns){
      rows.push({key:'week-periods-'+i,slots:periods.slice(i,i+columns)});
    }
  }
  const isoWeek=(monday:string):number=>{
    const date=new Date(monday+'T12:00:00');
    const thursday=new Date(date);
    thursday.setDate(thursday.getDate()+3);
    const year=thursday.getFullYear();
    const firstMonday=new Date(year,0,4,12);
    firstMonday.setDate(firstMonday.getDate()-((firstMonday.getDay()+6)%7));
    return 1+Math.round((date.getTime()-firstMonday.getTime())/(7*86400000));
  };
  const nowKey=habitDayKey(new Date());
  const thisWeek=mondayKey(nowKey);
  const activeIndex=rows.findIndex(row=>habit.frequency==='daily'
    ?row.key===thisWeek:row.slots.some(period=>period?.isToday));
  // Preview the current calendar week, not the first week of the entire goal.
  const previewIndex=activeIndex>=0?activeIndex:
    (rows.findIndex(row=>row.slots.some(period=>period?.future))>=0
      ?rows.findIndex(row=>row.slots.some(period=>period?.future))
      :Math.max(0,rows.length-1));
  const canExpand=rows.length>1;
  const shown=expanded||!canExpand?rows:rows.slice(previewIndex,previewIndex+1);
  const renderSquare=(period:Period)=>{
    const size={width:cellSize,height:cellSize,
      borderRadius:Math.min(4,cellSize/3)};
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
      return <View key={period.key} accessibilityLabel={period.key+' · accompli'}
        style={{...size,backgroundColor:color}}/>;
    }
    if(period.future){
      return <View key={period.key} accessibilityLabel={period.key+' · à venir'}
        style={{...size,backgroundColor:theme.dark?'#444B48':'#E8EBE9'}}/>;
    }
    return <View key={period.key} accessibilityLabel={period.key+' · manqué'}
      style={{...size,backgroundColor:theme.background,
        alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
      <View style={{position:'absolute',top:0,bottom:0,left:0,right:0,
        backgroundColor:color,opacity:.40,borderRadius:size.borderRadius}}/>
      <Ionicons name="close" color={theme.background}
        size={Math.max(10,Math.round(cellSize*.82))}/>
    </View>;
  };
  return <View style={{width:'100%'}} onLayout={event=>{
    const width=event.nativeEvent.layout.width;
    if(width>0&&Math.abs(width-measuredWidth)>1)setMeasuredWidth(width);
  }}>
    <View style={{gap:6,paddingVertical:4,paddingLeft:indent}}>
      {shown.map(row=><View key={row.key} style={{gap:4}}>
        <Text style={{fontSize:10,lineHeight:13,fontWeight:'500',
          color:theme.muted,letterSpacing:.15}}>
          {habit.frequency==='daily'
            ?(row.key===thisWeek?'Cette semaine · S':'Semaine ')+isoWeek(row.key)
            :'Semaines'}
        </Text>
        <View style={{flexDirection:'row',gap,alignItems:'center'}}>
          {row.slots.map((period,index)=>period?(
            <React.Fragment key={period.key}>{renderSquare(period)}</React.Fragment>
          ):(
            // Invisible positional spacer, not a failed or future habit square.
            <View key={'empty-'+index} style={{width:cellSize,height:cellSize}}/>
          ))}
        </View>
      </View>)}
      {canExpand?<Pressable accessibilityRole="button"
        accessibilityState={{expanded}}
        accessibilityLabel={expanded?'Réduire la chronologie':'Voir toute la chronologie'}
        onPress={()=>setExpanded(value=>!value)}
        style={{alignSelf:'flex-end',flexDirection:'row',alignItems:'center',
          gap:4,paddingVertical:5,paddingHorizontal:3}}>
        <Text style={{fontSize:10,color:theme.muted}}>
          {expanded?'Réduire':'Voir tous les carrés'}
        </Text>
        <Ionicons name={expanded?'chevron-up':'chevron-down'}
          size={13} color={theme.muted}/>
      </Pressable>:null}
    </View>
  </View>;
}
