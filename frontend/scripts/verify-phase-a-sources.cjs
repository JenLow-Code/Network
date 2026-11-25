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
  'src/domain/musicLibraryPreferences.ts'
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
      if(/jenlow-network-demo-api|\/api\/demo(?:\/|$)/i.test(value)&&!historical)
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
if(references.length||endpointReferences.length){console.error('Production source still references retired demo or local aspiration modules.');process.exitCode=1;}
