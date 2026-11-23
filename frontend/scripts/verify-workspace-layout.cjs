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
  ['app/my-space.tsx',/const phasePanelWidth=Math.max\(0,\(innerWidth-phaseGridGap\)\/2\);/,
    'Phase panels must be derived from the measured hero width'],
  ['app/my-space.tsx',/const phaseViewportWidth=Math.max\(0,phasePanelWidth-2\*panelInset-2-/,
    'Phase card area must account for inner label, borders and padding'],
  ['app/my-space.tsx',/LinearGradient id=\{'phase-wash-'\+index\}/,
    'All four phase panels must restore their tinted gradients'],
  ['app/my-space.tsx',/\{phaseSideLabel\?\(/,
    'Wide phase panels need a readable left-hand label area'],
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
// Math regression for the 2 × 2 overview: no phase, hero or carousel may
// extend beyond the measured page rail at desktop, tablet or phone widths.
for(const [canvasWidth,compact,tablet,desktop] of [
  [360,true,false,false],[430,true,false,false],[780,false,true,false],
  [1100,false,false,true],[1160,false,false,true],
]){
  const side=desktop?82:tablet?24:canvasWidth<520?16:20;
  const right=desktop?30:tablet?24:canvasWidth<520?16:20;
  const innerWidth=Math.max(0,canvasWidth-side-right);
  const gap=compact?10:tablet?14:18;
  const panelWidth=Math.max(0,(innerWidth-gap)/2);
  const sideLabel=!compact&&panelWidth>=390;
  const inset=compact?10:16;
  const labelWidth=sideLabel?110:compact?22:26;
  const labelGap=sideLabel?12:0;
  const viewportWidth=Math.max(0,panelWidth-2*inset-2-labelWidth-labelGap);
  const available=panelWidth-(sideLabel?inset:inset+labelWidth)-inset-2-
    (sideLabel?labelWidth+labelGap:0);
  if(side+innerWidth+right>canvasWidth+0.01||
    2*panelWidth+gap>innerWidth+0.01||
    viewportWidth>available+0.01||
    viewportWidth<1){
    console.error('Measured project overview overflows at '+canvasWidth+'px');
    process.exitCode=1;
  }
}

