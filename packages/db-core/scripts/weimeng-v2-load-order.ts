// packages/db-core/scripts/weimeng-v2-load-order.ts
// 偉盟訂單匯入：RORA(單頭)/RORB(單身) CSV → Nx04Order/Nx04OrderItem（G9 專用表）。
//   對照文件：C:\wellan\文件\偉盟單據匯入NEXORA_欄位對照.md（訂單段）
//   id 應用層自產（NX04ORDR/NX04ORIT + 7 碼）；冪等：起手自清 remark 開頭「偉盟匯入」的訂單。
//   金額：RAAMT 含稅→total、未稅/稅 5% 回推；表頭 RAAMT=0（空/廢單）時退用明細加總。
//   空單號列（偉盟廢列）跳過。
import { prisma, disconnectPrisma } from '../prisma/seed/client';
import { Prisma } from '../generated/prisma';
import { readFileSync } from 'fs';

const DIR = 'C:/nexora/docs/專案/測試資料';
const RORA = `${DIR}/20260720_RORA訂單頭_202506-202606.csv`;
const RORB = `${DIR}/20260720_RORB訂單身_202506-202606.csv`;
const MARK = '偉盟匯入';
const D = (n: number) => new Prisma.Decimal(Number.isFinite(n) ? Math.round(n * 10000) / 10000 : 0);
const D2 = (n: number) => new Prisma.Decimal(Number.isFinite(n) ? Math.round(n * 100) / 100 : 0);
const nz = (s: string | undefined) => { const v = (s || '').trim(); return v === 'NULL' ? '' : v; };
const num = (s: string | undefined) => { const n = +nz(s); return Number.isFinite(n) ? n : 0; };
const pad = (p: string, n: number) => p + String(n).padStart(7, '0');

function parseCsv(path: string, ncol: number): string[][] {
  const raw = readFileSync(path, 'utf8').replace(/^﻿/, '');
  const out: string[][] = [];
  let skipped = 0;
  const lines = raw.split(/\r?\n/);
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const f = lines[i].split(',');
    if (f.length !== ncol) { skipped++; continue; }
    out.push(f);
  }
  if (skipped) console.log(`  ${path.split('/').pop()}：欄數不符跳過 ${skipped}`);
  return out;
}

async function main() {
  const t = await prisma.nx99Tenant.findFirst({ where: { code: 'TW-100001' }, select: { id: true } });
  const tid = t!.id;
  const uid = (await prisma.nx01User.findFirst({ where: { tenantId: tid }, orderBy: { userAccount: 'asc' }, select: { id: true } }))!.id;

  // 冪等自清
  const dh = await prisma.nx04Order.findMany({ where: { tenantId: tid, remark: { startsWith: MARK } }, select: { id: true } });
  if (dh.length) {
    await prisma.nx04OrderItem.deleteMany({ where: { orderId: { in: dh.map((o) => o.id) } } });
    await prisma.nx04Order.deleteMany({ where: { id: { in: dh.map((o) => o.id) } } });
    console.log(`自清舊訂單 ${dh.length} 張`);
  }

  const pn = await prisma.nx01Partner.findMany({ where: { tenantId: tid }, select: { id: true, legacyCode: true } });
  const custMap = new Map<string, string>(); for (const p of pn) if (p.legacyCode) custMap.set(p.legacyCode.trim(), p.id);
  const pt = await prisma.nx01Part.findMany({ where: { tenantId: tid }, select: { id: true, code: true, secCode: true } });
  const partMap = new Map<string, string>(); for (const p of pt) { if (p.secCode) partMap.set(p.secCode.trim(), p.id); if (p.code) partMap.set(p.code.trim(), p.id); }
  const wh = await prisma.nx01Warehouse.findMany({ where: { tenantId: tid }, select: { id: true, code: true } });
  const whMap = new Map<string, string>(); for (const w of wh) whMap.set(w.code.trim(), w.id); const anyWh = wh[0].id;
  const whOf = (loc: string) => whMap.get((loc || '').slice(0, 3)) ?? anyWh;

  // RORA 單頭（16 欄）：0 RAREN 1 RANUM 2 RADAT 3 RADTO 4 RACNO 5 RAPAY 6 RABUY 7 RACLS 8 RAAMT 9 RAEND 10 RASHP 11 RAMEN 12 RARMK 13 TRDAT 14 TRMOD 15 TRUSR
  const headRows = parseCsv(RORA, 16);
  const headOf = new Map<string, string[]>();
  for (const f of headRows) { const d = nz(f[0]); if (d) headOf.set(d, f); }

  // RORB 單身（19 欄）：0 RBREN 1 RBIEM 2 RBNUM 3 RBMEN 4 RBPTN 5 RBNAM 6 RBLAB 7 RBCLA 8 RBYEA 9 RBQTY 10 RBUPC 11 RBAMT 12 RBDCX 13 RBUNI 14 RBAQY 15 RBDQY 16 RBIQY 17 RBSHP 18 RBRMK
  const itemRows = parseCsv(RORB, 19);
  const docItems = new Map<string, string[][]>();
  for (const f of itemRows) { const d = nz(f[0]); if (!d) continue; (docItems.get(d) ?? docItems.set(d, []).get(d)!).push(f); }
  console.log(`RORA 表頭 ${headOf.size} / RORB 明細 ${itemRows.length} 列、${docItems.size} 張單`);

  // 以「有明細的單號」為主（頭身合流；缺表頭者用明細首列補）
  const orderData: Prisma.Nx04OrderCreateManyInput[] = [];
  const itemData: Prisma.Nx04OrderItemCreateManyInput[] = [];
  let oi = 0, ii = 0, noCust = 0, noPart = 0;
  for (const [doc, rows] of docItems) {
    const h = headOf.get(doc);
    const custCode = h ? nz(h[1]) : nz(rows[0][2]);
    const cust = custMap.get(custCode); if (!cust) { noCust++; continue; }
    const oid = pad('NX04ORDR', ++oi);
    const oDate = new Date((h ? nz(h[2]) : '') || '2025-06-01');
    const createdAt = h && nz(h[13]) ? new Date(nz(h[13])) : oDate;
    const lineSum = rows.reduce((s, r) => s + num(r[11]), 0);
    const total = h && num(h[8]) ? num(h[8]) : lineSum;
    const sub = Math.round((total / 1.05) * 100) / 100;
    orderData.push({
      id: oid, tenantId: tid, warehouseId: h && nz(h[10]) ? (whMap.get(nz(h[10])) ?? whOf(nz(rows[0][17]))) : whOf(nz(rows[0][17])),
      docNo: doc.slice(0, 30), legacyDocNo: doc.slice(0, 20), orderDate: oDate, customerId: cust,
      expectedDate: h && nz(h[3]) ? new Date(nz(h[3])) : null,
      sourceDocNo: h && nz(h[4]) ? nz(h[4]).slice(0, 30) : null,
      paymentTerm: h && nz(h[5]) ? nz(h[5]).slice(0, 40) : null,
      subtotal: D2(sub), taxRate: D(5), taxAmount: D2(total - sub), totalAmount: D2(total),
      status: 'CLOSED', remark: h && nz(h[12]) ? `${MARK} ${nz(h[12])}`.slice(0, 200) : MARK,
      createdAt, updatedAt: createdAt, createdBy: uid, updatedBy: uid,
    });
    let ln = 0;
    for (const r of rows) {
      const partId = partMap.get(nz(r[4])); if (!partId) { noPart++; continue; }
      ln++;
      const dcx = num(r[12]) || 1;
      const rmk = [nz(r[18]), nz(r[7]) ? `車型${nz(r[7])}` : '', dcx !== 1 ? `折${dcx}` : ''].filter(Boolean).join(' ');
      itemData.push({
        id: pad('NX04ORIT', ++ii), orderId: oid, lineNo: ln, partId,
        partNo: nz(r[4]).slice(0, 50), partName: (nz(r[5]) || nz(r[4])).slice(0, 200),
        brandName: nz(r[6]) ? nz(r[6]).slice(0, 100) : null,
        qty: D(num(r[9])), unitPrice: D(num(r[10])), lineAmount: D2(num(r[11])),
        remark: rmk ? rmk.slice(0, 200) : null,
        createdAt: oDate, updatedAt: oDate, createdBy: uid, updatedBy: uid,
      });
    }
  }
  await prisma.nx04Order.createMany({ data: orderData, skipDuplicates: true });
  for (let i = 0; i < itemData.length; i += 2000) await prisma.nx04OrderItem.createMany({ data: itemData.slice(i, i + 2000), skipDuplicates: true });
  console.log(`訂單表頭 ${orderData.length}（客戶查無跳過 ${noCust}）/ 明細 ${itemData.length}（料號查無跳過 ${noPart}）`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => disconnectPrisma());
