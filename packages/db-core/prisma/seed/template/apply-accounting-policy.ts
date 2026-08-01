// packages/db-core/prisma/seed/template/apply-accounting-policy.ts
// @FUNCTION_CODE SYS-TMPL-SVC-028-F01
// 範本：會計政策（14 項）。
//
// 🔴 這張表不是文件、是會被程式讀的：
//    INVENTORY_COSTING（移動平均／個別認定）→ 直接決定 nx03_stock_ledger 的成本算法
//    CAPITALIZE_THRESHOLD（8 萬）→ 決定資產是否進 nx05_asset 而非直接列費用
//    DEPRECIATION_START（取得次月）→ 決定 nx05_asset_depreciation 第一列的月份
//
// ⚠️ 這幾項一旦開帳就不該再改——改了前後期就不可比，稅務上也會被質疑。
//    標 APPROVAL 的變更要向稅捐機關申請並經核准；標 CAUTION 的雖不需申請，
//    但改了前後期不可比，銀行與投資人看報表時會問。
// ⚠️ 本範本依台灣一般實務擬定，最終應由記帳士或會計師確認後定案。
//
// 例外走子表 nx05_accounting_policy_exception（Q4 拍板：開子表、不塞 JSON）。

import type { PrismaClient } from '../../../generated/prisma';
import type { ApplyTemplateParams } from './index';

interface PolicyRow {
  code: string; name: string; value: string; allowed: string; change: string; remark: string;
  exceptions?: { scope: string; scopeName: string; value: string; reason: string }[];
}

const ROWS: readonly PolicyRow[] = [
  {
    code: 'INVENTORY_SYSTEM', name: '存貨制度', value: '永續盤存',
    allowed: '永續盤存|定期盤存', change: 'CAUTION',
    remark: '永續＝銷貨當下即轉銷貨成本，隨時知道庫存與毛利。定期＝期末盤點才算成本，期中看不到毛利。'
      + '⚠ 要按月看毛利率驗證假設，只能選永續。',
  },
  {
    code: 'INVENTORY_COSTING', name: '存貨計價方法', value: '移動平均法',
    allowed: '移動平均法|先進先出法|加權平均法', change: 'APPROVAL',
    remark: '每次進貨重算平均單價。⚠ 這一項直接決定銷貨成本，也就是直接決定毛利率——'
      + '財務模型假設的毛利率是用哪種方法算的，要一致，否則模型與實績永遠對不起來。',
    exceptions: [{
      scope: 'SCOPE_TI', scopeName: '同行調貨', value: '個別認定法',
      reason: '調貨的進價是一筆一議（約 +32%），混進移動平均會汙染自有庫存的成本，'
        + '而且報表切不出「調貨佔多少、賺多少」。',
    }],
  },
  {
    code: 'REVENUE_RECOGNITION', name: '收入認列時點', value: '出貨時',
    allowed: '出貨時|客戶簽收後|對帳確認後', change: 'CAUTION',
    remark: '出貨即認列收入與應收。⚠ 若客戶常有「送到才算」的爭議，認列點會影響月底營業額。',
  },
  {
    code: 'DEPRECIATION_METHOD', name: '折舊方法', value: '平均法（直線）',
    allowed: '平均法|定率遞減法|年數合計法', change: 'APPROVAL',
    remark: '直線法最單純，帳務與稅務一致，不必做帳外調整。',
  },
  {
    code: 'SALVAGE_VALUE', name: '殘值估計', value: '成本÷(耐用年數+1)',
    allowed: '法定公式|估計零殘值', change: 'CAUTION',
    remark: '所得稅法平均法的標準做法。設零殘值會讓前期折舊較高。',
  },
  {
    code: 'DEPRECIATION_START', name: '折舊起算時點', value: '取得次月',
    allowed: '取得次月|取得當月', change: 'CAUTION',
    remark: '按月提列，取得當月不計。',
  },
  {
    code: 'CAPITALIZE_THRESHOLD', name: '資本化門檻', value: '80000',
    allowed: '法定上限 80000|自訂更低', change: 'FREE',
    remark: '⚠ 查核準則：單價不超過 8 萬或耐用年限不及 2 年，可直接列當年度費用。'
      + '🔴 但整批購置大量器具、耐用年限超過 2 年者仍應列作資本支出 → 判定要按「同廠商×同日×同類別」整批算，'
      + '不能逐列判（見 nx05_asset.capitalize_batch_key）。',
  },
  {
    code: 'BAD_DEBT', name: '呆帳處理', value: '直接沖銷法',
    allowed: '直接沖銷法|備抵法', change: 'CAUTION',
    remark: '小公司用直接沖銷（確定收不回才認列）。備抵法要每期估提。',
  },
  {
    code: 'FISCAL_YEAR', name: '會計年度', value: '曆年制（1–12 月）',
    allowed: '曆年制|非曆年制', change: 'APPROVAL',
    remark: '⚠ 第 13 期為年度調整期（不是第 13 個月）：年度結帳的調整分錄放這裡，'
      + '12 月的月報才不會被事後改動。',
  },
  {
    code: 'VAT_FILING', name: '營業稅申報', value: '每兩個月',
    allowed: '每兩個月|每月（申請）', change: 'FREE',
    remark: '單月 15 日前申報前兩個月。⚠ 若長期留抵稅額很大，可考慮申請按月申報加速退稅。'
      + '⚠ 與會計期間的月結是兩回事，不要混。',
  },
  {
    code: 'DEPT_ALLOCATION', name: '部門費用分攤', value: '不分攤（貢獻式損益）',
    allowed: '不分攤|按營業額|按人數', change: 'FREE',
    remark: '店看「店的貢獻」＝營收−銷貨成本−店的直接費用；總公司費用從總貢獻扣。'
      + '⚠ 判斷一家店該不該關，看貢獻不看分攤後淨利。',
  },
  {
    code: 'QUOTE_TAX_CONVENTION', name: '報價含稅慣例', value: '同行未稅／散客含稅',
    allowed: '全含稅|全未稅|分通路', change: 'FREE',
    remark: '⚠ 同一個數字在兩種慣例下差 5%。價格表的「售價比率」是對哪一個基準算的，要寫死。',
  },
  {
    code: 'FX_TRANSLATION', name: '外幣換算', value: '交易日匯率入帳、期末按結帳日匯率評價',
    allowed: '交易日匯率|月平均匯率|期末重評價', change: 'APPROVAL',
    remark: '🔴 進口第一天就會用到。⚠ 恆迎的教訓：外幣功能 100% 沒在用（幣別 28 年一個值、匯率全部是 1），'
      + '卻有兌換損益 281 萬——外幣資訊活在系統外。'
      + '→ 紀律：進口採購單沒填幣別與匯率就不能過帳。差額進 8104 兌換損益。',
  },
  {
    code: 'INVENTORY_VALUATION', name: '存貨評價', value: '成本與淨變現價值孰低法',
    allowed: '不評價|成本與淨變現價值孰低法', change: 'APPROVAL',
    remark: '⭐ 呆滯品出清需要它：貨還在但不值錢，要能認列 5105 存貨跌價損失，'
      + '而不是跟 5104 報廢混在一起。⚠ 恆迎沒有這個機制，所以 2.99 億庫存裡 1.94 億（65%）'
      + '不是一年內用得到的貨，帳上仍按原始成本躺著。'
      + '🔴 對映的交易代號 IWD 目前狀態為待決，等本政策定案後才啟用。',
  },
];

export async function applyAccountingPolicy(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, actorUserId } = params;

  // 生效起日：租戶建立當年 1 月 1 日（開帳後由設定精靈覆寫）
  const effectiveFrom = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));

  let exCount = 0;
  for (const [i, r] of ROWS.entries()) {
    const data = {
      name: r.name,
      selectedValue: r.value,
      allowedValues: r.allowed,
      changePolicy: r.change,
      effectiveFrom,
      sortNo: i + 1,
      isActive: true,
      remark: r.remark,
      updatedBy: actorUserId,
    };
    const policy = await prisma.nx05AccountingPolicy.upsert({
      where: { tenantId_code: { tenantId, code: r.code } },
      create: { tenantId, code: r.code, createdBy: actorUserId, ...data },
      update: data,
      select: { id: true },
    });

    for (const [j, e] of (r.exceptions ?? []).entries()) {
      const exData = {
        lineNo: j + 1,
        scopeName: e.scopeName,
        exceptionValue: e.value,
        reason: e.reason,
        isActive: true,
        updatedBy: actorUserId,
      };
      await prisma.nx05AccountingPolicyException.upsert({
        where: { policyId_scopeCode: { policyId: policy.id, scopeCode: e.scope } },
        create: { policyId: policy.id, scopeCode: e.scope, createdBy: actorUserId, ...exData },
        update: exData,
      });
      exCount += 1;
    }
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx05_accounting_policy_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx05_accounting_policy), 0), 1), true)`,
  );
  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx05_accounting_policy_exception_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx05_accounting_policy_exception), 0), 1), true)`,
  );

  console.log(`✅ [TEMPLATE] applyAccountingPolicy: ${ROWS.length} 項 / 例外 ${exCount} 筆 (tenant=${tenantId})`);
}
