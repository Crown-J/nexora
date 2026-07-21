// packages/db-core/scripts/weimeng-v2-rsim.ts
// 偉盟窗口重灌 v2 共用件：RSIM 表頭 CSV 解析（Crown 從 SSMS 匯出、逗號分隔）。
//   已知問題：ROPPA(指送地址)/RORMA(備註) 可能含逗號 → 欄位位移（~2.9k 列）。
//   修復法（確定性）：ROYMM/ROEDT(日期)+RODAY(日期時間) 三連欄當右錨 → 其左多出的併回 ROPPA；
//   RORMA 則以「尾端固定 15 欄」反推邊界。'NULL' 字串一律轉空。
import { readFileSync } from 'fs';

export type RsimRow = {
  doc: string; cls: string; num: string; rcn: string; dly: string; ppa: string;
  ymm: string; edt: string; day: string; inv: string; dav: string;
  txp: string; txr: number; atn: number; tax: number; att: number; amt: number;
  rma: string; mny: string; rat: number; men: string; sal: string; csr: string;
  rev: string; rer: string; mno: string; shp: string; cos: string; sno: string; qtp: number;
};

const CSV = 'C:/nexora/docs/專案/測試資料/20260720_RSIM表頭_202506-202606.csv';
const NCOL = 33;
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const isDT = (s: string) => /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s);
const nz = (s: string | undefined) => { const v = (s || '').trim(); return v === 'NULL' ? '' : v; };
const num = (s: string | undefined) => { const n = +nz(s); return Number.isFinite(n) ? n : 0; };

export function loadRsim(path = CSV): { map: Map<string, RsimRow>; repaired: number; failed: string[] } {
  const raw = readFileSync(path, 'utf8').replace(/^﻿/, '');
  const lines = raw.split(/\r?\n/);
  const map = new Map<string, RsimRow>();
  let repaired = 0;
  const failed: string[] = [];

  for (let li = 1; li < lines.length; li++) {
    const line = lines[li];
    if (!line) continue;
    let f = line.split(',');
    if (f.length !== NCOL) {
      // 右錨定位 ROYMM：從第 6 欄起找「日期,日期,日期時間」三連
      let yi = -1;
      for (let i = 6; i < f.length - 2; i++) {
        if (isDate(f[i]) && isDate(f[i + 1]) && isDT(f[i + 2])) { yi = i; break; }
      }
      if (yi < 0 || f.length < NCOL) { failed.push(line.slice(0, 60)); continue; }
      const ppa = f.slice(5, yi).join(',');
      const rmaEnd = f.length - 15; // 尾端 ROMNY..TRUSR 固定 15 欄
      const rma = f.slice(yi + 11, rmaEnd).join(',');
      f = [...f.slice(0, 5), ppa, ...f.slice(yi, yi + 11), rma, ...f.slice(rmaEnd)];
      if (f.length !== NCOL) { failed.push(line.slice(0, 60)); continue; }
      repaired++;
    }
    map.set(f[0].trim(), {
      doc: f[0].trim(), cls: nz(f[1]), num: nz(f[2]), rcn: nz(f[3]), dly: nz(f[4]), ppa: nz(f[5]),
      ymm: nz(f[6]), edt: nz(f[7]), day: nz(f[8]), inv: nz(f[9]), dav: nz(f[10]),
      txp: nz(f[11]), txr: num(f[12]), atn: num(f[13]), tax: num(f[14]), att: num(f[15]), amt: num(f[16]),
      rma: nz(f[17]), mny: nz(f[18]), rat: num(f[19]), men: nz(f[20]), sal: nz(f[21]), csr: nz(f[22]),
      rev: nz(f[23]), rer: nz(f[24]), mno: nz(f[25]), shp: nz(f[26]), cos: nz(f[27]), sno: nz(f[28]), qtp: num(f[29]),
    });
  }
  return { map, repaired, failed };
}

// 直接執行時：自我檢驗
if (process.argv[1] && process.argv[1].includes('weimeng-v2-rsim')) {
  const { map, repaired, failed } = loadRsim();
  console.log(`RSIM 解析：${map.size} 筆、修復位移 ${repaired}、失敗 ${failed.length}`);
  const byCls = new Map<string, number>();
  for (const r of map.values()) byCls.set(r.cls, (byCls.get(r.cls) ?? 0) + 1);
  console.log([...byCls.entries()].sort());
  // 抽驗一筆銷貨金額關係
  for (const r of map.values()) {
    if (r.cls === '3' && r.tax > 0) { console.log('銷貨含稅樣本:', r.doc, { atn: r.atn, tax: r.tax, att: r.att, amt: r.amt, txp: r.txp }); break; }
  }
  if (failed.length) console.log('失敗樣本:', failed.slice(0, 3));
}
