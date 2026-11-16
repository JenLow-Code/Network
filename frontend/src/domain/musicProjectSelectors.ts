import type { MusicProject, MusicSection } from './musicWorkspace';

/** Do not claim timing for an unrecorded idea. Only real media metadata and time ranges count. */
export function sectionDurationSeconds(project: MusicProject, section: MusicSection): number | undefined {
  if (Number.isFinite(section.startSeconds) && Number.isFinite(section.endSeconds) &&
      section.startSeconds! >= 0 && section.endSeconds! > section.startSeconds!) {
    return Math.round((section.endSeconds! - section.startSeconds!) * 100) / 100;
  }
  const lengths = [
    ...project.layers.filter(x => x.sectionId === section.id).map(x => x.durationSeconds),
    ...project.files.flatMap(file=>{
      const regions=(file.regions||[]).filter(r=>r.sectionId===section.id &&
        r.endSeconds>r.startSeconds && r.startSeconds>=0);
      if(regions.length)return regions.map(r=>r.endSeconds-r.startSeconds);
      return file.sectionIds.includes(section.id) &&
        (file.kind==='audio'||file.kind==='track')?[file.durationSeconds]:[];
    }),
  ].filter((n): n is number => typeof n === 'number' && n > 0 && Number.isFinite(n));
  return lengths.length ? Math.max(...lengths) : undefined;
}
export function songDurationSeconds(project: MusicProject): number | undefined {
  const versions = project.versions.map(v => v.durationSeconds).filter((n): n is number =>
    typeof n === 'number' && n > 0 && Number.isFinite(n));
  if (versions.length) return versions[0];
  const uploaded=project.files.filter(f=>f.kind==='audio'||f.kind==='track')
    .map(f=>f.durationSeconds).filter((n):n is number=>typeof n==='number'&&
      Number.isFinite(n)&&n>0);
  if(uploaded.length)return Math.max(...uploaded);
  const durations=project.sections.map(s=>sectionDurationSeconds(project,s));
  return durations.length && durations.every(n=>typeof n==='number')
    ? durations.reduce<number>((sum,n)=>sum+(n||0),0) : undefined;
}
export function formatMusicDuration(value?:number): string {
  if (value === undefined || !Number.isFinite(value) || value < 0) return '—';
  const secs=Math.round(value);
  return Math.floor(secs/60)+':'+String(secs%60).padStart(2,'0');
}
export function projectInstruments(project: MusicProject): string[] {
  const all=[...project.instruments, ...project.layers.map(x=>x.role),
    ...project.files.filter(f=>f.kind==='audio').map(f=>f.instrument||''),
    ...project.sections.flatMap(x=>x.instruments||[])];
  return [...new Set(all.map(x=>x.trim()).filter(x=>x && x.toLowerCase()!=='piste' &&
    x.toLowerCase()!=='instrument' && x.toLowerCase()!=='piste audio'))];
}
export async function fileAudioDuration(file: File): Promise<number|undefined> {
  if(typeof document==='undefined')return undefined;
  const url=URL.createObjectURL(file);
  try {
    return await new Promise<number|undefined>(resolve=>{
      const audio=document.createElement('audio');
      let done=false;
      const finish=(value?:number)=>{
        if(done)return;done=true;audio.removeAttribute('src');audio.load();
        resolve(value&&Number.isFinite(value)&&value>0?value:undefined);
      };
      audio.preload='metadata';
      audio.onloadedmetadata=()=>finish(audio.duration);
      audio.onerror=()=>finish();
      audio.src=url;
      audio.load();
      setTimeout(()=>finish(),3000);
    });
  } finally {URL.revokeObjectURL(url);}
}
