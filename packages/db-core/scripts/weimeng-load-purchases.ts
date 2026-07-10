// packages/db-core/scripts/weimeng-load-purchases.ts
// 偉盟續作 Phase D：載入進貨 2001~2026/6/22（~59萬列）到 Nx02Rr/Nx02RrItem。
//   唯讀歷史：status='POSTED'（歷史已完成進貨）、remark='偉盟匯入'，但不寫 Nx03 庫存/分類帳（不過帳）。
//   進貨金額稅不強算（唯盟舊資料未稅欄不可靠）：subtotal=total=Σ(數量×單價)、taxRate=0。
//   明細 locationId 用完整庫位對 Nx01Location（Phase B 已補齊）；unitCost/actualUnitCost 填單價供成本記憶查詢。
//   記憶體：for await 串流兩趟；配 NODE_OPTIONS=--max-old-space-size=8192。
import { prisma, disconnectPrisma } from '../prisma/seed/client';
import { Prisma } from '../generated/prisma';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

const SP = 'C:/Users/User/AppData/Local/Temp/claude/C--nexora/d101259f-e37a-4362-9aaf-8ad1312ba8e6/scratchpad';
// 可傳入年檔路徑（逐年獨立程序、避免 readline 緩衝大檔 OOM）；未傳則全檔。
const TSV = process.argv[2] || `${SP}/purchases.tsv`;
const MARK = '偉盟匯入';
const BATCH = 3000;
const D = (n: number) => new Prisma.Decimal(Number.isFinite(n) ? n : 0);
const num = (s: string) => { const n = +s; return Number.isFinite(n) ? n : 0; };
const lines = () => createInterface({ input: createReadStream(TSV), crlfDelay: Infinity });

async function main() {
  const t = await prisma.nx99Tenant.findFirst({ where: { code: 'TW-100001' }, select: { id: true } });
  const tid = t!.id;
  const uid = (await prisma.nx01User.findFirst({ where: { tenantId: tid }, orderBy: { userAccount: 'asc' }, select: { id: true } }))!.id;
  const twd = (await prisma.nx01Currency.findFirst({ where: { code: 'TWD' }, select: { id: true } }))!.id;

  const pn = await prisma.nx01Partner.findMany({ where: { tenantId: tid }, select: { id: true, legacyCode: true } });
  const supMap = new Map<string, string>(); for (const p of pn) if (p.legacyCode) supMap.set(p.legacyCode.trim(), p.id);
  const wh = await prisma.nx01Warehouse.findMany({ where: { tenantId: tid }, select: { id: true, code: true } });
  const whMap = new Map<string, string>(); for (const w of wh) whMap.set(w.code.trim(), w.id); const anyWh = wh[0].id;
  const whOf = (loc: string) => whMap.get((loc || '').slice(0, 3)) ?? anyWh;
  const lc = await prisma.nx01Location.findMany({ where: { tenantId: tid }, select: { id: true, code: true } });
  const locMap = new Map<string, string>(); for (const l of lc) locMap.set(l.code.trim(), l.id);

  // ── Pass 1：聚合表頭（tsv: 0單號 2日期 3供應商 7庫位 10總價）──
  type Agg = { sup: string; date: string; loc: string; tot: number };
  let agg = new Map<string, Agg>();
  for await (const line of lines()) {
    if (!line) continue; const f = line.split('\t'); const doc = f[0];
    let a = agg.get(doc);
    if (!a) { a = { sup: f[3], date: f[2], loc: f[7], tot: 0 }; agg.set(doc, a); }
    a.tot += num(f[10]);
  }
  console.log(`Pass1：聚合 ${agg.size} 張進貨表頭`);

  let headers: Prisma.Nx02RrCreateManyInput[] = [];
  let hn = 0, hskip = 0;
  const flushH = async () => { if (headers.length) { hn += (await prisma.nx02Rr.createMany({ data: headers, skipDuplicates: true })).count; headers = []; } };
  for (const [doc, a] of agg) {
    const sup = supMap.get(a.sup); if (!sup) { hskip++; continue; }
    const tot = D(a.tot);
    headers.push({
      tenantId: tid, warehouseId: whOf(a.loc), docNo: doc.slice(0, 30), rrDate: new Date(a.date), supplierId: sup,
      currencyId: twd, status: 'POSTED', subtotal: tot, taxRate: D(0), taxAmount: D(0), totalAmount: tot,
      postedAt: new Date(a.date), postedBy: uid, remark: MARK, createdAt: new Date(a.date), updatedAt: new Date(a.date), createdBy: uid, updatedBy: uid,
    });
    if (headers.length >= BATCH) await flushH();
  }
  await flushH();
  agg = new Map();
  console.log(`表頭載入 ${hn} 張（供應商查無跳過 ${hskip}）`);

  // 回讀 docNo→rrId（cursor 分頁）
  const rrIdOf = new Map<string, string>();
  let cursor: string | undefined;
  for (;;) {
    const page: { id: string; docNo: string }[] = await prisma.nx02Rr.findMany({ where: { tenantId: tid, remark: MARK }, select: { id: true, docNo: true }, orderBy: { id: 'asc' }, take: 20000, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}) });
    if (!page.length) break;
    for (const s of page) rrIdOf.set(s.docNo, s.id);
    cursor = page[page.length - 1].id;
    if (page.length < 20000) break;
  }
  console.log(`docNo→rrId 映射 ${rrIdOf.size} 筆`);

  const partMap = new Map<string, string>();
  const pt = await prisma.nx01Part.findMany({ where: { tenantId: tid }, select: { id: true, code: true, secCode: true } });
  for (const p of pt) { if (p.secCode) partMap.set(p.secCode.trim(), p.id); if (p.code) partMap.set(p.code.trim(), p.id); }

  // ── Pass 2：建明細（tsv: 0單號 4料號 5品名 7庫位 8數量 9單價 10總價 2日期）──
  const lineNoOf = new Map<string, number>();
  let buf: Prisma.Nx02RrItemCreateManyInput[] = [];
  let inum = 0, iskip = 0, noLoc = 0;
  const flushI = async () => { if (buf.length) { inum += (await prisma.nx02RrItem.createMany({ data: buf, skipDuplicates: true })).count; buf = []; if (inum % 100000 < BATCH) console.log(`  明細 ${inum}`); } };
  for await (const line of lines()) {
    if (!line) continue; const f = line.split('\t');
    const rrId = rrIdOf.get((f[0] || '').slice(0, 30)); const partId = partMap.get((f[4] || '').trim());
    const locId = locMap.get((f[7] || '').trim());
    if (!rrId || !partId) { iskip++; continue; }
    if (!locId) { noLoc++; continue; }
    const ln = (lineNoOf.get(f[0]) ?? 0) + 1; lineNoOf.set(f[0], ln);
    const price = D(num(f[9]));
    buf.push({
      rrId, lineNo: ln, partId, partNo: (f[4] || '').slice(0, 50), partName: (f[5] || f[4] || '').slice(0, 200),
      locationId: locId, qty: D(num(f[8])), unitCost: price, originalUnitCost: price, actualUnitCost: price, lineAmount: D(num(f[10])),
      createdAt: new Date(f[2]), updatedAt: new Date(f[2]), createdBy: uid, updatedBy: uid,
    });
    if (buf.length >= BATCH) await flushI();
  }
  await flushI();
  console.log(`明細載入 ${inum} 列（rrId/partId 查無跳過 ${iskip}、庫位查無跳過 ${noLoc}）`);
  console.log(`完成：進貨 RR ${hn} 張 / 明細 ${inum} 列（remark=${MARK}、status=POSTED 唯讀、未過帳）`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => disconnectPrisma());
