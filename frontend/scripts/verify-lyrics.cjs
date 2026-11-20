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
const {shiftLyricAnchors,isLyricAnchorValid}=
  load('src/domain/musicLyricAnchors.ts');
const original='Intro\n\nRefrain secret\n\nRefrain secret';
const index=original.lastIndexOf('Refrain secret');
const comment={id:'comment-1',start:index,end:index+14,
  text:'Refrain secret',comment:'Garder cette image',createdAt:'2026-11-20'};
assert.ok(isLyricAnchorValid(original,comment));
const prefixed='Nouvelle idée\n'+original;
const [shifted]=shiftLyricAnchors(original,prefixed,[comment]);
assert.equal(shifted.start,index+'Nouvelle idée\n'.length);
assert.equal(shifted.text,'Refrain secret');
assert.ok(isLyricAnchorValid(prefixed,shifted));
// Repeated refrains must not be confused after an insertion.
assert.equal(prefixed.indexOf('Refrain secret')!==shifted.start,true);
const extended=prefixed.slice(0,shifted.start+7)+' magnifique'+
  prefixed.slice(shifted.start+7);
const [adjusted]=shiftLyricAnchors(prefixed,extended,[shifted]);
assert.ok(isLyricAnchorValid(extended,adjusted));
assert.equal(adjusted.text,'Refrain magnifique secret');
const shortened='Petit mot\n'+prefixed;
const [again]=shiftLyricAnchors(prefixed,shortened,[shifted]);
assert.ok(isLyricAnchorValid(shortened,again));
// Crossing an anchor boundary cannot silently retarget its comment.
const removed=prefixed.slice(0,shifted.start-2)+
  prefixed.slice(shifted.start+3);
const [detached]=shiftLyricAnchors(prefixed,removed,[shifted]);
assert.equal(detached.text,shifted.text);
assert.equal(isLyricAnchorValid(removed,detached),false);
console.log('Lyrics: fixed sections, repeated refrains, anchored comments and edits passed.');
