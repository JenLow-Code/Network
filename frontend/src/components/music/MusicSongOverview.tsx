import React from 'react';
import {MusicSongElements} from './MusicSongElements';
import type {MusicProject} from '@/domain/musicWorkspace';

/** Tabs and structure editing live in the shared song header, not twice on this page. */
export function MusicSongOverview({project,patch,openSection}:{
  project:MusicProject;patch:(changes:Partial<MusicProject>)=>void;
  openSection:(id:string)=>void;openChat?:()=>void;
}) {
  return <MusicSongElements project={project} patch={patch} openSection={openSection}/>;
}
