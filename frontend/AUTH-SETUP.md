# JenLow Network — Supabase Auth + Cloudflare D1

## What is prepared
The React Native/Web client can use **Supabase Auth** for email-password, Google OAuth and (when Apple Developer is available) Apple sign-in. Supabase supplies password verification, persistent refresh sessions and account identity. JenLow's existing D1 database and ten inactive mock accounts are untouched.

**Not live until an authenticated Supabase project is configured.** The deprecated Cloudflare password Worker cannot verify passwords on its current runtime and is not used by this frontend authentication flow.

### 1. Create/connect the provider
- Create a project at https://supabase.com/dashboard, or connect Supabase to ChatGPT to work on the project directly. Select an EU region according to your privacy requirements.
- In Supabase Authentication > Providers, enable Email. Configure confirmation emails (the default sender has limitations; do not launch publicly without a working SMTP provider).
- In the project Connect panel, copy the **Project URL** and **publishable/anon key**.
- In Expo EAS build environment or Codespaces set \`EXPO_PUBLIC_SUPABASE_URL\` and \`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY\` to these public values; never set \`service_role\` in client variables.
- Add redirect URL \`jenlownetwork://auth/callback\` under Supabase Authentication > URL Configuration.

### 2. Google
- Create/configure OAuth credentials in Google Cloud Console (Consent screen and Web OAuth client).
- In Supabase Authentication > Providers > Google enter that Client ID and Secret.
- Add the Supabase callback URI shown by the dashboard to Google's authorized redirect URIs.
- Add the Android and web app as necessary. Physical Android OAuth login is tested only after a new EAS APK build and a valid redirect configuration.

### 3. Apple
- **A paid Apple Developer membership is required for full production Sign in with Apple configuration.** A regular iCloud/Apple ID is insufficient.
- When available, set up Apple Identifiers/Services ID and signing key and enable Apple in Supabase Auth. Add required URL/entitlements and create an EAS iOS build. The Apple button is intentionally disabled while the provider is not configured or while testing on Android.
- Do not claim Apple login is operational before physical-device verification.

### 4. Compile/release
After provider setup, create a **new** Expo EAS APK: existing installed APKs cannot acquire environment settings added after they were built.
From a Codespace in \`frontend/\`:
\`\`\`sh
npm install
npx expo-doctor@latest
npx eas-cli@latest build --platform android --profile preview
\`\`\`
The build uses EAS environment variables. For web deployment, add the same public variables to the Cloudflare frontend build environment and redeploy.

### 5. D1 integration — next security step
Supabase user IDs are independent of JenLow's D1 user IDs. A Cloudflare Worker must **verify the Supabase JWT** against the project's JWKS and issuer/audience, then map the validated \`sub\` to a D1 user via \`auth_identities\`. Never trust client-supplied email/user ID as proof of identity and **never put the Supabase service-role key in the frontend**. The current authenticated client can log in through Supabase, but it does not yet create/synchronize D1 users.

### Other limitations
- Sign-up may require email confirmation depending on provider settings.
- Password reset emails depend on functioning Supabase email delivery.
- OAuth provider configuration and an Apple Developer membership remain external prerequisites.
- This is not a replacement of the existing D1 data or the JenLow front-end design.
