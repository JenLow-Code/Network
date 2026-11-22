-- JenLow Music design review: harmless fictional preview data stored in D1.
-- Idempotent. Restricted to deactivated demo-user-01/02/04 seeded by demo_seed.sql.
-- Do NOT treat these as actual public calls or accepted real-world collaborations.
-- The read-only /api/demo/music endpoint exposes these test entries only.
INSERT OR IGNORE INTO media_assets(id,owner_id,external_url,media_type,mime_type,storage_status) VALUES
 ('demo-music-audio-01','demo-user-01','app-asset:pierre-01-douceur','audio','audio/wav','ready'),
 ('demo-music-audio-02','demo-user-02','app-asset:pierre-02-esperance','audio','audio/wav','ready'),
 ('demo-music-audio-03','demo-user-04','app-asset:pierre-03-lumiere','audio','audio/wav','ready');
INSERT OR IGNORE INTO music_rights(id,publisher_id,original_creator_name,rights_holder_name,license_type,attribution_text,adaptations_allowed,reviewed_status) VALUES
 ('demo-music-rights-01','demo-user-01','Camille Morel','Camille Morel','own_work','Démo de présentation JenLow — enregistrement fictif',1,'approved'),
 ('demo-music-rights-02','demo-user-02','Gabriel Costa','Gabriel Costa','own_work','Démo de présentation JenLow — enregistrement fictif',1,'approved');
INSERT OR IGNORE INTO publications(id,type,author_id,title,visibility) VALUES
 ('demo-music-publication-01','music','demo-user-01','[Démo] Échos d’été','public'),
 ('demo-music-publication-02','music','demo-user-02','[Démo] Nuits parallèles','public');
INSERT OR IGNORE INTO music_tracks(id,publication_id,publisher_id,audio_asset_id,rights_id,duration_ms) VALUES
 ('demo-music-track-01','demo-music-publication-01','demo-user-01','demo-music-audio-01','demo-music-rights-01',60000),
 ('demo-music-track-02','demo-music-publication-02','demo-user-02','demo-music-audio-02','demo-music-rights-02',60000);
INSERT OR IGNORE INTO music_contributors(track_id,credit_order,user_id,display_name,contribution) VALUES
 ('demo-music-track-01',0,'demo-user-01','Camille Morel','Auteur'),
 ('demo-music-track-02',0,'demo-user-02','Gabriel Costa','Auteur');
INSERT OR IGNORE INTO music_collab_proposals(id,original_track_id,proposed_by,audio_asset_id,description,status) VALUES
 ('demo-music-proposal-01','demo-music-track-02','demo-user-04','demo-music-audio-03','Démo UI : proposition de batterie / collaboration de Samuel Ribeiro','accepted');
INSERT OR IGNORE INTO music_proposal_credits(proposal_id,credit_order,contributor_id,display_name,contribution) VALUES
 ('demo-music-proposal-01',0,'demo-user-04','Samuel Ribeiro','Batterie');
INSERT OR IGNORE INTO demo_music_requests(publication_id,talents_json) VALUES
 ('demo-music-publication-01','["Chant","Mixage"]');
