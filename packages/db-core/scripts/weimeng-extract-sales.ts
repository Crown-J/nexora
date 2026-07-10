// packages/db-core/scripts/weimeng-extract-sales.ts
// 偉盟進銷存匯入 Phase1：串流解析 2GB 原檔（引號感知 csv-parse）→ 篩「銷貨(類型3) + 2024-01-01~2026-06-22」
//   輸出精簡 TSV（避開逗號問題）+ 不重複的 客戶舊碼 / 料號 / 庫位（供 placeholder 分析）。
import { createReadStream, writeFileSync } from 'fs';
import { parse } from 'csv-parse';

const SRC = 'C:/nexora/docs/專案/測試資料/20260707_進銷存單據.csv';
const OUT = 'C:/Users/User/AppData/Local/Temp/claude/C--nexora/22320be9-6832-4f02-b974-108ae8c2444b/scratchpad';
const DATE_FROM = '2024-01-01';
const DATE_TO = '2026-06-22';

// 欄位 0-based index（表頭 73 欄、資料 69 欄，前 52 欄對齊已驗證）
const I = { doc: 0, seq: 1, type: 3, cust: 4, date: 5, part: 6, pname: 8, brand: 24, loc: 27, qty: 29, price: 30, total: 32, nett: 39, remark: 42, creator: 48, ctime: 49 };

async function main() {
  const out: string[] = [];
  const cust = new Set<string>();
  const part = new Set<string>();
  const loc = new Set<string>();
  let total = 0, kept = 0, bad = 0;

  const parser = createReadStream(SRC).pipe(
    parse({ relax_quotes: true, relax_column_count: true, skip_empty_lines: true, bom: true }),
  );

  for await (const r of parser as AsyncIterable<string[]>) {
    total++;
    if (total % 1000000 === 0) console.log(`  掃 ${total / 1000000}M… 留 ${kept}`);
    const type = r[I.type];
    if (type !== '3') continue;
    const d = (r[I.date] || '').slice(0, 10);
    if (d < DATE_FROM || d > DATE_TO) continue;
    const c = (r[I.cust] || '').trim();
    const p = (r[I.part] || '').trim();
    const l = (r[I.loc] || '').trim();
    if (!c || !p) { bad++; continue; }
    cust.add(c); part.add(p); if (l) loc.add(l);
    // 精簡列（tab 分隔）
    out.push([
      r[I.doc], r[I.seq], d, c, p, (r[I.pname] || '').replace(/\t/g, ' '),
      (r[I.brand] || '').trim(), l, r[I.qty] || '0', r[I.price] || '0',
      r[I.total] || '0', r[I.nett] || '0', (r[I.remark] || '').replace(/\t/g, ' '),
      (r[I.creator] || '').trim(), r[I.ctime] || '',
    ].join('\t'));
    kept++;
  }

  writeFileSync(`${OUT}/sales.tsv`, out.join('\n'));
  writeFileSync(`${OUT}/sales_cust.txt`, [...cust].sort().join('\n'));
  writeFileSync(`${OUT}/sales_part.txt`, [...part].sort().join('\n'));
  writeFileSync(`${OUT}/sales_loc.txt`, [...loc].sort().join('\n'));
  console.log(`完成：掃 ${total} 列 / 留銷貨 ${kept} / 跳過缺客料 ${bad}`);
  console.log(`不重複 客戶 ${cust.size} / 料號 ${part.size} / 庫位 ${loc.size}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
