// Synthetic visual regression: never check private user uploads into Git.
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const assert=require('node:assert/strict');
const input=fs.readFileSync(path.resolve(__dirname,
  '../src/domain/musicScoreScanQuality.ts'),'utf8');
const code=ts.transpileModule(input,{compilerOptions:{
  target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,
}}).outputText;
const mod={exports:{}};
new Function('module','exports','require',code)(mod,mod.exports,require);
const {detectScoreGeometry,auditRecognizedScore}=mod.exports;
const width=600,height=520,px=new Uint8ClampedArray(width*height*4);
px.fill(255);
for(const first of [60,175,290,405])
  for(let line=0;line<5;line++)
    for(let x=40;x<560;x++)
      for(const dy of [0,1]){
        const y=first+line*8+dy,p=(y*width+x)*4;
        px[p]=0;px[p+1]=0;px[p+2]=0;
      }
const geo=detectScoreGeometry({width,height,data:px});
assert.equal(geo.staffCount,4,'Four groups of five staff lines detected');
assert.equal(geo.estimatedSystems,2);
assert.ok(geo.suggestedCrop?.height>0);
const falseScore=Array.from({length:27},(_,i)=>({
  midi:48+i%12,startBeats:i%3,lengthBeats:1,
}));
const bad=auditRecognizedScore(falseScore,3,geo);
assert.equal(bad.accepted,false);
assert.equal(bad.code,'score_incomplete');
const good=auditRecognizedScore(Array.from({length:24},(_,i)=>({
  midi:60+i%8,startBeats:i,lengthBeats:1,
})),3,geo);
assert.equal(good.accepted,true);
assert.equal(auditRecognizedScore([{midi:60,startBeats:0,lengthBeats:1}],3,
  {staffCount:1,estimatedSystems:1}).accepted,true);
assert.equal(auditRecognizedScore([{midi:999,startBeats:0,lengthBeats:1}],
  3,geo).code,'score_invalid');
console.log('Music scan staff geometry and incomplete-score guard: OK');
