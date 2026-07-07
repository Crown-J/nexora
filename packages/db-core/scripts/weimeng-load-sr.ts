// packages/db-core/scripts/weimeng-load-sr.ts
// 銷退軌 Step3：載入偉盟銷退(4) → Nx04Sr/Nx04SrItem。吃年檔參數、逐單連續分塊（記憶體安全）。
//   ⭐ soId / soItemId = null（偉盟無原單參照、Crown 拍板 DB 可空供匯入）。
//   唯讀歷史：status='POSTED'、remark='偉盟匯入'、不過帳不動庫存。
//   必填預設：returnMethod='S'(客戶送回)、returnReason='O'(其他)、returnPolicy='S'(標準)、returnType='N'。
//   金額：subtotal=total=Σ(數量×單價)、taxRate=0（唯讀、稅不強算）。
import { prisma, disconnectPrisma } from '../prisma/seed/client';
import { Prisma } from '../generated/prisma';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

const SP = 'C:/Users/User/AppData/Local/Temp/claude/C--nexora/d101259f-e37a-4362-9aaf-8ad1312ba8e6/scratchpad';
const TSV = process.argv[2] || `${SP}/sr.tsv`;
const MARK = '偉盟匯入';
const CHUNK = 2000, ITEM_BATCH = 3000;
const D = (n: number) => new Prisma.Decimal(Number.isFinite(n) ? n : 0);
const num = (s: string) => { const n = +s; return Number.isFinite(n) ? n : 0; };

type Doc = { doc: string; cust: string; date: string; loc: string; tot: number; rows: { part: string; pname: string; loc: string; qty: string; price: string; total: string }[] };

async function main() {
  const t = await prisma.nx99Tenant.findFirst({ where: { code: 'TW-100001' }, select: { id: true } });
  const tid = t!.id;
  const uid = (await prisma.nx01User.findFirst({ where: { tenantId: tid }, orderBy: { userAccount: 'asc' }, select: { id: true } }))!.id;

  const pn = await prisma.nx01Partner.findMany({ where: { tenantId: tid }, select: { id: true, legacyCode: true } });
  const custMap = new Map<string, string>(); for (const p of pn) if (p.legacyCode) custMap.set(p.legacyCode.trim(), p.id);
  const wh = await prisma.nx01Warehouse.findMany({ where: { tenantId: tid }, select: { id: true, code: true } });
  const whMap = new Map<string, string>(); for (const w of wh) whMap.set(w.code.trim(), w.id); const anyWh = wh[0].id;
  const whOf = (loc: string) => whMap.get((loc || '').slice(0, 3)) ?? anyWh;
  const lc = await prisma.nx01Location.findMany({ where: { tenantId: tid }, select: { id: true, code: true } });
  const locMap = new Map<string, string>(); for (const l of lc) locMap.set(l.code.trim(), l.id);
  const partMap = new Map<string, string>();
  const pt = await prisma.nx01Part.findMany({ where: { tenantId: tid }, select: { id: true, code: true, secCode: true } });
  for (const p of pt) { if (p.secCode) partMap.set(p.secCode.trim(), p.id); if (p.code) partMap.set(p.code.trim(), p.id); }

  let hn = 0, inum = 0, hskip = 0, iskip = 0, chunkN = 0;
  const processChunk = async (docs: Doc[]) => {
    const headers: Prisma.Nx04SrCreateManyInput[] = [];
    for (const d of docs) {
      const cust = custMap.get(d.cust); if (!cust) { d.rows = []; continue; }
      const tot = D(d.tot);
      headers.push({
        tenantId: tid, warehouseId: whOf(d.loc), docNo: d.doc.slice(0, 30), srDate: new Date(d.date), customerId: cust,
        soId: null, returnMethod: 'S', status: 'POSTED', subtotal: tot, taxRate: D(0), taxAmount: D(0), totalAmount: tot,
        remark: MARK, createdAt: new Date(d.date), updatedAt: new Date(d.date), createdBy: uid, updatedBy: uid,
      });
    }
    hskip += docs.length - headers.length;
    if (headers.length) hn += (await prisma.nx04Sr.createMany({ data: headers, skipDuplicates: true })).count;
    const back = await prisma.nx04Sr.findMany({ where: { tenantId: tid, remark: MARK, docNo: { in: headers.map((h) => h.docNo) } }, select: { id: true, docNo: true } });
    const idOf = new Map<string, string>(); for (const b of back) idOf.set(b.docNo, b.id);

    let buf: Prisma.Nx04SrItemCreateManyInput[] = [];
    const flush = async () => { if (buf.length) { inum += (await prisma.nx04SrItem.createMany({ data: buf, skipDuplicates: true })).count; buf = []; } };
    for (const d of docs) {
      const srId = idOf.get(d.doc.slice(0, 30)); if (!srId) continue;
      let ln = 0;
      for (const r of d.rows) {
        const partId = partMap.get(r.part.trim()); if (!partId) { iskip++; continue; }
        ln++;
        buf.push({
          srId, soItemId: null, lineNo: ln, partId, partNo: r.part.slice(0, 50), partName: (r.pname || r.part).slice(0, 200),
          returnPolicy: 'S', returnType: 'N', returnReason: 'O', qty: D(num(r.qty)), unitPrice: D(num(r.price)), lineAmount: D(num(r.total)),
          locationId: locMap.get((r.loc || '').trim()) ?? null,
          createdAt: new Date(d.date), updatedAt: new Date(d.date), createdBy: uid, updatedBy: uid,
        });
        if (buf.length >= ITEM_BATCH) await flush();
      }
    }
    await flush();
    chunkN++;
    if (chunkN % 20 === 0) console.log(`  已處理 ${chunkN} 批 / SR ${hn} / 明細 ${inum}`);
  };

  const rl = createInterface({ input: createReadStream(TSV), crlfDelay: Infinity });
  let cur: Doc | null = null, pending: Doc[] = [];
  for await (const line of rl) {
    if (!line) continue; const f = line.split('\t'); const doc = f[0];
    if (!cur || cur.doc !== doc) {
      if (cur) { pending.push(cur); if (pending.length >= CHUNK) { await processChunk(pending); pending = []; } }
      cur = { doc, cust: f[3], date: f[2], loc: f[7], tot: 0, rows: [] };
    }
    cur.tot += num(f[10]);
    cur.rows.push({ part: f[4], pname: f[5], loc: f[7], qty: f[8], price: f[9], total: f[10] });
  }
  if (cur) pending.push(cur);
  if (pending.length) await processChunk(pending);
  console.log(`完成：銷退 SR ${hn} 張 / 明細 ${inum} 列（客戶查無跳過 ${hskip} 單、料號查無跳過 ${iskip} 列；soId/soItemId=null、status=POSTED 唯讀）`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => disconnectPrisma());
