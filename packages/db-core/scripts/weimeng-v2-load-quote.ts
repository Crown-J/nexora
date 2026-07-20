// packages/db-core/scripts/weimeng-v2-load-quote.ts
// 偉盟報價匯入：RSAA(單頭)/RSAB(單身) CSV → Nx04Quote/Nx04QuoteItem。
//   對照文件：C:\wellan\文件\偉盟單據匯入NEXORA_欄位對照.md（報價段）
//   來源：Crown 從 SSMS 匯出的兩個 CSV（窗口 2025/06-2026/06、逗號分隔、自由文字已清 CR/LF/Tab/雙引號）。
//   冪等：起手自清所有 remark 開頭「偉盟匯入」且 legacyDocNo 非空的報價（本表僅報價、安全）。
//   金額：RAAMT=含稅總額 → totalAmount；subtotal=round(total/1.05)、tax=total−subtotal（5% 回推、RSAA 無未稅欄）。
//   狀態（決策 D6）：歷史報價一律 EXPIRED（過效期、非待辦），validUntil=RAEND 或 quoteDate。
import { prisma, disconnectPrisma } from '../prisma/seed/client';
import { Prisma } from '../generated/prisma';
import { readFileSync } from 'fs';

const DIR = 'C:/nexora/docs/專案/測試資料';
const RSAA = `${DIR}/20260720_RSAA報價單頭_202506-202606.csv`;
const RSAB = `${DIR}/20260720_RSAB報價單身_202506-202606.csv`;
const MARK = '偉盟匯入';
const BATCH = 3000;
const D = (n: number) => new Prisma.Decimal(Number.isFinite(n) ? Math.round(n * 10000) / 10000 : 0);
const D2 = (n: number) => new Prisma.Decimal(Number.isFinite(n) ? Math.round(n * 100) / 100 : 0);
const nz = (s: string | undefined) => { const v = (s || '').trim(); return v === 'NULL' ? '' : v; };
const num = (s: string | undefined) => { const n = +nz(s); return Number.isFinite(n) ? n : 0; };

// 解析 CSV（處理少量逗號位移：以尾端固定欄數右錨，多出的併入指定自由文字欄）
function parseCsv(path: string, ncol: number, textColFromRight: number): string[][] {
  const raw = readFileSync(path, 'utf8').replace(/^﻿/, '');
  const lines = raw.split(/\r?\n/);
  const out: string[][] = [];
  let repaired = 0, skipped = 0;
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    let f = lines[i].split(',');
    if (f.length !== ncol) {
      if (f.length > ncol) {
        // 多出的逗號在自由文字欄：把位移欄併回（右錨保留尾端 textColFromRight 欄結構）
        const surplus = f.length - ncol;
        const mergeAt = ncol - 1 - textColFromRight; // 併入此欄（0-based）
        const merged = f.slice(mergeAt, mergeAt + surplus + 1).join(',');
        f = [...f.slice(0, mergeAt), merged, ...f.slice(mergeAt + surplus + 1)];
        repaired++;
      }
      if (f.length !== ncol) { skipped++; continue; }
    }
    out.push(f);
  }
  console.log(`  ${path.split('/').pop()}：${out.length} 列（修復 ${repaired}、跳過 ${skipped}）`);
  return out;
}

async function main() {
  const t = await prisma.nx99Tenant.findFirst({ where: { code: 'TW-100001' }, select: { id: true } });
  const tid = t!.id;
  const uid = (await prisma.nx01User.findFirst({ where: { tenantId: tid }, orderBy: { userAccount: 'asc' }, select: { id: true } }))!.id;
  const twd = (await prisma.nx01Currency.findFirst({ where: { code: 'TWD' }, select: { id: true } }))!.id;
  const win = { tenantId: tid, remark: { startsWith: MARK }, legacyDocNo: { not: null } };

  // 冪等自清
  const di = await prisma.nx04QuoteItem.deleteMany({ where: { quote: win } });
  const dh = await prisma.nx04Quote.deleteMany({ where: win });
  if (dh.count) console.log(`自清舊報價：明細 ${di.count} / 表頭 ${dh.count}`);

  // 對照表
  const pn = await prisma.nx01Partner.findMany({ where: { tenantId: tid }, select: { id: true, legacyCode: true } });
  const custMap = new Map<string, string>(); for (const p of pn) if (p.legacyCode) custMap.set(p.legacyCode.trim(), p.id);
  const pt = await prisma.nx01Part.findMany({ where: { tenantId: tid }, select: { id: true, code: true, secCode: true } });
  const partMap = new Map<string, string>(); for (const p of pt) { if (p.secCode) partMap.set(p.secCode.trim(), p.id); if (p.code) partMap.set(p.code.trim(), p.id); }
  const wh = await prisma.nx01Warehouse.findMany({ where: { tenantId: tid }, select: { id: true, code: true } });
  const whMap = new Map<string, string>(); for (const w of wh) whMap.set(w.code.trim(), w.id); const anyWh = wh[0].id;

  // ── 單頭 RSAA（16 欄）──
  // 0 RAREN 1 RANUM 2 RADAT 3 RAEND 4 RAPAY 5 RABUY 6 RACLS 7 RAAMT 8 RAMNY 9 RARAT 10 RASHP 11 RAMEN 12 RARMK 13 TRDAT 14 TRMOD 15 TRUSR
  const heads = parseCsv(RSAA, 16, 3); // RARMK 距尾 3 欄
  let headers: Prisma.Nx04QuoteCreateManyInput[] = [];
  let hn = 0, hNoCust = 0, hNoWh = 0;
  const flushH = async () => { if (headers.length) { hn += (await prisma.nx04Quote.createMany({ data: headers, skipDuplicates: true })).count; headers = []; } };
  for (const f of heads) {
    const doc = nz(f[0]); if (!doc) continue;
    const cust = custMap.get(nz(f[1])); if (!cust) { hNoCust++; continue; }
    const wid = whMap.get(nz(f[10])); if (!wid) hNoWh++;
    const qDate = new Date(nz(f[2]) || '2025-06-01');
    const total = num(f[7]);
    const sub = Math.round((total / 1.05) * 100) / 100;
    const raend = nz(f[3]);
    headers.push({
      tenantId: tid, warehouseId: wid ?? anyWh, docNo: doc.slice(0, 30), legacyDocNo: doc.slice(0, 20),
      quoteDate: qDate, customerId: cust, currencyId: twd,
      validUntil: raend ? new Date(raend) : qDate,
      subtotal: D2(sub), taxRate: D(5), taxAmount: D2(total - sub), totalAmount: D2(total),
      status: 'EXPIRED', source: 'FORMAL',
      remark: nz(f[12]) ? `${MARK} ${nz(f[12])}`.slice(0, 200) : MARK,
      createdAt: nz(f[13]) ? new Date(nz(f[13])) : qDate, updatedAt: nz(f[13]) ? new Date(nz(f[13])) : qDate,
      createdBy: uid, updatedBy: uid,
    });
    if (headers.length >= BATCH) await flushH();
  }
  await flushH();
  console.log(`報價表頭 ${hn}（客戶查無跳過 ${hNoCust}、倉別查無退預設 ${hNoWh}）`);

  // 回讀 legacyDocNo→quoteId
  const qIdOf = new Map<string, string>();
  let cursor: string | undefined;
  for (;;) {
    const page = await prisma.nx04Quote.findMany({ where: win, select: { id: true, legacyDocNo: true }, orderBy: { id: 'asc' }, take: 20000, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}) });
    if (!page.length) break;
    for (const s of page) if (s.legacyDocNo) qIdOf.set(s.legacyDocNo, s.id);
    cursor = page[page.length - 1].id;
    if (page.length < 20000) break;
  }

  // ── 單身 RSAB（19 欄）──
  // 0 RBREN 1 RBIEM 2 RBDAT 3 RBNUM 4 RBPTN 5 RBNAM 6 RBLAB 7 RBCLA 8 RBYEA 9 RBQTY 10 RBUPC 11 RBAMT 12 RBDCX 13 RBUNI 14 RBCNO 15 RBREV 16 RBSHP 17 RBRMK 18 RBENM
  const items = parseCsv(RSAB, 19, 0); // RBENM 在最尾
  const lineNoOf = new Map<string, number>();
  let buf: Prisma.Nx04QuoteItemCreateManyInput[] = [];
  let inum = 0, iNoQuote = 0, iNoPart = 0, deselected = 0;
  const flushI = async () => { if (buf.length) { inum += (await prisma.nx04QuoteItem.createMany({ data: buf, skipDuplicates: true })).count; buf = []; if (inum % 60000 < BATCH) console.log(`  明細 ${inum}`); } };
  for (const f of items) {
    const doc = nz(f[0]);
    const quoteId = qIdOf.get(doc.slice(0, 20)); if (!quoteId) { iNoQuote++; continue; }
    const partId = partMap.get(nz(f[4])); if (!partId) { iNoPart++; continue; }
    const ln = (lineNoOf.get(doc) ?? 0) + 1; lineNoOf.set(doc, ln);
    const sel = nz(f[15]) !== 'Y'; if (!sel) deselected++;
    const dcx = num(f[12]) || 1;
    const rmk = [nz(f[17]), nz(f[6]) ? `廠牌${nz(f[6])}` : '', nz(f[18]) ? `EN:${nz(f[18])}` : '', dcx !== 1 ? `折${dcx}` : '']
      .filter(Boolean).join(' ');
    buf.push({
      quoteId, lineNo: ln, partId, partNo: nz(f[4]).slice(0, 50), partName: (nz(f[5]) || nz(f[4])).slice(0, 200),
      qty: D(num(f[9])), unitPrice: D(num(f[10])), lineAmount: D2(num(f[11])), isSelected: sel,
      remark: rmk ? rmk.slice(0, 200) : null,
      createdAt: nz(f[2]) ? new Date(nz(f[2])) : new Date('2025-06-01'), updatedAt: nz(f[2]) ? new Date(nz(f[2])) : new Date('2025-06-01'),
      createdBy: uid, updatedBy: uid,
    });
    if (buf.length >= BATCH) await flushI();
  }
  await flushI();
  console.log(`報價明細 ${inum}（表頭查無跳過 ${iNoQuote}、料號查無跳過 ${iNoPart}、未選 isSelected=false ${deselected}）`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => disconnectPrisma());
