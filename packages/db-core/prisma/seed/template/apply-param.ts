// packages/db-core/prisma/seed/template/apply-param.ts
// @FUNCTION_CODE SYS-TMPL-SVC-027-F01
// 範本：代碼參數表（Q2 拍板・限定用途）。
//
// ⛔ 這張表「不是」全庫值域池。只收「租戶可自行增刪、且不影響狀態機」的分類型值域。
//    單據狀態機（DRAFT/APPROVED/VOIDED…）、借貸方向、任何被 switch 判斷的值 → 一律留在程式碼，
//    因為它們一改程式就要改，放 DB 只會製造「改得動但改了會壞」的假象。
//
// 紀律（來自亞羅、寫進註解也要進 code review）：
//   判準一：一個值域超過 50 個值 → 它是資料不是參數，該獨立成主檔。
//   判準二：一個值域每個值都帶著其他屬性 → 也是主檔（稅別／收付方式／資產類別因此各自升格）。
//   恆迎違反的代價：這張表 11,615 筆裡 10,383 筆是零件族群、365 筆是郵遞區號 → 89% 是誤塞的資料。
//
// A 階段實收 9 類（扣掉已升格成主檔的、與屬狀態機的）。

import type { PrismaClient } from '../../../generated/prisma';
import type { ApplyTemplateParams } from './index';

interface ParamRow { cat: string; code: string; name: string; a1?: string; remark?: string }

const ROWS: readonly ParamRow[] = [
  // ── 現金流量分類（標好它，現金流量表就能自動出）──
  { cat: 'CASH_FLOW_TYPE', code: 'O', name: '營業活動' },
  { cat: 'CASH_FLOW_TYPE', code: 'I', name: '投資活動' },
  { cat: 'CASH_FLOW_TYPE', code: 'F', name: '籌資活動' },
  { cat: 'CASH_FLOW_TYPE', code: 'C', name: '現金及約當現金' },
  { cat: 'CASH_FLOW_TYPE', code: 'N', name: '不適用' },

  // ── 費用核准路徑 ──
  { cat: 'EXPENSE_APPROVAL_PATH', code: 'A', name: '合約與法定固定', a1: '簽約時核准一次', remark: '佔 1-a 月費用 95%。' },
  { cat: 'EXPENSE_APPROVAL_PATH', code: 'B', name: '計量後結算', a1: '⛔ 不審，異常偵測', remark: '超過近 6 期平均 ×1.3 → 提示（提示，不擋）。用途不是省錢，是抓漏水與忘記關的東西。' },
  { cat: 'EXPENSE_APPROVAL_PATH', code: 'C', name: '小額零星實支', a1: '事後核銷', remark: '零用金或代墊報支。' },
  { cat: 'EXPENSE_APPROVAL_PATH', code: 'D', name: '一次性與資本支出', a1: '資本支出預算', remark: '屬固定資產循環。' },
  { cat: 'EXPENSE_APPROVAL_PATH', code: 'E', name: '出貨量連動耗材', a1: '一般採購（廠商月結）', remark: '🔴 包材與貼碼耗材。走零用金會爆定額，且看不到單位出貨成本。' },

  // ── 定期費用頻率 ──
  { cat: 'RECURRING_FREQUENCY', code: 'M', name: '每月' },
  { cat: 'RECURRING_FREQUENCY', code: 'Q', name: '每季' },
  { cat: 'RECURRING_FREQUENCY', code: 'H', name: '每半年' },
  { cat: 'RECURRING_FREQUENCY', code: 'Y', name: '每年', remark: '⚠ 年繳的保險費要能攤到各月的現金預測，不是只在繳費那個月出現。' },

  // ── 現金預測確定性（三條線不可混在同一格）──
  { cat: 'CASH_FORECAST_CERTAINTY', code: '1', name: '高（票據／定期費用）', a1: '日期與金額都確定' },
  { cat: 'CASH_FORECAST_CERTAINTY', code: '2', name: '中（帳款）', a1: '金額確定、日期看對方', remark: '⭐ 收款側用該客戶歷史付款準時率調整。' },
  { cat: 'CASH_FORECAST_CERTAINTY', code: '3', name: '低（推估）', a1: '兩者都要估', remark: '🔴 不可與「中」混在同一格顯示。' },
  { cat: 'CASH_FORECAST_CERTAINTY', code: '4', name: '稅（日期確定金額估）', a1: '性質特殊', remark: '🔴 要單獨標，不要混進「低」。' },

  // ── 未達帳項類型（銀行對帳）──
  { cat: 'BANK_REC_ITEM_TYPE', code: 'DIT', name: '在途存款', a1: '合理差額', remark: '⭐ 這四類要能勾為合理差額並自動帶到次期，否則會為了讓差額歸零而亂調帳。' },
  { cat: 'BANK_REC_ITEM_TYPE', code: 'OSC', name: '已開出未兌現支票', a1: '合理差額' },
  { cat: 'BANK_REC_ITEM_TYPE', code: 'BKF', name: '銀行手續費未入帳', a1: '合理差額' },
  { cat: 'BANK_REC_ITEM_TYPE', code: 'COL', name: '託收票據未兌現', a1: '合理差額' },
  { cat: 'BANK_REC_ITEM_TYPE', code: 'OTH', name: '其他（必須寫原因）', a1: '不合理差額', remark: '🔴 唯一要人填理由的欄位——系統不知道錢為什麼不見。' },

  // ── 資產處分方式 ──
  { cat: 'ASSET_DISPOSAL_METHOD', code: 'SELL', name: '出售', a1: '🔴 要開發票', remark: '🔴 營業人出售固定資產屬營業稅課稅範圍（賣掉舊機車也要開）。' },
  { cat: 'ASSET_DISPOSAL_METHOD', code: 'SCRP', name: '報廢', a1: '要留證明', remark: '⚠ 拆解照片或回收單，否則稅局可能不認列損失。' },
  { cat: 'ASSET_DISPOSAL_METHOD', code: 'LOSS', name: '盤點短少', a1: '🔴 要寫原因', remark: '🔴 唯一要人填理由的欄位（系統不知道東西為什麼不見）。' },

  // ── 資本支出類別 ──
  { cat: 'CAPEX_CATEGORY', code: 'OPEN', name: '開辦', a1: '一次性', remark: '1-a 的資本支出 95% 在這一格。' },
  { cat: 'CAPEX_CATEGORY', code: 'REPL', name: '汰換', a1: '重複性', remark: '⚠ 電腦 3 年後要換——這是可以事先排進資本支出預算的。' },
  { cat: 'CAPEX_CATEGORY', code: 'EXPN', name: '擴充（展店）', a1: '一次性', remark: '⏳ 展店才啟用。' },

  // ── 資產狀態 ──
  { cat: 'ASSET_STATUS', code: 'A', name: '在用', a1: '要折舊、要盤到' },
  { cat: 'ASSET_STATUS', code: 'P', name: '預定（尚未取得）', a1: '不折舊', remark: '⚠ 尚未購入的先建成這個狀態。' },
  { cat: 'ASSET_STATUS', code: 'I', name: '停用（未處分）', a1: '仍要折舊、仍要盤到', remark: '🔴 最容易漏的一格：停用不等於除帳。' },
  { cat: 'ASSET_STATUS', code: 'D', name: '已處分', a1: '不折舊、不盤' },

  // ── 折舊方法 ──
  { cat: 'DEPRECIATION_METHOD', code: 'SL', name: '平均法（直線）', a1: '殘值＝成本÷(年數+1)', remark: '⭐ 目前只用這一種。⚠ 定率遞減法要另設參數，現在不開。' },
];

export async function applyParam(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, actorUserId } = params;

  const sortByCat = new Map<string, number>();
  for (const r of ROWS) {
    const n = (sortByCat.get(r.cat) ?? 0) + 1;
    sortByCat.set(r.cat, n);
    const data = {
      name: r.name,
      sortNo: n,
      attr1: r.a1 ?? null,
      attr2: null,
      isSystem: true,
      isActive: true,
      remark: r.remark ?? null,
      updatedBy: actorUserId,
    };
    await prisma.nx01Param.upsert({
      where: { tenantId_categoryCode_code: { tenantId, categoryCode: r.cat, code: r.code } },
      create: { tenantId, categoryCode: r.cat, code: r.code, createdBy: actorUserId, ...data },
      update: data,
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_param_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_param), 0), 1), true)`,
  );

  console.log(`✅ [TEMPLATE] applyParam: ${ROWS.length} 筆 / ${sortByCat.size} 類 (tenant=${tenantId})`);
}
