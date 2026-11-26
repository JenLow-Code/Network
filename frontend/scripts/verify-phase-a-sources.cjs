// Phase A inventory: inspect every application source, including currently
// unreachable modules. A legacy file is not evidence of production use: report
// its consumers separately. This is a release guard, not a runtime feature.
const fs=require('node:fs'),path=require('node:path');
const ts=require('typescript');
const root=path.join(__dirname,'..');
const walk=(dir)=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
  const p=path.join(dir,e.name);return e.isDirectory()?walk(p):/\.[jt]sx?$/.test(p)?[p]:[];
});
const files=[...walk(path.join(root,'app')),...walk(path.join(root,'src'))];
const legacy=/^src\/(?:mocks\/|lib\/api\/(?:demo|musicPreview)\.ts$|domain\/(?:mockGrowthPreview|dreamPersistence)\.ts$|components\/music\/MusicProposalDemoAudio\.tsx$)/;
const prefs=new Set([
  'src/theme/AppTheme.tsx','src/lib/supabaseClient.ts','src/context/AuthProvider.tsx',
  'src/domain/musicLibraryPreferences.ts','src/i18n/locale.tsx','src/lib/api/session.ts',
  // Offline public-domain scripture is a read-only content cache, not user records.
  'src/domain/bibleLibrary.ts'
]);
const fixturePaths=[],references=[],storage=[],endpointReferences=[];
for(const file of files){
  const rel=path.relative(root,file).replaceAll(path.sep,'/');
  const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
  const historical=legacy.test(rel);
  if(historical)fixturePaths.push(rel);
  const location=node=>rel+':'+(source.getLineAndCharacterOfPosition(node.getStart(source)).line+1);
  const visit=node=>{
    if(ts.isStringLiteralLike(node)){
      const value=node.text;
      if(/(?:^|\/)mocks\/|(?:^|\/)(?:mockGrowthPreview|musicPreview|MusicProposalDemoAudio|dreamPersistence|demo)(?:\.[jt]sx?)?$/.test(value)&&!historical)
        references.push({location:location(node),reference:value});
      if(/jenlow-network-demo-api|jenlow-music-scan|EXPO_PUBLIC_MUSIC_SCAN_API_URL|\/api\/demo(?:\/|$)|\/api\/music\/scan(?:\/|$)/i.test(value)&&!historical)
        endpointReferences.push({location:location(node),reference:value});
    }
    if(ts.isIdentifier(node)&&/^(AsyncStorage|localStorage|sessionStorage|indexedDB)$/.test(node.text)&&!historical)
      storage.push({location:location(node),identifier:node.text,preferenceOrAuth:prefs.has(rel)});
    ts.forEachChild(node,visit);
  };visit(source);
}
console.log('Application source files inspected:',files.length);
console.log('Legacy source inventory:',JSON.stringify(fixturePaths));
console.log('Imports/references to retired modules:',JSON.stringify(references));
console.log('Direct demo API references:',JSON.stringify(endpointReferences));
console.log('Storage references (review all non-preference/auth uses):',JSON.stringify(storage));
if(references.length||endpointReferences.length||storage.some(entry=>!entry.preferenceOrAuth)){console.error('Production source still references retired demo or local aspiration modules.');process.exitCode=1;}

// Exercise the production compatibility predicate with isolated test data.
const assert=require('node:assert/strict');
const compiled=ts.transpileModule(fs.readFileSync(path.join(root,'src/lib/api/realRecords.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const fixtureModule={exports:{}};
new Function('exports','module',compiled)(fixtureModule.exports,fixtureModule);
const {isRetiredFixture,isRealProposal}=fixtureModule.exports;
assert.equal(isRetiredFixture({id:'demo-music-publication-02'}),true);
assert.equal(isRealProposal({id:'proposal-actual',trackPublicationId:'demo-music-publication-02'}),false);
assert.equal(isRealProposal({id:'demo-music-proposal-02',trackPublicationId:'track-actual'}),false);
assert.equal(isRealProposal({id:'real-proposal',trackPublicationId:'real-track',isDemo:true}),false);
assert.equal(isRetiredFixture({id:'actual-record',title:'Test',author:{id:'actual-user'}}),false);
assert.equal(isRealProposal({id:'real-proposal',trackPublicationId:'real-track'}),true);
assert.equal(isRealProposal({id:'real-proposal'}),false);
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
for(const rel of ['src/components/profile/ProfileMusic.tsx','app/music-hub.tsx','app/music-listen/[id].tsx'])
  assert.ok(read(rel).includes('.filter(isRealProposal)'),rel+' must reject retired proposal records');
assert.ok(read('app/space.tsx').includes("'/api/conversations'"));
assert.ok(read('src/components/ui/ContactSheet.tsx').includes("'/api/contacts'"));
assert.ok(!read('app/publish/music.tsx').includes('setDone(true)'));
const routeFiles=files.filter(f=>path.relative(root,f).startsWith('app'+path.sep));
console.log('Route modules inspected:',routeFiles.length);
console.log('Route manifest:',JSON.stringify(routeFiles.map(f=>path.relative(root,f).replaceAll(path.sep,'/')).sort()));
console.log('Retired-record and no-fabricated-activity checks passed.');

assert.ok(read('src/components/music/MusicDocumentScanner.tsx').includes('accessibilityState={{disabled:true}}'));
assert.ok(!/\bfetch\s*\(|\bonSaved\s*\(/.test(read('src/components/music/MusicDocumentScanner.tsx')));
