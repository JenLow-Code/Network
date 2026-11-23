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
// The personal shortcut icons once rendered as isolated symbols on the far left
// of full-width pages. Only those two rows should omit their leading icon.
const shortcuts = source('src/components/dream/DreamWorkspaceShortcuts.tsx');
assert.ok(shortcuts.includes('!hideLeadingIcon ?') &&
  /label="Notes personnelles"[\s\S]{0,100}hideLeadingIcon/.test(shortcuts) &&
  /label="Documents & Inspirations"[\s\S]{0,100}hideLeadingIcon/.test(shortcuts) &&
  shortcuts.includes("name={icon}"),
  'Notes and Documents links must stay right-aligned without leading icons');
// Across all dream phases the destructive action stays visibly black and narrower,
// while the primary action remains larger; only desktop groups move to the rail.
for (const file of ['src/components/dream/DreamExperience.tsx',
  'src/components/dream/SemenceStudio.tsx', 'app/my-dream/flower/[id].tsx']) {
  const content = source(file);
  assert.ok(content.includes("alignSelf:ws.desktop?'flex-start':'center'") &&
    content.includes("backgroundColor:'#151515'") &&
    content.includes("flex:(ws.tablet||ws.desktop)?.8:undefined") &&
    content.includes("flex:(ws.tablet||ws.desktop)?1.35:undefined"),
    'Dream action hierarchy must retain compact black Arracher on the shared desktop rail: ' + file);
}

for (const file of ['app/space.tsx','app/login.tsx','app/chat/[id].tsx','app/agenda.tsx']) {
  const contents = source(file);
  assert.ok(!/<SafeAreaView style=\{\{[^}]*backgroundColor: ['"]#fff['"]/.test(contents),
    'Fixed white page background breaks dark mode: ' + file);
}
assert.ok(!source('app/agenda.tsx').includes('DEMO_AGENDA'),
  'Demo-only appointments must not appear in the real dated Agenda');
console.log('Theme foreground, muted and accent contrast >=4.5:1 on both surfaces.');
console.log('Shared Back alignment, dream advancement/header and page surfaces verified.');
