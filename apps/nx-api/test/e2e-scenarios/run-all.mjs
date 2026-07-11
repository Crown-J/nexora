// apps/nx-api/test/e2e-scenarios/run-all.mjs
// 依序跑全部情境（各腳本自清、順序無相依但序跑避免搶同靶料）；任一失敗 exit 1
import { spawnSync } from 'child_process';
import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const scripts = readdirSync(dir).filter((f) => /^\d\d-.*\.mjs$/.test(f)).sort();
const results = [];
for (const f of scripts) {
  console.log(`\n===== ${f} =====`);
  const r = spawnSync(process.execPath, [path.join(dir, f)], { stdio: 'inherit' });
  results.push([f, r.status === 0]);
}
console.log('\n===== 總結 =====');
for (const [f, ok] of results) console.log(`${ok ? 'PASS' : 'FAIL'} ${f}`);
process.exit(results.every(([, ok]) => ok) ? 0 : 1);
