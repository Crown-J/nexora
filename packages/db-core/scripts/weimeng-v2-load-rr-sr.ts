// packages/db-core/scripts/weimeng-v2-load-rr-sr.ts
// 偉盟窗口重灌 v2 Step4：型1 進貨 → Nx02Rr/Item、型4 銷退 → Nx04Sr/Item。
//   進貨新欄（G3/G4/G5）：billingPartnerId=RSIM.RORCN(≠廠商時)、supplierInvoiceNo/Date=ROINV/RODAV、
//   refSoId=RORER 指向銷貨單（代購/直送；需先跑 load-sales 才解得到）。
//   成本語意：進貨 ROCOT=實付進價 → actualUnitCost；ROUPC → unitCost/originalUnitCost。
//   冪等：起手自清窗口 v2 列。
import { prisma, disconnectPrisma } from '../prisma/seed/client';
import { Prisma } from '../generated/prisma';
import { readFileSync } from 'fs';
import { loadRsim } from './weimeng-v2-rsim';

const DIR = 'C:/nexora/docs/專案/測試資料/偉盟匯入產出/v2窗口';
const MARK = '偉盟匯入';
const FROM = '202506', TO = '202607';
const BATCH = 2000;
const D = (n: number) => new Prisma.Decimal(Number.isFinite(n) ? Math.round(n * 10000) / 10000 : 0);
const num = (s: string) => { const n = +s; return Number.isFinite(n) ? n : 0; };

type Row = { iem: string; num: string; date: string; ptn: string; pno: string; nam: string; pos: string; qty: number; upc: number; amt: number; cot: number; rer: string; rmk: string };
const readTsv = (file: string) => {
  const docs = new Map<string, Row[]>();
  for (const line of readFileSync(`${DIR}/${file}`, 'utf8').split('\n')) {
    if (!line) continue; const f = line.split('\t');
    (docs.get(f[0]) ?? docs.set(f[0], []).get(f[0])!).push({
      iem: f[1], num: f[2], date: f[3], ptn: f[4], pno: f[5], nam: f[6], pos: f[8],
      qty: num(f[9]), upc: num(f[10]), amt: num(f[11]), cot: num(f[12]), rer: f[15] || '', rmk: f[17] || '',
    });
  }
  return docs;
};

async function main() {
  const t = await prisma.nx99Tenant.findFirst({ where: { code: 'TW-100001' }, select: { id: true } });
  const tid = t!.id;
  const uid = (await prisma.nx01User.findFirst({ where: { tenantId: tid }, orderBy: { userAccount: 'asc' }, select: { id: true } }))!.id;
  const twd = (await prisma.nx01Currency.findFirst({ where: { code: 'TWD' }, select: { id: true } }))!.id;
  const win = { tenantId: tid, remark: { startsWith: MARK }, legacyDocNo: { gte: FROM, lt: TO } };

  const pn = await prisma.nx01Partner.findMany({ where: { tenantId: tid }, select: { id: true, legacyCode: true } });
  const pMap = new Map<string, string>(); for (const p of pn) if (p.legacyCode) pMap.set(p.legacyCode.trim(), p.id);
  const pt = await prisma.nx01Part.findMany({ where: { tenantId: tid }, select: { id: true, code: true, secCode: true } });
  const partMap = new Map<string, string>(); for (const p of pt) { if (p.secCode) partMap.set(p.secCode.trim(), p.id); if (p.code) partMap.set(p.code.trim(), p.id); }
  const wh = await prisma.nx01Warehouse.findMany({ where: { tenantId: tid }, select: { id: true, code: true } });
  const whMap = new Map<string, string>(); for (const w of wh) whMap.set(w.code.trim(), w.id); const anyWh = wh[0].id;
  const whOf = (loc: string) => whMap.get((loc || '').slice(0, 3)) ?? anyWh;
  const lc = await prisma.nx01Location.findMany({ where: { tenantId: tid }, select: { id: true, code: true, warehouseId: true } });
  const locMap = new Map<string, string>(); const whDefLoc = new Map<string, string>();
  for (const l of lc) { locMap.set(l.code.trim(), l.id); if (!whDefLoc.has(l.warehouseId)) whDefLoc.set(l.warehouseId, l.id); }
  const { map: rsim } = loadRsim();

  // 窗口銷貨 legacyDocNo→soId（供 refSoId 解析）
  const soIdOf = new Map<string, string>();
  let cursor: string | undefined;
  for (;;) {
    const page = await prisma.nx04So.findMany({ where: win, select: { id: true, legacyDocNo: true }, orderBy: { id: 'asc' }, take: 20000, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}) });
    if (!page.length) break;
    for (const s of page) if (s.legacyDocNo) soIdOf.set(s.legacyDocNo, s.id);
    cursor = page[page.length - 1].id;
    if (page.length < 20000) break;
  }
  console.log(`窗口銷貨對照 ${soIdOf.size} 張`);

  // ══════════ 型1 進貨 → Nx02Rr ══════════
  {
    const di = await prisma.nx02RrItem.deleteMany({ where: { rr: win } });
    const dh = await prisma.nx02Rr.deleteMany({ where: win });
    if (dh.count) console.log(`RR 自清：明細 ${di.count} / 表頭 ${dh.count}`);
    const docs = readTsv('t1.tsv');
    let headers: Prisma.Nx02RrCreateManyInput[] = [];
    let hn = 0, hNoSup = 0, refSo = 0, billed = 0, inv = 0;
    const flushH = async () => { if (headers.length) { hn += (await prisma.nx02Rr.createMany({ data: headers, skipDuplicates: true })).count; headers = []; } };
    for (const [doc, rows] of docs) {
      const h = rsim.get(doc);
      const supCode = h?.num || rows[0].num;
      const sup = pMap.get(supCode); if (!sup) { hNoSup++; continue; }
      const rrDate = new Date(rows[0].date || h?.ymm || '2025-06-01');
      const createdAt = h?.day ? new Date(h.day) : rrDate;
      const lineSum = rows.reduce((s, r) => s + r.amt, 0);
      const total = h?.amt || lineSum, tax = h?.tax || 0, sub = h?.att || total - tax;
      const ref = h?.rer && /^\d{6}3/.test(h.rer) ? soIdOf.get(h.rer.trim()) ?? null : null;
      if (ref) refSo++;
      const billing = h && h.rcn && h.rcn !== supCode ? pMap.get(h.rcn) ?? null : null;
      if (billing) billed++;
      if (h?.inv) inv++;
      const isCancel = h?.rev === 'Y';
      headers.push({
        tenantId: tid, warehouseId: whMap.get(h?.shp?.trim() || '') ?? whOf(rows[0].pos),
        docNo: doc.slice(0, 30), legacyDocNo: doc.slice(0, 20), rrDate, supplierId: sup,
        billingPartnerId: billing, refSoId: ref,
        supplierInvoiceNo: h?.inv ? h.inv.slice(0, 20) : null,
        supplierInvoiceDate: h?.dav ? new Date(h.dav) : null,
        currencyId: twd, status: isCancel ? 'CANCELLED' : 'POSTED',
        taxRate: D((h?.txr || 0) * 100), subtotal: D(sub), taxAmount: D(tax), totalAmount: D(total),
        postedAt: isCancel ? null : rrDate, postedBy: isCancel ? null : uid,
        voidedAt: isCancel ? createdAt : null, voidedBy: isCancel ? uid : null,
        remark: h?.rma ? `${MARK} ${h.rma}`.slice(0, 200) : MARK,
        createdAt, updatedAt: createdAt, createdBy: uid, updatedBy: uid,
      });
      if (headers.length >= BATCH) await flushH();
    }
    await flushH();
    console.log(`RR 表頭 ${hn}（廠商查無 ${hNoSup}、代購綁銷貨 ${refSo}、帳款對象≠廠商 ${billed}、有發票號 ${inv}）`);

    const rrIdOf = new Map<string, string>();
    let cur: string | undefined;
    for (;;) {
      const page = await prisma.nx02Rr.findMany({ where: win, select: { id: true, legacyDocNo: true }, orderBy: { id: 'asc' }, take: 20000, ...(cur ? { skip: 1, cursor: { id: cur } } : {}) });
      if (!page.length) break;
      for (const s of page) if (s.legacyDocNo) rrIdOf.set(s.legacyDocNo, s.id);
      cur = page[page.length - 1].id;
      if (page.length < 20000) break;
    }
    let buf: Prisma.Nx02RrItemCreateManyInput[] = [];
    let inum = 0, iNoPart = 0, locFall = 0;
    const flushI = async () => { if (buf.length) { inum += (await prisma.nx02RrItem.createMany({ data: buf, skipDuplicates: true })).count; buf = []; } };
    for (const [doc, rows] of docs) {
      const rrId = rrIdOf.get(doc.slice(0, 20)); if (!rrId) continue;
      let ln = 0;
      for (const r of rows) {
        const partId = partMap.get(r.ptn); if (!partId) { iNoPart++; continue; }
        ln++;
        const whId = whOf(r.pos);
        let locId = locMap.get(r.pos);
        if (!locId) { locId = whDefLoc.get(whId); locFall++; }
        if (!locId) continue;
        const created = r.date ? new Date(r.date) : new Date(rows[0].date || '2025-06-01');
        buf.push({
          rrId, lineNo: ln, partId, partNo: r.ptn.slice(0, 50), partName: (r.nam || r.ptn).slice(0, 200),
          locationId: locId, qty: D(r.qty), expectedQty: D(r.qty), actualQty: D(r.qty),
          unitCost: D(r.upc), originalUnitCost: D(r.upc), actualUnitCost: D(r.cot || r.upc), lineAmount: D(r.amt),
          remark: r.rmk ? r.rmk.slice(0, 200) : null,
          createdAt: created, updatedAt: created, createdBy: uid, updatedBy: uid,
        });
        if (buf.length >= BATCH) await flushI();
      }
    }
    await flushI();
    console.log(`RR 明細 ${inum}（料號查無 ${iNoPart}、庫位退回預設 ${locFall}）`);
  }

  // ══════════ 型4 銷退 → Nx04Sr ══════════
  {
    const di = await prisma.nx04SrItem.deleteMany({ where: { sr: win } });
    const dh = await prisma.nx04Sr.deleteMany({ where: win });
    if (dh.count) console.log(`SR 自清：明細 ${di.count} / 表頭 ${dh.count}`);
    const docs = readTsv('t4.tsv');
    let headers: Prisma.Nx04SrCreateManyInput[] = [];
    let hn = 0, hNoCust = 0;
    const flushH = async () => { if (headers.length) { hn += (await prisma.nx04Sr.createMany({ data: headers, skipDuplicates: true })).count; headers = []; } };
    for (const [doc, rows] of docs) {
      const h = rsim.get(doc);
      const cust = pMap.get(h?.num || rows[0].num); if (!cust) { hNoCust++; continue; }
      const srDate = new Date(rows[0].date || h?.ymm || '2025-06-01');
      const createdAt = h?.day ? new Date(h.day) : srDate;
      const lineSum = rows.reduce((s, r) => s + r.amt, 0);
      const total = h?.amt || lineSum, tax = h?.tax || 0, sub = h?.att || total - tax;
      const isCancel = h?.rev === 'Y';
      headers.push({
        tenantId: tid, warehouseId: whMap.get(h?.shp?.trim() || '') ?? whOf(rows[0].pos),
        docNo: doc.slice(0, 30), legacyDocNo: doc.slice(0, 20), srDate, customerId: cust, soId: null,
        returnMethod: 'S', status: isCancel ? 'CANCELLED' : 'POSTED',
        taxRate: D((h?.txr || 0) * 100), subtotal: D(sub), taxAmount: D(tax), totalAmount: D(total),
        receivedAt: isCancel ? null : createdAt, receivedBy: isCancel ? null : uid,
        remark: h?.rma ? `${MARK} ${h.rma}`.slice(0, 200) : MARK,
        createdAt, updatedAt: createdAt, createdBy: uid, updatedBy: uid,
      });
      if (headers.length >= BATCH) await flushH();
    }
    await flushH();
    console.log(`SR 表頭 ${hn}（客戶查無 ${hNoCust}）`);

    const srIdOf = new Map<string, string>();
    let cur: string | undefined;
    for (;;) {
      const page = await prisma.nx04Sr.findMany({ where: win, select: { id: true, legacyDocNo: true }, orderBy: { id: 'asc' }, take: 20000, ...(cur ? { skip: 1, cursor: { id: cur } } : {}) });
      if (!page.length) break;
      for (const s of page) if (s.legacyDocNo) srIdOf.set(s.legacyDocNo, s.id);
      cur = page[page.length - 1].id;
      if (page.length < 20000) break;
    }
    let buf: Prisma.Nx04SrItemCreateManyInput[] = [];
    let inum = 0, iNoPart = 0;
    const flushI = async () => { if (buf.length) { inum += (await prisma.nx04SrItem.createMany({ data: buf, skipDuplicates: true })).count; buf = []; } };
    for (const [doc, rows] of docs) {
      const srId = srIdOf.get(doc.slice(0, 20)); if (!srId) continue;
      let ln = 0;
      for (const r of rows) {
        const partId = partMap.get(r.ptn); if (!partId) { iNoPart++; continue; }
        ln++;
        const created = r.date ? new Date(r.date) : new Date(rows[0].date || '2025-06-01');
        buf.push({
          srId, soItemId: null, lineNo: ln, partId, partNo: r.ptn.slice(0, 50), partName: (r.nam || r.ptn).slice(0, 200),
          returnPolicy: 'S', returnType: 'N', returnReason: 'O', dispositionFlag: 'G',
          qty: D(Math.abs(r.qty)), unitPrice: D(r.upc), lineAmount: D(Math.abs(r.amt)),
          locationId: locMap.get(r.pos) ?? null,
          remark: r.rmk ? r.rmk.slice(0, 200) : null,
          createdAt: created, updatedAt: created, createdBy: uid, updatedBy: uid,
        });
        if (buf.length >= BATCH) await flushI();
      }
    }
    await flushI();
    console.log(`SR 明細 ${inum}（料號查無 ${iNoPart}）`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => disconnectPrisma());
