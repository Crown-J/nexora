// packages/db-core/scripts/weimeng-placeholders.ts
// 偉盟匯入 Phase2：為銷貨用到、但主檔沒有的 客戶/料號 建 placeholder，並產維護清單。
//   客戶：配下一個 C#### 碼、legacyCode=舊碼、名稱優先取客戶檔、否則標【待維護】。
//   料號：code=料號本身、secCode=同、名稱取銷貨品名、否則標【待維護】。
import { prisma, disconnectPrisma } from '../prisma/seed/client';
import { readFileSync, writeFileSync, createReadStream } from 'fs';
import { parse } from 'csv-parse';

const SP = 'C:/Users/User/AppData/Local/Temp/claude/C--nexora/22320be9-6832-4f02-b974-108ae8c2444b/scratchpad';
const CUST_CSV = 'C:/nexora/docs/專案/測試資料/20260604_客戶資料.csv';

function rdSet(f: string): Set<string> {
  return new Set(readFileSync(`${SP}/${f}`, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean));
}

async function main() {
  const t = await prisma.nx99Tenant.findFirst({ where: { code: 'TW-100001' }, select: { id: true } });
  const tid = t!.id;
  const sysUser = await prisma.nx01User.findFirst({ where: { tenantId: tid }, select: { id: true }, orderBy: { userAccount: 'asc' } });
  const uid = sysUser!.id;

  // ── 缺客戶 ──
  const cust = rdSet('sales_cust.txt');
  const pn = await prisma.nx01Partner.findMany({ where: { tenantId: tid }, select: { legacyCode: true } });
  const dbLeg = new Set(pn.map((x) => (x.legacyCode || '').trim()).filter(Boolean));
  const missCust = [...cust].filter((c) => !dbLeg.has(c)).sort();

  // 客戶檔 code→name
  const custName = new Map<string, string>();
  await new Promise<void>((res, rej) => {
    const p = createReadStream(CUST_CSV).pipe(parse({ relax_quotes: true, relax_column_count: true, skip_empty_lines: true, bom: true, from_line: 2 }));
    p.on('data', (r: string[]) => { const c = (r[0] || '').trim(); if (c && !custName.has(c)) custName.set(c, (r[2] || '').trim()); });
    p.on('end', () => res()); p.on('error', rej);
  });

  // 缺料號 + 品名（銷貨 tsv：料號=f4, 品名=f5）
  const part = rdSet('sales_part.txt');
  const pt = await prisma.nx01Part.findMany({ where: { tenantId: tid }, select: { code: true, secCode: true } });
  const dbPart = new Set<string>(); for (const p of pt) { if (p.code) dbPart.add(p.code.trim()); if (p.secCode) dbPart.add(p.secCode.trim()); }
  const missPart = [...part].filter((p) => !dbPart.has(p)).sort();
  const partName = new Map<string, string>();
  for (const line of readFileSync(`${SP}/sales.tsv`, 'utf8').split('\n')) {
    const f = line.split('\t'); const code = (f[4] || '').trim();
    if (code && !partName.has(code)) partName.set(code, (f[5] || '').trim());
  }

  // ── 配客戶 C#### 碼（取現有最大 + 1）──
  const cs = await prisma.nx01Partner.findMany({ where: { tenantId: tid, code: { startsWith: 'C' } }, select: { code: true } });
  let maxC = 0; for (const c of cs) { const m = (c.code || '').match(/^C(\d{4})$/); if (m) maxC = Math.max(maxC, +m[1]); }

  const custList: string[] = [];
  for (const leg of missCust) {
    maxC++;
    const code = `C${String(maxC).padStart(4, '0')}`;
    const nm = custName.get(leg) || '';
    const name = (nm ? nm : leg).slice(0, 110) + '【待維護-偉盟匯入】';
    await prisma.nx01Partner.create({ data: { tenantId: tid, code, name: name.slice(0, 120), legacyCode: leg, partnerType: 'C', isActive: true, createdBy: uid, updatedBy: uid } });
    custList.push(`${code}\t${leg}\t${nm || '(客戶檔亦無名)'}`);
  }
  // bump PARTNER_C 計數器
  await prisma.nx01SeqCounter.upsert({ where: { tenantId_scope: { tenantId: tid, scope: 'PARTNER_C' } }, create: { tenantId: tid, scope: 'PARTNER_C', nextNo: maxC + 1 }, update: { nextNo: maxC + 1 } });

  // ── 建料號 placeholder（code=料號）──
  const partList: string[] = [];
  const BATCH = 1000;
  for (let i = 0; i < missPart.length; i += BATCH) {
    const chunk = missPart.slice(i, i + BATCH);
    await prisma.nx01Part.createMany({
      data: chunk.map((code) => {
        const nm = partName.get(code) || '';
        return { tenantId: tid, code, secCode: code, name: ((nm || code) + ' 【待維護-偉盟匯入】').slice(0, 200), createdBy: uid, updatedBy: uid };
      }),
      skipDuplicates: true,
    });
    for (const code of chunk) partList.push(`${code}\t${partName.get(code) || '(無品名)'}`);
  }

  writeFileSync(`${SP}/placeholder_customers.tsv`, '代號\t舊碼\t名稱\n' + custList.join('\n'));
  writeFileSync(`${SP}/placeholder_parts.tsv`, '料號\t品名\n' + partList.join('\n'));
  console.log(`建 placeholder 客戶 ${custList.length} 筆、料號 ${partList.length} 筆`);
  console.log(`維護清單：placeholder_customers.tsv / placeholder_parts.tsv`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => disconnectPrisma());
