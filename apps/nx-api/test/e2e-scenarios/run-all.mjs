// apps/nx-api/test/e2e-scenarios/run-all.mjs
// 依序跑全部情境（各腳本自清、順序無相依但序跑避免搶同靶料）；任一失敗 exit 1
import { spawnSync } from 'child_process';
import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const dir = path.dirname(fileURLToPath(import.meta.url));
// 2026-08-01：也收 .ts（shared service 層的測試用 TypeScript 寫、以 tsx 跑）
const scripts = readdirSync(dir).filter((f) => /^\d\d-.*\.(mjs|ts)$/.test(f)).sort();
const results = [];
for (const f of scripts) {
  console.log(`\n===== ${f} =====`);
  const r = f.endsWith('.ts')
    ? spawnSync('npx', ['tsx', path.join(dir, f)], { stdio: 'inherit', shell: true })
    : spawnSync(process.execPath, [path.join(dir, f)], { stdio: 'inherit' });
  results.push([f, r.status === 0]);
}
console.log('\n===== 總結 =====');
for (const [f, ok] of results) console.log(`${ok ? 'PASS' : 'FAIL'} ${f}`);
process.exit(results.every(([, ok]) => ok) ? 0 : 1);
