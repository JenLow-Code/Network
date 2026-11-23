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


// Gallery and music header alignment regression: keep a single shared inset
// from the page title through the hero, and the same top rhythm in Music.
const read=path=>readFileSync(join(base,path),'utf8');
const layoutRules=[
  ['app/my-space.tsx',/const galleryWidth=innerWidth;/,
    'The project hero must fit inside the page gutters on mobile and desktop'],
  ['app/music-hub.tsx',/\.\.\.workspaceCanvas\(width\),paddingTop:12/,
    'The Music landing header must use the same canvas and top offset as other pages'],
  ['app/music-workspace/[id].tsx',/paddingTop:12,paddingBottom:/,
    'Owned music workspaces must keep the common top offset'],
  ['app/music-collaboration/[id].tsx',/(?:paddingHorizontal:ws\.gutter|paddingLeft:ws\.contentGutter,paddingRight:ws\.gutter),paddingTop:12/,
    'Collaborative music workspaces must keep the common top offset'],
  ['src/components/navigation/PageHeader.tsx',/top:desktop\?2:0,zIndex:6/,
    'The shared back arrow must be vertically centered with its page title'],
];
const failedLayoutRules=layoutRules.filter(([path,pattern])=>!pattern.test(read(path)));
if(failedLayoutRules.length){
  for(const [path,,reason] of failedLayoutRules){
    console.error('Workspace alignment regression: '+path+' — '+reason);
  }
  process.exitCode=1;
}else{
  console.log('Project hero and music headers match shared page alignment rules.');
}
