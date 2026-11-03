-- 0011 · Bible reference data (no member data).
-- Louis Segond 1910 is in the public domain. Only Psalm 150 is included — the chapter the
-- current app already displays. Other editions or chapters must be imported from a source
-- whose licence permits it (bible_editions.import_allowed=1); see database/README.md.

INSERT OR IGNORE INTO bible_editions(id,code,name,language_code,copyright_notice,source_url,redistribution_license,import_allowed,export_allowed)
VALUES('edition-lsg1910','LSG1910','Louis Segond 1910','fr','Louis Segond 1910 — domaine public',NULL,'public-domain',1,1);

INSERT OR IGNORE INTO bible_books(id,book_code,name,sort_order,chapter_count) VALUES
 ('book-GEN','GEN','Genèse',1,50),('book-EXO','EXO','Exode',2,40),('book-LEV','LEV','Lévitique',3,27),('book-NUM','NUM','Nombres',4,36),
 ('book-DEU','DEU','Deutéronome',5,34),('book-JOS','JOS','Josué',6,24),('book-JDG','JDG','Juges',7,21),('book-RUT','RUT','Ruth',8,4),
 ('book-1SA','1SA','1 Samuel',9,31),('book-2SA','2SA','2 Samuel',10,24),('book-1KI','1KI','1 Rois',11,22),('book-2KI','2KI','2 Rois',12,25),
 ('book-1CH','1CH','1 Chroniques',13,29),('book-2CH','2CH','2 Chroniques',14,36),('book-EZR','EZR','Esdras',15,10),('book-NEH','NEH','Néhémie',16,13),
 ('book-EST','EST','Esther',17,10),('book-JOB','JOB','Job',18,42),('book-PSA','PSA','Psaumes',19,150),('book-PRO','PRO','Proverbes',20,31),
 ('book-ECC','ECC','Ecclésiaste',21,12),('book-SNG','SNG','Cantique des cantiques',22,8),('book-ISA','ISA','Ésaïe',23,66),('book-JER','JER','Jérémie',24,52),
 ('book-LAM','LAM','Lamentations',25,5),('book-EZK','EZK','Ézéchiel',26,48),('book-DAN','DAN','Daniel',27,12),('book-HOS','HOS','Osée',28,14),
 ('book-JOL','JOL','Joël',29,3),('book-AMO','AMO','Amos',30,9),('book-OBA','OBA','Abdias',31,1),('book-JON','JON','Jonas',32,4),
 ('book-MIC','MIC','Michée',33,7),('book-NAM','NAM','Nahum',34,3),('book-HAB','HAB','Habacuc',35,3),('book-ZEP','ZEP','Sophonie',36,3),
 ('book-HAG','HAG','Aggée',37,2),('book-ZEC','ZEC','Zacharie',38,14),('book-MAL','MAL','Malachie',39,4),
 ('book-MAT','MAT','Matthieu',40,28),('book-MRK','MRK','Marc',41,16),('book-LUK','LUK','Luc',42,24),('book-JHN','JHN','Jean',43,21),
 ('book-ACT','ACT','Actes',44,28),('book-ROM','ROM','Romains',45,16),('book-1CO','1CO','1 Corinthiens',46,16),('book-2CO','2CO','2 Corinthiens',47,13),
 ('book-GAL','GAL','Galates',48,6),('book-EPH','EPH','Éphésiens',49,6),('book-PHP','PHP','Philippiens',50,4),('book-COL','COL','Colossiens',51,4),
 ('book-1TH','1TH','1 Thessaloniciens',52,5),('book-2TH','2TH','2 Thessaloniciens',53,3),('book-1TI','1TI','1 Timothée',54,6),('book-2TI','2TI','2 Timothée',55,4),
 ('book-TIT','TIT','Tite',56,3),('book-PHM','PHM','Philémon',57,1),('book-HEB','HEB','Hébreux',58,13),('book-JAS','JAS','Jacques',59,5),
 ('book-1PE','1PE','1 Pierre',60,5),('book-2PE','2PE','2 Pierre',61,3),('book-1JN','1JN','1 Jean',62,5),('book-2JN','2JN','2 Jean',63,1),
 ('book-3JN','3JN','3 Jean',64,1),('book-JUD','JUD','Jude',65,1),('book-REV','REV','Apocalypse',66,22);

INSERT OR IGNORE INTO bible_verses(edition_id,book_id,chapter,verse,text) VALUES
 ('edition-lsg1910','book-PSA',150,1,'Louez l’Éternel ! Louez Dieu dans son sanctuaire ! Louez-le dans l’étendue, où éclate sa puissance !'),
 ('edition-lsg1910','book-PSA',150,2,'Louez-le pour ses hauts faits ! Louez-le selon l’immensité de sa grandeur !'),
 ('edition-lsg1910','book-PSA',150,3,'Louez-le au son de la trompette ! Louez-le avec le luth et la harpe !'),
 ('edition-lsg1910','book-PSA',150,4,'Louez-le avec le tambourin et avec des danses ! Louez-le avec les instruments à cordes et le chalumeau !'),
 ('edition-lsg1910','book-PSA',150,5,'Louez-le avec les cymbales sonores ! Louez-le avec les cymbales retentissantes !'),
 ('edition-lsg1910','book-PSA',150,6,'Que tout ce qui respire loue l’Éternel ! Louez l’Éternel !');
