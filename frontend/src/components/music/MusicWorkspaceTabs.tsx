import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/AppTheme';

export type MusicWorkspaceSpace = 'capture' | 'create' | 'collaborate';

const SPACES: {
  id: MusicWorkspaceSpace; title: string; icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'capture', title: 'Capturer', icon: 'mic-outline' },
  { id: 'create', title: 'Créer', icon: 'layers-outline' },
  { id: 'collaborate', title: 'Collaborer', icon: 'people-outline' },
];

/** Identical navigation for private and authorized shared song workspaces. */
export function MusicWorkspaceTabs({space,onChange,compact,desktop}:{
  space:MusicWorkspaceSpace;
  onChange:(space:MusicWorkspaceSpace)=>void;
  compact:boolean;
  desktop:boolean;
}){
  const theme=useAppTheme();
  return <View accessibilityRole="tablist" style={{
    flex:desktop?undefined:1,minWidth:0,flexDirection:'row',
    alignItems:'center',justifyContent:'center',gap:desktop?20:compact?0:3,
  }}>
    {SPACES.map(item=>{
      const selected=space===item.id;
      return <Pressable key={item.id} onPress={()=>onChange(item.id)}
        accessibilityRole="tab" accessibilityLabel={item.title}
        accessibilityState={{selected}}
        style={{flex:desktop?undefined:1,minWidth:compact?0:undefined,
          flexDirection:'row',alignItems:'center',justifyContent:'center',
          gap:desktop?8:9,minHeight:compact?48:desktop?46:52,
          borderBottomWidth:compact?0:selected?2:0,
          borderBottomColor:selected?'#CB245C':'transparent',
          paddingHorizontal:compact?0:desktop?12:3}}>
        <Ionicons name={item.icon} size={compact?25:desktop?18:19}
          color={selected?'#CB245C':theme.muted}/>
        {!compact?<Text numberOfLines={1}
          style={{fontSize:14,fontWeight:selected?'700':'500',
            color:selected?theme.foreground:theme.muted}}>
          {item.title}
        </Text>:null}
      </Pressable>;
    })}
  </View>;
}
