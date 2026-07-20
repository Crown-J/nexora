// packages/db-core/scripts/weimeng-v2-cleanup-window.ts
// 偉盟窗口重灌 v2 Step2：刪掉窗口內（單號 202506–202606）舊壓測灌入的 SO/RR/SR。
//   舊資料辨識：remark='偉盟匯入' 且 docNo=偉盟原單號（前6碼=年月）。
//   刪除原因：舊灌入日期取 ROEDT 月鍵（全塌月初）、subtotal 誤取 ROCOT 成本 → 語意錯，窗口內重灌。
//   窗口外壓測資料不動。順序：明細→表頭；SR 先於 SO（雖然舊 SR.soId 全 null，保守起見）。
import { prisma, disconnectPrisma } from '../prisma/seed/client';

const MARK = '偉盟匯入';
const FROM = '202506', TO = '202607';

async function main() {
  const t = await prisma.nx99Tenant.findFirst({ where: { code: 'TW-100001' }, select: { id: true } });
  const tid = t!.id;
  const win = { tenantId: tid, remark: MARK, docNo: { gte: FROM, lt: TO } };

  console.log('=== 刪除前盤點 ===');
  const so0 = await prisma.nx04So.count({ where: win });
  const rr0 = await prisma.nx02Rr.count({ where: win });
  const sr0 = await prisma.nx04Sr.count({ where: win });
  console.log(`SO ${so0} / RR ${rr0} / SR ${sr0}`);

  console.log('=== 刪除 ===');
  const sri = await prisma.nx04SrItem.deleteMany({ where: { sr: win } });
  const sr = await prisma.nx04Sr.deleteMany({ where: win });
  console.log(`SR 明細 ${sri.count} / 表頭 ${sr.count}`);
  const soi = await prisma.nx04SoItem.deleteMany({ where: { so: win } });
  const so = await prisma.nx04So.deleteMany({ where: win });
  console.log(`SO 明細 ${soi.count} / 表頭 ${so.count}`);
  const rri = await prisma.nx02RrItem.deleteMany({ where: { rr: win } });
  const rr = await prisma.nx02Rr.deleteMany({ where: win });
  console.log(`RR 明細 ${rri.count} / 表頭 ${rr.count}`);

  console.log('=== 刪除後（應全 0）===');
  console.log(`SO ${await prisma.nx04So.count({ where: win })} / RR ${await prisma.nx02Rr.count({ where: win })} / SR ${await prisma.nx04Sr.count({ where: win })}`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => disconnectPrisma());
