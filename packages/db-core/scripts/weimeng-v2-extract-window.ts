// packages/db-core/scripts/weimeng-v2-extract-window.ts
// 偉盟窗口重灌 v2 Step1：從 2.2GB RSIO dump 抽 2025/06–2026/06（單號前6碼篩）×六單型 → 各型 TSV。
//   對照文件：C:\wellan\文件\偉盟單據匯入NEXORA_欄位對照.md
//   欄位一律取「前 52 欄對齊已驗證」區內（0-based）：⚠ 日期取 49 RODAT（勿用 5 ROEDT 月鍵）、
//   成本取 39 ROCOT（勿誤當未稅額）——此二者即舊壓測灌入的出錯點。
import { createReadStream, createWriteStream, mkdirSync } from 'fs';
import { parse } from 'csv-parse';

const SRC = 'C:/nexora/docs/專案/測試資料/20260707_進銷存單據.csv';
const OUT = 'C:/nexora/docs/專案/測試資料/偉盟匯入產出/v2窗口';
const FROM = '202506', TO = '202607'; // 單號前綴 [FROM, TO)

// 0-based 欄位（RSIO 1-based − 1）
const I = {
  doc: 0,   // ROREN 單號
  iem: 1,   // ROIEM 項次
  cls: 3,   // ROCLS 類型
  num: 4,   // RONUM 對象
  ptn: 6,   // ROPTN 基準料號
  pno: 7,   // ROPNO 使用料號
  nam: 8,   // RONAM 品名
  rer: 10,  // RORER 關聯單號
  rim: 11,  // RORIM 對方項次(調撥)
  cos: 21,  // ROCOS 進出方向碼
  lab: 24,  // ROLAB 廠牌
  pos: 27,  // ROPOS 庫位
  qty: 29,  // ROQTY 數量
  upc: 30,  // ROUPC 單價
  amt: 32,  // ROAMT 金額
  dcx: 34,  // RODCX 折數
  cot: 39,  // ROCOT 成本（銷貨=BSAVG/進貨=實付）
  rmk: 42,  // RORMK 備註
  men: 48,  // ROMEN 經辦
  dat: 49,  // RODAT ⭐實際業務日
};
const TYPES = ['1', '2', '3', '4', '6', 'M'];

async function main() {
  mkdirSync(OUT, { recursive: true });
  const ws = new Map(TYPES.map((t) => [t, createWriteStream(`${OUT}/t${t}.tsv`)]));
  const kept = new Map(TYPES.map((t) => [t, 0]));
  let total = 0;
  const clean = (s: string | undefined) => (s || '').replace(/[\t\r\n]/g, ' ').trim();

  const parser = createReadStream(SRC).pipe(
    parse({ relax_quotes: true, relax_column_count: true, skip_empty_lines: true, bom: true }),
  );
  for await (const r of parser as AsyncIterable<string[]>) {
    total++;
    if (total % 1000000 === 0) console.log(`  掃 ${total / 1000000}M…`);
    const doc = r[I.doc] || '';
    if (doc < FROM || doc >= TO) continue;
    const cls = (r[I.cls] || '').trim();
    const w = ws.get(cls);
    if (!w) continue;
    w.write(
      [
        doc, r[I.iem], clean(r[I.num]), (r[I.dat] || '').slice(0, 10),
        clean(r[I.ptn]), clean(r[I.pno]), clean(r[I.nam]), clean(r[I.lab]), clean(r[I.pos]),
        r[I.qty] || '0', r[I.upc] || '0', r[I.amt] || '0', r[I.cot] || '0', r[I.dcx] || '1',
        clean(r[I.cos]), clean(r[I.rer]), clean(r[I.rim]), clean(r[I.rmk]), clean(r[I.men]),
      ].join('\t') + '\n',
    );
    kept.set(cls, kept.get(cls)! + 1);
  }
  await Promise.all([...ws.values()].map((w) => new Promise((res) => w.end(res))));
  console.log(`完成：掃 ${total} 列`);
  for (const t of TYPES) console.log(`  型${t}: ${kept.get(t)} 列`);
}
main().catch((e) => { console.error(e); process.exit(1); });
