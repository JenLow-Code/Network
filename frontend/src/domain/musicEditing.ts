/**
 * Browser-only, non-destructive punch-in utility.
 * The source recording is decoded and a new WAV is created in memory.
 * Nothing in IndexedDB is overwritten until the user explicitly saves the result.
 */
export async function punchInAudio(previous: File | null, take: File, atSeconds: number):
  Promise<{file: File; durationSeconds: number}> {
  if (typeof AudioContext === 'undefined') throw Error('Montage audio indisponible sur cet appareil.');
  const ctx = new AudioContext();
  try {
    const fresh = await ctx.decodeAudioData(await take.arrayBuffer());
    // Encode short first takes as PCM WAV so seeking is reliable in browsers whose
    // MediaRecorder WebM files have missing duration/seek metadata.
    const original = previous ? await ctx.decodeAudioData(await previous.arrayBuffer()) : fresh;
    const sampleRate = original.sampleRate;
    if (fresh.sampleRate !== sampleRate) throw Error('Fréquences audio incompatibles.');
    const channels = Math.min(2, Math.max(original.numberOfChannels, fresh.numberOfChannels));
    const start = Math.max(0, Math.min(original.length, Math.round(atSeconds * sampleRate)));
    const end = Math.min(original.length, start + fresh.length);
    const total = Math.max(original.length, start + fresh.length);
    if (total * channels * 2 + 44 > 100 * 1024 * 1024) {
      if (!previous) return {file:take,durationSeconds:fresh.duration};
      throw Error('Prise finale trop longue pour le stockage local (100 Mo maximum).');
    }
    const pcm = Array.from({length:channels},(_,c)=>{
      const result = new Float32Array(total);
      const before = original.getChannelData(Math.min(c,original.numberOfChannels-1));
      const after = fresh.getChannelData(Math.min(c,fresh.numberOfChannels-1));
      result.set(before.subarray(0,start),0);
      result.set(after,start);
      if(end < original.length) result.set(before.subarray(end),end);
      return result;
    });
    const buffer = new ArrayBuffer(44 + total * channels * 2);
    const view = new DataView(buffer);
    const ascii=(at:number,str:string)=>{
      for(let i=0;i<str.length;i++)view.setUint8(at+i,str.charCodeAt(i));
    };
    ascii(0,'RIFF');view.setUint32(4,36+total*channels*2,true);ascii(8,'WAVE');
    ascii(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);
    view.setUint16(22,channels,true);view.setUint32(24,sampleRate,true);
    view.setUint32(28,sampleRate*channels*2,true);view.setUint16(32,channels*2,true);
    view.setUint16(34,16,true);ascii(36,'data');view.setUint32(40,total*channels*2,true);
    let ptr=44;
    for(let i=0;i<total;i++)for(let c=0;c<channels;c++){
      const v=Math.max(-1,Math.min(1,pcm[c][i]||0));
      view.setInt16(ptr,v<0?Math.round(v*32768):Math.round(v*32767),true);
      ptr+=2;
    }
    return {file:new File([buffer],'prise-retouchee-'+Date.now()+'.wav',{type:'audio/wav'}),
      durationSeconds:total/sampleRate};
  } finally {await ctx.close();}
}
export function musicStamp(time: number): string {
  const safe=Math.max(0,Number.isFinite(time)?time:0);
  const mins=Math.floor(safe/60);
  const secs=Math.floor(safe%60);
  const cs=Math.floor((safe%1)*100);
  return String(mins).padStart(2,'0')+':'+String(secs).padStart(2,'0')+
    '.'+String(cs).padStart(2,'0');
}

/** Exact displayed selection, in milliseconds. Not a guarantee of codec/sample accuracy. */
export function musicStampMs(time: number): string {
  const total = Math.max(0, Math.round((Number.isFinite(time) ? time : 0) * 1000));
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const milliseconds = total % 1000;
  return String(minutes).padStart(2, '0') + ':' +
    String(seconds).padStart(2, '0') + '.' +
    String(milliseconds).padStart(3, '0');
}
