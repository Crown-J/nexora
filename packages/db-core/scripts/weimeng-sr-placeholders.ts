// packages/db-core/scripts/weimeng-sr-placeholders.ts
// 銷退軌 Step2b：為銷退用到、但主檔沒有的 客戶(C)/料號/庫位 建 placeholder。
//   銷退對象＝客戶（缺→C###）。料號/庫位同前。安全：dry 預設、go 才寫。
import { prisma, disconnectPrisma } from '../prisma/seed/client';
import { readFileSync, writeFileSync, createReadStream } from 'fs';
import { createInterface } from 'readline';
import { parse } from 'csv-parse';

const SP = 'C:/Users/User/AppData/Local/Temp/claude/C--nexora/d101259f-e37a-4362-9aaf-8ad1312ba8e6/scratchpad';
const OUT = 'C:/nexora/docs/_team';
const CUST_CSV = 'C:/nexora/docs/專案/測試資料/20260604_客戶資料.csv';
const GO = process.argv.includes('go');
const rd = (f: string) => new Set(readFileSync(`${SP}/${f}`, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean));

async function main() {
  const t = await prisma.nx99Tenant.findFirst({ where: { code: 'TW-100001' }, select: { id: true } });
  const tid = t!.id;
  const uid = (await prisma.nx01User.findFirst({ where: { tenantId: tid }, orderBy: { userAccount: 'asc' }, select: { id: true } }))!.id;

  const pn = await prisma.nx01Partner.findMany({ where: { tenantId: tid }, select: { code: true, legacyCode: true } });
  const dbLeg = new Set(pn.map((x) => (x.legacyCode || '').trim()).filter(Boolean));
  const allCodes = pn.map((x) => x.code || '');
  const pt = await prisma.nx01Part.findMany({ where: { tenantId: tid }, select: { code: true, secCode: true } });
  const dbPart = new Set<string>(); for (const p of pt) { if (p.code) dbPart.add(p.code.trim()); if (p.secCode) dbPart.add(p.secCode.trim()); }
  const lc = await prisma.nx01Location.findMany({ where: { tenantId: tid }, select: { code: true } });
  const dbLoc = new Set(lc.map((x) => (x.code || '').trim()));
  const wh = await prisma.nx01Warehouse.findMany({ where: { tenantId: tid }, select: { id: true, code: true } });
  const whMap = new Map<string, string>(); for (const w of wh) whMap.set(w.code.trim(), w.id); const anyWh = wh[0].id;

  const missCust = [...rd('sr_cust.txt')].filter((c) => !dbLeg.has(c)).sort();
  const missPart = [...rd('sr_part.txt')].filter((p) => !dbPart.has(p)).sort();
  const missLoc = [...rd('sr_loc.txt')].filter((l) => !dbLoc.has(l)).sort();
  console.log(`缺失：客戶 ${missCust.length} / 料號 ${missPart.length} / 庫位 ${missLoc.length}`);
  if (missLoc.length) console.log('  缺庫位:', missLoc.join(','));
  if (!GO) { console.log('[dry] 未寫入。加 go 才建。'); return; }

  // 客戶名稱
  const custName = new Map<string, string>();
  await new Promise<void>((res, rej) => {
    const p = createReadStream(CUST_CSV).pipe(parse({ relax_quotes: true, relax_column_count: true, skip_empty_lines: true, bom: true, from_line: 2 }));
    p.on('data', (r: string[]) => { const c = (r[0] || '').trim(); if (c && !custName.has(c)) custName.set(c, (r[2] || '').trim()); });
    p.on('end', () => res()); p.on('error', rej);
  });
  let maxC = 0; for (const c of allCodes) { const m = (c || '').match(/^C(\d{4})$/); if (m) maxC = Math.max(maxC, +m[1]); }
  const custList: string[] = [];
  for (const leg of missCust) {
    maxC++; const code = `C${String(maxC).padStart(4, '0')}`;
    const nm = custName.get(leg) || '';
    await prisma.nx01Partner.create({ data: { tenantId: tid, code, name: ((nm || leg) + '【待維護-偉盟匯入(客戶)】').slice(0, 120), legacyCode: leg, partnerType: 'C', isActive: true, createdBy: uid, updatedBy: uid } });
    custList.push(`${code}\t${leg}\t${nm || '(無名)'}`);
  }
  if (missCust.length) await prisma.nx01SeqCounter.upsert({ where: { tenantId_scope: { tenantId: tid, scope: 'PARTNER_C' } }, create: { tenantId: tid, scope: 'PARTNER_C', nextNo: maxC + 1 }, update: { nextNo: maxC + 1 } });
  console.log(`建客戶 ${custList.length}`);

  // 料號名稱（串流 sr.tsv）
  const want = new Set(missPart); const partName = new Map<string, string>();
  await new Promise<void>((res) => {
    const rl = createInterface({ input: createReadStream(`${SP}/sr.tsv`), crlfDelay: Infinity });
    rl.on('line', (line) => { if (!line) return; const f = line.split('\t'); const code = (f[4] || '').trim(); if (code && want.has(code) && !partName.has(code)) partName.set(code, (f[5] || '').trim()); });
    rl.on('close', () => res());
  });
  const partList: string[] = [];
  for (let i = 0; i < missPart.length; i += 1000) {
    const chunk = missPart.slice(i, i + 1000);
    await prisma.nx01Part.createMany({ data: chunk.map((code) => ({ tenantId: tid, code, secCode: code, name: ((partName.get(code) || code) + ' 【待維護-偉盟匯入】').slice(0, 200), createdBy: uid, updatedBy: uid })), skipDuplicates: true });
    for (const code of chunk) partList.push(`${code}\t${partName.get(code) || '(無品名)'}`);
  }
  console.log(`建料號 ${partList.length}`);

  const locList: string[] = [];
  for (const l of missLoc) {
    await prisma.nx01Location.create({ data: { tenantId: tid, warehouseId: whMap.get(l.slice(0, 3)) ?? anyWh, code: l, name: `偉盟庫位 ${l}【待維護】`.slice(0, 100), isActive: true, createdBy: uid, updatedBy: uid } });
    locList.push(`${l}\t${l.slice(0, 3)}`);
  }
  console.log(`建庫位 ${locList.length}`);

  writeFileSync(`${OUT}/weimeng-placeholder-sr-more.tsv`, `# 銷退新增 placeholder\n客戶:\n${custList.join('\n')}\n\n料號:\n${partList.join('\n')}\n\n庫位:\n${locList.join('\n')}`);
  console.log('維護清單：docs/_team/weimeng-placeholder-sr-more.tsv');
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => disconnectPrisma());
