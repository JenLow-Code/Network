/* Check the shared palette and the highest-risk navigation / theme invariants.
 * This complements, but does not replace, real screenshots on devices. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const source = name => fs.readFileSync(path.join(root, name), 'utf8');

const theme = source('src/theme/AppTheme.tsx');
const names = ['background', 'surface', 'foreground', 'muted', 'accent'];
const palette = {};
for (const name of names) {
  const expression = new RegExp(name + ": dark \\? '(#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?)' : '(#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?)'");
  const match = theme.match(expression);
  assert.ok(match, 'Theme token not found: ' + name);
  palette[name] = { dark: match[1], light: match[2] };
}
function luminance(value) {
  const hex = value.length === 4 ? value.slice(1).split('').map(ch => ch + ch).join('') : value.slice(1);
  const components = hex.match(/../g).map(v => parseInt(v, 16) / 255)
    .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return .2126 * components[0] + .7152 * components[1] + .0722 * components[2];
}
function contrast(a, b) {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (lighter + .05) / (darker + .05);
}
for (const mode of ['light', 'dark']) {
  for (const base of ['background', 'surface']) {
    for (const text of ['foreground', 'muted', 'accent']) {
      const ratio = contrast(palette[base][mode], palette[text][mode]);
      assert.ok(ratio >= 4.5, mode + ': ' + text + ' on ' + base +
        ' contrast is only ' + ratio.toFixed(2) + ':1');
    }
  }
}
const nav = source('src/components/navigation/PageHeader.tsx');
assert.ok(nav.includes('left:desktop?-DESKTOP_PAGE_CONTENT_INSET:0') &&
  nav.includes('paddingLeft:desktop?0:52'),
  'Shared Back and title alignment must stay consistent');
const hero = source('src/components/dream/DreamPhaseLayout.tsx');
assert.ok(hero.includes('<PageHeader center={phasesInTopRow?advancement:undefined} onBack={onBack}/>') &&
  hero.includes("import { PageHeader } from '@/components/navigation/PageHeader';") &&
  hero.includes('const phasesInTopRow = width >= 760;') &&
  hero.includes('{!phasesInTopRow ?') &&
  hero.includes('accessibilityRole="tablist"') &&
  hero.includes("accessibilityState={{selected,disabled:!reached||!onNavigate}}") &&
  hero.indexOf('const advancement =') < hero.indexOf('return <View style={{marginBottom:desktop?17:18}}>') &&
  hero.indexOf('{dream.title}') > hero.indexOf('style={{width:coverSize,height:coverSize') &&
  !hero.includes('<PageHeader title={dream.title}'),
  'Dream progress belongs at the top; title and description beside photo; phases remain accessible');
// Mobile tabs remain icons only so narrow headers never clip the selected label.
// Text labels and tab selection semantics stay available to assistive technology.
const musicTabs = source('src/components/music/MusicWorkspaceTabs.tsx');
assert.ok(musicTabs.includes("accessibilityRole=\"tablist\"") &&
  musicTabs.includes('accessibilityLabel={item.title}') &&
  musicTabs.includes('accessibilityState={{selected}}') &&
  musicTabs.includes('!compact?<Text') &&
  musicTabs.includes('borderBottomWidth:compact?0:selected?2:0') &&
  musicTabs.includes("color={selected?'#CB245C':theme.muted}"),
  'Phone music tabs must be equally sized, icon-only and magenta when active');
const discover = source('app/discover.tsx');
assert.ok(discover.includes("const compact=width<600;") &&
  discover.includes("const filterIcons: Record<") &&
  discover.includes('accessibilityRole="tablist"') &&
  discover.includes('accessibilityLabel={filterTitle(f)}') &&
  discover.includes('accessibilityState={{selected:filter===f}}') &&
  discover.includes("filter===f?'#CB245C':theme.muted") &&
  discover.includes('<Pill key={f}'),
  'Phone Discovery filters must show six accessible icons; desktop stays labelled');
assert.ok(hero.includes('const iconOnlyPhases = narrow;') &&
  hero.includes("tintColor={selected?activeAccent:reached?theme.muted:theme.border}") &&
  hero.includes('accessibilityLabel={\'Ouvrir \'+PHASE_LABELS[item]}') &&
  hero.includes("accessibilityState={{selected,disabled:!reached||!onNavigate}}") &&
  hero.includes('minHeight:iconOnlyPhases?48:') &&
  hero.includes('{iconOnlyPhases ?'),
  'Dream phase tabs must be icon-only on phones while preserving phase colours and locking');

// The personal shortcut icons once rendered as isolated symbols on the far left
// of full-width pages. Only those two rows should omit their leading icon.
const shortcuts = source('src/components/dream/DreamWorkspaceShortcuts.tsx');
assert.ok(shortcuts.includes('!hideLeadingIcon ?') &&
  /label="Notes personnelles"[\s\S]{0,100}hideLeadingIcon/.test(shortcuts) &&
  /label="Documents & Inspirations"[\s\S]{0,100}hideLeadingIcon/.test(shortcuts) &&
  shortcuts.includes("name={icon}"),
  'Notes and Documents links must stay right-aligned without leading icons');
// Stage advancement belongs in a dedicated in-flow destination across the
// full reading rail. The forward action is visually last on desktop, first on
// mobile. Pausing and destroying remain smaller utility actions.
const milestone = source('src/components/dream/DreamMilestoneActions.tsx');
assert.ok(milestone.includes('PROCHAINE ÉTAPE') &&
  milestone.includes("borderTopWidth:1,borderColor:theme.border") &&
  milestone.includes("width:'100%'") &&
  milestone.includes("minWidth:desktop?194:undefined") &&
  milestone.includes("backgroundColor:pressed?'#292929':'#151515'") &&
  milestone.includes('{secondary}') && milestone.includes('{destructive}') &&
  milestone.includes('{primary}') &&
  milestone.indexOf('{secondary}') < milestone.indexOf('{primary}') &&
  milestone.includes("accessibilityState={{disabled:primaryDisabled}}"),
  'Dream stage destination must keep an emphasized forward action and safer secondary controls');
for (const [file,nextStage] of [
  ['src/components/dream/SemenceStudio.tsx','Germination'],
  ['src/components/dream/DreamExperience.tsx','Croissance'],
  ['app/my-dream/flower/[id].tsx','Publication'],
]) {
  const content = source(file);
  assert.ok(content.includes('DreamMilestoneActions') &&
    content.includes('nextStage="' + nextStage + '"'),
    'Dream stage must identify the next milestone instead of a floating action row: ' + file);
}
assert.ok(source('src/components/dream/DreamExperience.tsx').includes('nextStage="Floraison"'),
  'Croissance needs the same full-width milestone footer before Floraison');

for (const file of ['app/space.tsx','app/login.tsx','app/chat/[id].tsx','app/agenda.tsx']) {
  const contents = source(file);
  assert.ok(!/<SafeAreaView style=\{\{[^}]*backgroundColor: ['"]#fff['"]/.test(contents),
    'Fixed white page background breaks dark mode: ' + file);
}
assert.ok(!source('app/agenda.tsx').includes('DEMO_AGENDA'),
  'Demo-only appointments must not appear in the real dated Agenda');
console.log('Theme foreground, muted and accent contrast >=4.5:1 on both surfaces.');
console.log('Shared Back alignment, dream advancement/header and page surfaces verified.');
