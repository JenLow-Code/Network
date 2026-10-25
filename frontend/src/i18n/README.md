# JenLow Network i18n

French, English, German and Portuguese translations live as individual JSON dictionaries in this directory. The locale provider imports the dictionaries and exposes tr(key), with a separate legacy t(key) mapping for navigation/settings.

Currently wired screens: navigation, Settings, Discover search/filter/header, My Dreams header, Music header, and Agenda/prayer date view. Remaining legacy/demo UI strings (profile editing, login forms, chat samples, My Circle, publication details and Dream editor) are still partly hardcoded. **Do not describe the application as fully translated yet.** Future UI changes must add keys to all four locale files and call tr(...) rather than inline strings.

User-generated Dream titles, Bible source editions, member profiles and quoted external music attribution remain in their original language; interface translation must not rewrite them.
## October 2026 implementation update
All existing app screens now use LocalizedText and LocalizedTextInput for fixed labels. The shared translation glossary lives in src/i18n/uiCopy.ts and additional typed screen dictionaries are in fr.json, en.json, de.json and pt.json. Unknown static labels still fall back to their source language; developer/test strings and user-created content intentionally remain untranslated. Add missing terms to the glossary as they are discovered, and keep UI strings out of business data.
