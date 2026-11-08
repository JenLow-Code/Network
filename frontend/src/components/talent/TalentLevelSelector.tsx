import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAppTheme } from '@/theme/AppTheme';

/** One shared five-dot scale for profile and requested talent levels. */
export const TALENT_LEVELS = [
  'Grand débutant',
  'Quelques notions',
  'Intermédiaire',
  'Avancé',
  'Professionnel',
] as const;
const COLORS = ['#287D58','#2ECA65','#EAC000','#F38A24','#CB245C'] as const;

export function TalentLevelSelector({
  value, onChange, disabled = false,
}: {
  value: string;
  onChange: (level: string) => void;
  disabled?: boolean;
}) {
  const theme = useAppTheme();
  const selected = Math.max(0,TALENT_LEVELS.findIndex(level => level === value));
  return (
    <View style={{gap:10,alignItems:'flex-start'}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:11}}>
        {TALENT_LEVELS.map((level,index)=>(
          <Pressable key={level}
            accessibilityRole="radio" accessibilityState={{selected:index===selected,disabled}}
            accessibilityLabel={'Niveau '+(index+1)+' sur 5 : '+level}
            disabled={disabled}
            onPress={()=>onChange(level)}
            style={{minWidth:38,minHeight:38,alignItems:'center',justifyContent:'center'}}>
            <View style={{
              width:index===selected?17:14,height:index===selected?17:14,borderRadius:10,
              backgroundColor:index<=selected?COLORS[index]:(theme.dark?'#64676C':'#E6E6E6'),
              borderWidth:index===selected?2:0,
              borderColor:theme.background,
            }}/>
          </Pressable>
        ))}
      </View>
      <Text style={{fontSize:12,color:theme.muted}}>
        {TALENT_LEVELS[selected]}
      </Text>
    </View>
  );
}
