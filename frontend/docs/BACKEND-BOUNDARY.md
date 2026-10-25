# API-neutral frontend / future database design

Frontend modules:
- src/domain/publicationRules.ts: pure V1 permission policy to implement again on the server.
- src/domain/demoCircle.ts: demo contact / matching vocabulary.
- src/context.tsx: demo client-side state and persistence. Replace with HTTP API clients when backend is available.
- src/ActionRail.tsx + src/DreamStageAction.tsx: permission-driven actions.
- screens under app/: public gallery/detail vs personal Dream workspace.

Backend may be **Java (Spring Boot)** or Python; the frontend doesn't depend on either. We will select database schema first and define REST/JSON contracts. Critical server entities:
users; talents; relationships (My Circle + consent); dreams; dream_owners; dream_members; dream_needs; publications and linked verses; encouragements (private); shared_dreams (public aggregated count); fire_saves; prayer_saves; introductions with mutual acceptance; music_assets; music_attributions; music_proposals and contributor credits; conversations/messages; dream_inspirations.
Database and backend are **not implemented** in this frontend update.
