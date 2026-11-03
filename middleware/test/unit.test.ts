import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePhase, toApiPhase, toDbPhase, nextPhase, phaseLabel, EDITABLE_FIELDS, PHASES } from '../src/domain/phases.ts';
import { parseLevel, levelLabel, seekingFrom, asIllustration } from '../src/domain/talents.ts';
import { actionsFor, viewerActions, allows } from '../src/domain/actions.ts';
import { V, isCalendarDate, isTimeZone } from '../src/http/validate.ts';
import { decodeCursor, encodeCursor, pageLimit } from '../src/http/cursor.ts';
import { parseReference } from '../src/modules/bible.ts';
import { parseRange, sniffMatches } from '../src/modules/media.ts';
import { inQuietHours } from '../src/jobs/scheduled.ts';
import { toIcs } from '../src/modules/agenda.ts';
import { renderNotification } from '../src/services/notifications.ts';
import { ApiError } from '../src/http/errors.ts';

test('phase normalisation is total and reversible; labels are localized', () => {
  for (const p of PHASES) assert.equal(toApiPhase(toDbPhase(p)), p);
  assert.equal(toApiPhase('dream'), 'semence');
  assert.equal(toApiPhase('testimony'), 'floraison');
  assert.equal(parsePhase('growth'), 'croissance');
  assert.equal(parsePhase('Rêve'), 'semence');
  assert.equal(parsePhase('Témoignage'), 'floraison');
  assert.equal(parsePhase('fruit'), null, 'Fruit is not a phase');
  assert.equal(nextPhase('floraison'), null);
  assert.equal(phaseLabel('croissance', 'de'), 'Wachstum');
  assert.throws(() => toApiPhase('bogus'));
  assert.deepEqual(EDITABLE_FIELDS.floraison, []);
  assert.ok(!EDITABLE_FIELDS.germination.includes('summary') && EDITABLE_FIELDS.germination.includes('cover'));
});

test('five talent levels in order, frontend labels map to the same dots', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(l => levelLabel(l, 'fr')), ['Découverte', 'Débutant', 'Intermédiaire', 'Avancé', 'Professionnel']);
  assert.equal(parseLevel('Confirmée'), 4);
  assert.equal(parseLevel('Débutant'), 2);
  assert.equal(parseLevel(6), null);
  assert.equal(parseLevel('expert mondial'), null);
  assert.deepEqual(seekingFrom({ can_teach: 1, wants_to_learn: 1, wants_tandem: 0 }, 'fr'), ['Professeur', 'Élèves']);
  assert.equal(asIllustration('drums'), 'drums');
  assert.equal(asIllustration('<svg>'), null);
});

test('action policy per content type and phase mirrors the V1 rules', () => {
  assert.deepEqual(actionsFor('dream', 'croissance'), ['prayer', 'encourage']);
  assert.ok(allows('dream', 'offer-help', 'germination'));
  assert.ok(!allows('dream', 'fire', 'germination'));
  assert.ok(allows('bible', 'verse-export'));
  assert.ok(!allows('music', 'verse-export'));
  assert.deepEqual(viewerActions('dream', 'semence', { authenticated: false, isOwner: false }), []);
  assert.ok(!viewerActions('dream', 'semence', { authenticated: true, isOwner: true }).includes('same-dream'));
});

test('validator collects every error; dates must exist; instants normalise to UTC', () => {
  const v = new V({ title: '', level: 9, date: '2026-02-30', at: '2026-11-03T10:00:00+01:00', url: 'http://x.test' });
  v.str('title', { required: true });
  v.int('level', { max: 5 });
  v.date('date');
  const at = v.instant('at');
  v.url('url');
  assert.equal(at, '2026-11-03T09:00:00Z');
  try { v.done(); assert.fail('should throw'); } catch (e) {
    assert.ok(e instanceof ApiError);
    assert.deepEqual(e.details!.map(d => d.field), ['title', 'level', 'date', 'url']);
  }
  assert.ok(isCalendarDate('2028-02-29') && !isCalendarDate('2027-02-29'));
  assert.ok(isTimeZone('Europe/Paris') && !isTimeZone('Nowhere/Land'));
});

test('cursors round-trip and reject tampering', () => {
  const c = { t: '2026-11-03 10:00:00', id: 'abc-é' };
  assert.deepEqual(decodeCursor(encodeCursor(c)), c);
  assert.throws(() => decodeCursor('not-a-cursor!!'));
  assert.equal(pageLimit(null), 20);
  assert.equal(pageLimit('500'), 50);
  assert.throws(() => pageLimit('-1'));
});

test('Scripture reference parser (French and English forms)', () => {
  assert.deepEqual(parseReference('Psaume 150:6'), { bookCode: 'PSA', chapter: 150, startVerse: 6, endVerse: 6 });
  assert.deepEqual(parseReference('lu dans Jean 3.16-17 ce matin'), { bookCode: 'JHN', chapter: 3, startVerse: 16, endVerse: 17 });
  assert.deepEqual(parseReference('1 Corinthiens 13:4'), { bookCode: '1CO', chapter: 13, startVerse: 4, endVerse: 4 });
  assert.equal(parseReference('Hello world'), null);
  assert.equal(parseReference('Jean 3:17-16'), null);
});

test('byte ranges and magic bytes', () => {
  assert.deepEqual(parseRange('bytes=0-99', 1000), { start: 0, end: 99 });
  assert.deepEqual(parseRange('bytes=-100', 1000), { start: 900, end: 999 });
  assert.deepEqual(parseRange('bytes=990-', 1000), { start: 990, end: 999 });
  assert.equal(parseRange('bytes=2000-', 1000), null);
  assert.ok(sniffMatches('image/png', Uint8Array.from([0x89, 0x50, 0x4e, 0x47])));
  assert.ok(!sniffMatches('image/png', new TextEncoder().encode('<svg')));
  assert.ok(sniffMatches('application/pdf', new TextEncoder().encode('%PDF-1.7')));
});

test('quiet hours across midnight in the member timezone', () => {
  // 23:30 in Paris (UTC+1 in November) is inside 22:00–07:00.
  assert.equal(inQuietHours('22:00', '07:00', 'Europe/Paris', new Date('2026-11-03T22:30:00Z')), true);
  assert.equal(inQuietHours('22:00', '07:00', 'Europe/Paris', new Date('2026-11-03T12:00:00Z')), false);
  assert.equal(inQuietHours(null, null, 'Europe/Paris', new Date()), false);
});

test('ICS escaping and folding follow RFC 5545', () => {
  const ics = toIcs([{ id: 'e1', title: 'Répétition, salle; B ' + 'x'.repeat(120), description: 'Ligne 1\nLigne 2', creator_id: 'u', source_type: 'manual', source_id: null, dream_id: null, starts_at: '2026-11-20T18:00:00Z', ends_at: '2026-11-20T20:00:00Z', timezone: 'Europe/Paris', location_text: null, online_meeting_url: null, status: 'confirmed', visibility: 'private', created_at: '', updated_at: '', cancelled_at: null }], 'JenLow');
  assert.ok(ics.includes('SUMMARY:Répétition\\, salle\\; B'));
  assert.ok(ics.includes('DESCRIPTION:Ligne 1\\nLigne 2'));
  for (const line of ics.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, 'line too long: ' + line);
  assert.ok(ics.includes('STATUS:CONFIRMED'));
});

test('notification text is rendered from stored keys and parameters', () => {
  assert.deepEqual(renderNotification('dream.phase.changed', JSON.stringify({ dream: 'Mon rêve', phase: 'Croissance' }), 'fr'), { title: 'Le rêve avance', body: 'Mon rêve entre en Croissance.' });
  assert.equal(renderNotification('dream.phase.changed', '{}', 'de').title, 'Le rêve avance', 'falls back to French until German copy exists');
});
