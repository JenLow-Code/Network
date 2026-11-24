import React,{createContext,useContext,useMemo,useState} from 'react';
import type {MusicProject} from './musicWorkspace';
type State={project:MusicProject|null;setProject:(project:MusicProject|null)=>void};
const Context=createContext<State|null>(null);
/** Transient navigation metadata, only supplied after verified shared access. */
export function SharedMusicNavigationProvider({children}:{children:React.ReactNode}){
  const [project,setProject]=useState<MusicProject|null>(null);
  const value=useMemo(()=>({project,setProject}),[project]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useSharedMusicNavigation(){
  const value=useContext(Context);
  if(!value)throw Error('SharedMusicNavigationProvider missing');
  return value;
}
