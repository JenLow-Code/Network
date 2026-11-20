/**
 * Regression checks for MIDI export/import before the Web Audio renderer.
 * Runs against the actual TypeScript source without installing MIDI packages.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const root=path.join(__dirname,'..');
function load(relative){
  const source=fs.readFileSync(path.join(root,relative),'utf8');
  const js=ts.transpileModule(source,{compilerOptions:{
    module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,
  }}).outputText;
  const module={exports:{}};
  new Function('module','exports','require',js)(module,module.exports,require);
  return module.exports;
}
const {exportMusicMidi}=load('src/domain/musicNotation.ts');
const {parseMusicMidi}=load('src/domain/musicMidiParser.ts');
const notes=[
  {id:'a',instrument:'piano',midi:60,startBeats:0,lengthBeats:1,velocity:95},
  {id:'b',instrument:'piano',midi:64,startBeats:0,lengthBeats:2,velocity:90},
  {id:'c',instrument:'drum',midi:36,startBeats:1,lengthBeats:.5,velocity:110},
  {id:'d',instrument:'piano',midi:67,startBeats:3.5,lengthBeats:.75,velocity:82},
];
const midi=exportMusicMidi(notes,115);
assert.equal(String.fromCharCode(...midi.slice(0,4)),'MThd');
const result=parseMusicMidi(midi);
assert.equal(result.bpm,115);
assert.equal(result.events.length,notes.length);
assert.ok(result.durationSeconds>2);
for(const event of notes){
  const matching=result.events.find(n=>n.midi===event.midi&&n.instrument===event.instrument);
  assert.ok(matching,'Missing note '+event.midi);
  assert.ok(Math.abs(matching.startBeats-event.startBeats)<.005);
  assert.ok(Math.abs(matching.lengthBeats-event.lengthBeats)<.005);
}
assert.ok(result.events.some(e=>e.instrument==='drum'),'Percussion channel lost');
assert.throws(()=>parseMusicMidi(new Uint8Array([1,2,3])));
// Type-0 single-track format uses the same event parser; verify the
// multi-track roundtrip first, which covers tempo, chords and percussion.
console.log('MIDI import/export roundtrip, chords, rests, tempo and drums passed.');
