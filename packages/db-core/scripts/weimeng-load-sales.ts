// packages/db-core/scripts/weimeng-load-sales.ts
// 偉盟匯入 Phase3：把 sales.tsv 組成 Nx04So(表頭)+Nx04SoItem(明細) bulk 載入。
//   唯讀歷史：status='C'(完成)、不過帳不動庫存。docNo=偉盟單號、remark='偉盟匯入'。
import { prisma, disconnectPrisma } from '../prisma/seed/client';
import { Prisma } from '../generated/prisma';
import { readFileSync } from 'fs';

const SP = 'C:/Users/User/AppData/Local/Temp/claude/C--nexora/22320be9-6832-4f02-b974-108ae8c2444b/scratchpad';
const MARK = '偉盟匯入';
const D = (n: number) => new Prisma.Decimal(Number.isFinite(+n) ? +n : 0);

async function main() {
  const t = await prisma.nx99Tenant.findFirst({ where: { code: 'TW-100001' }, select: { id: true } });
  const tid = t!.id;
  const uid = (await prisma.nx01User.findFirst({ where: { tenantId: tid }, orderBy: { userAccount: 'asc' }, select: { id: true } }))!.id;
  const twd = (await prisma.nx01Currency.findFirst({ where: { code: 'TWD' }, select: { id: true } }))!.id;

  // 對照表
  const pn = await prisma.nx01Partner.findMany({ where: { tenantId: tid }, select: { id: true, legacyCode: true } });
  const custMap = new Map<string, string>(); for (const p of pn) if (p.legacyCode) custMap.set(p.legacyCode.trim(), p.id);
  const pt = await prisma.nx01Part.findMany({ where: { tenantId: tid }, select: { id: true, code: true, secCode: true } });
  const partMap = new Map<string, string>(); for (const p of pt) { if (p.secCode) partMap.set(p.secCode.trim(), p.id); if (p.code) partMap.set(p.code.trim(), p.id); }
  const wh = await prisma.nx01Warehouse.findMany({ where: { tenantId: tid }, select: { id: true, code: true } });
  const whMap = new Map<string, string>(); for (const w of wh) whMap.set(w.code.trim(), w.id);
  const anyWh = wh[0].id;

  // 讀 sales.tsv、依單號分組（保順序）
  type Row = { seq: string; date: string; cust: string; part: string; pname: string; loc: string; qty: string; price: string; total: string; nett: string };
  const docs = new Map<string, Row[]>();
  const lines = readFileSync(`${SP}/sales.tsv`, 'utf8').split('\n');
  for (const line of lines) {
    if (!line) continue;
    const f = line.split('\t');
    const doc = f[0];
    (docs.get(doc) ?? docs.set(doc, []).get(doc)!).push({
      seq: f[1], date: f[2], cust: f[3], part: f[4], pname: f[5], loc: f[7], qty: f[8], price: f[9], total: f[10], nett: f[11],
    });
  }
  console.log(`單號 ${docs.size} 張 / 明細 ${lines.length - (lines[lines.length - 1] ? 0 : 1)} 列`);

  // ── 表頭 ──
  const whOf = (loc: string) => whMap.get((loc || '').slice(0, 3)) ?? anyWh;
  const headers: Prisma.Nx04SoCreateManyInput[] = [];
  for (const [doc, rows] of docs) {
    const r0 = rows[0];
    const cust = custMap.get(r0.cust);
    if (!cust) continue; // 客戶查無（理論上已補齊）
    let sub = D(0), tot = D(0);
    for (const r of rows) { sub = sub.add(D(r.nett)); tot = tot.add(D(r.total)); }
    const tax = tot.sub(sub);
    headers.push({
      tenantId: tid, warehouseId: whOf(r0.loc), docNo: doc.slice(0, 30), soDate: new Date(r0.date), customerId: cust,
      currencyId: twd, deliveryType: 'S', taxRate: D(5), subtotal: sub, taxAmount: tax.gte(0) ? tax : D(0), totalAmount: tot,
      status: 'C', completedAt: new Date(r0.date), remark: MARK, createdAt: new Date(r0.date), updatedAt: new Date(r0.date),
      createdBy: uid, updatedBy: uid,
    });
  }
  let hn = 0;
  for (let i = 0; i < headers.length; i += 2000) { hn += (await prisma.nx04So.createMany({ data: headers.slice(i, i + 2000), skipDuplicates: true })).count; if (i % 40000 === 0) console.log(`  表頭 ${i}/${headers.length}`); }
  console.log(`表頭載入 ${hn} 張`);

  // 回讀 docNo→soId
  const created = await prisma.nx04So.findMany({ where: { tenantId: tid, remark: MARK }, select: { id: true, docNo: true } });
  const soIdOf = new Map<string, string>(); for (const s of created) soIdOf.set(s.docNo, s.id);

  // ── 明細 ──
  const items: Prisma.Nx04SoItemCreateManyInput[] = [];
  for (const [doc, rows] of docs) {
    const soId = soIdOf.get(doc.slice(0, 30)); if (!soId) continue;
    let ln = 0;
    for (const r of rows) {
      const partId = partMap.get(r.part); if (!partId) continue;
      ln++;
      items.push({
        soId, lineNo: ln, partId, partNo: r.part.slice(0, 50), partName: (r.pname || r.part).slice(0, 200),
        warehouseId: whOf(r.loc), qty: D(r.qty), unitPrice: D(r.price), lineAmount: D(r.total),
        itemStatus: 'C', transferSourceType: 'S', transferStatus: 'C', fulfillStatus: 'C',
        createdAt: new Date(r.date), updatedAt: new Date(r.date), createdBy: uid, updatedBy: uid,
      });
    }
  }
  let inum = 0;
  for (let i = 0; i < items.length; i += 2000) { inum += (await prisma.nx04SoItem.createMany({ data: items.slice(i, i + 2000), skipDuplicates: true })).count; if (i % 40000 === 0) console.log(`  明細 ${i}/${items.length}`); }
  console.log(`明細載入 ${inum} 列`);
  console.log(`完成：SO ${hn} 張 / 明細 ${inum} 列（remark=${MARK}、status=C 唯讀歷史）`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => disconnectPrisma());
