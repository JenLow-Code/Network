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
