# JenLow Network — frontend

React Native + Expo Router + TypeScript. One codebase targeting Android, iOS and browser.

## Monorepo

```text
Network/
  frontend/            # mobile and web UI (this project)
  database/            # future database schema and migrations
  middleware/          # future APIs, security and business logic
```

The last two directories will be added when their implementations are ready, at repository root.

## Run

```sh
cd frontend
npm install
npx expo install --fix
npx expo start
# or: npx expo start --web
```

The app has login, profile, My Space and chat screens with **local demo data only**. Enter any valid-looking email to open the prototype. This is not genuine authentication. Google and Apple login are not connected. Data does not persist across restarts.

## Architecture

- `app/`: routes for login, profile, My Space and chat
- `src/components.tsx`: reusable avatar, navigation and filters
- `src/context.tsx`: local state, to be replaced with secure backend integration
- `src/theme.ts`: shared colors

## Limitations

This is a scaffold, not production-ready software. It reflects the supplied Figma designs structurally, but does not contain the original high-resolution profile photographs and audio. Chat, profile changes and activities are local-only. Dream editor, Bible reader, uploads, payments, permissions, server messaging and real login are not yet implemented.

Dependencies and runtime have not been installed or tested on device in this environment. Validate Expo dependency compatibility with `npx expo install --fix` before running. Never commit secrets or live personal data to Git.

## UI prototype updates (October 2026)

- Login routes to **Discover**; bottom navigation opens Discover, My Space and Profile.
- Discover uses demo Dreams with remote Unsplash image URLs, search and category filtering. Dream details and a sample Psalm 150 chapter reader are linked. Remote images require connectivity; these are not bundled assets. Photos are illustrative placeholders for demo Dreams, not photographs of actual members.
- Profile name is fixed, while description / city / church use inline editing. Switching fields discards unsaved edits. A small grey checkmark sits within the editable underline.
- Talent and Dream cards show a compact mobile preview. Tap for detail. Arrows navigate between items.
- Three WAV clips live in `assets/audio/`. Their stacked controls expand into a waveform-styled audio player; tapping the waveform seeks within a track.
- All profile edits, favorites, Dream content and messaging are still **local demonstration data**. No real auth, database, upload or moderation backend yet.

### Verification

Source commits were written to GitHub. Actual Cloudflare production deployment, device/browser rendering, runtime playback and TypeScript build have **not** been verified during this update. Inspect Cloudflare build logs and test before using outside a prototype.

## Dreams, gallery and prayer prototype (October 25, 2026)

- Gallery has no action rail. Music cards have a top-right play/pause button playing an original 8.2-second demo snippet; Bible cards show an actual excerpt.
- Dream stages are **Rêve, Initiation, Croissance, Témoignage**, with quiet colour banners.
- The Dream detail screen has a compact action rail beside the bottom of its image, small circular talent needs and its title, phase and author above the content.
- The Bible detail retains the whole Psalm 150 in context. Music and Bible detail pages retain the bottom menu.
- Navigation includes **Mes rêves**, a four-stage index with stage-specific actions (same dream, offer help, pray, share testimony).
- **Mes prières du jour** is one simple list shared across eligible Dreams, Bible and Music publications.
- Fire, joined Dreams and prayer state persist **on the current device/browser only** under a demo email address. They are not server-synchronized.
- The seed state opens a web/native-compatible modal to select a demo Dream.

### Outstanding backend features

A genuine shared 'same dream' counter, notifying other users, accepted collaboration flows, account-secured data, daily notification scheduling, internal messaging and media uploads are **not** implemented. Do not represent local demo counts as actual community activity.

The screens and files were committed on GitHub; the Cloudflare build, browser rendering, mobile playback and navigation have not been independently verified in this turn.
