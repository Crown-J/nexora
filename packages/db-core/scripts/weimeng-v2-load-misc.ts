// packages/db-core/scripts/weimeng-v2-load-misc.ts
// 偉盟窗口重灌 v2 Step6：型6 盤點 → Nx03StockTake/Item、型2 進退 → Nx02Pr/Item。
//   盤點：偉盟只存「盤差」（ROQTY 正盈負虧、無系統量/實盤量）→ systemQty=0、countedQty=diffQty=盤差，
//   remark 標記近似（決策 D4）。項目 locationId 必填 → 庫位查無退回該倉第一個庫位。
//   進退：G6 已將 rrItemId 改可空 → 無原進貨參照直接 null。
import { prisma, disconnectPrisma } from '../prisma/seed/client';
import { Prisma } from '../generated/prisma';
import { readFileSync } from 'fs';
import { loadRsim } from './weimeng-v2-rsim';

const DIR = 'C:/nexora/docs/專案/測試資料/偉盟匯入產出/v2窗口';
const MARK = '偉盟匯入';
const FROM = '202506', TO = '202607';
const D = (n: number) => new Prisma.Decimal(Number.isFinite(n) ? Math.round(n * 10000) / 10000 : 0);
const num = (s: string) => { const n = +s; return Number.isFinite(n) ? n : 0; };

type Row = { iem: string; num: string; date: string; ptn: string; nam: string; pos: string; qty: number; upc: number; amt: number; cot: number; rmk: string };
const readTsv = (file: string) => {
  const docs = new Map<string, Row[]>();
  for (const line of readFileSync(`${DIR}/${file}`, 'utf8').split('\n')) {
    if (!line) continue; const f = line.split('\t');
    (docs.get(f[0]) ?? docs.set(f[0], []).get(f[0])!).push({
      iem: f[1], num: f[2], date: f[3], ptn: f[4], nam: f[6], pos: f[8],
      qty: num(f[9]), upc: num(f[10]), amt: num(f[11]), cot: num(f[12]), rmk: f[17] || '',
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

  // ══════════ 型6 盤點 → Nx03StockTake ══════════
  {
    const di = await prisma.nx03StockTakeItem.deleteMany({ where: { stockTake: win } });
    const dh = await prisma.nx03StockTake.deleteMany({ where: win });
    if (dh.count) console.log(`盤點自清：明細 ${di.count} / 表頭 ${dh.count}`);
    const docs = readTsv('t6.tsv');
    let hn = 0, inum = 0, iNoPart = 0, locFall = 0;
    for (const [doc, rows] of docs) {
      const h = rsim.get(doc);
      const d0 = new Date(rows[0].date || h?.ymm || '2025-06-01');
      const createdAt = h?.day ? new Date(h.day) : d0;
      const whId = whMap.get(h?.shp?.trim() || '') ?? whOf(rows[0].pos);
      const head = await prisma.nx03StockTake.create({
        data: {
          tenantId: tid, docNo: doc.slice(0, 30), legacyDocNo: doc.slice(0, 20), stockTakeDate: d0,
          warehouseId: whId, scopeType: 'P', scopeDetail: '偉盟歷史盤點盈虧（僅存盤差）',
          status: 'POSTED', postedAt: d0, postedBy: uid, approvalStatus: 'N',
          remark: `${MARK}｜偉盟僅存盤差：systemQty=0、countedQty=盤差為近似`,
          createdAt, updatedAt: createdAt, createdBy: uid, updatedBy: uid,
        }, select: { id: true },
      });
      hn++;
      let ln = 0;
      const items: Prisma.Nx03StockTakeItemCreateManyInput[] = [];
      for (const r of rows) {
        const partId = partMap.get(r.ptn); if (!partId) { iNoPart++; continue; }
        ln++;
        let locId = locMap.get(r.pos);
        if (!locId) { locId = whDefLoc.get(whOf(r.pos)) ?? whDefLoc.get(whId); locFall++; }
        if (!locId) continue;
        const created = r.date ? new Date(r.date) : d0;
        items.push({
          stockTakeId: head.id, lineNo: ln, partId, partNo: r.ptn.slice(0, 50), partName: (r.nam || r.ptn).slice(0, 200),
          warehouseId: whOf(r.pos), locationId: locId,
          systemQty: D(0), countedQty: D(r.qty), diffQty: D(r.qty),
          snapshotQty: D(0), deltaQty: D(0), formulaExpectedQty: D(0), realDiffQty: D(r.qty),
          unitCost: D(r.cot), diffCost: D(r.qty * r.cot),
          adjustType: r.qty > 0 ? 'I' : r.qty < 0 ? 'O' : 'N', status: 'P',
          varianceReasonCode: r.qty !== 0 ? 'U' : null, countedAt: created,
          remark: r.rmk ? r.rmk.slice(0, 200) : null,
          createdAt: created, updatedAt: created, createdBy: uid, updatedBy: uid,
        });
      }
      if (items.length) inum += (await prisma.nx03StockTakeItem.createMany({ data: items })).count;
    }
    console.log(`盤點 表頭 ${hn} / 明細 ${inum}（料號查無 ${iNoPart}、庫位退回預設 ${locFall}）`);
  }

  // ══════════ 型2 進退 → Nx02Pr ══════════
  {
    const di = await prisma.nx02PrItem.deleteMany({ where: { pr: win } });
    const dh = await prisma.nx02Pr.deleteMany({ where: win });
    if (dh.count) console.log(`進退自清：明細 ${di.count} / 表頭 ${dh.count}`);
    const docs = readTsv('t2.tsv');
    let hn = 0, hNoSup = 0, inum = 0, iNoPart = 0;
    for (const [doc, rows] of docs) {
      const h = rsim.get(doc);
      const sup = pMap.get(h?.num || rows[0].num); if (!sup) { hNoSup++; continue; }
      const d0 = new Date(rows[0].date || h?.ymm || '2025-06-01');
      const createdAt = h?.day ? new Date(h.day) : d0;
      const lineSum = rows.reduce((s, r) => s + Math.abs(r.amt), 0);
      const total = h?.amt || lineSum, tax = h?.tax || 0, sub = h?.att || total - tax;
      const isCancel = h?.rev === 'Y';
      const head = await prisma.nx02Pr.create({
        data: {
          tenantId: tid, docNo: doc.slice(0, 30), legacyDocNo: doc.slice(0, 20), prDate: d0,
          warehouseId: whMap.get(h?.shp?.trim() || '') ?? whOf(rows[0].pos), supplierId: sup, rrId: null,
          currencyId: twd, status: isCancel ? 'V' : 'P',
          taxRate: D((h?.txr || 0) * 100), subtotal: D(sub), taxAmount: D(tax), totalAmount: D(total),
          postedAt: isCancel ? null : d0, postedBy: isCancel ? null : uid,
          voidedAt: isCancel ? createdAt : null, voidedBy: isCancel ? uid : null,
          paymentStatus: 'U', returnMode: 'P', dispositionFlag: 'G',
          remark: h?.rma ? `${MARK} ${h.rma}`.slice(0, 200) : MARK,
          createdAt, updatedAt: createdAt, createdBy: uid, updatedBy: uid,
        }, select: { id: true },
      });
      hn++;
      let ln = 0;
      const items: Prisma.Nx02PrItemCreateManyInput[] = [];
      for (const r of rows) {
        const partId = partMap.get(r.ptn); if (!partId) { iNoPart++; continue; }
        ln++;
        const created = r.date ? new Date(r.date) : d0;
        items.push({
          prId: head.id, rrItemId: null, lineNo: ln, partId, partNo: r.ptn.slice(0, 50), partName: (r.nam || r.ptn).slice(0, 200),
          locationId: locMap.get(r.pos) ?? null, returnReason: 'O',
          qty: D(Math.abs(r.qty)), unitCost: D(r.cot || r.upc), lineAmount: D(Math.abs(r.amt)),
          remark: r.rmk ? r.rmk.slice(0, 200) : null,
          createdAt: created, updatedAt: created, createdBy: uid, updatedBy: uid,
        });
      }
      if (items.length) inum += (await prisma.nx02PrItem.createMany({ data: items })).count;
    }
    console.log(`進退 表頭 ${hn}（廠商查無 ${hNoSup}）/ 明細 ${inum}（料號查無 ${iNoPart}）`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => disconnectPrisma());
