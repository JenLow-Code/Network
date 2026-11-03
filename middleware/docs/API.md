# API guide

Base URL: the Worker (today `https://jenlow-network-auth.jenlow-production.workers.dev`).
Full operation list: [`openapi.json`](openapi.json) (generated from the route table) or `GET /api/openapi.json`.

## Conventions
- **Auth:** `Authorization: Bearer <accessToken>` (15 min). Renew with `POST /v1/auth/refresh {"refreshToken"}`; each refresh token works once.
- **Errors (`/api/*`):** `{"error":{"code":"need_full","message":"…","requestId":"…","details":[{"field":"…","code":"…"}]}}`. `/v1/auth/*` keeps `{"error":"code"}`. Codes: 400 malformed · 401 not signed in · 403 not allowed · 404 absent **or not visible to you** · 409 conflict · 422 validation or business rule · 429 rate limit · 503 not configured.
- **Lists:** `{"items":[…],"nextCursor":"…"|null}`. Pass `?cursor=` for the next page.
- **Timestamps:** ISO 8601 UTC. Dates (`goalDate`, `entryDate`) are `YYYY-MM-DD`. Events carry an IANA `timezone`.
- **Idempotency:** send `Idempotency-Key` on transitions, offer acceptance and adaptation publishing; retries replay the first response (`Idempotent-Replay: true`).
- **Concurrency:** `PATCH /api/dreams/:id` accepts `expectedVersion`; a stale version returns 409 `version_conflict`.
- **Locale:** labels follow the member preference, then `?locale=`, then `Accept-Language`, else French.

## Feed items
Every Discovery, profile, Fire and detail item is discriminated by `type`:
```json
{
  "id": "demo-pub-dream-01-2", "type": "dream", "dreamId": "demo-dream-01-2",
  "phase": "germination", "phaseLabel": "Germination",
  "title": "Composer un premier EP acoustique", "summary": "…",
  "author": { "id": "demo-user-01", "handle": "mock01", "displayName": "Camille Morel", "avatarUrl": null, "church": null, "isDemo": true },
  "cover": { "id": "…", "url": "https://images.unsplash.com/…", "attribution": "Photo Unsplash — …" },
  "needs": [{ "id": "…", "label": "Mixage et mastering", "category": "person", "requiredLevel": 4, "requiredLevelLabel": "Avancé", "slotsTotal": 1, "slotsFilled": 0, "confirmed": false, "isRequired": true }],
  "needsProgress": { "requiredFilled": 2, "requiredTotal": 4, "slotsFilled": 2, "slotsTotal": 4 },
  "counts": { "sameDream": 0, "inspiredDreams": 0 },
  "viewer": { "isOwner": false, "actions": ["share-internal", "prayer", "offer-help", "introduce"], "fire": false, "prayer": false, "sameDream": false, "encouraged": false },
  "locked": false, "visibility": "public", "createdAt": "2026-11-01T15:00:00Z"
}
```
`counts.encouragements` appears only for accepted owners. `requiredLevel` on a need is the proficiency asked for (five dots), never Dream progress. Bible items add `reference`, `excerpt`, `caption`; music items add `playback`, `credits`, `rights`, `downloadable:false`; talent items add `level`, `levelLabel`, `seeking`, `samples`.

## A Dream from start to Floraison
```http
POST /api/dreams                         {"title":"Enregistrer ma chanson","summary":"…"}          → 201, private Semence
POST /api/media/uploads                  {"purpose":"dream_cover","mimeType":"image/jpeg","bytes":123456}
PUT  /api/media/{id}/content             (raw bytes, Content-Type + Content-Length)
POST /api/media/{id}/complete            {}
PATCH /api/dreams/{id}                   {"coverMediaId":"…"}
POST /api/dreams/{id}/transitions        {"to":"germination"}                                     → public
POST /api/dreams/{id}/needs              {"label":"Batteur","talentId":"talent-batterie","requiredLevel":3}
POST /api/needs/{needId}/offers          {"message":"Je peux aider"}            (another member)
POST /api/offers/{offerId}/accept                                                                 → slot filled, helper = collaborator
PATCH /api/dreams/{id}                   {"goalDate":"2027-03-01"}
POST /api/dreams/{id}/transitions        {"to":"croissance"}                                      → Dream conversation created once
POST /api/dreams/{id}/entries            {"type":"progress","body":"…","entryDate":"2026-11-03"}
POST /api/dreams/{id}/transitions        {"to":"floraison","testimony":"…","resultMediaIds":["…"]} → locked
POST /api/dreams/{id}/inspired-dreams    {"title":"…"}                          (another member)  → Fruit +1
```
When a transition is not ready the 422 lists what is missing, e.g. `{"code":"transition_not_ready","details":[{"code":"goal_date_required"},{"code":"need_not_confirmed","field":"<needId>"}]}`.

## Media
Uploads go through the Worker into R2 (max sizes per purpose, e.g. 8 MB images, 30 MB audio); `complete` checks size and file signature and quarantines mismatches. Read URLs are signed and expire within two hours, support `Range`, and are always served inline.

## Polling for new messages
`GET /api/updates?since=<serverTime>` returns unread totals and changed conversation ids; then `GET /api/conversations/{id}/messages?after=<serverTime>`. Send with a `clientMessageId` so retries never duplicate a message.
