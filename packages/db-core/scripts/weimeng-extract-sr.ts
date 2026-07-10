// packages/db-core/scripts/weimeng-extract-sr.ts
// 銷退軌 Step2a：串流抽偉盟原檔「銷退(類型4) 2001-01-01~2026-06-22」→ sr.tsv + 不重複 客戶/料號/庫位。
//   欄位同銷貨（對象=客戶 col4）。串流寫入避免 OOM。純讀+寫 scratchpad、不動 DB。
import { createReadStream, createWriteStream, writeFileSync } from 'fs';
import { parse } from 'csv-parse';

const SRC = 'C:/nexora/docs/專案/測試資料/20260707_進銷存單據.csv';
const SP = 'C:/Users/User/AppData/Local/Temp/claude/C--nexora/d101259f-e37a-4362-9aaf-8ad1312ba8e6/scratchpad';
const FROM = '2001-01-01', TO = '2026-06-22';
const I = { doc: 0, seq: 1, type: 3, obj: 4, date: 5, part: 6, pname: 8, brand: 24, loc: 27, qty: 29, price: 30, total: 32, nett: 39, remark: 42, creator: 48, ctime: 49 };
const write = (ws: NodeJS.WritableStream, s: string) => ws.write(s) ? Promise.resolve() : new Promise<void>((r) => ws.once('drain', () => r()));

async function main() {
  const ws = createWriteStream(`${SP}/sr.tsv`);
  const c = new Set<string>(), p = new Set<string>(), l = new Set<string>();
  let total = 0, kept = 0, bad = 0;
  const parser = createReadStream(SRC).pipe(parse({ relax_quotes: true, relax_column_count: true, skip_empty_lines: true, bom: true }));
  for await (const r of parser as AsyncIterable<string[]>) {
    total++;
    if (total % 1000000 === 0) console.log(`  掃 ${total / 1000000}M… 留 ${kept}`);
    if ((r[I.type] || '').trim() !== '4') continue;
    const d = (r[I.date] || '').slice(0, 10); if (d < FROM || d > TO) continue;
    const o = (r[I.obj] || '').trim(), pt = (r[I.part] || '').trim(), lo = (r[I.loc] || '').trim();
    if (!o || !pt) { bad++; continue; }
    c.add(o); p.add(pt); if (lo) l.add(lo);
    await write(ws, [r[I.doc], r[I.seq], d, o, pt, (r[I.pname] || '').replace(/\t/g, ' '), (r[I.brand] || '').trim(), lo, r[I.qty] || '0', r[I.price] || '0', r[I.total] || '0', r[I.nett] || '0', (r[I.remark] || '').replace(/\t/g, ' '), (r[I.creator] || '').trim(), r[I.ctime] || ''].join('\t') + '\n');
    kept++;
  }
  await new Promise<void>((r) => ws.end(r));
  writeFileSync(`${SP}/sr_cust.txt`, [...c].sort().join('\n'));
  writeFileSync(`${SP}/sr_part.txt`, [...p].sort().join('\n'));
  writeFileSync(`${SP}/sr_loc.txt`, [...l].sort().join('\n'));
  console.log(`完成：掃 ${total} / 留銷退 ${kept} / 跳過 ${bad}；不重複 客戶${c.size}/料${p.size}/庫位${l.size}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
