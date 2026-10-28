import React from 'react';
import {Pressable} from 'react-native';
import {router} from 'expo-router';
import {MessageIcon} from '@/icons/MessageIcon';
import {useAppTheme} from '@/theme/AppTheme';

export function TopActions(){const theme=useAppTheme();return <Pressable accessibilityLabel="Messages" onPress={()=>router.push('/space')} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><MessageIcon size={25} color={theme.foreground}/></Pressable>}
