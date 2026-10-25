# JenLow Agenda V1

The Agenda now shows the selected calendar date, today's saved Bible/Dream/Music prayer subjects in a list, and demonstration accepted/pending appointments. There is NO separate personal-prayer composition feature or separate prayer list screen in the intended main navigation.

Calendar integration design:
1. Once an invitation is accepted, store a concrete start/end ISO datetime and timezone on agenda_events; there must never be a fabricated time when exporting.
2. iOS/Android: use expo-calendar native permissions in an installed app to explicitly write a confirmed event; user chooses which device calendar to use (their OS may have Google/Outlook accounts enabled). An independent ICS calendar subscription URL is an optional read-only alternative for calendar clients.
3. Google/Outlook two-way synchronization requires OAuth calendar-specific scopes, refresh tokens in backend secret storage, explicit user consent, idempotent event sync, cancellation handling, and careful recurrence/timezone logic.
4. Reminder/prayer scheduler is separate from the calendar export. Daily prayer assignments should read prayer_saves.scheduled_for from D1 and never assume an undated local favorite is a real daily prayer.
5. Without completed event dates/credentials, show a transparent demo action rather than creating fake events.

Backend API / calendar endpoints are not implemented yet. The Agenda currently shows demo-only date navigation and a shareable text summary; it does not sync with any provider.
