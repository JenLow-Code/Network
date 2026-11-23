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
  'app/profile-talents.tsx',
  'app/profile-publications.tsx',
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
// position. The back control alone is offset to the left. The Projects hero
// and phase backgrounds intentionally bleed to both phone edges.
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
  ['app/my-space.tsx',/const side=compact\?0:ws.contentGutter;/,
    'The Projects page removes exterior gutters on phone only'],
  ['app/my-space.tsx',/const right=compact\?0:ws.gutter;/,
    'The Projects hero and phase rows must reach the phone right edge'],
  ['app/my-space.tsx',/paddingLeft:0,paddingRight:0,paddingBottom:64,paddingTop:12/,
    'The Projects ScrollView must not retain any inherited workspace side padding'],
  ['app/my-space.tsx',/paddingLeft:ws.contentGutter,paddingRight:ws.gutter/,
    'Mobile page heading and independent controls retain safe reading gutters'],
  ['app/my-space.tsx',/const innerWidth=Math.max\(0,canvasWidth-side-right\);/,
    'Projects hero must fit the actual measured canvas width'],
  ['app/my-space.tsx',/paddingLeft:side,paddingRight:right/,
    'Projects hero must not bleed left of the content rail'],
  ['app/my-space.tsx',/const galleryWidth=innerWidth;/,
    'Projects carousel must respect its inset width'],
  ['app/my-space.tsx',/onLayout=\{event=>\{/,
    'Project overview must measure its actual visible canvas'],
  ['app/my-space.tsx',/const phasePanelWidth=innerWidth;/,
    'All four phase rows must span the same useful width as the hero'],
  ['app/my-space.tsx',/flexDirection:'column',\s*gap:phaseGridGap/,
    'Phase panels must stack as four horizontal rows, not columns'],
  ['app/my-space.tsx',/minHeight:compact\?\(dreams.length>1\?158:148\):214/,
    'Mobile phase rows must stay thin enough to reveal adjacent phases'],
  ['app/my-space.tsx',/paddingTop:compact\?34:59,paddingBottom:compact\?4:16/,
    'Mobile phase rows must avoid unused vertical space below cards'],
  ['app/my-space.tsx',/const frontWidth=Math.min\(viewportWidth,cardHeight\);/,
    'Mobile aspiration cards must stay square by matching their width to card height'],
  ['app/my-space.tsx',/Math.min\(124,Math.max\(104,Math.round\(phaseViewportWidth\*\.31\)\)\)/,
    'Mobile aspiration cards must keep the slightly larger square size'],
  ['app/my-space.tsx',/position:'absolute',top:-32,left:0,zIndex:6/,
    'Mobile aspiration navigation must sit discreetly at the phase top-left'],
  ['app/my-space.tsx',/accessibilityLabel=\{'Afficher aspiration '\+\(index\+1\)\}/,
    'Mobile aspiration navigation must use tappable bullet indicators'],
  ['app/my-space.tsx',/dreams\[\(current-1\+dreams.length\)%dreams.length\]/,
    'Mobile carousel previous card must wrap from first aspiration to last'],
  ['app/my-space.tsx',/dreams\[\(current\+1\)%dreams.length\]/,
    'Mobile carousel next card must wrap from last aspiration to first'],
  ['app/my-space.tsx',/const normalized=\(next\+dreams.length\)%dreams.length;/,
    'Mobile carousel selection must normalize circular indices'],
  ['app/my-space.tsx',/\(viewportWidth-frontWidth\)\*\.30/,
    'Mobile carousel must stay left-biased away from the phase title'],
  ['app/my-space.tsx',/onPress=\{\(\)=>switchTo\(currentRef.current-1,1\)\}/,
    'Previous mobile carousel card must be tappable'],
  ['app/my-space.tsx',/onPress=\{\(\)=>switchTo\(currentRef.current\+1,-1\)\}/,
    'Next mobile carousel card must be tappable'],
  ['app/my-space.tsx',/left:Math.max\(0,activeLeft-sideWidth\+sidePeek\)/,
    'Previous mobile card must visibly peek from the left'],
  ['app/my-space.tsx',/activeLeft\+frontWidth-sidePeek/,
    'Next mobile card must visibly peek from the right'],
  ['app/my-space.tsx',/const phaseViewportWidth=Math.max\(0,/,
    'Carousel width must be derived from the available phase row width'],
  ['app/my-space.tsx',/LinearGradient id=\{'phase-wash-'\+index\}/,
    'Every phase must retain its coloured background wash'],
  ['app/my-space.tsx',/offset="0%" stopColor=\{panel.accent\}\s*stopOpacity=\{0\}/,
    'Phase colour must disappear into the page background at the left edge'],
  ['app/my-space.tsx',/offset="100%" stopColor=\{panel.accent\}\s*stopOpacity=\{theme.dark\?0.20:0.13\}/,
    'A gentle phase colour must remain at the right edge'],
  ['app/my-space.tsx',/borderRadius:0,\s*backgroundColor:theme.background/,
    'Phase section shells must be square with no visible outline'],
  ['app/my-space.tsx',/borderRadius: isBanner \? 0 : 11/,
    'Dream tiles inside every phase must retain rounded corners'],
  ['app/my-space.tsx',/top:compact\?13:16,\s*right:panelInset/,
    'Phase names must be anchored at the top-right corner'],
  ['app/my-space.tsx',/color:theme.dark\?panel.headingDark:panel.headingLight/,
    'Phase headings must use soft phase-tinted ink with dark-mode contrast'],
  ['app/my-space.tsx',/!compact\?\(/,
    'Mobile phase headings must hide aspiration counts to preserve space'],
  ['app/my-space.tsx',/borderRadius:11,overflow:'hidden'/,
    'Mobile stacked previews must retain rounded corners'],
  ['app/my-space.tsx',/stopColor=\{theme.background\} stopOpacity=\{1\}/,
    'The left hero fade must exactly match the real page background'],
  ['app/my-space.tsx',/paddingHorizontal: isBanner \? bannerInset : 13/,
    'The hero title and description must use the same content inset as the cards'],
  ['app/my-space.tsx',/const phaseLeftInset=compact\?12:0;/,
    'Desktop hero and cards must start directly on the shared page rail'],
  ['app/my-space.tsx',/bannerInset=\{phaseLeftInset\}/,
    'The banner headline must share the project card left inset'],
  ['app/my-space.tsx',/bottom:compact\?12:17,left:phaseLeftInset,right:panelInset/,
    'Hero controls must align precisely with headline and first project tile'],
  ['app/my-space.tsx',/paddingLeft:phaseLeftInset,paddingRight:panelInset/,
    'Each phase row must keep its first dream tile on the shared content rail'],
  ['app/my-space.tsx',/height:2,\s*backgroundColor:theme.background,zIndex:8/,
    'A solid two-pixel seam seal must hide the hero image edge without a bottom fade'],
  ['app/my-space.tsx',/backgroundColor: isBanner \? theme.background : theme.surface/,
    'The hero must not use a legacy white backing different from the page'],
  ['app/my-space.tsx',/headingLight:'#261C22'/,
    'Floraison titles must be near-black with a subtle magenta-brown tint'],
  ['app/my-space.tsx',/panel.title.toLocaleUpperCase\('fr-FR'\)/,
    'Phase titles must remain uppercase and horizontal'],
  ['app/my-space.tsx',/dreams.length===0\?\(/,
    'Phase watermark must render only when its section has no dream cards'],
  ['app/my-space.tsx',/DreamPhaseIcon phase=\{panel.phase\}/,
    'Empty phases must retain their faint identity illustration'],
  ['src/components/navigation/Nav.tsx',/icon: 'folder-outline' as const, title: t\('dreams'\)/,
    'Aspirations navigation must match the overview title'],
  ['src/components/navigation/Nav.tsx',/const cleanProjectsNav=path==='\/my-space';/,
    'The projects overview navigation must not inherit the legacy background'],
  ['src/components/navigation/Nav.tsx',/backgroundColor:cleanProjectsNav\?theme.background:navSurface/,
    'The projects navigation surface must match the current page colour'],
  ['src/components/navigation/Nav.tsx',/!cleanProjectsNav\?\(/,
    'The legacy glass background must be disabled only on the Projects overview'],
  ['app/music-hub.tsx',/\.\.\.workspaceCanvas\(width\),paddingTop:12/,
    'Music landing must use the shared page canvas'],
  ['app/music-hub.tsx',/ws.contentGutter - ws.gutter/,
    'Music card grid must use the actual smaller content width'],
  ['app/chat/[id].tsx',/left:workspaceLayout\(width\).gutter/,
    'Chat back controls must sit left of their padded title rail'],
  ['src/components/dream/DreamPhaseLayout.tsx',/<PageHeader center=\{advancement\} onBack=\{onBack\}\/>/,
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
// These regressions are intentional failures, not optional style changes.
const projectSource=read('app/my-space.tsx');
if(/Aspiration précédente/.test(projectSource)||
   /\{current\+1\}\/\{dreams.length\}/.test(projectSource)){
  console.error('Mobile aspiration navigation must use subtle top-left bullets, not bottom counters/arrows.');
  process.exitCode=1;
}
if(/borderRadius:0,borderWidth:1/.test(projectSource)||
   /presentation === 'phase' \? 0 : 11/.test(projectSource)||
   /fruit-banner-bottom-fade/.test(projectSource)||
   /Hide the thin lower edge of the image/.test(projectSource)||
   /width:27,height:3,\s*backgroundColor:panel.accent/.test(projectSource)){
  console.error('Project panels must stay borderless, dreams rounded, and the hero free of bottom fades or decorative rules.');
  process.exitCode=1;
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
// Responsive geometry regression: full-bleed hero and four rows on phones,
// with inner controls inset; desktop retains the shared content rail.
for(const [canvasWidth,desktop,tablet] of [
  [320,false,false],[360,false,false],[430,false,false],
  [780,false,true],[1100,true,false],[1160,true,false],
]){
  const compact=canvasWidth<600;
  const side=compact?0:desktop?82:tablet?24:canvasWidth<520?16:20;
  const right=compact?0:desktop?30:tablet?24:canvasWidth<520?16:20;
  const innerWidth=Math.max(0,canvasWidth-side-right);
  const phasePanelWidth=innerWidth;
  const panelInset=compact?12:16;
  const phaseLeftInset=compact?12:0;
  const viewportWidth=Math.max(0,phasePanelWidth-phaseLeftInset-panelInset);
  const cardWidth=compact?viewportWidth:
    Math.min(232,Math.max(150,Math.round(viewportWidth*.31)));
  if(side+phasePanelWidth+right>canvasWidth+0.01 ||
    (compact && (side!==0 || right!==0 || phasePanelWidth!==canvasWidth)) ||
    phasePanelWidth<1 || viewportWidth<1 || cardWidth>viewportWidth){
    console.error('Full-width project phase row overflows at '+canvasWidth+'px');
    process.exitCode=1;
  }
}


// Talent creation is a full editor: these fields must be visible and persisted
// before the card is created, not hidden behind a second editing step.
const talentCreation=read('app/profile-talents.tsx');
const talentCreationGuards=[
  ['levelPicker(newLevel,setNewLevel)', 'level selector in add dialog'],
  ['onChangeText={setNewDescription}', 'description input in add dialog'],
  ['description:newDescription.trim()', 'description saved with new talent'],
  ['level:newLevel', 'selected level saved with new talent'],
  ['interests:newInterests', 'selected intentions saved with new talent'],
  ['levelPicker(talents[selectedTalent].level', 'editing retains level selector'],
  ['setNewLevel(-1);setNewDescription(\'\')', 'creation draft reset'],
  ['maxHeight:\'88%\'', 'creation form remains scrollable on small screens'],
];
for(const [needle,reason] of talentCreationGuards){
  if(!talentCreation.includes(needle)){
    console.error('Talent creation regression: '+reason);
    process.exitCode=1;
  }
}

const talentLevelDots=read('src/components/talent/TalentLevelDots.tsx');
if(!talentLevelDots.includes('return 0;')){
  console.error('Talent level regression: an unset level must render zero filled dots.');
  process.exitCode=1;
}

// Branding regression: aspirations are the public-facing concept.
// Keep historical domain identifiers (dream, Rêve, API and storage keys) stable.
const aspirationBranding=[
  ['src/components/navigation/Nav.tsx', "title: t('dreams')"],
  ['app/my-space.tsx', "<PageHeader title={t('dreams')} />"],
  ['app/my-space.tsx', "label:'Toutes les aspirations'"],
  ['app/discover.tsx', "'Tout', 'Pour moi', 'Aspirations'"],
  ['app/my-dream/new.tsx', '<PageHeader title="Nouvelle aspiration" />'],
  ['app/my-dream/new.tsx', 'Nom de mon aspiration *'],
  ['src/i18n/fr.json', '"dreamsFilter": "Aspirations"'],
  ['src/i18n/en.json', '"dreamsFilter": "Aspirations"'],
  ['src/i18n/de.json', '"dreamsFilter": "Bestrebungen"'],
  ['src/i18n/pt.json', '"dreamsFilter": "Aspirações"'],
  ['src/i18n/locale.tsx', "dreams: 'Mes aspirations'"],
  ['src/i18n/uiCopy.ts', "'Créer une aspiration'"],
  ['src/components/detail/PublicationPrimaryAction.tsx','Créer une aspiration inspirée'],
  ['src/components/dream/PublicationSearchPicker.tsx', "'ASPIRATION'"],
  ['src/domain/publication.ts', "'Rêve' | 'Initiation' | 'Croissance' | 'Témoignage'"],
];
for(const [path,text] of aspirationBranding){
  if(!read(path).includes(text)){
    console.error('Aspiration branding regression: '+path+' missing '+text);
    process.exitCode=1;
  }
}
const oldBranding=/(?:Mes projets|Mes rêves|Créer un rêve|Aucun projet|Aucun rêve|Donner naissance à un rêve)/;
for(const path of ['app/my-space.tsx','app/my-dream/new.tsx',
  'app/my-dreams/[phase].tsx','src/components/navigation/Nav.tsx']){
  if(oldBranding.test(read(path))){
    console.error('Legacy user-visible project/dream wording: '+path);
    process.exitCode=1;
  }
}
if(/(?:aspirationr|congeléee|crééee|partagéess|Créer une aspiration inspiré(?!e))/.test(
  ['app/my-space.tsx','app/my-dream/new.tsx',
   'src/components/dream/DreamExperience.tsx',
   'src/components/dream/SemenceInspirations.tsx',
   'src/components/detail/PublicationPrimaryAction.tsx']
  .map(read).join('\n'))){
  console.error('Aspiration grammar regression in public UI copy.');
  process.exitCode=1;
}
const notificationCopy=readFileSync(join(base,'../middleware/src/services/notifications.ts'),'utf8');
if(!notificationCopy.includes("title: 'Invitation à rejoindre une aspiration'") ||
   !notificationCopy.includes("title: 'Aspiration invitation'")){
  console.error('Notifications still use old dream terminology.');
  process.exitCode=1;
}
