import React,{createContext,useContext,useEffect,useState} from 'react';
import {Appearance,Platform,useColorScheme} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
export type AppearancePreference='light'|'dark'|'system';
type AppThemeValue={
 preference:AppearancePreference;
 setPreference:(next:AppearancePreference)=>void;
 dark:boolean;
 background:string;
 surface:string;
 foreground:string;
 muted:string;
 border:string;
};
const ThemeContext=createContext<AppThemeValue|null>(null);
const STORAGE='jenlow.appearance';
export function AppThemeProvider({children}:{children:React.ReactNode}){
 const system=useColorScheme();
 const [preference,setPreference]=useState<AppearancePreference>('system');
 useEffect(()=>{let active=true;void AsyncStorage.getItem(STORAGE).then(p=>{if(active&&(p==='light'||p==='dark'||p==='system'))setPreference(p)}).catch(()=>{});return()=>{active=false}},[]);
 useEffect(()=>{if(Platform.OS!=='web'&&typeof Appearance.setColorScheme==='function')Appearance.setColorScheme(preference==='system'?'auto':preference)},[preference]);
 const change=(next:AppearancePreference)=>{setPreference(next);void AsyncStorage.setItem(STORAGE,next).catch(()=>{})};
 const dark=(preference==='system'?system:preference)==='dark';
 return <ThemeContext.Provider value={{preference,setPreference:change,dark,background:dark?'#111317':'#FFFCF5',surface:dark?'#202227':'#fff',foreground:dark?'#F3F3F3':'#171717',muted:dark?'#B2B2B2':'#777',border:dark?'#393B40':'#e8e8e8'}}>{children}</ThemeContext.Provider>;
}
export function useAppTheme(){const value=useContext(ThemeContext);if(!value)throw new Error('AppThemeProvider missing');return value}
