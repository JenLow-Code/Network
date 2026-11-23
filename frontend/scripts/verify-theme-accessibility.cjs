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
  const expression = new RegExp(name + ": dark \\? '(#[0-9a-fA-F]{6})' : '(#[0-9a-fA-F]{6})'");
  const match = theme.match(expression);
  assert.ok(match, 'Theme token not found: ' + name);
  palette[name] = { dark: match[1], light: match[2] };
}
function luminance(value) {
  const components = value.slice(1).match(/../g).map(v => parseInt(v, 16) / 255)
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
assert.ok(nav.includes("left:0") && nav.includes('paddingLeft:52'),
  'Shared Back and title alignment must stay consistent');
const hero = source('src/components/dream/DreamPhaseLayout.tsx');
assert.ok(hero.includes('marginHorizontal:-heroBleed') &&
  hero.includes('left:heroBleed,right:heroBleed'),
  'Dream cover actions must align with the same canvas as the other pages');
for (const file of ['app/space.tsx','app/login.tsx','app/chat/[id].tsx','app/agenda.tsx']) {
  const contents = source(file);
  assert.ok(!/<SafeAreaView style=\{\{[^}]*backgroundColor: ['"]#fff['"]/.test(contents),
    'Fixed white page background breaks dark mode: ' + file);
}
assert.ok(!source('app/agenda.tsx').includes('DEMO_AGENDA'),
  'Demo-only appointments must not appear in the real dated Agenda');
console.log('Theme foreground, muted and accent contrast >=4.5:1 on both surfaces.');
console.log('Shared Back alignment, dream hero and key page surfaces verified.');
