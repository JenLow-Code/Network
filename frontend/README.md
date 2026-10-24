# JenLow Network — Frontend

React Native + Expo Router + TypeScript (Android, iOS and web).

This directory is the mobile/web client of the JenLow Network monorepo.
The future `database/` and `middleware/` directories belong at the repository root, not inside `frontend/`.

The current frontend prototype is a **demo**, with local-only state. Authentication, messaging, file storage, and database persistence require a secure backend before production use.

Run from this directory once source files are present:

```sh
npm install
npx expo install --fix
npx expo start
```

Do not commit API secrets, real personal data, or unlicensed media.
