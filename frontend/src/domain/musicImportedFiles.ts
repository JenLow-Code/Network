import { textFromDocx } from '@/lib/docxPreview';
import { saveMusicWorkspaceFile } from './musicLocalStorage';
import { fileAudioDuration } from './musicProjectSelectors';
import { newMusicId } from './musicWorkspace';
import type { MusicProjectFile, MusicLyricSegment } from './musicWorkspace';

export function lyricStanzas(text:string):MusicLyricSegment[] {
  // Keep all user text, without guessing which stanza is a verse or bridge.
  return text.replace(/\r\n?/g,'\n').split(/\n\s*\n/g)
    .map(part=>part.trim()).filter(Boolean)
    .map(part=>({id:newMusicId(),text:part,sectionIds:[]}));
}
export function isWordDocument(file:File):boolean {
  return /\.docx$/i.test(file.name);
}
export async function importSongFile(file:File, originalLanguage:string):Promise<MusicProjectFile> {
  const lower=file.name.toLowerCase();
  const audio=/\.(mp3|m4a|wav|webm|ogg|aac)$/i.test(lower);
  const midi=/\.(mid|midi)$/i.test(lower);
  const docx=/\.docx$/i.test(lower);
  const plain=/\.(txt|md)$/i.test(lower);
  const score=/\.(pdf|png|jpg|jpeg|webp)$/i.test(lower);
  const text=docx?await textFromDocx(await file.arrayBuffer()):
    plain?await file.text():undefined;
  const localFileId=await saveMusicWorkspaceFile(file);
  return {
    id:newMusicId(),title:file.name.replace(/\.[^.]+$/,''),
    kind:audio?'audio':midi?'track':score?'score':'document',
    sectionIds:[],text,
    originalFilename:file.name,mimeType:file.type||undefined,localFileId,
    durationSeconds:audio?await fileAudioDuration(file):undefined,
    language:docx||plain?originalLanguage:undefined,
    createdAt:new Date().toISOString(),
  };
}
/** Classification does not change/delete imported original bytes. */
export function classifySongFile(file:MusicProjectFile,kind:MusicProjectFile['kind']):MusicProjectFile {
  return {...file,kind,
    lyricSegments:kind==='lyrics'&&!file.lyricSegments?.length&&file.text?.trim()
      ?lyricStanzas(file.text):file.lyricSegments,
  };
}
export function matchesMusicSection(file:MusicProjectFile,sectionId:string):boolean {
  return (file.sectionIds||[]).includes(sectionId)
    || (file.lyricSegments||[]).some(s=>(s.sectionIds||[]).includes(sectionId))
    || (file.regions||[]).some(r=>r.sectionId===sectionId);
}
export function lyricsForMusicSection(file:MusicProjectFile,sectionId:string):string {
  if(file.lyricSegments?.length){
    return file.lyricSegments.filter(s=>s.sectionIds.includes(sectionId)).map(s=>s.text).join('\n\n');
  }
  return file.sectionContent?.[sectionId] || ((file.sectionIds||[]).includes(sectionId)?file.text||'':'');
}
