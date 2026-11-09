import React, { useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DreamHabit } from '@/domain/dreamWorkspace';
import { habitDayKey, habitKey } from '@/domain/habitProgress';
import { useAppTheme } from '@/theme/AppTheme';

type Period = { key:string; completed:boolean; isToday:boolean; future:boolean };

function chronologicalPeriods(habit:DreamHabit, goalDate?:string, now:Date=new Date()): Period[] {
  const today=habitDayKey(now);
  const periodToday=habitKey(habit.frequency,today);
  const validDate=(value?:string)=>!!value && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(new Date(value+'T12:00:00').getTime());
  const earliest=[...(habit.completed||[]),...Object.keys(habit.measurements||{})]
    .filter(validDate).map(key=>habitKey(habit.frequency,key)).sort()[0];
  const habitStart=validDate(habit.startedAt)?habitKey(habit.frequency,habit.startedAt!):undefined;
  // Never conceal an existing earlier completion if a stored start date was later.
  const start=earliest && habitStart ? (earliest<habitStart?earliest:habitStart):
    earliest||habitStart||periodToday;
  const finish=validDate(goalDate)?habitKey(habit.frequency,goalDate!):periodToday;
  const first=new Date(start+'T12:00:00');
  const last=new Date(finish+'T12:00:00');
  if(last.getTime()<first.getTime())return [];
  const target=habit.target&&habit.target>0?habit.target:1;
  const done=new Set((habit.completed||[]).map(key=>habitKey(habit.frequency,key)));
  const result:Period[]=[];
  const step=habit.frequency==='weekly'?7:1;
  for(let date=new Date(first);date<=last&&result.length<1000;date.setDate(date.getDate()+step)){
    const key=habitDayKey(date);
    const amount=habit.measurements?.[key];
    result.push({key,completed:amount!==undefined?amount>=target:done.has(key),
      isToday:key===periodToday,future:key>periodToday});
  }
  // Huge plans display the most recent/future segment rather than falsely
  // implying a dense history of completions.
  if(result.length>336){
    const todayIndex=result.findIndex(period=>period.isToday);
    const center=Math.max(0,todayIndex<0?result.length-1:todayIndex);
    const from=Math.max(0,Math.min(result.length-336,center-125));
    return result.slice(from,from+336);
  }
  return result;
}

/**
 * Each square represents an actual calendar period (a day or week).
 * This makes adjacent completed squares consistent with a consecutive-period streak.
 * Session totals remain separately visible as e.g. "4 / 83".
 */
export function HabitSquareGrid({
  habit, goalDate, color, editable, onTodayPress,
}: {
  habit:DreamHabit;
  goalDate?:string;
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
  const periods=chronologicalPeriods(habit,goalDate);
  const todayIndex=periods.findIndex(period=>period.isToday);
  const canExpand=periods.length>columns;
  // The single-row preview ends at today, so the preceding successful days
  // remain visible even when today sits at a grid row boundary.
  const previewStart=canExpand&&todayIndex>=0
    ?Math.max(0,Math.min(periods.length-columns,todayIndex-columns+1))
    :Math.max(0,periods.length-columns);
  const visible=expanded||!canExpand?periods:periods.slice(previewStart,previewStart+columns);
  const periodType=habit.frequency==='weekly'?'semaine':'jour';
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
          return <View key={period.key} accessibilityLabel={
            period.key+' · '+(period.future?'à venir':period.completed?'accompli':'manqué')
          } style={{...size,
            backgroundColor:color,
            opacity:period.completed?1:period.future ? .12 : .57,
            alignItems:'center',justifyContent:'center'}}>
            {!period.future&&!period.completed
              ?<Ionicons name="close" color="#FFFFFF"
                size={Math.max(9,Math.round(cellSize*.79))}/>
              :null}
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
      {expanded?<Text style={{fontSize:10,color:theme.muted,lineHeight:16}}>
        1 carré = 1 {periodType} · carré entouré = {habit.frequency==='weekly'?'cette semaine':"aujourd'hui"}
        {periods.length===336?' · affichage limité à 336 périodes':''}
      </Text>:null}
    </View>
  </View>;
}
