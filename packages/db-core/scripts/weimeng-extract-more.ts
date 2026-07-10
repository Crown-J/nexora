// packages/db-core/scripts/weimeng-extract-more.ts
// 偉盟續作 Phase A：一次串流過 2GB 原檔，同時抽兩塊：
//   ① 早年銷貨 sales_early.tsv（type3、2001-01-01~2023-12-31；2024~6/22 已匯不重抽）
//   ② 進貨      purchases.tsv （type1、2001-01-01~2026-06-22）
//   並收集缺失分析用的不重複集合（銷貨客戶/料號/庫位、進貨供應商/料號/庫位）。
//   串流寫入 + 背壓處理，避免大檔 OOM。純讀原檔 + 寫 scratchpad，不動 DB。
import { createReadStream, createWriteStream, writeFileSync } from 'fs';
import { parse } from 'csv-parse';

const SRC = 'C:/nexora/docs/專案/測試資料/20260707_進銷存單據.csv';
const SP = 'C:/Users/User/AppData/Local/Temp/claude/C--nexora/d101259f-e37a-4362-9aaf-8ad1312ba8e6/scratchpad';
const SALES_FROM = '2001-01-01', SALES_TO = '2023-12-31';
const PUR_FROM = '2001-01-01', PUR_TO = '2026-06-22';

// 欄位 0-based（69 欄、前 52 欄對齊已驗）
const I = { doc: 0, seq: 1, type: 3, obj: 4, date: 5, part: 6, pname: 8, brand: 24, loc: 27, qty: 29, price: 30, total: 32, nett: 39, remark: 42, creator: 48, ctime: 49 };

const write = (ws: NodeJS.WritableStream, s: string) =>
  ws.write(s) ? Promise.resolve() : new Promise<void>((res) => ws.once('drain', () => res()));

async function main() {
  const wsSale = createWriteStream(`${SP}/sales_early.tsv`);
  const wsPur = createWriteStream(`${SP}/purchases.tsv`);
  const sc = new Set<string>(), sp = new Set<string>(), sl = new Set<string>(); // 銷貨 客戶/料號/庫位
  const uc = new Set<string>(), up = new Set<string>(), ul = new Set<string>(); // 進貨 供應商/料號/庫位
  let total = 0, kSale = 0, kPur = 0, bad = 0;

  const parser = createReadStream(SRC).pipe(parse({ relax_quotes: true, relax_column_count: true, skip_empty_lines: true, bom: true }));
  for await (const r of parser as AsyncIterable<string[]>) {
    total++;
    if (total % 1000000 === 0) console.log(`  掃 ${total / 1000000}M… 銷${kSale} 進${kPur}`);
    const type = (r[I.type] || '').trim();
    if (type !== '3' && type !== '1') continue;
    const d = (r[I.date] || '').slice(0, 10);
    const o = (r[I.obj] || '').trim();
    const p = (r[I.part] || '').trim();
    const l = (r[I.loc] || '').trim();
    if (!o || !p) { bad++; continue; }
    // 精簡列（tab 分隔）：單號 序 日期 對象 料號 品名 廠牌 庫位 數量 單價 總價 未稅 備註 建單人 建單時間
    const line = [
      r[I.doc], r[I.seq], d, o, p, (r[I.pname] || '').replace(/\t/g, ' '),
      (r[I.brand] || '').trim(), l, r[I.qty] || '0', r[I.price] || '0',
      r[I.total] || '0', r[I.nett] || '0', (r[I.remark] || '').replace(/\t/g, ' '),
      (r[I.creator] || '').trim(), r[I.ctime] || '',
    ].join('\t') + '\n';

    if (type === '3') {
      if (d < SALES_FROM || d > SALES_TO) continue;
      sc.add(o); sp.add(p); if (l) sl.add(l);
      await write(wsSale, line); kSale++;
    } else { // type 1
      if (d < PUR_FROM || d > PUR_TO) continue;
      uc.add(o); up.add(p); if (l) ul.add(l);
      await write(wsPur, line); kPur++;
    }
  }
  await new Promise<void>((res) => wsSale.end(res));
  await new Promise<void>((res) => wsPur.end(res));

  writeFileSync(`${SP}/sales_early_cust.txt`, [...sc].sort().join('\n'));
  writeFileSync(`${SP}/sales_early_part.txt`, [...sp].sort().join('\n'));
  writeFileSync(`${SP}/sales_early_loc.txt`, [...sl].sort().join('\n'));
  writeFileSync(`${SP}/pur_supplier.txt`, [...uc].sort().join('\n'));
  writeFileSync(`${SP}/pur_part.txt`, [...up].sort().join('\n'));
  writeFileSync(`${SP}/pur_loc.txt`, [...ul].sort().join('\n'));

  console.log(`\n完成：掃 ${total} 列 / 缺對象或料跳過 ${bad}`);
  console.log(`早年銷貨 ${kSale} 列（不重複 客戶${sc.size}/料${sp.size}/庫位${sl.size}）`);
  console.log(`進貨     ${kPur} 列（不重複 供應商${uc.size}/料${up.size}/庫位${ul.size}）`);
}
main().catch((e) => { console.error(e); process.exit(1); });
