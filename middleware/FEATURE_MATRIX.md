# Feature matrix

**Backend status** — ✅ working, verified by automated tests (all 216 operations have a tested success path, see `docs/ROUTE_COVERAGE.md`) · 🔌 needs an external provider or Cloudflare setup · ❓ product decision open (`DECISIONS.md`).
**UI** — 🟢 screen reads/writes the API · 🟡 API ready, screen still uses local demo state · ⚪ no screen.
Frontend changes were type-checked against stubs only (no npm registry here); the Expo typecheck runs in CI.

Nothing is deployed yet: these statuses describe the code in this repository, tested locally.

## Account & session
| Screen / action | Endpoint | Backend | UI |
| --- | --- | --- | --- |
| Login (email + password) | `POST /v1/auth/email/login` | ✅ | 🟡 app still signs in with Supabase (unchanged on purpose, `DECISIONS.md` §2) |
| Register (12+ chars, invite code) | `POST /v1/auth/email/register` | ✅ | 🟡 unchanged (Supabase) |
| Session restore after reload | `POST /v1/auth/refresh` → `GET /api/me` | ✅ rotation + replay rejection | 🟡 unchanged (Supabase) |
| Sign out | `POST /v1/auth/logout` | ✅ | 🟡 unchanged (Supabase) |
| Google / Apple sign-in | — | 🔌 provider + verified callback needed ❓ | unchanged |
| Password reset / email verification | — | 🔌 transactional email provider | unchanged |
| Settings: locale, timezone, appearance, privacy, notification opt-outs, quiet hours | `GET/PATCH /api/me/preferences` | ✅ | 🟡 `app/settings.tsx` |
| Data export (GDPR) | `GET /api/me/export` | ✅ | 🟡 |
| Delete account | `POST /api/me/deletion-request` | ✅ deactivate + revoke; erasure is an operator step ❓ | 🟡 |
| Consent records | `POST /api/me/consents` | ✅ | ⚪ |

## Discovery (Découvrir)
| Action | Endpoint | Backend | UI |
| --- | --- | --- | --- |
| Mixed feed (Dreams in 4 phases, Bible, Music, Talents), 4/3/2 columns | `GET /api/discovery?cursor&limit&type&phase&q` | ✅ keyset pagination, chronological | 🟢 `app/discover.tsx`, loading / retry, no mock fallback |
| Filters Tout / Rêves / Musique / Bible / Talents, search | same | ✅ | 🟢 client-side on loaded items |
| Open any card → detail | `GET /api/publications/:id` | ✅ every seeded item resolves | 🟢 Dream, Music, Talent, Bible routes |
| Demo dataset | `GET /api/demo/dreams`, `/api/demo/users[/:id]` | ✅ same contract as the deployed demo Worker | — |

## Dream detail & My Space
| Action | Endpoint | Backend | UI |
| --- | --- | --- | --- |
| Detail with phase content, needs, people, journal, permissions | `GET /api/dreams/:id` | ✅ | 🟢 `app/dream/[id].tsx` (public detail) |
| Create Dream (private Semence) | `POST /api/dreams` | ✅ | 🟡 `app/my-dream/new.tsx` |
| My Dreams incl. private drafts (lock) | `GET /api/me/dreams` | ✅ | 🟡 `app/my-space.tsx`, `app/profile.tsx` |
| Edit allowed fields; title immutable | `PATCH /api/dreams/:id` | ✅ phase rules + `expectedVersion` | 🟡 |
| "Faire germer" / Croissance / Floraison | `POST /api/dreams/:id/transitions` | ✅ guarded, atomic, idempotent | 🟡 `DreamExperience`, `SemenceStudio`, `my-dream/flower` |
| What blocks the next phase | `GET /api/dreams/:id/readiness` | ✅ | 🟡 |
| Delete Dream | `DELETE /api/dreams/:id` | ✅ soft delete everywhere | 🟡 |
| Semence gallery | `POST/DELETE /api/dreams/:id/media` | ✅ | 🟡 |
| Semence studio blocks | `GET/POST /api/dreams/:id/blocks`, `PATCH/DELETE /api/dream-blocks/:id`, `PUT …/blocks/order` | ✅ Semence-only | 🟡 |
| Needs (person / practical / financial), required level 1–5 | `GET/POST /api/dreams/:id/needs`, `PATCH/DELETE /api/needs/:id` | ✅ | 🟡 resources panel |
| Owner confirms a resource | `POST /api/needs/:id/confirm` / `unconfirm` | ✅ | 🟡 |
| Offer help ("Offrir mon aide") | `POST /api/needs/:id/offers` | ✅ | 🟡 `DreamStageAction` |
| Accept / decline / release / withdraw offers | `POST /api/offers/:id/{accept,decline,release,withdraw}` | ✅ race-safe | 🟡 |
| Offers received / mine | `GET /api/dreams/:id/offers`, `GET /api/me/offers` | ✅ | 🟡 |
| Matching members for a need | `GET /api/needs/:id/matches` | ✅ self-reported levels only | 🟡 |
| Co-owner invitations | `POST/GET /api/dreams/:id/owner-invitations`, `GET /api/me/owner-invitations`, `POST /api/owner-invitations/:id/{accept,decline,revoke}`, `DELETE /api/dreams/:id/owners/:handle` | ✅ last-owner rule | 🟡 |
| Collaborators | `POST /api/dreams/:id/collaborators`, `…/respond`, `DELETE …/collaborators/:handle` | ✅ | 🟡 |
| Participants ("Moi aussi" list, owners) | `GET /api/dreams/:id/participants`, `GET /v1/dreams/:id/participants` | ✅ | 🟡 `my-dream-participants/[id]` |
| "Moi aussi" (public count) | `POST/DELETE /api/dreams/:id/same-dream` | ✅ | 🟡 `SwipeReaction` |
| Encourage (owner-only count) | `POST/DELETE/GET /api/dreams/:id/encouragements` | ✅ | 🟡 |
| Journal: notes, additions, dated progress | `GET/POST /api/dreams/:id/entries`, `PATCH/DELETE /api/entries/:id` | ✅ | 🟡 |
| Habits / milestones | `…/habits`, `/api/habits/:id/checks`, `…/milestones`, `/api/milestones/:id` | ✅ | 🟡 |
| Dream conversation (opened at Croissance) | `GET /api/dreams/:id/conversation` | ✅ exactly one | 🟡 `chat/[id]` |
| Inspired Dream / Fruit | `POST /api/dreams/:id/inspired-dreams`, `GET …/inspirations`, `POST …/inspirations` | ✅ lineage counted | 🟡 `ActionRail` "Inspirer mon rêve" |
| Phase history | `GET /api/dreams/:id/phase-history` | ✅ | 🟡 |

## Fire, prayer, sharing
| Action | Endpoint | Backend | UI |
| --- | --- | --- | --- |
| Fire save / remove (phase policy enforced) | `POST/DELETE /api/publications/:id/fire` | ✅ | 🟡 `ActionRail` (local) |
| Firelist | `GET /api/me/fire` | ✅ | 🟡 `app/fire.tsx` |
| Fire folders | `/api/me/fire/folders…` | ✅ | 🟡 |
| Prayer (once/daily/weekly, no fake dates; any publication incl. talents) | `POST/DELETE /api/publications/:id/prayer`, `GET /api/me/prayers?date=` | ✅ | 🟡 `app/prayers.tsx`, `app/agenda.tsx` |
| Dated prayer reminder (opt-in) | `GET/POST/DELETE /api/me/prayer-reminders` + cron | ✅ in-app; push 🔌 | 🟡 |
| Share internally / externally | `POST /api/publications/:id/shares` | ✅ contacts/Circle only | 🟡 `app/share/[id].tsx` |
| Verse export | `GET /api/bible/posts/:id/export` | ✅ licence-checked | 🟡 `app/verse-export/[id].tsx` |

## Music
| Action | Endpoint | Backend | UI |
| --- | --- | --- | --- |
| Music hub / detail / cassette playback | `GET /api/music`, `GET /api/music/:id`, `GET /api/music/:id/playback` | ✅ inline streaming, no download | 🟢 detail + card playback (`audioUrl`); 🟡 `app/music-hub.tsx` |
| Publish with rights + credits | `POST /api/music` | ✅ | 🟡 `app/publish/music.tsx` |
| Edit / delete / withdraw rights | `PATCH/DELETE /api/music/:id`, `POST …/withdraw` | ✅ | 🟡 |
| Music idea → Dream | `POST /api/music/:id/inspired-dreams` | ✅ | 🟡 |
| Adaptation proposals (submit, accept, reject, withdraw, publish by original publisher with all credits) | `/api/music/:id/proposals`, `/api/music-proposals/:id/*`, `GET /api/me/music-proposals` | ✅ | 🟡 `app/music-proposal/[id].tsx` |

## Bible
| Action | Endpoint | Backend | UI |
| --- | --- | --- | --- |
| Editions, books, whole chapter with selection | `GET /api/bible/editions`, `/books`, `/editions/:e/books/:b/chapters/:c` | ✅ (LSG 1910, Psalm 150 seeded) | 🟢 reader uses API author + verses when opened from an API post |
| Share a verse / range | `POST /api/bible/posts`, `GET /api/bible/posts/:id` | ✅ | 🟡 |
| Shared in from another app | `POST /api/bible/share-intents`, `GET /api/me/share-intents`, `POST /api/share-intents/:id/{resolve,reject}` | ✅ reference parser | 🟡 `app/import-verse.tsx` |
| Full licensed editions | import script | 🔌 licensed source needed | — |

## Talents & profiles
| Action | Endpoint | Backend | UI |
| --- | --- | --- | --- |
| Taxonomy | `GET /api/talents` | ✅ 33 talents | 🟡 |
| My talents (5 levels, give/learn/tandem, availability, samples, showcase) | `/api/me/talents…` | ✅ | 🟡 `app/profile.tsx` |
| Talent showcase (publication type `talent`) detail, encourage | `GET /api/publications/:id` (alias `/api/talent-posts/:id`), `…/encouragements` | ✅ owner-only count | 🟢 `app/person/[name].tsx` |
| Talent search | `GET /api/talent-search` | ✅ transparent filters | 🟡 |
| Public profile (bio, optional church, talents, featured post, one-column feed) | `GET /api/users/:handle`, `…/publications`, `…/talents` | ✅ | 🟢 `app/member/[name].tsx` |
| Own profile incl. locked drafts; edit | `GET/PATCH /api/me`, `GET /api/me/publications` | ✅ | 🟡 `app/profile.tsx` |
| Featured post | `GET/PUT/DELETE /api/me/featured-post` | ✅ eligibility + fallback | 🟢 from the public profile |
| Member search | `GET /api/users?q=` | ✅ discoverable only | ⚪ |
| Block / unblock | `POST/DELETE /api/users/:handle/block`, `GET /api/me/blocks` | ✅ enforced in feed, profiles, chat, offers | 🟡 |

## Social & communication
| Action | Endpoint | Backend | UI |
| --- | --- | --- | --- |
| Contacts | `/api/contacts…` | ✅ | 🟡 `ContactSheet` |
| My Circle | `/api/circle…` | ✅ reciprocal | 🟡 `app/circle.tsx` |
| Trusted introduction (dual consent) | `POST /api/introductions`, `GET /api/me/introductions`, `POST /api/introductions/:id/respond` | ✅ | 🟡 `app/introduce/[id].tsx` |
| Video call (Circle only) | `/api/calls…` | ✅ session lifecycle; media 🔌 (e.g. Cloudflare Calls) | 🟡 `app/circle-call/[id].tsx` |
| Conversations, messages, reactions, read, mute, archive, leave | `/api/conversations…`, `/api/messages…` | ✅ membership + blocks | 🟡 `app/chat/[id].tsx` |
| New-message polling | `GET /api/updates` | ✅ | 🟡 |
| Notifications | `/api/notifications…` | ✅ in-app; push/email 🔌 | 🟡 `app/space.tsx` |
| Device registration | `/api/me/devices…` | ✅ hashed token; delivery 🔌 | ⚪ |

## Agenda
| Action | Endpoint | Backend | UI |
| --- | --- | --- | --- |
| My agenda / public events | `GET /api/events`, `GET /api/events/public` | ✅ | 🟡 `app/agenda.tsx` |
| Create / edit / cancel, invite, respond | `/api/events…` | ✅ UTC + IANA zone | 🟡 |
| ICS file / subscription | `GET /api/events/:id/ics`, `GET /api/me/calendar-feed` | ✅ RFC 5545 | 🟡 "Ajouter au calendrier" |
| Google / Outlook two-way sync | `GET /api/calendar-providers` | 🔌 OAuth credentials | — |

## Media & safety
| Action | Endpoint | Backend | UI |
| --- | --- | --- | --- |
| Upload (avatar, covers, gallery, results, audio, samples) | `POST /api/media/uploads` → `PUT …/content` → `POST …/complete` | ✅ with in-memory R2 in tests; 🔌 create the R2 bucket | 🟡 `pickDreamImage` still reads files locally |
| Attributed external image | `POST /api/media/external` | ✅ | — |
| Report content | `POST /api/reports` | ✅ | ⚪ |
| Moderation queue / actions | `GET /api/admin/reports`, `POST …/resolve` | ✅ moderators only | ⚪ |
| Readiness / OpenAPI | `GET /api/health/ready`, `GET /api/openapi.json` | ✅ | — |
