// packages/db-core/scripts/weimeng-placeholders-more.ts
// 偉盟續作 Phase B：為早年銷貨+進貨用到、但主檔沒有的 對象/料號/庫位 建 placeholder。
//   對象分型：只在銷貨=客戶C / 只在進貨=供應商S / 兩邊都有=同行O（各用自己號碼計數器）。
//   料號：code=料號、secCode=同、名稱取品名+【待維護】。
//   庫位：Nx01Location、warehouseId=庫位前3碼對應倉、code=完整庫位。
//   安全：預設只報告數量（dry），帶參數 `go` 才真的寫入。
import { prisma, disconnectPrisma } from '../prisma/seed/client';
import { readFileSync, writeFileSync, createReadStream } from 'fs';
import { createInterface } from 'readline';
import { parse } from 'csv-parse';

const SP = 'C:/Users/User/AppData/Local/Temp/claude/C--nexora/d101259f-e37a-4362-9aaf-8ad1312ba8e6/scratchpad';
const OUT = 'C:/nexora/docs/_team';
const CUST_CSV = 'C:/nexora/docs/專案/測試資料/20260604_客戶資料.csv';
const GO = process.argv.includes('go');

const rd = (f: string) => new Set(readFileSync(`${SP}/${f}`, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean));
const nextCode = (prefix: string, codes: string[]) => {
  let max = 0; const re = new RegExp(`^${prefix}(\\d{4})$`);
  for (const c of codes) { const m = (c || '').match(re); if (m) max = Math.max(max, +m[1]); }
  return max;
};

async function main() {
  const t = await prisma.nx99Tenant.findFirst({ where: { code: 'TW-100001' }, select: { id: true } });
  const tid = t!.id;
  const uid = (await prisma.nx01User.findFirst({ where: { tenantId: tid }, orderBy: { userAccount: 'asc' }, select: { id: true } }))!.id;

  // ── DB 現況 ──
  const pn = await prisma.nx01Partner.findMany({ where: { tenantId: tid }, select: { code: true, legacyCode: true } });
  const dbLeg = new Set(pn.map((x) => (x.legacyCode || '').trim()).filter(Boolean));
  const allCodes = pn.map((x) => x.code || '');
  const pt = await prisma.nx01Part.findMany({ where: { tenantId: tid }, select: { code: true, secCode: true } });
  const dbPart = new Set<string>(); for (const p of pt) { if (p.code) dbPart.add(p.code.trim()); if (p.secCode) dbPart.add(p.secCode.trim()); }
  const loc = await prisma.nx01Location.findMany({ where: { tenantId: tid }, select: { code: true } });
  const dbLoc = new Set(loc.map((x) => (x.code || '').trim()));
  const wh = await prisma.nx01Warehouse.findMany({ where: { tenantId: tid }, select: { id: true, code: true } });
  const whMap = new Map<string, string>(); for (const w of wh) whMap.set(w.code.trim(), w.id); const anyWh = wh[0].id;

  // ── 讀抽取集合 ──
  const salesCust = rd('sales_early_cust.txt'), purSup = rd('pur_supplier.txt');
  const salesPart = rd('sales_early_part.txt'), purPart = rd('pur_part.txt');
  const salesLoc = rd('sales_early_loc.txt'), purLoc = rd('pur_loc.txt');

  // ── 對象分型（缺的才處理）──
  const roleType = new Map<string, string>(); // legacyCode → C/S/O
  for (const c of salesCust) if (!dbLeg.has(c)) roleType.set(c, 'C');
  for (const s of purSup) if (!dbLeg.has(s)) roleType.set(s, roleType.has(s) ? 'O' : 'S');
  const missByType = { C: 0, S: 0, O: 0 };
  for (const ty of roleType.values()) missByType[ty as 'C' | 'S' | 'O']++;

  // ── 缺料號 / 缺庫位 ──
  const missPart = [...new Set([...salesPart, ...purPart])].filter((p) => !dbPart.has(p)).sort();
  const missLoc = [...new Set([...salesLoc, ...purLoc])].filter((l) => !dbLoc.has(l)).sort();

  console.log('=== 缺失盤點（尚未寫入）===');
  console.log(`對象：客戶C ${missByType.C} / 供應商S ${missByType.S} / 同行O ${missByType.O}（合計 ${roleType.size}）`);
  console.log(`料號：${missPart.length}`);
  console.log(`庫位：${missLoc.length}  →`, missLoc.join(','));
  if (!GO) { console.log('\n[dry] 未寫入。加參數 go 才真的建。'); return; }

  // ── 客戶名稱查（僅客戶檔有名）──
  const custName = new Map<string, string>();
  await new Promise<void>((res, rej) => {
    const p = createReadStream(CUST_CSV).pipe(parse({ relax_quotes: true, relax_column_count: true, skip_empty_lines: true, bom: true, from_line: 2 }));
    p.on('data', (r: string[]) => { const c = (r[0] || '').trim(); if (c && !custName.has(c)) custName.set(c, (r[2] || '').trim()); });
    p.on('end', () => res()); p.on('error', rej);
  });

  // ── 建對象 placeholder（分型、各自計數器）──
  const counters = { C: nextCode('C', allCodes), S: nextCode('S', allCodes), O: nextCode('O', allCodes) };
  const typeName: Record<string, string> = { C: '客戶', S: '供應商', O: '同行' };
  const partnerList: string[] = [];
  for (const [leg, ty] of [...roleType.entries()].sort()) {
    counters[ty as 'C' | 'S' | 'O']++;
    const code = `${ty}${String(counters[ty as 'C' | 'S' | 'O']).padStart(4, '0')}`;
    const nm = custName.get(leg) || '';
    const name = ((nm || leg) + `【待維護-偉盟匯入(${typeName[ty]})】`).slice(0, 120);
    await prisma.nx01Partner.create({ data: { tenantId: tid, code, name, legacyCode: leg, partnerType: ty, canTransferStock: ty === 'O', isActive: true, createdBy: uid, updatedBy: uid } });
    partnerList.push(`${code}\t${ty}\t${leg}\t${nm || '(無名)'}`);
  }
  for (const ty of ['C', 'S', 'O'] as const) {
    await prisma.nx01SeqCounter.upsert({ where: { tenantId_scope: { tenantId: tid, scope: `PARTNER_${ty}` } }, create: { tenantId: tid, scope: `PARTNER_${ty}`, nextNo: counters[ty] + 1 }, update: { nextNo: counters[ty] + 1 } });
  }
  console.log(`建對象 ${partnerList.length} 筆（C${missByType.C}/S${missByType.S}/O${missByType.O}）`);

  // ── 料號名稱（串流兩檔取首見）──
  const wantPart = new Set(missPart);
  const partName = new Map<string, string>();
  for (const f of ['sales_early.tsv', 'purchases.tsv']) {
    await new Promise<void>((res) => {
      const rl = createInterface({ input: createReadStream(`${SP}/${f}`), crlfDelay: Infinity });
      rl.on('line', (line) => { if (!line) return; const c = line.split('\t'); const code = (c[4] || '').trim(); if (code && wantPart.has(code) && !partName.has(code)) partName.set(code, (c[5] || '').trim()); });
      rl.on('close', () => res());
    });
  }

  // ── 建料號 placeholder ──
  const partList: string[] = [];
  const BATCH = 1000;
  for (let i = 0; i < missPart.length; i += BATCH) {
    const chunk = missPart.slice(i, i + BATCH);
    await prisma.nx01Part.createMany({
      data: chunk.map((code) => { const nm = partName.get(code) || ''; return { tenantId: tid, code, secCode: code, name: ((nm || code) + ' 【待維護-偉盟匯入】').slice(0, 200), createdBy: uid, updatedBy: uid }; }),
      skipDuplicates: true,
    });
    for (const code of chunk) partList.push(`${code}\t${partName.get(code) || '(無品名)'}`);
    if (i % 10000 === 0) console.log(`  料號 ${i}/${missPart.length}`);
  }
  console.log(`建料號 ${partList.length} 筆`);

  // ── 建庫位 placeholder ──
  const locList: string[] = [];
  for (const l of missLoc) {
    const whId = whMap.get(l.slice(0, 3)) ?? anyWh;
    await prisma.nx01Location.create({ data: { tenantId: tid, warehouseId: whId, code: l, name: `偉盟庫位 ${l}【待維護】`.slice(0, 100), isActive: true, createdBy: uid, updatedBy: uid } });
    locList.push(`${l}\t${l.slice(0, 3)}`);
  }
  console.log(`建庫位 ${locList.length} 筆`);

  // ── 維護清單 ──
  writeFileSync(`${OUT}/weimeng-placeholder-partners-more.tsv`, '代號\t型別\t舊碼\t名稱\n' + partnerList.join('\n'));
  writeFileSync(`${OUT}/weimeng-placeholder-parts-more.tsv`, '料號\t品名\n' + partList.join('\n'));
  writeFileSync(`${OUT}/weimeng-placeholder-locations-more.tsv`, '庫位\t倉別\n' + locList.join('\n'));
  console.log(`維護清單已寫 docs/_team/weimeng-placeholder-*-more.tsv`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => disconnectPrisma());
