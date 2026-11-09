import type { Router } from '../http/router';
import type { Ctx, Viewer } from '../http/context';
import { V } from '../http/validate';
import { conflict, forbidden, notFound, unprocessable } from '../http/errors';
import { enforceLimit, LIMITS } from '../http/rateLimit';
import { iso, newId } from '../lib/util';
import { auditStmt } from '../services/access';
import { loadItem } from '../services/feed';
import { requireOwnedMedia } from './media';
import { chapterContext } from './publications';
import { json } from '../http/respond';

/**
 * Scripture is one publication type among others. Only editions whose licence allows import
 * hold verses here; nothing assumes every translation is public domain. The seeded edition is
 * Louis Segond 1910; missing chapters are fetched from a fixed public-domain source on first publication.
 */
type Edition = { id: string; code: string; name: string; language_code: string; copyright_notice: string | null; source_url: string | null; redistribution_license: string | null; import_allowed: number; export_allowed: number };
type Book = { id: string; book_code: string; name: string; sort_order: number; chapter_count: number };

/** Common French/English book names and abbreviations → canonical book codes (OSIS-style). */
const BOOK_ALIASES: Record<string, string> = {
  genese: 'GEN', 'genèse': 'GEN', gen: 'GEN', genesis: 'GEN', exode: 'EXO', exodus: 'EXO', ex: 'EXO',
  psaume: 'PSA', psaumes: 'PSA', ps: 'PSA', psalm: 'PSA', psalms: 'PSA', proverbes: 'PRO', proverbs: 'PRO', prov: 'PRO', pr: 'PRO',
  esaie: 'ISA', 'ésaïe': 'ISA', esaïe: 'ISA', isaie: 'ISA', 'isaïe': 'ISA', isaiah: 'ISA', es: 'ISA', jeremie: 'JER', 'jérémie': 'JER', jeremiah: 'JER',
  matthieu: 'MAT', matthew: 'MAT', mt: 'MAT', marc: 'MRK', mark: 'MRK', mc: 'MRK', luc: 'LUK', luke: 'LUK', lc: 'LUK', jean: 'JHN', john: 'JHN', jn: 'JHN',
  actes: 'ACT', acts: 'ACT', romains: 'ROM', romans: 'ROM', rm: 'ROM', '1corinthiens': '1CO', '1corinthians': '1CO', '2corinthiens': '2CO', '2corinthians': '2CO',
  galates: 'GAL', galatians: 'GAL', ephesiens: 'EPH', 'éphésiens': 'EPH', ephesians: 'EPH', philippiens: 'PHP', philippians: 'PHP',
  colossiens: 'COL', colossians: 'COL', hebreux: 'HEB', 'hébreux': 'HEB', hebrews: 'HEB', jacques: 'JAS', james: 'JAS', apocalypse: 'REV', revelation: 'REV', ap: 'REV',
};

export type ParsedReference = { bookCode: string; chapter: number; startVerse: number; endVerse: number };

/** Finds the first reference like "Psaume 150:6", "Ps 150.1-3" or "1 Corinthiens 13:4". */
export function parseReference(text: string): ParsedReference | null {
  const m = /(\d\s*)?([A-Za-zÀ-ÿ]+)\.?\s+(\d{1,3})\s*[:.,]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?/u.exec(text);
  if (!m) return null;
  const key = ((m[1] || '').replace(/\s/g, '') + m[2]).toLowerCase();
  const bookCode = BOOK_ALIASES[key];
  if (!bookCode) return null;
  const chapter = Number(m[3]), start = Number(m[4]), end = m[5] ? Number(m[5]) : start;
  if (chapter < 1 || start < 1 || end < start) return null;
  return { bookCode, chapter, startVerse: start, endVerse: end };
}

async function edition(ctx: Ctx, code: string): Promise<Edition> {
  const e = await ctx.sql.first<Edition>('SELECT * FROM bible_editions WHERE code=?', code);
  if (!e) throw notFound('edition_not_found');
  return e;
}
async function book(ctx: Ctx, code: string): Promise<Book> {
  const b = await ctx.sql.first<Book>('SELECT * FROM bible_books WHERE book_code=?', code.toUpperCase());
  if (!b) throw notFound('book_not_found');
  return b;
}

/** Validates that every verse of the range exists in the edition. */
async function validateRange(ctx: Ctx, e: Edition, b: Book, chapter: number, start: number, end: number) {
  if (chapter < 1 || chapter > b.chapter_count) throw unprocessable('chapter_out_of_range');
  if (end < start) throw unprocessable('invalid_range');
  if (end - start > 30) throw unprocessable('range_too_long', 'Select at most 31 verses.');
  const n = await ctx.sql.first<{ n: number }>('SELECT count(*) AS n FROM bible_verses WHERE edition_id=? AND book_id=? AND chapter=? AND verse BETWEEN ? AND ?', e.id, b.id, chapter, start, end);
  if ((n?.n ?? 0) !== end - start + 1) throw unprocessable('verses_not_available', 'These verses are not available in this edition.');
}


/**
 * On first publication of an unseeded Louis Segond 1910 chapter, import its
 * public-domain text from the same fixed source already used by the reader.
 * Only the known public-domain edition is eligible; caller-supplied URLs or
 * text are never accepted as canonical Scripture.
 */
const LSG_BOOK_FILES = ["Gen","Exod","Lev","Num","Deut","Josh","Judg","Ruth","1Sam","2Sam","1Kgs","2Kgs","1Chr","2Chr","Ezra","Neh","Esth","Job","Ps","Prov","Eccl","Song","Isa","Jer","Lam","Ezek","Dan","Hos","Joel","Amos","Obad","Jonah","Mic","Nah","Hab","Zeph","Hag","Zech","Mal","Matt","Mark","Luke","John","Acts","Rom","1Cor","2Cor","Gal","Eph","Phil","Col","1Thess","2Thess","1Tim","2Tim","Titus","Phlm","Heb","Jas","1Pet","2Pet","1John","2John","3John","Jude","Rev"] as const;
type SourceChapter = {chapter:number;verses:{number:number;text:string}[]};
type SourceBook = {book:string;chapters:SourceChapter[]};
async function ensurePublicDomainChapter(
  ctx:Ctx, e:Edition, b:Book, chapter:number, start:number, end:number,
):Promise<void>{
  if(e.code!=='LSG1910'||e.import_allowed!==1||chapter<1||chapter>b.chapter_count||
     start<1||end<start||end-start>30)return;
  const existing=await ctx.sql.first<{n:number}>(
    'SELECT count(*) AS n FROM bible_verses WHERE edition_id=? AND book_id=? AND chapter=? AND verse BETWEEN ? AND ?',
    e.id,b.id,chapter,start,end,
  );
  if(existing?.n===end-start+1)return;
  const sourceCode=LSG_BOOK_FILES[b.sort_order-1];
  if(!sourceCode)return;
  let source:SourceBook;
  try{
    const response=await fetch('https://raw.githubusercontent.com/midvash/bible-data/main/versions/fr/lsg/books/'+sourceCode+'.json');
    if(!response.ok)throw new Error('Bible source unavailable');
    source=await response.json() as SourceBook;
  }catch{
    throw unprocessable('verses_not_available','Bible source unavailable for publication.');
  }
  if(source?.book!==sourceCode||!Array.isArray(source.chapters))
    throw unprocessable('verses_not_available','Bible source format invalid.');
  const found=source.chapters.find(c=>c?.chapter===chapter&&Array.isArray(c.verses));
  if(!found)throw unprocessable('verses_not_available','This chapter is not available.');
  const verses=found.verses.filter(v=>Number.isInteger(v?.number)&&
    v.number>0&&v.number<=200&&typeof v.text==='string'&&v.text.trim().length>0);
  const available=new Set(verses.map(v=>v.number));
  for(let number=start;number<=end;number++)
    if(!available.has(number))throw unprocessable('verses_not_available','The selected verse is not available.');
  if(verses.length>0)await ctx.sql.batch(verses.map(v=>ctx.sql.stmt(
    'INSERT OR IGNORE INTO bible_verses(edition_id,book_id,chapter,verse,text) VALUES(?,?,?,?,?)',
    e.id,b.id,chapter,v.number,v.text.trim(),
  )));
}

async function createBiblePost(ctx: Ctx, viewer: Viewer, input: { editionCode: string; bookCode: string; chapter: number; startVerse: number; endVerse: number; caption?: string | null; imageMediaId?: string | null; sourceUri?: string | null; importedFromApp?: string | null; visibility: string }): Promise<string> {
  const e = await edition(ctx, input.editionCode);
  const b = await book(ctx, input.bookCode);
  await ensurePublicDomainChapter(ctx, e, b, input.chapter, input.startVerse, input.endVerse);
  await validateRange(ctx, e, b, input.chapter, input.startVerse, input.endVerse);
  if (input.imageMediaId) await requireOwnedMedia(ctx.sql, input.imageMediaId, viewer.id, ['image']);
  const pubId = newId();
  const title = `${b.name} ${input.chapter}:${input.startVerse}${input.endVerse > input.startVerse ? '-' + input.endVerse : ''}`;
  await ctx.sql.batch([
    ctx.sql.stmt("INSERT INTO publications(id,type,author_id,title,cover_asset_id,visibility) VALUES(?,'bible',?,?,?,?)", pubId, viewer.id, title, input.imageMediaId ?? null, input.visibility),
    ctx.sql.stmt(
      'INSERT INTO bible_posts(publication_id,edition_id,book_id,chapter,start_verse,end_verse,imported_from_app,source_uri,custom_image_asset_id,caption) VALUES(?,?,?,?,?,?,?,?,?,?)',
      pubId, e.id, b.id, input.chapter, input.startVerse, input.endVerse, input.importedFromApp ?? null, input.sourceUri ?? null, input.imageMediaId ?? null, input.caption ?? null,
    ),
    auditStmt(ctx.sql, viewer.id, 'bible_post_created', 'publication', pubId, ctx.requestId),
  ]);
  return pubId;
}

export function registerBible(r: Router): void {
  r.add('GET', '/api/bible/editions', { tag: 'Bible', summary: 'Editions with licence and attribution', auth: 'none' }, async ctx => {
    const rows = await ctx.sql.all<Edition>('SELECT * FROM bible_editions ORDER BY language_code,name');
    return { items: rows.map(e => ({ code: e.code, name: e.name, language: e.language_code, attribution: e.copyright_notice, sourceUrl: e.source_url, license: e.redistribution_license, exportAllowed: e.export_allowed === 1 })) };
  });

  r.add('GET', '/api/bible/books', { tag: 'Bible', summary: 'Books in canonical order', auth: 'none' }, async ctx => {
    const rows = await ctx.sql.all<Book>('SELECT * FROM bible_books ORDER BY sort_order');
    return { items: rows.map(b => ({ code: b.book_code, name: b.name, order: b.sort_order, chapters: b.chapter_count })) };
  });

  r.add('GET', '/api/bible/editions/:edition/books/:book/chapters/:chapter', { tag: 'Bible', summary: 'A whole chapter (optionally ?from=&to= to mark a selection)', auth: 'none' }, async ctx => {
    const e = await edition(ctx, ctx.param('edition'));
    const b = await book(ctx, ctx.param('book'));
    const chapter = Number(ctx.param('chapter'));
    if (!Number.isInteger(chapter) || chapter < 1 || chapter > b.chapter_count) throw unprocessable('chapter_out_of_range');
    const verses = await ctx.sql.all<{ verse: number; text: string }>('SELECT verse,text FROM bible_verses WHERE edition_id=? AND book_id=? AND chapter=? ORDER BY verse', e.id, b.id, chapter);
    if (!verses.length) throw notFound('chapter_not_available');
    const from = Number(ctx.query('from') || '0'), to = Number(ctx.query('to') || ctx.query('from') || '0');
    if (from) await validateRange(ctx, e, b, chapter, from, to);
    return {
      edition: { code: e.code, name: e.name, attribution: e.copyright_notice }, book: { code: b.book_code, name: b.name }, chapter,
      verses: verses.map(v => ({ number: v.verse, text: v.text, position: !from ? null : v.verse < from ? 'before' : v.verse > to ? 'after' : 'selected' })),
    };
  });

  r.add('POST', '/api/bible/posts', { tag: 'Bible', summary: 'Share a verse or verse range from an edition', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    await enforceLimit(ctx.sql, 'write', viewer.id, LIMITS.write);
    const v = new V(await ctx.body());
    const editionCode = v.str('editionCode', { required: true, max: 20 });
    const bookCode = v.str('bookCode', { required: true, max: 10 });
    const chapter = v.int('chapter', { required: true, min: 1, max: 200 });
    const startVerse = v.int('startVerse', { required: true, min: 1, max: 200 });
    const endVerse = v.int('endVerse', { min: 1, max: 200 });
    const caption = v.str('caption', { max: 1000, nullable: true });
    const imageMediaId = v.id('imageMediaId', { nullable: true });
    const sourceUri = v.url('sourceUri', { nullable: true });
    const visibility = v.oneOf('visibility', ['public', 'members', 'private'] as const) ?? 'public';
    v.done();
    const id = await createBiblePost(ctx, viewer, { editionCode: editionCode!, bookCode: bookCode!, chapter: chapter!, startVerse: startVerse!, endVerse: endVerse ?? startVerse!, caption, imageMediaId, sourceUri, visibility });
    return json({ item: await loadItem(ctx, id, { includeDemo: true }), chapter: await chapterContext(ctx, id) }, 201, { Location: `/api/bible/posts/${id}` });
  });

  r.add('GET', '/api/bible/posts/:id', { tag: 'Bible', summary: 'Bible post with the full chapter in context', auth: 'optional' }, async ctx => {
    const item = await loadItem(ctx, ctx.param('id'), { includeDemo: true });
    if (!item || item.type !== 'bible') throw notFound();
    return { item, chapter: await chapterContext(ctx, item.id) };
  });

  r.add('GET', '/api/bible/posts/:id/export', { tag: 'Bible', summary: 'Verse-only export text with attribution (only when the edition allows export)', auth: 'optional' }, async ctx => {
    const item = await loadItem(ctx, ctx.param('id'), { includeDemo: true });
    if (!item || item.type !== 'bible') throw notFound();
    const e = await edition(ctx, item.reference.edition.code);
    if (!e.export_allowed) throw forbidden('export_not_licensed', 'This edition does not allow export.');
    return { reference: item.reference.label, text: item.excerpt, attribution: `${e.name}${e.copyright_notice ? ' — ' + e.copyright_notice : ''}` };
  });

  // ------------------------------------------------------------------ inbound shares from Bible apps
  r.add('POST', '/api/bible/share-intents', { tag: 'Bible', summary: 'Record text shared into JenLow from another app and suggest a reference', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    await enforceLimit(ctx.sql, 'write', viewer.id, LIMITS.write);
    const v = new V(await ctx.body());
    const rawText = v.str('rawText', { required: true, max: 2000 });
    const sourceApp = v.str('sourceApp', { max: 80, nullable: true });
    const sourceUri = v.url('sourceUri', { nullable: true });
    v.done();
    const id = newId();
    await ctx.sql.run(
      "INSERT INTO external_share_intents(id,user_id,content_type,source_app,source_uri,raw_text,expires_at) VALUES(?,?,'bible_verse',?,?,?,datetime('now','+7 days'))",
      id, viewer.id, sourceApp ?? null, sourceUri ?? null, rawText!,
    );
    return { intent: { id, status: 'pending', suggestion: parseReference(rawText!) } };
  });

  r.add('GET', '/api/me/share-intents', { tag: 'Bible', summary: 'My pending shared verses to confirm', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const rows = await ctx.sql.all<{ id: string; source_app: string | null; source_uri: string | null; raw_text: string | null; import_status: string; created_at: string }>(
      "SELECT id,source_app,source_uri,raw_text,import_status,created_at FROM external_share_intents WHERE user_id=? AND import_status='pending' AND (expires_at IS NULL OR datetime(expires_at)>datetime('now')) ORDER BY created_at DESC",
      viewer.id,
    );
    return { items: rows.map(x => ({ id: x.id, sourceApp: x.source_app, sourceUri: x.source_uri, rawText: x.raw_text, suggestion: parseReference(x.raw_text || ''), createdAt: iso(x.created_at) })) };
  });

  r.add('POST', '/api/share-intents/:id/resolve', { tag: 'Bible', summary: 'Confirm the reference and edition; creates the Bible post with attribution', auth: 'required', status: 201 }, async ctx => {
    const viewer = await ctx.user();
    const intent = await ctx.sql.first<{ id: string; user_id: string; import_status: string; source_app: string | null; source_uri: string | null }>('SELECT * FROM external_share_intents WHERE id=?', ctx.param('id'));
    if (!intent || intent.user_id !== viewer.id) throw notFound();
    if (intent.import_status !== 'pending') throw conflict('intent_not_pending');
    const v = new V(await ctx.body());
    const editionCode = v.str('editionCode', { required: true, max: 20 });
    const bookCode = v.str('bookCode', { required: true, max: 10 });
    const chapter = v.int('chapter', { required: true, min: 1, max: 200 });
    const startVerse = v.int('startVerse', { required: true, min: 1, max: 200 });
    const endVerse = v.int('endVerse', { min: 1, max: 200 });
    const caption = v.str('caption', { max: 1000, nullable: true });
    const visibility = v.oneOf('visibility', ['public', 'members', 'private'] as const) ?? 'public';
    v.done();
    const id = await createBiblePost(ctx, viewer, { editionCode: editionCode!, bookCode: bookCode!, chapter: chapter!, startVerse: startVerse!, endVerse: endVerse ?? startVerse!, caption, sourceUri: intent.source_uri, importedFromApp: intent.source_app, visibility });
    await ctx.sql.run("UPDATE external_share_intents SET import_status='resolved',resolved_publication_id=? WHERE id=?", id, intent.id);
    return json({ item: await loadItem(ctx, id, { includeDemo: true }) }, 201);
  });

  r.add('POST', '/api/share-intents/:id/reject', { tag: 'Bible', summary: 'Dismiss a shared verse', auth: 'required' }, async ctx => {
    const viewer = await ctx.user();
    const changed = await ctx.sql.run("UPDATE external_share_intents SET import_status='rejected' WHERE id=? AND user_id=? AND import_status='pending'", ctx.param('id'), viewer.id);
    if (!changed) throw notFound();
    return { rejected: true };
  });
}
