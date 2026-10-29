# Biro Script reduced: local-only typography preview

JenLow Network uses Caveat as its redistributable default. The handwritten text on the Network login logo, the Discovery **S’INSPIRER** heading, and Discovery card author names now uses a shared font configuration.

The attached ingoFonts Biro Script reduced font is **not committed**: its EULA does not grant redistribution/embedding rights for a public app. This means the branch builds safely without it, and your preview can use it locally while you assess the design. Before publishing an app containing this font, obtain explicit permission or an appropriate embedding license.

## Preview on your computer

1. Unzip your original `biro_script.zip`.
2. In the `frontend` directory run:
   ```sh
   node scripts/biro-preview.mjs "/path/to/Biro_Script_reduced.ttf"
   npx expo start --clear
   ```
3. The font is loaded by Expo locally. Do not commit the edited `src/theme/handwriting.ts`, the font, or a build containing it. The reduced demo may omit numerals, accents and punctuation, so inspect French text carefully.

## Revert to the public-safe version

```sh
node scripts/biro-preview.mjs --reset
npx expo start --clear
```

The app's full typography, layout, buttons, and body text remain unchanged. If you later obtain distribution/embedding permission, the same central font configuration can be adapted for the official app build.
