/**
 * Enable Biro Script reduced for a LOCAL Expo preview.
 * First extract Biro_Script_reduced.ttf from your ZIP.
 * Usage: node scripts/biro-preview.mjs /path/to/Biro_Script_reduced.ttf
 * Revert: node scripts/biro-preview.mjs --reset
 * Do not publish builds that embed the demo without permission.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fontPath = resolve(root, 'assets/fonts/Biro_Script_reduced.ttf');
const configPath = resolve(root, 'src/theme/handwriting.ts');
const fallback = `import { Caveat_700Bold } from '@expo-google-fonts/caveat';

// The default build uses a redistributable font. Biro is only enabled for a local preview.
export const HANDWRITING_FAMILY = 'Caveat_700Bold';
export const handwritingFontMap = { Caveat_700Bold };
`;
const preview = `import { Caveat_700Bold } from '@expo-google-fonts/caveat';

// LOCAL PREVIEW ONLY. Run "node scripts/biro-preview.mjs --reset" before sharing a build.
export const HANDWRITING_FAMILY = 'BiroScriptPreview';
export const handwritingFontMap = {
  Caveat_700Bold,
  BiroScriptPreview: require('../../assets/fonts/Biro_Script_reduced.ttf'),
};
`;
const command = process.argv[2];
if (!command) {
  console.error('Usage: node scripts/biro-preview.mjs <extracted .ttf file> | --reset');
  process.exit(1);
}
const existing = readFileSync(configPath, 'utf8').replace(/\r\n/g, '\n');
if (existing !== fallback && existing !== preview) {
  throw new Error('Font configuration has custom changes; refusing to overwrite.');
}
if (command === '--reset') {
  writeFileSync(configPath, fallback);
  rmSync(fontPath, { force: true });
  console.log('Restored Caveat and removed the private Biro font.');
} else {
  if (!command.toLowerCase().endsWith('.ttf')) throw new Error('Extract the .ttf from your ZIP first.');
  const data = readFileSync(resolve(process.cwd(), command));
  if (data.length < 128 || data.readUInt32BE(0) !== 0x00010000) {
    throw new Error('Not a valid TrueType font.');
  }
  mkdirSync(dirname(fontPath), { recursive: true });
  writeFileSync(fontPath, data);
  writeFileSync(configPath, preview);
  console.log('Local Biro preview enabled. Run npx expo start --clear');
  console.warn('Do not commit this config or distribute a build containing the demo font.');
}
