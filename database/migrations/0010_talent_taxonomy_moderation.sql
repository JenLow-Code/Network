-- 0010 · Talent taxonomy reference data and moderation visibility (additive).
-- Reference data only: no member records. INSERT OR IGNORE keeps it re-runnable and never
-- overwrites talents an operator may already have created with the same name.

ALTER TABLE talents ADD COLUMN slug TEXT;
ALTER TABLE talents ADD COLUMN illustration TEXT;
CREATE UNIQUE INDEX idx_talents_slug ON talents(slug) WHERE slug IS NOT NULL;

INSERT OR IGNORE INTO talents(id,name,category,slug,illustration) VALUES
 ('talent-chant','Chant','music','chant','singing'),
 ('talent-guitare-acoustique','Guitare acoustique','music','guitare-acoustique','acoustic-guitar'),
 ('talent-guitare-electrique','Guitare électrique','music','guitare-electrique','electric-guitar'),
 ('talent-basse','Basse','music','basse','bass'),
 ('talent-contrebasse','Contrebasse','music','contrebasse','double-bass'),
 ('talent-batterie','Batterie','music','batterie','drums'),
 ('talent-piano','Piano','music','piano','piano'),
 ('talent-violon','Violon','music','violon','violin'),
 ('talent-violoncelle','Violoncelle','music','violoncelle','cello'),
 ('talent-trompette','Trompette','music','trompette','trumpet'),
 ('talent-saxophone','Saxophone','music','saxophone','saxophone'),
 ('talent-ukulele','Ukulélé','music','ukulele','ukulele'),
 ('talent-composition','Composition','music','composition',NULL),
 ('talent-ecriture-chansons','Écriture de chansons','music','ecriture-chansons',NULL),
 ('talent-production-musicale','Production musicale','music','production-musicale',NULL),
 ('talent-mixage','Mixage et mastering','music','mixage',NULL),
 ('talent-direction-louange','Direction de louange','music','direction-louange','singing'),
 ('talent-sonorisation','Sonorisation','technique','sonorisation',NULL),
 ('talent-lumiere','Éclairage scénique','technique','lumiere',NULL),
 ('talent-photographie','Photographie','visual','photographie','camera'),
 ('talent-video','Vidéo','visual','video','camera'),
 ('talent-graphisme','Graphisme','visual','graphisme',NULL),
 ('talent-illustration','Illustration','visual','illustration',NULL),
 ('talent-ecriture','Écriture','word','ecriture',NULL),
 ('talent-traduction','Traduction','word','traduction',NULL),
 ('talent-enseignement','Enseignement','people','enseignement',NULL),
 ('talent-mentorat','Mentorat','people','mentorat',NULL),
 ('talent-organisation','Organisation d''événements','people','organisation',NULL),
 ('talent-accueil','Accueil et hospitalité','people','accueil',NULL),
 ('talent-developpement-web','Développement web','technique','developpement-web',NULL),
 ('talent-danse','Danse','movement','danse',NULL),
 ('talent-jardinage','Jardinage','practical','jardinage',NULL),
 ('talent-menuiserie','Menuiserie','practical','menuiserie',NULL);

-- Moderation: hiding keeps evidence for review instead of deleting member content.
ALTER TABLE publications ADD COLUMN moderation_hidden_at TEXT;
ALTER TABLE dreams ADD COLUMN moderation_hidden_at TEXT;
ALTER TABLE messages ADD COLUMN moderation_hidden_at TEXT;
ALTER TABLE talent_posts ADD COLUMN moderation_hidden_at TEXT;
