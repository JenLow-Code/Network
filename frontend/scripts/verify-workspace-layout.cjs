/**
 * Guard against desktop navigation pages silently defining their own outer
 * width or horizontal origin. Only inner reading columns and modals may be
 * intentionally narrower. Run before the standard frontend build checks.
 */
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const base=join(__dirname,'..');
const pages=[
  'app/agenda.tsx',
  'app/discover.tsx',
  'app/music-hub.tsx',
  'app/music-workspace/[id].tsx',
  'app/my-space.tsx',
  'app/profile.tsx',
  'app/profile-preview.tsx',
  'app/prayers.tsx',
  'app/settings.tsx',
  'app/notifications.tsx',
  'app/talent-invitations.tsx',
  'app/bible-library.tsx',
  'app/fire.tsx',
  'app/space.tsx',
  'app/circle.tsx',
  'app/import-verse.tsx',
  'app/music/new.tsx',
  'app/music-collaboration/[id].tsx',
  'app/music-proposal/[id].tsx',
  'app/member/[name].tsx',
  'app/my-dream/new.tsx',
  'app/my-dreams/[phase].tsx',
  'app/my-dream-participants/[id].tsx',
  'app/my-dream/flower/[id].tsx',
  'app/my-dream/library/[id].tsx',
  'app/my-dream/notes/[id].tsx',
  'app/chat/[id].tsx',
  'app/semence-share/[id].tsx',
  'app/publish/music.tsx',
  'app/share/[id].tsx',
  'app/introduce/[id].tsx',
  'app/verse-export/[id].tsx',
  'app/circle-call/[id].tsx',
  'app/bible/[reference].tsx',
  'src/components/dream/DreamHub.tsx',
  'src/components/detail/DetailLayout.tsx',
];
const missing=pages.filter(path=>!/(workspaceCanvas|workspaceLayout)\(/.test(
  readFileSync(join(base,path),'utf8'),
));
if(missing.length){
  console.error('Pages missing the shared JenLow workspace canvas:\n' +
    missing.map(path=>'  - '+path).join('\n'));
  process.exitCode=1;
}else{
  console.log('Shared canvas present on '+pages.length+' desktop page shells.');
}

// Regression guard: Semence is a single inspirations stage, without the
// 'Documents & Inspirations' or 'Notes personnelles' sidebar children.
// A private notebook shortcut remains in Semence's own content.
const dreamNav=readFileSync(join(base,'src/components/navigation/Nav.tsx'),'utf8');
const semence=readFileSync(join(base,'src/components/dream/SemenceStudio.tsx'),'utf8');
if(!dreamNav.includes("||phase==='Rêve')return phaseNav;")||
  dreamNav.includes("(phase==='Rêve'?[")||
  !semence.includes('<DreamWorkspaceShortcuts dream={dream}/>')||
  semence.includes('<DreamWorkspaceShortcuts dream={dream} showLibrary/>')){
  console.error('Semence navigation regression: remove its sidebar children and library shortcut.');
  process.exitCode=1;
}else{
  console.log('Semence: no sidebar child entries or redundant library shortcut.');
}


// Germination must expose its existing shared Documents & Inspirations
// workspace in the same sidebar as personal notes (Semence stays unchanged).
const germinationNav=dreamNav.split("(phase==='Initiation'?[")[1]?.split(']:[')[0]||'';
if(!germinationNav.includes("{kind:'library' as const,title:'Documents & Inspirations'}")||
   !germinationNav.includes("{kind:'notes' as const,title:'Notes personnelles'}")||
   !dreamNav.includes("'/my-dream/library/[id]'")||
   !dreamNav.includes("section:kind==='library'?'all':'notes'")){
  console.error('Germination navigation must open Documents & Inspirations and Notes personnelles.');
  process.exitCode=1;
}else{
  console.log('Germination library is visible and routes to the existing documents workspace.');
}


// Desktop content rail: titles, headers, hero and notebook body share one x
// position. The back control alone is offset to the left. On touch/mobile,
// retain the established narrower grid so cards never lose a column.
const read=path=>readFileSync(join(base,path),'utf8');
const layoutRules=[
  ['src/theme/workspaceLayout.ts',/DESKTOP_PAGE_CONTENT_INSET=52;/,
    'Desktop back offset constant must remain defined'],
  ['src/theme/workspaceLayout.ts',/const contentGutter=gutter\+\(desktop\?DESKTOP_PAGE_CONTENT_INSET:0\);/,
    'Main page content must use the one canonical desktop rail'],
  ['src/theme/workspaceLayout.ts',/paddingLeft:contentGutter,[\s\S]*?paddingRight:gutter,/,
    'Desktop canvas must add space on the left without bleeding into the right edge'],
  ['src/components/navigation/PageHeader.tsx',/left:desktop\?-DESKTOP_PAGE_CONTENT_INSET:0/,
    'Only the desktop back arrow is outside the common content rail'],
  ['src/components/navigation/PageHeader.tsx',/paddingLeft:desktop\?0:52/,
    'Desktop titles must start on the content rail; mobile retains its established spacing'],
  ['app/my-space.tsx',/const side=ws.contentGutter;/,
    'The projects header and panels must start on the common rail'],
  ['app/my-space.tsx',/const innerWidth=Math.max\(0,canvasWidth-side-right\);/,
    'Projects hero must fit the actual measured canvas width'],
  ['app/my-space.tsx',/paddingLeft:side,paddingRight:right/,
    'Projects hero must not bleed left of the content rail'],
  ['app/my-space.tsx',/const galleryWidth=innerWidth;/,
    'Projects carousel must respect its inset width'],
  ['app/my-space.tsx',/onLayout=\{event=>\{/,
    'Project overview must measure its actual visible canvas'],
  ['app/my-space.tsx',/const phaseColumns=ws.desktop\?4:2;/,
    'Desktop must show four phase columns (responsive two-column fallback)'],
  ['app/my-space.tsx',/\(innerWidth-\(phaseColumns-1\)\*phaseGridGap\)\/phaseColumns/,
    'Phase columns must share the exact measured hero rail'],
  ['app/my-space.tsx',/const phaseViewportWidth=Math.max\(0,phasePanelWidth-2\*panelInset-2\);/,
    'Every project carousel must fit within its own narrow phase panel'],
  ['app/my-space.tsx',/LinearGradient id=\{'phase-wash-'\+index\}/,
    'Every phase must retain a background colour wash'],
  ['app/my-space.tsx',/stopOpacity=\{theme.dark\?0.34:0.29\}/,
    'Phase colour must be strongest at the left edge'],
  ['app/my-space.tsx',/offset="100%" stopColor=\{panel.accent\}/,
    'Phase colour must fade into the page background on the right'],
  ['app/my-space.tsx',/borderRadius:0,borderWidth:1/,
    'Phase panels must have square, non-rounded edges'],
  ['app/my-space.tsx',/panel.title.toLocaleUpperCase\('fr-FR'\)/,
    'Phase titles must be uppercase and horizontal'],
  ['app/my-space.tsx',/DreamPhaseIcon phase=\{panel.phase\}/,
    'Soft phase illustrations must stay in the background'],
  ['app/music-hub.tsx',/\.\.\.workspaceCanvas\(width\),paddingTop:12/,
    'Music landing must use the shared page canvas'],
  ['app/music-hub.tsx',/ws.contentGutter - ws.gutter/,
    'Music card grid must use the actual smaller content width'],
  ['app/chat/[id].tsx',/left:workspaceLayout\(width\).gutter/,
    'Chat back controls must sit left of their padded title rail'],
  ['src/components/dream/DreamPhaseLayout.tsx',/<PageHeader title=\{dream\.title\} onBack=\{onBack\}\/>/,
    'All dream phases must use the canonical page header and Back alignment'],
];
const directWorkspacePages=[
  'app/music-workspace/[id].tsx',
  'app/music-collaboration/[id].tsx',
  'app/my-dream/notes/[id].tsx',
  'app/my-dream/library/[id].tsx',
  'app/my-dream/flower/[id].tsx',
  'src/components/dream/SemenceStudio.tsx',
  'src/components/dream/DreamExperience.tsx',
  'app/discover.tsx',
];
for(const path of directWorkspacePages){
  layoutRules.push([path,/paddingLeft:\s*ws.contentGutter,\s*paddingRight:\s*ws.gutter/,
    'Directly padded page must use the shared rail']);
}
const failures=layoutRules.filter(([path,pattern])=>!pattern.test(read(path)));
if(failures.length){
  for(const [path,,reason] of failures){
    console.error('Workspace rail regression: '+path+' — '+reason);
  }
  process.exitCode=1;
}else{
  console.log('Desktop content rails and notebook/music/chat/project headers verified ('+
    layoutRules.length+' assertions).');
}
// Responsive geometry regression: four columns on desktop, two on narrow
// screens; all phase blocks stay within the exact same bounds as the hero.
for(const [canvasWidth,desktop,tablet] of [
  [320,false,false],[360,false,false],[430,false,false],
  [780,false,true],[1100,true,false],[1160,true,false],
]){
  const compact=canvasWidth<600;
  const side=desktop?82:tablet?24:canvasWidth<520?16:20;
  const right=desktop?30:tablet?24:canvasWidth<520?16:20;
  const innerWidth=Math.max(0,canvasWidth-side-right);
  const columns=desktop?4:2;
  const gap=compact?10:tablet?14:12;
  const panelWidth=Math.max(0,(innerWidth-(columns-1)*gap)/columns);
  const inset=compact?9:12;
  const viewportWidth=Math.max(0,panelWidth-2*inset-2);
  const tileWidth=compact?viewportWidth:Math.max(1,Math.floor(viewportWidth*.84));
  if(side+innerWidth+right>canvasWidth+0.01||
    columns*panelWidth+(columns-1)*gap>innerWidth+0.01||
    viewportWidth>panelWidth-2*inset-2+0.01||
    viewportWidth<1||tileWidth>viewportWidth){
    console.error('Projects phase columns overflow at '+canvasWidth+'px');
    process.exitCode=1;
  }
}
