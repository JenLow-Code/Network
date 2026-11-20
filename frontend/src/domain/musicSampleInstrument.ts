/**
 * Client-side monophonic instrument-sample analysis.
 * No server or ML dependency. Polyphonic/unstable sources must be reviewed
 * manually; a detected frequency is a suggestion, not a certified tuning.
 */
export type SamplePitch = {
  midi:number;frequencyHz:number;cents:number;confidence:number;
};
export function midiFrequency(midi:number):number{
  return 440*Math.pow(2,(midi-69)/12);
}
export function samplePlaybackRate(targetMidi:number,sourceFrequencyHz:number):number{
  return midiFrequency(targetMidi)/sourceFrequencyHz;
}

function yinWindow(
  data:Float32Array,offset:number,count:number,rate:number,
):{hz:number;confidence:number}|null{
  const minLag=Math.max(2,Math.floor(rate/1100));
  const maxLag=Math.min(Math.floor(rate/72),Math.floor(count/2));
  if(count<650||maxLag<=minLag)return null;
  const difference=new Float64Array(maxLag+1);
  const normalized=new Float64Array(maxLag+1);
  let running=0;
  // YIN cumulative mean normalized difference; genuine pitch periods have
  // minima, while the algorithm distinguishes silence/noise by confidence.
  for(let lag=1;lag<=maxLag;lag++){
    let diff=0;
    for(let i=0;i<count-maxLag;i++){
      const d=data[offset+i]-data[offset+i+lag];
      diff+=d*d;
    }
    difference[lag]=diff;
    running+=diff;
    normalized[lag]=running>0?diff*lag/running:1;
  }
  let best=-1;
  for(let lag=minLag;lag<maxLag;lag++){
    if(normalized[lag]<.18){
      while(lag+1<=maxLag&&normalized[lag+1]<normalized[lag])lag++;
      best=lag;break;
    }
  }
  if(best<0){
    let score=1;
    for(let lag=minLag;lag<=maxLag;lag++){
      if(normalized[lag]<score){score=normalized[lag];best=lag;}
    }
  }
  if(best<0||normalized[best]>.30)return null;
  const left=normalized[Math.max(minLag,best-1)];
  const middle=normalized[best];
  const right=normalized[Math.min(maxLag,best+1)];
  const divisor=left-2*middle+right;
  const fractional=Math.abs(divisor)>1e-9?
    Math.max(-.5,Math.min(.5,(left-right)/(2*divisor))):0;
  const period=best+fractional;
  const hz=rate/period;
  if(hz<72||hz>1100||!Number.isFinite(hz))return null;
  return {hz,confidence:Math.min(1,Math.max(0,1-middle))};
}

/** Samples are mono here; pass a stereo mix if needed. */
export function analyzeSamplePitch(
  samples:Float32Array,sampleRate:number,
):SamplePitch|null{
  if(!samples.length||!Number.isFinite(sampleRate)||sampleRate<8000)return null;
  const decimation=Math.max(1,Math.floor(sampleRate/12000));
  const count=Math.min(Math.floor(samples.length/decimation),30000);
  if(count<1150)return null;
  const data=new Float32Array(count);
  let peak=0,sum=0;
  for(let i=0;i<count;i++){
    const value=samples[i*decimation];
    data[i]=value;
    peak=Math.max(peak,Math.abs(value));sum+=value*value;
  }
  const rms=Math.sqrt(sum/count);
  if(peak<.003||rms<.001)return null;
  const rate=sampleRate/decimation;
  const window=Math.min(4096,Math.max(950,Math.floor(count*.52)));
  const positions=[.12,.34,.56].map(r=>
    Math.max(0,Math.min(count-window,Math.floor(count*r))));
  const results=positions.map(offset=>yinWindow(data,offset,window,rate))
    .filter((r):r is {hz:number;confidence:number}=>r!==null);
  if(results.length<2)return null;
  // Require a majority of windows to agree within 45 cents; prevents
  // transient hits, speech and noisy samples from being labelled notes.
  let cluster:typeof results=[];
  for(const candidate of results){
    const close=results.filter(other=>
      Math.abs(1200*Math.log2(candidate.hz/other.hz))<45);
    if(close.length>cluster.length)cluster=close;
  }
  if(cluster.length<2)return null;
  const frequencyHz=cluster.reduce((sum,r)=>sum+r.hz*r.confidence,0)/
    cluster.reduce((sum,r)=>sum+r.confidence,0);
  const confidence=cluster.reduce((sum,r)=>sum+r.confidence,0)/
    cluster.length*(cluster.length/results.length);
  if(!Number.isFinite(frequencyHz)||confidence<.7)return null;
  const rawMidi=69+12*Math.log2(frequencyHz/440);
  const midi=Math.round(rawMidi);
  if(midi<24||midi>96)return null;
  return {midi,frequencyHz,cents:Math.round((rawMidi-midi)*100),
    confidence:Math.round(confidence*100)/100};
}

/** Use the loudest channel to locate onset and loop points. A mono mic can
 * be routed to the right channel only; the keyboard must not call it silent. */
export function sampleAudioRegion(buffer:{
  numberOfChannels:number;sampleRate:number;
  getChannelData:(channel:number)=>Float32Array;
}):{offset:number;loopStart:number;loopEnd:number;peak:number}{
  let region=sampleRegion(buffer.getChannelData(0),buffer.sampleRate);
  for(let channel=1;channel<buffer.numberOfChannels;channel++){
    const candidate=sampleRegion(buffer.getChannelData(channel),buffer.sampleRate);
    if(candidate.peak>region.peak)region=candidate;
  }
  return region;
}

/** Determine a useful audio onset and loopable sustain section.
 * Snap loop boundaries towards nearby zero crossings to reduce clicks.
 * If a source is too short, looping falls back to the whole audible part.
 */
export function sampleRegion(
  samples:Float32Array,sampleRate:number,
):{offset:number;loopStart:number;loopEnd:number;peak:number}{
  const len=samples.length;
  if(!len||sampleRate<=0)return {offset:0,loopStart:0,loopEnd:0,peak:0};
  let peak=0;
  const step=Math.max(1,Math.floor(len/40000));
  for(let i=0;i<len;i+=step)peak=Math.max(peak,Math.abs(samples[i]));
  if(peak<.001)return {offset:0,loopStart:0,loopEnd:len/sampleRate,peak};
  const threshold=Math.max(.0015,peak*.025);
  let begin=0;
  while(begin<len&&Math.abs(samples[begin])<threshold)begin++;
  begin=Math.max(0,begin-Math.floor(sampleRate*.009));
  const offset=begin/sampleRate;
  const audible=Math.max(0,len-begin);
  const startGuess=begin+Math.floor(audible*.28);
  const endGuess=begin+Math.floor(audible*.82);
  const zero=(guess:number)=>{
    const radius=Math.min(Math.floor(sampleRate*.013),Math.floor(len*.08));
    let found=Math.max(0,Math.min(len-1,guess)),best=Infinity;
    for(let i=Math.max(1,guess-radius);i<Math.min(len-1,guess+radius);i++){
      // Prefer equal-polarity zero crossings on both ends.
      if(samples[i-1]<=0&&samples[i]>0){
        const score=Math.abs(samples[i]);
        if(score<best){best=score;found=i;}
      }
    }
    return found;
  };
  const loopStart=zero(startGuess)/sampleRate;
  const loopEnd=zero(endGuess)/sampleRate;
  return {offset,loopStart,loopEnd:loopEnd>loopStart+.07?
    loopEnd:len/sampleRate,peak};
}
