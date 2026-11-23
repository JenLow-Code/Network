/* Executes the real Agenda selectors without introducing a browser or React dependency. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const filename = path.join(__dirname, '..', 'src', 'domain', 'agendaOverview.ts');
const source = fs.readFileSync(filename, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: filename,
  reportDiagnostics: true,
});
assert.equal((compiled.diagnostics || []).length, 0, 'Agenda code should transpile');
const result = { exports: {} };
new Function('module', 'exports', compiled.outputText)(result, result.exports);
const { calendarDay, dreamCalendarItems, dreamItemsForDay, markedDreamDays } = result.exports;

assert.equal(calendarDay('2026-02-30'), null, 'Impossible days must be rejected');
assert.equal(calendarDay('2026-11-25'), '2026-11-25');
assert.equal(calendarDay('2026-11-25T14:30:00'), '2026-11-25');
assert.equal(calendarDay('nonsense'), null);

const dreams = [
  {
    id: 'dream-1', title: 'Atelier communautaire', phase: 'Croissance',
    goalDate: '2026-11-25',
    milestones: [{ id: 'log1', title: 'Premier essai', date: '2026-11-24' }],
    growthEvents: [{ id: 'evt1', kind: 'need_found', title: 'Salle',
      date: '2026-11-24', category: 'practical', needId: 'need1' }],
    flowerDraft: { achievedOn: '2026-11-26', reminderDate: '2026-11-27' },
    paused: true, pauseUntil: '2026-11-28',
  },
  { id: 'dream-2', title: 'Non daté', phase: 'Rêve', goalDate: '2026-02-30' },
];
const items = dreamCalendarItems(dreams);
assert.equal(items.length, 6, 'Real dates only: goal, log, resource, achievement, reminder, resume');
assert.deepEqual(items.map(item => item.date), [
  '2026-11-24','2026-11-24','2026-11-25','2026-11-26','2026-11-27','2026-11-29',
]);
assert.equal(dreamItemsForDay(items, '2026-11-24').length, 2);
assert.equal(dreamItemsForDay(items, '2026-11-23').length, 0);
assert.ok(markedDreamDays(items, 2026, 10).has('2026-11-25'));
assert.equal(markedDreamDays(items, 2026, 9).size, 0);
assert.equal(new Set(items.map(item => item.id)).size, items.length, 'Calendar entry IDs are unique');
console.log('Agenda projections validated: real dates, milestones, resources, reminders, resumption.');
