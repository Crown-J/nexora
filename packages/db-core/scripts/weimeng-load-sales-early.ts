// packages/db-core/scripts/weimeng-load-sales-early.ts
// 偉盟續作 Phase C：載入早年銷貨 2001~2023（~264萬列 / 141萬張）到 Nx04So/Nx04SoItem。
//   唯讀歷史：status='C'、remark='偉盟匯入'、不過帳不動庫存。
//   ⚠️ 記憶體：tsv 已驗證「照單號完全連續」→ 逐單連續分塊，每 CHUNK 張單一批（建表頭→回讀id→建明細），
//      永不持有百萬級 Map（舊 agg 全表版 OOM 8GB）。配 NODE_OPTIONS=--max-old-space-size=8192 保險。
import { prisma, disconnectPrisma } from '../prisma/seed/client';
import { Prisma } from '../generated/prisma';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

const SP = 'C:/Users/User/AppData/Local/Temp/claude/C--nexora/d101259f-e37a-4362-9aaf-8ad1312ba8e6/scratchpad';
// 可傳入年檔路徑（逐年獨立程序、避免 readline 緩衝大檔 OOM）；未傳則全檔。
const TSV = process.argv[2] || `${SP}/sales_early.tsv`;
const MARK = '偉盟匯入';
const CHUNK = 2000;        // 每批單數（表頭一次 createMany）
const ITEM_BATCH = 3000;   // 明細子批（避開 Postgres 參數上限）
const D = (n: number) => new Prisma.Decimal(Number.isFinite(n) ? n : 0);
const num = (s: string) => { const n = +s; return Number.isFinite(n) ? n : 0; };

type Doc = { doc: string; cust: string; date: string; loc: string; sub: number; tot: number; rows: { part: string; pname: string; loc: string; qty: string; price: string; total: string }[] };

async function main() {
  const t = await prisma.nx99Tenant.findFirst({ where: { code: 'TW-100001' }, select: { id: true } });
  const tid = t!.id;
  const uid = (await prisma.nx01User.findFirst({ where: { tenantId: tid }, orderBy: { userAccount: 'asc' }, select: { id: true } }))!.id;
  const twd = (await prisma.nx01Currency.findFirst({ where: { code: 'TWD' }, select: { id: true } }))!.id;

  const pn = await prisma.nx01Partner.findMany({ where: { tenantId: tid }, select: { id: true, legacyCode: true } });
  const custMap = new Map<string, string>(); for (const p of pn) if (p.legacyCode) custMap.set(p.legacyCode.trim(), p.id);
  const wh = await prisma.nx01Warehouse.findMany({ where: { tenantId: tid }, select: { id: true, code: true } });
  const whMap = new Map<string, string>(); for (const w of wh) whMap.set(w.code.trim(), w.id); const anyWh = wh[0].id;
  const whOf = (loc: string) => whMap.get((loc || '').slice(0, 3)) ?? anyWh;
  const partMap = new Map<string, string>();
  const pt = await prisma.nx01Part.findMany({ where: { tenantId: tid }, select: { id: true, code: true, secCode: true } });
  for (const p of pt) { if (p.secCode) partMap.set(p.secCode.trim(), p.id); if (p.code) partMap.set(p.code.trim(), p.id); }
  console.log(`對照載入：客戶 ${custMap.size} / 料號 ${partMap.size} / 倉 ${whMap.size}`);

  let hn = 0, inum = 0, hskip = 0, iskip = 0, chunkN = 0;

  const processChunk = async (docs: Doc[]) => {
    // 1) 表頭
    const headers: Prisma.Nx04SoCreateManyInput[] = [];
    for (const d of docs) {
      const cust = custMap.get(d.cust); if (!cust) { d.rows = []; continue; } // 標記跳過（rows 清空）
      const sub = D(d.sub), tot = D(d.tot); const tax = tot.sub(sub);
      headers.push({
        tenantId: tid, warehouseId: whOf(d.loc), docNo: d.doc.slice(0, 30), soDate: new Date(d.date), customerId: cust,
        currencyId: twd, deliveryType: 'S', taxRate: D(5), subtotal: sub, taxAmount: tax.gte(0) ? tax : D(0), totalAmount: tot,
        status: 'C', completedAt: new Date(d.date), remark: MARK, createdAt: new Date(d.date), updatedAt: new Date(d.date), createdBy: uid, updatedBy: uid,
      });
    }
    hskip += docs.length - headers.length;
    if (headers.length) hn += (await prisma.nx04So.createMany({ data: headers, skipDuplicates: true })).count;

    // 2) 回讀本批 docNo→soId
    const docNos = headers.map((h) => h.docNo);
    const back = await prisma.nx04So.findMany({ where: { tenantId: tid, remark: MARK, docNo: { in: docNos } }, select: { id: true, docNo: true } });
    const idOf = new Map<string, string>(); for (const b of back) idOf.set(b.docNo, b.id);

    // 3) 明細（子批 flush）
    let buf: Prisma.Nx04SoItemCreateManyInput[] = [];
    const flush = async () => { if (buf.length) { inum += (await prisma.nx04SoItem.createMany({ data: buf, skipDuplicates: true })).count; buf = []; } };
    for (const d of docs) {
      const soId = idOf.get(d.doc.slice(0, 30)); if (!soId) continue;
      let ln = 0;
      for (const r of d.rows) {
        const partId = partMap.get(r.part.trim()); if (!partId) { iskip++; continue; }
        ln++;
        buf.push({
          soId, lineNo: ln, partId, partNo: r.part.slice(0, 50), partName: (r.pname || r.part).slice(0, 200),
          warehouseId: whOf(r.loc), qty: D(num(r.qty)), unitPrice: D(num(r.price)), lineAmount: D(num(r.total)),
          itemStatus: 'C', transferSourceType: 'S', transferStatus: 'C', fulfillStatus: 'C',
          createdAt: new Date(d.date), updatedAt: new Date(d.date), createdBy: uid, updatedBy: uid,
        });
        if (buf.length >= ITEM_BATCH) await flush();
      }
    }
    await flush();
    chunkN++;
    if (chunkN % 50 === 0) console.log(`  已處理 ${chunkN} 批 / 表頭 ${hn} / 明細 ${inum}`);
  };

  // 連續逐單串流
  const rl = createInterface({ input: createReadStream(TSV), crlfDelay: Infinity });
  let cur: Doc | null = null;
  let pending: Doc[] = [];
  for await (const line of rl) {
    if (!line) continue;
    const f = line.split('\t');
    const doc = f[0];
    if (!cur || cur.doc !== doc) {
      if (cur) { pending.push(cur); if (pending.length >= CHUNK) { await processChunk(pending); pending = []; } }
      cur = { doc, cust: f[3], date: f[2], loc: f[7], sub: 0, tot: 0, rows: [] };
    }
    cur.sub += num(f[11]); cur.tot += num(f[10]);
    cur.rows.push({ part: f[4], pname: f[5], loc: f[7], qty: f[8], price: f[9], total: f[10] });
  }
  if (cur) pending.push(cur);
  if (pending.length) await processChunk(pending);

  console.log(`完成：早年銷貨 SO ${hn} 張 / 明細 ${inum} 列（客戶查無跳過 ${hskip} 單、料號查無跳過 ${iskip} 列；remark=${MARK}、status=C 唯讀）`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => disconnectPrisma());
