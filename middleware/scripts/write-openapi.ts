/** Writes docs/openapi.json from the live route table (npm run openapi). */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { router, API_VERSION } from '../src/app.ts';
import { openApi } from '../src/openapi.ts';
writeFileSync(join(import.meta.dirname, '..', 'docs', 'openapi.json'), JSON.stringify(openApi(router, API_VERSION), null, 2) + '\n');
console.log(`docs/openapi.json: ${router.routes.length} operations`);
