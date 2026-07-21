// packages/db-core/scripts/weimeng-v2-load-inquiry.ts
// 偉盟詢價匯入：RSQA(頭)/RSQB(身) → 依「行為」分流兩張 NEXORA 原生表。
//   對照文件：C:\wellan\文件\偉盟單據匯入NEXORA_欄位對照.md（詢價段）
//   偉盟詢價＝向廠商詢價（國內/國外，RATYP=I/O），依對象行為分：
//     供應商 S       → 採購進貨詢價 → Nx02Rfq + Nx02RfqItem（rfqType=G、status=C）
//     材料行/同業 其餘 → 銷售調貨詢價 → Nx04InquiryRecord（原子日誌、每行一筆）
//       （含 NEXORA 歸類為客戶 C 的汽車材料行/同業，行為上仍是調貨詢價）
//   幣別 NTD→TWD；冪等：兩表各以 remark 開頭「偉盟匯入」自清。
import { prisma, disconnectPrisma } from '../prisma/seed/client';
import { Prisma } from '../generated/prisma';
import { readFileSync } from 'fs';

const DIR = 'C:/nexora/docs/專案/測試資料';
const RSQA = `${DIR}/20260720_RSQA詢價單頭_202506-202606.csv`;
const RSQB = `${DIR}/20260720_RSQB詢價單身_202506-202606.csv`;
const MARK = '偉盟匯入';
const BATCH = 2000;
const D = (n: number) => new Prisma.Decimal(Number.isFinite(n) ? Math.round(n * 10000) / 10000 : 0);
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

  const pn = await prisma.nx01Partner.findMany({ where: { tenantId: tid }, select: { id: true, legacyCode: true, partnerType: true } });
  const pInfo = new Map<string, { id: string; type: string }>();
  for (const p of pn) if (p.legacyCode) pInfo.set(p.legacyCode.trim(), { id: p.id, type: p.partnerType });
  const pt = await prisma.nx01Part.findMany({ where: { tenantId: tid }, select: { id: true, code: true, secCode: true } });
  const partMap = new Map<string, string>(); for (const p of pt) { if (p.secCode) partMap.set(p.secCode.trim(), p.id); if (p.code) partMap.set(p.code.trim(), p.id); }
  const wh = await prisma.nx01Warehouse.findMany({ where: { tenantId: tid }, select: { id: true, code: true } });
  const whMap = new Map<string, string>(); for (const w of wh) whMap.set(w.code.trim(), w.id); const anyWh = wh[0].id;
  const whOf = (loc: string) => whMap.get((loc || '').slice(0, 3)) ?? anyWh;
  const cur = await prisma.nx01Currency.findMany({ select: { id: true, code: true } });
  const curMap = new Map<string, string>(); for (const c of cur) curMap.set(c.code, c.id);
  const twd = curMap.get('TWD')!;
  const curOf = (code: string) => curMap.get(code === 'NTD' ? 'TWD' : code) ?? twd;

  // 冪等自清
  {
    const rfqs = await prisma.nx02Rfq.findMany({ where: { tenantId: tid, remark: { startsWith: MARK } }, select: { id: true } });
    if (rfqs.length) {
      await prisma.nx02RfqItem.deleteMany({ where: { rfqId: { in: rfqs.map((r) => r.id) } } });
      await prisma.nx02Rfq.deleteMany({ where: { id: { in: rfqs.map((r) => r.id) } } });
      console.log(`自清舊進貨詢價 Rfq ${rfqs.length} 張`);
    }
    const iq = await prisma.nx04InquiryRecord.deleteMany({ where: { tenantId: tid, remark: { startsWith: MARK } } });
    if (iq.count) console.log(`自清舊調貨詢價 InquiryRecord ${iq.count} 筆`);
  }

  // 單頭 RSQA（18 欄）：0 RAREN 1 RATYP 2 RANUM 3 RARCN 4 RADAT 5 RAEND 6 RABUY 7 RAPAY 8 RAMEN 9 RASAL 10 RAMNY 11 RARAT 12 RAAMT 13 RASHP 14 RARMK 15 TRDAT 16 TRMOD 17 TRUSR
  const headRows = parseCsv(RSQA, 18);
  type H = { ptype: string; pid: string; date: string; whId: string; cur: string; sal: string; typ: string; rmk: string };
  const headOf = new Map<string, H>();
  let noPartner = 0;
  for (const f of headRows) {
    const doc = nz(f[0]); if (!doc) continue;
    const pi = pInfo.get(nz(f[2])); if (!pi) { noPartner++; continue; }
    headOf.set(doc, {
      ptype: pi.type, pid: pi.id, date: (nz(f[4]) || '2025-06-01').slice(0, 19),
      whId: nz(f[13]) ? (whMap.get(nz(f[13])) ?? anyWh) : anyWh, cur: curOf(nz(f[10])),
      sal: nz(f[9]) && nz(f[9]) !== 'N' ? nz(f[9]) : '', typ: nz(f[1]), rmk: nz(f[14]),
    });
  }
  console.log(`RSQA 表頭 ${headOf.size}（對象查無 partner 跳過 ${noPartner}）`);

  // 單身 RSQB（20 欄）：0 RBREN 1 RBIEM 2 RBPTN 3 RBNAM 4 RBENM 5 RBMTA 6 RBCOR 7 RBLAB 8 RBCLA 9 RBYEA 10 RBQTY 11 RBUNI 12 RBMNY 13 RBUPC 14 RBAMT 15 RBPPD 16 RBDCX 17 RBSHP 18 RBCNO 19 RBRMK
  const itemRows = parseCsv(RSQB, 20);

  // 進貨詢價（S）：group by doc → Nx02Rfq + Item
  const rfqDocs = new Map<string, string[][]>();
  // 調貨詢價（其餘）：atomic InquiryRecord
  const inquiryData: Prisma.Nx04InquiryRecordCreateManyInput[] = [];
  let noHead = 0, noPart = 0;
  for (const f of itemRows) {
    const doc = nz(f[0]); const h = headOf.get(doc); if (!h) { noHead++; continue; }
    const partId = partMap.get(nz(f[2])); if (!partId) { noPart++; continue; }
    if (h.ptype === 'S') {
      (rfqDocs.get(doc) ?? rfqDocs.set(doc, []).get(doc)!).push(f);
    } else {
      inquiryData.push({
        tenantId: tid, recordDate: new Date(h.date), sourcePartnerId: h.pid, partId,
        partNo: nz(f[2]).slice(0, 50), partName: (nz(f[3]) || nz(f[2])).slice(0, 200),
        warehouseId: nz(f[17]) ? whOf(nz(f[17])) : h.whId,
        qty: D(num(f[10]) || 1), unitPrice: D(num(f[13])), currencyId: curOf(nz(f[12])) || h.cur,
        salesPersonId: h.sal || null,
        remark: `${MARK} ${doc}${h.typ === 'O' ? ' 國外' : ''}${nz(f[19]) ? ' ' + nz(f[19]) : ''}`.slice(0, 200),
        createdBy: uid, updatedBy: uid, createdAt: new Date(h.date), updatedAt: new Date(h.date),
      });
    }
  }

  // 建 InquiryRecord（調貨詢價）
  let iqn = 0;
  for (let i = 0; i < inquiryData.length; i += BATCH) iqn += (await prisma.nx04InquiryRecord.createMany({ data: inquiryData.slice(i, i + BATCH) })).count;
  console.log(`調貨詢價 InquiryRecord ${iqn} 筆`);

  // 建 Nx02Rfq（進貨詢價）表頭 + 明細
  let rfqN = 0, rfqItemN = 0, ordr = 0;
  const rfqHeaders: Prisma.Nx02RfqCreateManyInput[] = [];
  const docToRfqId = new Map<string, string>();
  for (const [doc, rows] of rfqDocs) {
    const h = headOf.get(doc)!;
    const rid = pad('NX02RFHT', ++ordr);
    docToRfqId.set(doc, rid);
    rfqHeaders.push({
      id: rid, tenantId: tid, docNo: doc.slice(0, 30), rfqDate: new Date(h.date),
      supplierId: h.pid, warehouseId: h.whId, currency: (cur.find((c) => c.id === h.cur)?.code) ?? 'TWD',
      status: 'C', rfqType: 'G', rfqReason: 'S',
      remark: `${MARK} ${doc}${h.typ === 'O' ? ' 國外' : ''}${h.rmk ? ' ' + h.rmk : ''}`.slice(0, 200),
      createdBy: uid, updatedBy: uid, createdAt: new Date(h.date), updatedAt: new Date(h.date),
    });
  }
  for (let i = 0; i < rfqHeaders.length; i += BATCH) rfqN += (await prisma.nx02Rfq.createMany({ data: rfqHeaders.slice(i, i + BATCH), skipDuplicates: true })).count;
  console.log(`進貨詢價 Rfq 表頭 ${rfqN} 張`);

  const rfqItems: Prisma.Nx02RfqItemCreateManyInput[] = [];
  let it = 0;
  for (const [doc, rows] of rfqDocs) {
    const rid = docToRfqId.get(doc)!; const h = headOf.get(doc)!;
    let ln = 0;
    for (const f of rows) {
      const partId = partMap.get(nz(f[2])); if (!partId) continue;
      ln++;
      rfqItems.push({
        id: pad('NX02RFIT', ++it), rfqId: rid, lineNo: ln, partId,
        partNo: nz(f[2]).slice(0, 50), partName: (nz(f[3]) || nz(f[2])).slice(0, 200),
        qty: D(num(f[10])), unitPrice: D(num(f[13])), currencyId: curOf(nz(f[12])) || h.cur,
        status: 'R', remark: nz(f[19]) ? nz(f[19]).slice(0, 200) : null,
        createdBy: uid, updatedBy: uid, createdAt: new Date(h.date), updatedAt: new Date(h.date),
      });
    }
  }
  for (let i = 0; i < rfqItems.length; i += BATCH) rfqItemN += (await prisma.nx02RfqItem.createMany({ data: rfqItems.slice(i, i + BATCH), skipDuplicates: true })).count;
  console.log(`進貨詢價 RfqItem ${rfqItemN} 列`);
  console.log(`（明細表頭查無跳過 ${noHead}、料號查無跳過 ${noPart}）`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => disconnectPrisma());
