// packages/db-core/scripts/weimeng-load-items.ts
// 偉盟匯入 Phase3b（恢復）：表頭已載入，這支只補明細。記憶體精簡：邊建邊刷、不囤全部。
//   先刪掉上次半途插入的明細，再乾淨重灌。
import { prisma, disconnectPrisma } from '../prisma/seed/client';
import { Prisma } from '../generated/prisma';
import { readFileSync } from 'fs';

const SP = 'C:/Users/User/AppData/Local/Temp/claude/C--nexora/22320be9-6832-4f02-b974-108ae8c2444b/scratchpad';
const MARK = '偉盟匯入';
const D = (n: string) => new Prisma.Decimal(Number.isFinite(+n) ? +n : 0);

async function main() {
  const t = await prisma.nx99Tenant.findFirst({ where: { code: 'TW-100001' }, select: { id: true } });
  const tid = t!.id;
  const uid = (await prisma.nx01User.findFirst({ where: { tenantId: tid }, orderBy: { userAccount: 'asc' }, select: { id: true } }))!.id;

  // 刪上次半途明細
  const del = await prisma.nx04SoItem.deleteMany({ where: { so: { tenantId: tid, remark: MARK } } });
  console.log(`清掉半途明細 ${del.count} 列`);

  // 對照表
  const pt = await prisma.nx01Part.findMany({ where: { tenantId: tid }, select: { id: true, code: true, secCode: true } });
  const partMap = new Map<string, string>(); for (const p of pt) { if (p.secCode) partMap.set(p.secCode.trim(), p.id); if (p.code) partMap.set(p.code.trim(), p.id); }
  const wh = await prisma.nx01Warehouse.findMany({ where: { tenantId: tid }, select: { id: true, code: true } });
  const whMap = new Map<string, string>(); for (const w of wh) whMap.set(w.code.trim(), w.id); const anyWh = wh[0].id;
  const whOf = (loc: string) => whMap.get((loc || '').slice(0, 3)) ?? anyWh;

  // docNo→soId
  const created = await prisma.nx04So.findMany({ where: { tenantId: tid, remark: MARK }, select: { id: true, docNo: true } });
  const soIdOf = new Map<string, string>(); for (const s of created) soIdOf.set(s.docNo, s.id);
  console.log(`表頭 ${soIdOf.size} 張`);

  // 串流建明細、邊刷
  const lineNoOf = new Map<string, number>();
  let buf: Prisma.Nx04SoItemCreateManyInput[] = [];
  let n = 0, skip = 0;
  const lines = readFileSync(`${SP}/sales.tsv`, 'utf8').split('\n');
  for (const line of lines) {
    if (!line) continue;
    const f = line.split('\t');
    const soId = soIdOf.get((f[0] || '').slice(0, 30));
    const partId = partMap.get((f[4] || '').trim());
    if (!soId || !partId) { skip++; continue; }
    const ln = (lineNoOf.get(f[0]) ?? 0) + 1; lineNoOf.set(f[0], ln);
    buf.push({
      soId, lineNo: ln, partId, partNo: (f[4] || '').slice(0, 50), partName: (f[5] || f[4] || '').slice(0, 200),
      warehouseId: whOf(f[7]), qty: D(f[8]), unitPrice: D(f[9]), lineAmount: D(f[10]),
      itemStatus: 'C', transferSourceType: 'S', transferStatus: 'C', fulfillStatus: 'C',
      createdAt: new Date(f[2]), updatedAt: new Date(f[2]), createdBy: uid, updatedBy: uid,
    });
    if (buf.length >= 2000) { n += (await prisma.nx04SoItem.createMany({ data: buf })).count; buf = []; if (n % 40000 === 0) console.log(`  明細 ${n}`); }
  }
  if (buf.length) n += (await prisma.nx04SoItem.createMany({ data: buf })).count;
  console.log(`明細載入 ${n} 列 / 跳過 ${skip}`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => disconnectPrisma());
