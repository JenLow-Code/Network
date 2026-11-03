/**
 * Aggregates the route coverage recorded by the test client into docs/ROUTE_COVERAGE.md.
 *   npm test && npm run coverage:routes
 */
import { readdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { router } from '../src/app.ts';

const dir = join(import.meta.dirname, '..', '.route-coverage');
if (!existsSync(dir)) throw new Error('No coverage recorded: run `npm test` first.');
const seen = new Map<string, { ok: number; err: number }>();
for (const f of readdirSync(dir)) {
  const data = JSON.parse(readFileSync(join(dir, f), 'utf8')) as Record<string, { ok: number; err: number }>;
  for (const [k, v] of Object.entries(data)) {
    const e = seen.get(k) ?? { ok: 0, err: 0 };
    seen.set(k, { ok: e.ok + v.ok, err: e.err + v.err });
  }
}
rmSync(dir, { recursive: true, force: true });
const rows = router.routes.map(r => {
  const key = `${r.method} ${r.path}`;
  const s = seen.get(key);
  const status = !s ? 'not exercised' : s.ok ? 'success path tested' : 'only error paths tested';
  return { tag: r.tag, key, status, s };
});
const tested = rows.filter(r => r.status === 'success path tested').length;
const lines = [
  '# Route coverage (generated)',
  '',
  'Produced by `npm test && npm run coverage:routes`. A route counts as tested when an automated',
  'test received a 2xx/3xx response from it; "only error paths" means tests exercised its guards',
  '(401/403/404/409/422) but not a success.',
  '',
  `**${tested} of ${rows.length} operations have a tested success path.**`,
  '',
  '| Area | Operation | Status | Calls (ok / error) |',
  '| --- | --- | --- | --- |',
  ...rows.map(r => `| ${r.tag} | \`${r.key}\` | ${r.status} | ${r.s ? `${r.s.ok} / ${r.s.err}` : '—'} |`),
  '',
];
writeFileSync(join(import.meta.dirname, '..', 'docs', 'ROUTE_COVERAGE.md'), lines.join('\n'));
console.log(`${tested}/${rows.length} operations with a tested success path`);
