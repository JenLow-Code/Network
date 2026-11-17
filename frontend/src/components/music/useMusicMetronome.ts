import {useEffect,useRef,useState} from 'react';

type Engine={context:AudioContext;interval:ReturnType<typeof setInterval>;next:number;index:number};
const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));

/** Browser Web Audio click scheduler: look-ahead avoids setInterval timing jitter.
 * Call start only in a playback/recording gesture. No audio is recorded into tracks.
 */
export function useMusicMetronome(){
  const engine=useRef<Engine|null>(null);
  const settings=useRef({bpm:100,muted:false,meter:4});
  const [running,setRunning]=useState(false);
  const stop=()=>{
    const e=engine.current;
    if(!e)return;
    engine.current=null;clearInterval(e.interval);
    void e.context.close().catch(()=>{});
    setRunning(false);
  };
  const setSettings=(bpm:number,muted:boolean,meter=4)=>{
    settings.current={bpm:clamp(Math.round(bpm)||100,30,300),
      muted,meter:clamp(Math.round(meter)||4,1,12)};
  };
  const start=(bpm:number,muted:boolean,meter=4,startAtSeconds=0)=>{
    stop();
    setSettings(bpm,muted,meter);
    if(typeof AudioContext==='undefined')return false;
    try{
      const ctx=new AudioContext();
      void ctx.resume().catch(()=>{});
      const beatDuration=60/settings.current.bpm;
      const startPos=Math.max(0,startAtSeconds);
      const firstBeat=Math.ceil((startPos-.000001)/beatDuration);
      const delay=Math.max(0,firstBeat*beatDuration-startPos);
      const e:Engine={context:ctx,interval:null as unknown as ReturnType<typeof setInterval>,
        next:ctx.currentTime+.06+delay,index:firstBeat};
      const schedule=()=>{
        if(engine.current!==e)return;
        let count=0;
        while(e.next<ctx.currentTime+.16&&count++<32){
          const strong=e.index%settings.current.meter===0;
          if(!settings.current.muted){
            const oscillator=ctx.createOscillator();
            const gain=ctx.createGain();
            oscillator.type='sine';oscillator.frequency.value=strong?1450:950;
            gain.gain.setValueAtTime(.0001,e.next);
            gain.gain.exponentialRampToValueAtTime(strong?.12:.075,e.next+.002);
            gain.gain.exponentialRampToValueAtTime(.0001,e.next+.065);
            oscillator.connect(gain);gain.connect(ctx.destination);
            oscillator.start(e.next);oscillator.stop(e.next+.07);
          }
          e.next+=60/settings.current.bpm;
          e.index++;
        }
      };
      engine.current=e;
      e.interval=setInterval(schedule,25);
      schedule();setRunning(true);
      return true;
    }catch{
      stop();return false;
    }
  };
  useEffect(()=>()=>{const e=engine.current;if(e){
    clearInterval(e.interval);void e.context.close().catch(()=>{});engine.current=null;
  }},[]);
  return {start,stop,setSettings,running};
}
