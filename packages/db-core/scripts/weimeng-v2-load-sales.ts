// packages/db-core/scripts/weimeng-v2-load-sales.ts
// 偉盟窗口重灌 v2 Step3：型3 銷貨 → Nx04So/Nx04SoItem（RSIM 表頭 × RSIO 明細）。
//   對照文件：C:\wellan\文件\偉盟單據匯入NEXORA_欄位對照.md
//   修正舊壓測灌入兩病灶：日期用 RODAT（非 ROEDT 月鍵）、成本 ROCOT 進 unitCost（非 subtotal）。
//   金額取 RSIM 官方數：subtotal=ROATT(未稅)、tax=ROTAX、total=ROAMT（實測 ROATT+ROTAX=ROAMT；字典 ROATN 是錯的）。
//   冪等：起手先刪窗口內 v2 資料（legacyDocNo 202506–202606）再灌；舊壓測列（legacyDocNo=null）由 cleanup 腳本處理。
import { prisma, disconnectPrisma } from '../prisma/seed/client';
import { Prisma } from '../generated/prisma';
import { readFileSync } from 'fs';
import { loadRsim } from './weimeng-v2-rsim';

const TSV = 'C:/nexora/docs/專案/測試資料/偉盟匯入產出/v2窗口/t3.tsv';
const MARK = '偉盟匯入';
const FROM = '202506', TO = '202607';
const BATCH = 3000;
const D = (n: number) => new Prisma.Decimal(Number.isFinite(n) ? Math.round(n * 10000) / 10000 : 0);
const num = (s: string) => { const n = +s; return Number.isFinite(n) ? n : 0; };

// tsv: 0doc 1iem 2num 3date 4ptn 5pno 6nam 7lab 8pos 9qty 10upc 11amt 12cot 13dcx 14cos 15rer 16rim 17rmk 18men
type Row = { iem: string; num: string; date: string; ptn: string; pno: string; nam: string; lab: string; pos: string; qty: number; upc: number; amt: number; cot: number; dcx: number; rmk: string };

async function main() {
  const t = await prisma.nx99Tenant.findFirst({ where: { code: 'TW-100001' }, select: { id: true } });
  const tid = t!.id;
  const uid = (await prisma.nx01User.findFirst({ where: { tenantId: tid }, orderBy: { userAccount: 'asc' }, select: { id: true } }))!.id;
  const twd = (await prisma.nx01Currency.findFirst({ where: { code: 'TWD' }, select: { id: true } }))!.id;

  // 冪等自清（v2 專屬列）
  const win = { tenantId: tid, remark: { startsWith: MARK }, legacyDocNo: { gte: FROM, lt: TO } };
  const di = await prisma.nx04SoItem.deleteMany({ where: { so: win } });
  const dh = await prisma.nx04So.deleteMany({ where: win });
  if (dh.count) console.log(`自清 v2 舊灌：明細 ${di.count} / 表頭 ${dh.count}`);

  // 對照表
  const pn = await prisma.nx01Partner.findMany({ where: { tenantId: tid }, select: { id: true, legacyCode: true } });
  const custMap = new Map<string, string>(); for (const p of pn) if (p.legacyCode) custMap.set(p.legacyCode.trim(), p.id);
  const pt = await prisma.nx01Part.findMany({ where: { tenantId: tid }, select: { id: true, code: true, secCode: true } });
  const partMap = new Map<string, string>(); for (const p of pt) { if (p.secCode) partMap.set(p.secCode.trim(), p.id); if (p.code) partMap.set(p.code.trim(), p.id); }
  const wh = await prisma.nx01Warehouse.findMany({ where: { tenantId: tid }, select: { id: true, code: true } });
  const whMap = new Map<string, string>(); for (const w of wh) whMap.set(w.code.trim(), w.id); const anyWh = wh[0].id;
  const whOf = (loc: string) => whMap.get((loc || '').slice(0, 3)) ?? anyWh;
  const lc = await prisma.nx01Location.findMany({ where: { tenantId: tid }, select: { id: true, code: true } });
  const locMap = new Map<string, string>(); for (const l of lc) locMap.set(l.code.trim(), l.id);
  const { map: rsim, repaired } = loadRsim();
  console.log(`RSIM ${rsim.size}（修復 ${repaired}）`);

  // 讀明細、分組
  const docs = new Map<string, Row[]>();
  for (const line of readFileSync(TSV, 'utf8').split('\n')) {
    if (!line) continue; const f = line.split('\t');
    (docs.get(f[0]) ?? docs.set(f[0], []).get(f[0])!).push({
      iem: f[1], num: f[2], date: f[3], ptn: f[4], pno: f[5], nam: f[6], lab: f[7], pos: f[8],
      qty: num(f[9]), upc: num(f[10]), amt: num(f[11]), cot: num(f[12]), dcx: num(f[13]) || 1, rmk: f[17] || '',
    });
  }
  console.log(`明細 TSV：${docs.size} 張單`);

  // ── 表頭 ──
  let headers: Prisma.Nx04SoCreateManyInput[] = [];
  let hn = 0, hNoCust = 0, hNoRsim = 0, billed = 0, cancelled = 0;
  const flushH = async () => { if (headers.length) { hn += (await prisma.nx04So.createMany({ data: headers, skipDuplicates: true })).count; headers = []; } };
  for (const [doc, rows] of docs) {
    const h = rsim.get(doc);
    if (!h) hNoRsim++;
    const custCode = h?.num || rows[0].num;
    const cust = custMap.get(custCode);
    if (!cust) { hNoCust++; continue; }
    const soDate = new Date(rows[0].date || h?.ymm || h?.edt || '2025-06-01');
    const createdAt = h?.day ? new Date(h.day) : soDate;
    const lineSum = rows.reduce((s, r) => s + r.amt, 0);
    const total = h?.amt || lineSum;
    const tax = h?.tax || 0;
    const sub = h?.att || total - tax;
    const billing = h && h.rcn && h.rcn !== custCode ? custMap.get(h.rcn) ?? null : null;
    if (billing) billed++;
    const isCancel = h?.rev === 'Y';
    if (isCancel) cancelled++;
    headers.push({
      tenantId: tid, warehouseId: whMap.get(h?.shp?.trim() || '') ?? whOf(rows[0].pos),
      docNo: doc.slice(0, 30), legacyDocNo: doc.slice(0, 20), soDate, customerId: cust,
      billingPartnerId: billing, currencyId: twd,
      deliveryType: h && (h.ppa || h.dly) ? 'D' : 'P',
      deliveryAddress: h?.ppa ? h.ppa.slice(0, 200) : null,
      accountPeriod: h?.edt ? new Date(h.edt) : new Date(soDate.getFullYear(), soDate.getMonth(), 1),
      invoiceCopies: h?.txp === '2' ? 2 : h?.txp === '3' ? 3 : 0,
      taxRate: D((h?.txr || 0) * 100), subtotal: D(sub), taxAmount: D(tax), totalAmount: D(total),
      status: isCancel ? 'CANCELLED' : 'SHIPPED',
      cancelledAt: isCancel ? createdAt : null, cancelledBy: isCancel ? uid : null,
      cancelReason: isCancel ? '偉盟原單沖銷' : null,
      remark: h?.rma ? `${MARK} ${h.rma}`.slice(0, 200) : MARK,
      createdAt, updatedAt: createdAt, createdBy: uid, updatedBy: uid,
    });
    if (headers.length >= BATCH) await flushH();
  }
  await flushH();
  console.log(`表頭 ${hn} 張（客戶查無跳過 ${hNoCust}、無RSIM ${hNoRsim}、帳款對象≠客戶 ${billed}、沖銷 ${cancelled}）`);

  // 回讀 legacyDocNo→soId
  const soIdOf = new Map<string, string>();
  let cursor: string | undefined;
  for (;;) {
    const page = await prisma.nx04So.findMany({ where: win, select: { id: true, legacyDocNo: true }, orderBy: { id: 'asc' }, take: 20000, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}) });
    if (!page.length) break;
    for (const s of page) if (s.legacyDocNo) soIdOf.set(s.legacyDocNo, s.id);
    cursor = page[page.length - 1].id;
    if (page.length < 20000) break;
  }

  // ── 明細 ──
  let buf: Prisma.Nx04SoItemCreateManyInput[] = [];
  let inum = 0, iNoPart = 0, subst = 0;
  const flushI = async () => { if (buf.length) { inum += (await prisma.nx04SoItem.createMany({ data: buf, skipDuplicates: true })).count; buf = []; if (inum % 60000 < BATCH) console.log(`  明細 ${inum}`); } };
  for (const [doc, rows] of docs) {
    const soId = soIdOf.get(doc.slice(0, 20)); if (!soId) continue;
    let ln = 0;
    for (const r of rows) {
      const partId = partMap.get(r.ptn); if (!partId) { iNoPart++; continue; }
      ln++;
      const actual = r.pno && r.pno !== r.ptn ? partMap.get(r.pno) ?? null : null;
      if (actual) subst++;
      const created = r.date ? new Date(r.date) : new Date(rows[0].date || '2025-06-01');
      const rmks = [r.rmk, r.dcx !== 1 ? `折數${r.dcx}` : ''].filter(Boolean).join(' ');
      buf.push({
        soId, lineNo: ln, partId, partNo: r.ptn.slice(0, 50), partName: (r.nam || r.ptn).slice(0, 200),
        brandName: r.lab ? r.lab.slice(0, 100) : null,
        actualPartId: actual, actualPartNo: actual ? r.pno.slice(0, 50) : null,
        warehouseId: whOf(r.pos), locationId: locMap.get(r.pos) ?? null,
        qty: D(r.qty), unitPrice: D(r.upc), unitCost: D(r.cot), lineAmount: D(r.amt),
        remark: rmks ? rmks.slice(0, 200) : null,
        itemStatus: 'C', transferSourceType: 'S', transferStatus: 'C', fulfillStatus: 'F',
        createdAt: created, updatedAt: created, createdBy: uid, updatedBy: uid,
      });
      if (buf.length >= BATCH) await flushI();
    }
  }
  await flushI();
  console.log(`明細 ${inum} 列（料號查無跳過 ${iNoPart}、替代出貨 actualPart ${subst}）`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => disconnectPrisma());
