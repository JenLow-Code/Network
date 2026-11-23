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
    alignItems:'center',justifyContent:'center',gap:desktop?20:compact?3:3,
    // One distinct tab group, visually separated from Back / Fire / Chat.
    backgroundColor:compact?(theme.dark?'#252B2B':'#F3F0EA'):'transparent',
    borderWidth:compact?1:0,borderColor:theme.border,
    borderRadius:compact?12:0,padding:compact?3:0,
  }}>
    {SPACES.map(item=>{
      const selected=space===item.id;
      return <Pressable key={item.id} onPress={()=>onChange(item.id)}
        accessibilityRole="tab" accessibilityLabel={item.title}
        accessibilityState={{selected}}
        style={{flex:desktop?undefined:1,minWidth:compact?0:undefined,
          flexDirection:'row',alignItems:'center',justifyContent:'center',
          gap:desktop?8:9,minHeight:compact?38:desktop?46:52,
          borderBottomWidth:selected?2:0,
          borderBottomColor:selected?'#CB245C':'transparent',
          borderRadius:compact?9:0,
          backgroundColor:compact&&selected?
            (theme.dark?'rgba(203,36,92,.20)':'#FCEAF1'):'transparent',
          paddingHorizontal:compact?0:desktop?12:3}}>
        <Ionicons name={item.icon} size={compact?23:desktop?18:19}
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
