# Sharing verses from an external Bible app — V1 design

Android: register the native Android share target for text/plain and image/* intents in the compiled application. iOS: use a Share Extension configured to receive text or images; test Expo's share-intent/receiving API support carefully because native share extension setup requires a development build, not only a website.

Flow: user taps Share in YouVersion or another Bible app -> Android/iOS system share chooser -> chooses JenLow -> JenLow receives text/image and an optional source URL -> parser attempts a Scripture reference -> user confirms reference and translation -> application opens the complete book chapter with selected verses highlighted -> user chooses Fire, Dream inspiration, today's prayer or internal share.

Do not scrape YouVersion's content or imply that shared copyrighted visual templates may be republished. Prefer extracting the reference and displaying a legally reusable Bible edition in JenLow. Imported verse images may have source-specific licensing limitations. If reference parsing fails, ask the user to choose it.

The current app has a Psalm 150 demonstration; the complete Bible and native share target are NOT implemented. Track in-app share requests with database external_share_intents; API must validate source content.

## Implemented native receiver (requires a fresh native build)
The frontend now includes expo-sharing and its iOS/Android config plugin, app/+native-intent.ts and app/import-verse.tsx. It accepts external text/image payloads, tries to parse Psalm references, and navigates to the internal chapter reader only for the currently present Psalm 150 demo. This is NOT a full YouVersion integration, a live share extension test, or a complete internal Bible; unsupported Bible chapters are explicitly shown as unavailable.
