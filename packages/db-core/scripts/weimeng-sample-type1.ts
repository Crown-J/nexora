// packages/db-core/scripts/weimeng-sample-type1.ts
// 抽樣：印出前幾筆 type-1(進貨) 與 type-4(銷退) 原始欄位，確認欄位佈局與 type-3 一致。純讀、找到即停。
import { createReadStream } from 'fs';
import { parse } from 'csv-parse';

const SRC = 'C:/nexora/docs/專案/測試資料/20260707_進銷存單據.csv';
const LABEL: Record<number, string> = { 0: '單號', 1: '序', 3: '類型', 4: '對象', 5: '日期', 6: '料號', 8: '品名', 24: '廠牌', 27: '庫位', 29: '數量', 30: '單價', 32: '總價', 39: '未稅', 42: '備註', 48: '建單人', 49: '建單時間' };

async function main() {
  const parser = createReadStream(SRC).pipe(parse({ relax_quotes: true, relax_column_count: true, skip_empty_lines: true, bom: true }));
  let n1 = 0, n4 = 0;
  for await (const r of parser as AsyncIterable<string[]>) {
    const t = (r[3] || '').trim();
    if (t === '1' && n1 < 3) { n1++; console.log(`\n--- 進貨(1) #${n1}（共 ${r.length} 欄）---`); for (const k of Object.keys(LABEL)) console.log(`  [${k}] ${LABEL[+k]}\t= ${JSON.stringify(r[+k])}`); }
    if (t === '4' && n4 < 3) { n4++; console.log(`\n--- 銷退(4) #${n4}（共 ${r.length} 欄）---`); for (const k of Object.keys(LABEL)) console.log(`  [${k}] ${LABEL[+k]}\t= ${JSON.stringify(r[+k])}`); }
    if (n1 >= 3 && n4 >= 3) break;
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
