// packages/db-core/scripts/weimeng-scan-types.ts
// 偉盟原檔盤點：串流掃 2GB 原檔，統計「各類型列數」與「各類型×年份列數」，供決定續作範圍。
//   純計數、不落檔、不動 DB。引號感知 csv-parse（品名/備註含逗號）。
import { createReadStream } from 'fs';
import { parse } from 'csv-parse';

const SRC = 'C:/nexora/docs/專案/測試資料/20260707_進銷存單據.csv';
const I = { type: 3, date: 5 };
const TYPE_NAME: Record<string, string> = { '1': '進貨', '2': '進退', '3': '銷貨', '4': '銷退', '5': '重組盈虧', '6': '盤點盈虧', '7': '報廢', 'M': '多倉調撥' };

async function main() {
  const byType = new Map<string, number>();
  const byTypeYear = new Map<string, Map<string, number>>();
  let total = 0, noDate = 0;

  const parser = createReadStream(SRC).pipe(
    parse({ relax_quotes: true, relax_column_count: true, skip_empty_lines: true, bom: true }),
  );

  for await (const r of parser as AsyncIterable<string[]>) {
    total++;
    if (total % 1000000 === 0) console.log(`  掃 ${total / 1000000}M…`);
    const type = (r[I.type] || '').trim();
    byType.set(type, (byType.get(type) || 0) + 1);
    const y = (r[I.date] || '').slice(0, 4);
    if (!/^\d{4}$/.test(y)) { noDate++; continue; }
    if (!byTypeYear.has(type)) byTypeYear.set(type, new Map());
    const ym = byTypeYear.get(type)!;
    ym.set(y, (ym.get(y) || 0) + 1);
  }

  console.log(`\n總列數 ${total} / 無效日期 ${noDate}\n`);
  console.log('=== 各類型列數 ===');
  for (const [t, c] of [...byType.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  類型 ${t} ${TYPE_NAME[t] || '?'}\t${c.toLocaleString()}`);
  }
  console.log('\n=== 重點類型 × 年份（1進貨 / 3銷貨 / 4銷退）===');
  for (const t of ['1', '3', '4']) {
    const ym = byTypeYear.get(t); if (!ym) continue;
    console.log(`  類型 ${t} ${TYPE_NAME[t]}:`);
    for (const [y, c] of [...ym.entries()].sort()) console.log(`    ${y}\t${c.toLocaleString()}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
