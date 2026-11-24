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
    flex:desktop?undefined:compact?undefined:1,
    width:compact?142:undefined,minWidth:0,flexDirection:'row',
    alignItems:'center',justifyContent:'center',
    gap:desktop?20:compact?10:3,
    // On phones this is deliberately a light secondary navigation:
    // no capsule, no selected fill, just icons and a small active dot.
    backgroundColor:'transparent',borderWidth:0,padding:0,
  }}>
    {SPACES.map(item=>{
      const selected=space===item.id;
      return <Pressable key={item.id} onPress={()=>onChange(item.id)}
        accessibilityRole="tab" accessibilityLabel={item.title}
        accessibilityState={{selected}}
        style={{
          flex:compact?undefined:desktop?undefined:1,
          width:compact?34:undefined,minWidth:0,
          alignItems:'center',justifyContent:'center',
          gap:compact?2:desktop?8:9,
          minHeight:compact?34:desktop?46:52,
          flexDirection:compact?'column':'row',
          paddingHorizontal:compact?0:desktop?12:3
        }}>
        <Ionicons name={item.icon} size={compact?20:desktop?18:19}
          color={selected?'#CB245C':theme.muted}/>
        {compact?(
          <View style={{width:selected?5:3,height:selected?5:3,borderRadius:3,
            backgroundColor:selected?'#CB245C':'transparent'}}/>
        ):(
          <Text numberOfLines={1}
            style={{fontSize:14,fontWeight:selected?'700':'500',
              color:selected?theme.foreground:theme.muted}}>
            {item.title}
          </Text>
        )}
      </Pressable>;
    })}
  </View>;
}
