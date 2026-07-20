// packages/db-core/scripts/weimeng-v2-load-st.ts
// 偉盟窗口重灌 v2 Step5：型M 多倉調撥 → Nx03St/Nx03StItem。⭐成對兩列收斂成 1 筆明細。
//   偉盟一次調撥=同單號兩列（ROCOS=3 撥出 / 4 撥入）以 RORIM 互指項次；
//   收斂：qty=撥出量、receivedQty=撥入量 → 63 張幽靈不平衡單「照實匯」，天然成為不平衡偵測測試案例。
//   孤兒列（配對被刪，鑑識已證實的系統缺陷）：單獨成列、remark 標記，不丟棄。
//   調撥計價=BSAVG 平均成本（ROCOT）→ unitCost。
import { prisma, disconnectPrisma } from '../prisma/seed/client';
import { Prisma } from '../generated/prisma';
import { readFileSync } from 'fs';
import { loadRsim } from './weimeng-v2-rsim';

const TSV = 'C:/nexora/docs/專案/測試資料/偉盟匯入產出/v2窗口/tM.tsv';
const MARK = '偉盟匯入';
const FROM = '202506', TO = '202607';
const BATCH = 3000;
const D = (n: number) => new Prisma.Decimal(Number.isFinite(n) ? Math.round(n * 10000) / 10000 : 0);
const num = (s: string) => { const n = +s; return Number.isFinite(n) ? n : 0; };

// tsv: 0doc 1iem 2num 3date 4ptn 5pno 6nam 7lab 8pos 9qty 10upc 11amt 12cot 13dcx 14cos 15rer 16rim 17rmk 18men
type Row = { iem: string; date: string; ptn: string; nam: string; lab: string; pos: string; qty: number; cot: number; cos: string; rim: string; rmk: string };

async function main() {
  const t = await prisma.nx99Tenant.findFirst({ where: { code: 'TW-100001' }, select: { id: true } });
  const tid = t!.id;
  const uid = (await prisma.nx01User.findFirst({ where: { tenantId: tid }, orderBy: { userAccount: 'asc' }, select: { id: true } }))!.id;
  const win = { tenantId: tid, remark: { startsWith: MARK }, legacyDocNo: { gte: FROM, lt: TO } };

  const di = await prisma.nx03StItem.deleteMany({ where: { st: win } });
  const dh = await prisma.nx03St.deleteMany({ where: win });
  if (dh.count) console.log(`自清 v2 舊灌：明細 ${di.count} / 表頭 ${dh.count}`);

  const pt = await prisma.nx01Part.findMany({ where: { tenantId: tid }, select: { id: true, code: true, secCode: true } });
  const partMap = new Map<string, string>(); for (const p of pt) { if (p.secCode) partMap.set(p.secCode.trim(), p.id); if (p.code) partMap.set(p.code.trim(), p.id); }
  const wh = await prisma.nx01Warehouse.findMany({ where: { tenantId: tid }, select: { id: true, code: true } });
  const whMap = new Map<string, string>(); for (const w of wh) whMap.set(w.code.trim(), w.id); const anyWh = wh[0].id;
  const whOf = (loc: string) => whMap.get((loc || '').slice(0, 3)) ?? anyWh;
  const lc = await prisma.nx01Location.findMany({ where: { tenantId: tid }, select: { id: true, code: true } });
  const locMap = new Map<string, string>(); for (const l of lc) locMap.set(l.code.trim(), l.id);
  const { map: rsim } = loadRsim();

  const docs = new Map<string, Row[]>();
  for (const line of readFileSync(TSV, 'utf8').split('\n')) {
    if (!line) continue; const f = line.split('\t');
    (docs.get(f[0]) ?? docs.set(f[0], []).get(f[0])!).push({
      iem: f[1], date: f[3], ptn: f[4], nam: f[6], lab: f[7], pos: f[8],
      qty: num(f[9]), cot: num(f[12]), cos: f[14], rim: f[16], rmk: f[17] || '',
    });
  }
  console.log(`調撥 TSV：${docs.size} 張單`);

  // ── 收斂 + 表頭 ──
  type Item = { ptn: string; nam: string; lab: string; qty: number; recv: number | null; cot: number; fromLoc: string; toLoc: string; note: string; date: string };
  const collapsed = new Map<string, { from: string; to: string; date: string; items: Item[] }>();
  let pairs = 0, orphanIn = 0, orphanOut = 0, imbalance = 0;
  for (const [doc, rows] of docs) {
    const byIem = new Map(rows.map((r) => [r.iem, r]));
    const used = new Set<string>();
    const items: Item[] = [];
    let fromPos = '', toPos = '';
    for (const r of rows) {
      if (r.cos !== '3' || used.has(r.iem)) continue;
      const mate = byIem.get(r.rim);
      if (mate && mate.cos === '4' && !used.has(mate.iem)) {
        used.add(r.iem); used.add(mate.iem); pairs++;
        if (r.qty !== mate.qty) imbalance++;
        if (!fromPos) { fromPos = r.pos; toPos = mate.pos; }
        items.push({ ptn: r.ptn, nam: r.nam, lab: r.lab, qty: r.qty, recv: mate.qty, cot: r.cot, fromLoc: r.pos, toLoc: mate.pos, note: '', date: r.date });
      } else {
        used.add(r.iem); orphanOut++;
        if (!fromPos) fromPos = r.pos;
        items.push({ ptn: r.ptn, nam: r.nam, lab: r.lab, qty: r.qty, recv: 0, cot: r.cot, fromLoc: r.pos, toLoc: '', note: '[偉盟孤兒撥出]', date: r.date });
      }
    }
    for (const r of rows) {
      if (used.has(r.iem) || r.cos !== '4') continue;
      used.add(r.iem); orphanIn++;
      if (!toPos) toPos = r.pos;
      items.push({ ptn: r.ptn, nam: r.nam, lab: r.lab, qty: r.qty, recv: r.qty, cot: r.cot, fromLoc: '', toLoc: r.pos, note: '[偉盟孤兒撥入]', date: r.date });
    }
    if (!items.length) continue;
    collapsed.set(doc, { from: fromPos, to: toPos, date: items[0].date, items });
  }
  console.log(`收斂：成對 ${pairs}、孤兒撥出 ${orphanOut}、孤兒撥入 ${orphanIn}、撥出≠撥入 ${imbalance} 列`);

  let headers: Prisma.Nx03StCreateManyInput[] = [];
  let hn = 0;
  const flushH = async () => { if (headers.length) { hn += (await prisma.nx03St.createMany({ data: headers, skipDuplicates: true })).count; headers = []; } };
  for (const [doc, c] of collapsed) {
    const h = rsim.get(doc);
    const stDate = new Date(c.date || h?.ymm || '2025-06-01');
    const createdAt = h?.day ? new Date(h.day) : stDate;
    headers.push({
      tenantId: tid, docNo: doc.slice(0, 30), legacyDocNo: doc.slice(0, 20), stDate,
      fromWarehouseId: c.from ? whOf(c.from) : whMap.get(h?.shp?.trim() || '') ?? anyWh,
      toWarehouseId: c.to ? whOf(c.to) : whMap.get((h?.mno || '').slice(0, 3)) ?? anyWh,
      status: 'RECEIVED', stType: 'M', triggerSource: 'M',
      postedAt: stDate, postedBy: uid, receivedAt: stDate, receivedBy: uid,
      remark: h?.rma ? `${MARK} ${h.rma}`.slice(0, 200) : MARK,
      createdAt, updatedAt: createdAt, createdBy: uid, updatedBy: uid,
    });
    if (headers.length >= BATCH) await flushH();
  }
  await flushH();
  console.log(`ST 表頭 ${hn} 張`);

  const stIdOf = new Map<string, string>();
  let cursor: string | undefined;
  for (;;) {
    const page = await prisma.nx03St.findMany({ where: win, select: { id: true, legacyDocNo: true }, orderBy: { id: 'asc' }, take: 20000, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}) });
    if (!page.length) break;
    for (const s of page) if (s.legacyDocNo) stIdOf.set(s.legacyDocNo, s.id);
    cursor = page[page.length - 1].id;
    if (page.length < 20000) break;
  }

  let buf: Prisma.Nx03StItemCreateManyInput[] = [];
  let inum = 0, iNoPart = 0;
  const flushI = async () => { if (buf.length) { inum += (await prisma.nx03StItem.createMany({ data: buf, skipDuplicates: true })).count; buf = []; if (inum % 60000 < BATCH) console.log(`  明細 ${inum}`); } };
  for (const [doc, c] of collapsed) {
    const stId = stIdOf.get(doc.slice(0, 20)); if (!stId) continue;
    let ln = 0;
    for (const it of c.items) {
      const partId = partMap.get(it.ptn); if (!partId) { iNoPart++; continue; }
      ln++;
      const created = it.date ? new Date(it.date) : new Date(c.date || '2025-06-01');
      buf.push({
        stId, lineNo: ln, partId, partNo: it.ptn.slice(0, 50), partName: (it.nam || it.ptn).slice(0, 200),
        fromLocationId: it.fromLoc ? locMap.get(it.fromLoc) ?? null : null,
        toLocationId: it.toLoc ? locMap.get(it.toLoc) ?? null : null,
        qty: D(it.qty), receivedQty: it.recv === null ? null : D(it.recv), unitCost: D(it.cot),
        remark: it.note || null,
        createdAt: created, updatedAt: created, createdBy: uid, updatedBy: uid,
      });
      if (buf.length >= BATCH) await flushI();
    }
  }
  await flushI();
  console.log(`ST 明細 ${inum} 列（料號查無 ${iNoPart}）`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => disconnectPrisma());
