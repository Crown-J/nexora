// packages/db-core/prisma/seed/template/apply-posting-rule.ts
// @FUNCTION_CODE SYS-TMPL-SVC-020-F01
// 範本：過帳規則／交易科目對映（總帳脊椎 A 階段 2026-08-01）。
//
// ⭐ 這是缺口 1「總帳脊椎」的核心規格輸入：單據要怎麼過帳，全部看這裡。
// 資料來源：亞羅核心主檔-v1『交易科目對映』（彙總 43 個代號）
//           ＋ 營運循環-v10 五張分循環分頁（另 20 個代號）＝ 共 63 個交易代號、169 條分錄行。
//
// 轉譯時做的三件修正（皆為實測發現、非臆測）：
//   1. 🔴 亞羅對映表筆誤 2134 → 2121：FA-DISP 第 4 行寫 2134「銷項稅額」，
//      但科目表的銷項稅額是 2121。⚠ 這正是該表自己警告過的恆迎病（對映表與科目主檔對不上）。
//   2. FA-TRF 資產移轉：亞羅明列「⛔ 不做分錄」→ 建為 INACTIVE、0 分錄行，設計決定留痕。
//   3. 科目欄含樣板或多選（6xxx／15x2／15xx／1102-1111／1102-2131／2151-2501／7103-8102）
//      → 進 accountPattern 而非 accountCodeId，並標 isOptional。
//
// 循環映射（決策 3️⃣ 落地）：cycleCode = 內部切法（含 FUND 資金）、
//   legalCycleCode = 對外的內控九大。⭐ 資金那條是「一條拆進兩條」，所以逐代號標而非逐循環標。

import type { PrismaClient } from '../../../generated/prisma';
import type { ApplyTemplateParams } from './index';

interface RuleRow { code: string; name: string; cycle: string; legal: string; status: string; remark: string | null }
interface LineRow {
  rule: string; no: number; dc: string; acc: string | null; pattern: string | null; basis: string;
  dept: boolean; partner: boolean; scope: string; bank: boolean; optional: boolean;
  cond: string | null; remark: string | null;
}

const RULES: readonly RuleRow[] = [
  { code: 'BAD',        name: '呆帳沖銷',                cycle: 'FUND',       legal: 'SALES_RECEIPT',    status: 'ACTIVE',   remark: null },
  { code: 'BK-TRF',     name: '帳戶間調撥（軋票撥款）',         cycle: 'FUND',       legal: 'TREASURY',         status: 'ACTIVE',   remark: null },
  { code: 'BON-P',      name: '🆕 獎金提撥（v10）',         cycle: 'HR',         legal: 'PAYROLL',          status: 'ACTIVE',   remark: null },
  { code: 'BON-U',      name: '🆕 獎金池動用（v10）',        cycle: 'HR',         legal: 'PAYROLL',          status: 'ACTIVE',   remark: null },
  { code: 'CLS',        name: '年度結帳',                cycle: 'FUND',       legal: 'TREASURY',         status: 'ACTIVE',   remark: null },
  { code: 'CQ-NG',      name: '票據退票',                cycle: 'FUND',       legal: 'SALES_RECEIPT',    status: 'ACTIVE',   remark: null },
  { code: 'DEP',        name: '折舊提列',                cycle: 'FIXEDASSET', legal: 'FIXEDASSET',       status: 'ACTIVE',   remark: null },
  { code: 'EMP-EXP',    name: '員工代墊報支',              cycle: 'FUND',       legal: 'PAYROLL',          status: 'ACTIVE',   remark: null },
  { code: 'EQ-IN',      name: '股東出資／增資',             cycle: 'FINANCE',    legal: 'FINANCING',        status: 'ACTIVE',   remark: null },
  { code: 'EX-D',       name: '費用（可扣抵）',             cycle: 'PURCHASE',   legal: 'PURCHASE_PAYMENT', status: 'ACTIVE',   remark: null },
  { code: 'EX-N',       name: '費用（不得扣抵）',            cycle: 'PURCHASE',   legal: 'PURCHASE_PAYMENT', status: 'ACTIVE',   remark: null },
  { code: 'FA-ACQ',     name: '資產取得（資本化）',           cycle: 'FIXEDASSET', legal: 'FIXEDASSET',       status: 'ACTIVE',   remark: null },
  { code: 'FA-DEP',     name: '折舊計提（月結自動）',          cycle: 'FIXEDASSET', legal: 'FIXEDASSET',       status: 'ACTIVE',   remark: null },
  { code: 'FA-DISP',    name: '資產出售',                cycle: 'FIXEDASSET', legal: 'FIXEDASSET',       status: 'ACTIVE',   remark: null },
  { code: 'FA-EXP',     name: '小額資產費用化（≤8 萬）',       cycle: 'FIXEDASSET', legal: 'FIXEDASSET',       status: 'ACTIVE',   remark: null },
  { code: 'FA-INS',     name: '財產保險',                cycle: 'FIXEDASSET', legal: 'FIXEDASSET',       status: 'ACTIVE',   remark: null },
  { code: 'FA-SCRP',    name: '資產報廢',                cycle: 'FIXEDASSET', legal: 'FIXEDASSET',       status: 'ACTIVE',   remark: null },
  { code: 'FA-SEC',     name: '押金支付／退回',             cycle: 'FIXEDASSET', legal: 'FIXEDASSET',       status: 'ACTIVE',   remark: null },
  { code: 'FA-TRF',     name: '資產移轉',                cycle: 'FIXEDASSET', legal: 'FIXEDASSET',       status: 'INACTIVE', remark: '⛔ 不做分錄：同庫存層的內部位移，只改主檔維度（部門／保管人／位置），不動總帳。唯一例外是跨部門要改費用歸屬——那時改的也只是折舊分錄的部門維度，科目不變。' },
  { code: 'FX',         name: '兌換差額',                cycle: 'FUND',       legal: 'TREASURY',         status: 'ACTIVE',   remark: null },
  { code: 'IADJ',       name: '盤點盈虧',                cycle: 'INVENTORY',  legal: 'INVENTORY',        status: 'ACTIVE',   remark: null },
  { code: 'IT-SW',      name: '軟體訂閱',                cycle: 'IT',         legal: 'IT',               status: 'ACTIVE',   remark: null },
  { code: 'IWD',        name: '存貨跌價',                cycle: 'INVENTORY',  legal: 'INVENTORY',        status: 'PENDING',  remark: null },
  { code: 'LCA',        name: 'Landed Cost 分攤',      cycle: 'PURCHASE',   legal: 'PURCHASE_PAYMENT', status: 'ACTIVE',   remark: null },
  { code: 'LN-DRAW',    name: '借款動用（撥款）',            cycle: 'FINANCE',    legal: 'FINANCING',        status: 'ACTIVE',   remark: null },
  { code: 'LN-GUAR',    name: '信保基金保證手續費',           cycle: 'FINANCE',    legal: 'FINANCING',        status: 'ACTIVE',   remark: null },
  { code: 'LN-REPAY',   name: '還本付息',                cycle: 'FINANCE',    legal: 'FINANCING',        status: 'ACTIVE',   remark: null },
  { code: 'NT-DISC',    name: '⭐⭐ 票貼（應收票據貼現）',       cycle: 'FINANCE',    legal: 'FINANCING',        status: 'ACTIVE',   remark: null },
  { code: 'NT-DISC-NG', name: '🔴 已貼現票據退票（追索）',       cycle: 'FINANCE',    legal: 'FINANCING',        status: 'ACTIVE',   remark: null },
  { code: 'OFFS',       name: '抵帳（同行互抵）',            cycle: 'FUND',       legal: 'PURCHASE_PAYMENT', status: 'ACTIVE',   remark: null },
  { code: 'OPEN-AP',    name: '期初存貨（承接·賒欠）',         cycle: 'INVENTORY',  legal: 'INVENTORY',        status: 'ACTIVE',   remark: null },
  { code: 'OPEN-CA',    name: '期初存貨（承接·現購）',         cycle: 'INVENTORY',  legal: 'INVENTORY',        status: 'ACTIVE',   remark: null },
  { code: 'OPEN-EQ',    name: '期初存貨（實物出資）',          cycle: 'INVENTORY',  legal: 'INVENTORY',        status: 'ACTIVE',   remark: null },
  { code: 'PAY',        name: '薪資計提',                cycle: 'HR',         legal: 'PAYROLL',          status: 'ACTIVE',   remark: null },
  { code: 'PAY-LV',     name: '🔴 未休特休估列（本輪發現的缺口）',   cycle: 'HR',         legal: 'PAYROLL',          status: 'ACTIVE',   remark: null },
  { code: 'PAY-NHI2',   name: '⚠ 二代健保補充保費',          cycle: 'HR',         legal: 'PAYROLL',          status: 'ACTIVE',   remark: null },
  { code: 'PAY-SEV',    name: '資遣費與預告工資',            cycle: 'HR',         legal: 'PAYROLL',          status: 'ACTIVE',   remark: null },
  { code: 'PC-ADV',     name: '零用金設立／定額調整',          cycle: 'FUND',       legal: 'TREASURY',         status: 'ACTIVE',   remark: null },
  { code: 'PC-EXP',     name: '零用金核銷撥補',             cycle: 'FUND',       legal: 'TREASURY',         status: 'ACTIVE',   remark: null },
  { code: 'PO',         name: '進貨',                  cycle: 'PURCHASE',   legal: 'PURCHASE_PAYMENT', status: 'ACTIVE',   remark: null },
  { code: 'PO-IMP',     name: '進口費用歸集',              cycle: 'PURCHASE',   legal: 'PURCHASE_PAYMENT', status: 'ACTIVE',   remark: null },
  { code: 'PO-PRE',     name: '預付貨款（付款段）',           cycle: 'PURCHASE',   legal: 'PURCHASE_PAYMENT', status: 'ACTIVE',   remark: null },
  { code: 'PO-RCV',     name: '到貨（預付轉存貨）',           cycle: 'PURCHASE',   legal: 'PURCHASE_PAYMENT', status: 'ACTIVE',   remark: null },
  { code: 'PO-TR',      name: '調貨進貨',                cycle: 'PURCHASE',   legal: 'PURCHASE_PAYMENT', status: 'ACTIVE',   remark: null },
  { code: 'PR',         name: '進貨退出／折讓',             cycle: 'PURCHASE',   legal: 'PURCHASE_PAYMENT', status: 'ACTIVE',   remark: null },
  { code: 'PY-CA',      name: '付款（匯款）',              cycle: 'FUND',       legal: 'PURCHASE_PAYMENT', status: 'ACTIVE',   remark: null },
  { code: 'PY-CD',      name: '票據到期（付）',             cycle: 'FUND',       legal: 'PURCHASE_PAYMENT', status: 'ACTIVE',   remark: null },
  { code: 'PY-CQ',      name: '付款（開出支票）',            cycle: 'FUND',       legal: 'PURCHASE_PAYMENT', status: 'ACTIVE',   remark: null },
  { code: 'RC-CA',      name: '收款（現金／匯款）',           cycle: 'FUND',       legal: 'SALES_RECEIPT',    status: 'ACTIVE',   remark: null },
  { code: 'RC-CD',      name: '票據到期（收）',             cycle: 'FUND',       legal: 'SALES_RECEIPT',    status: 'ACTIVE',   remark: null },
  { code: 'RC-CQ',      name: '收款（收到支票）',            cycle: 'FUND',       legal: 'SALES_RECEIPT',    status: 'ACTIVE',   remark: null },
  { code: 'SCRP',       name: '報廢',                  cycle: 'INVENTORY',  legal: 'INVENTORY',        status: 'ACTIVE',   remark: null },
  { code: 'SD',         name: '銷貨折讓',                cycle: 'SALES',      legal: 'SALES_RECEIPT',    status: 'ACTIVE',   remark: null },
  { code: 'SO-CA',      name: '銷貨（現金）',              cycle: 'SALES',      legal: 'SALES_RECEIPT',    status: 'ACTIVE',   remark: null },
  { code: 'SO-CR',      name: '銷貨（賒銷）',              cycle: 'SALES',      legal: 'SALES_RECEIPT',    status: 'ACTIVE',   remark: null },
  { code: 'SR',         name: '銷貨退回',                cycle: 'SALES',      legal: 'SALES_RECEIPT',    status: 'ACTIVE',   remark: null },
  { code: 'TAX-FS',     name: '營所稅結算（5 月）',          cycle: 'FUND',       legal: 'TREASURY',         status: 'ACTIVE',   remark: null },
  { code: 'TAX-PP',     name: '營所稅暫繳（9 月）',          cycle: 'FUND',       legal: 'TREASURY',         status: 'ACTIVE',   remark: null },
  { code: 'TRF',        name: '倉庫調撥',                cycle: 'INVENTORY',  legal: 'INVENTORY',        status: 'ACTIVE',   remark: null },
  { code: 'VAT',        name: '營業稅申報',               cycle: 'FUND',       legal: 'TREASURY',         status: 'ACTIVE',   remark: null },
  { code: 'WCLM',       name: '保固索賠回收',              cycle: 'INVENTORY',  legal: 'INVENTORY',        status: 'ACTIVE',   remark: null },
  { code: 'WHT',        name: '代扣款項繳納',              cycle: 'FUND',       legal: 'TREASURY',         status: 'ACTIVE',   remark: null },
  { code: 'WOUT',       name: '保固換貨出庫',              cycle: 'INVENTORY',  legal: 'INVENTORY',        status: 'ACTIVE',   remark: null },
];

const LINES: readonly LineRow[] = [
  { rule: 'BAD',        no:  1, dc: 'D', acc: '6407',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'BAD',        no:  2, dc: 'C', acc: '1111',   pattern: null,         basis: 'AMOUNT', dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: '🆕 三題檢查表第②題（錢動了、貨沒動）抓到的。科目 6407 早就存在，但沒有任何交易代號承接它。 ⚠ 會計政策第 8 項：呆帳採**直接沖銷法**（確定收不回才認列），所以不做期末估提。 ⚠ 6407 的說明已寫：『與信用額度制度連動。恆迎客戶等級 99.88% 空白，等於沒有這道閘。』', remark: '🆕 三題檢查表第②題（錢動了、貨沒動）抓到的。科目 6407 早就存在，但沒有任何交易代號承接它。 ⚠ 會計政策第 8 項：呆帳採**直接沖銷法**（確定收不回才認列），所以不做期末估提。 ⚠ 6407 的說明已寫：『與信用額度制度連動。恆迎客戶等級 99.88% 空白，等於沒有這道閘。』' },
  { rule: 'BK-TRF',     no:  1, dc: 'D', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: null },
  { rule: 'BK-TRF',     no:  2, dc: 'C', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: '🔴 同科目、不同**銀行帳戶**、金額相等 → 不產生任何損益。與 `TRF` 倉庫調撥是同一種形狀（同科目跨維度）。 ⚠ 所以「銀行帳戶」必須是傳票上的一個維度，不能只靠科目——否則這一組分錄借貸同科目同金額，會看起來像沒發生任何事。 ⭐ 恆迎用 `1113 轉入現金`／`1114 轉出現金` 兩個科目來處理這件事；亞羅用維度，科目表不用膨脹。', remark: '🔴 同科目、不同**銀行帳戶**、金額相等 → 不產生任何損益。與 `TRF` 倉庫調撥是同一種形狀（同科目跨維度）。 ⚠ 所以「銀行帳戶」必須是傳票上的一個維度，不能只靠科目——否則這一組分錄借貸同科目同金額，會看起來像沒發生任何事。 ⭐ 恆迎用 `1113 轉入現金`／`1114 轉出現金` 兩個科目來處理這件事；亞羅用維度，科目表不用膨脹。' },
  { rule: 'BON-P',      no:  1, dc: 'D', acc: '6102',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：當月獎金 × X%。🔴 它不是「額外多提一筆」，是**當月已賺到、延後發**——所以借方仍是 6102，不另開科目', remark: '金額基礎（原文）：當月獎金 × X%。🔴 它不是「額外多提一筆」，是**當月已賺到、延後發**——所以借方仍是 6102，不另開科目' },
  { rule: 'BON-P',      no:  2, dc: 'C', acc: '2116',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：同上。🔴 **不可塞 `2111 應付費用`**——那個科目已經給員工代墊報支用（往來對象＝員工），混進去餘額就讀不出來。⭐ 而獎金池要能看到「餘額等於幾個月」，所以它必須有自己的科目', remark: '金額基礎（原文）：同上。🔴 **不可塞 `2111 應付費用`**——那個科目已經給員工代墊報支用（往來對象＝員工），混進去餘額就讀不出來。⭐ 而獎金池要能看到「餘額等於幾個月」，所以它必須有自己的科目' },
  { rule: 'BON-U',      no:  1, dc: 'D', acc: '2116',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：核准動用金額。🔴 動用需執行長核准，且單次不超過池餘額的 1/2', remark: '金額基礎（原文）：核准動用金額。🔴 動用需執行長核准，且單次不超過池餘額的 1/2' },
  { rule: 'BON-U',      no:  2, dc: 'C', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：同上。⭐ 隨當月薪資一起發，⛔ 不另開一次付款',      remark: '金額基礎（原文）：同上。⭐ 隨當月薪資一起發，⛔ 不另開一次付款' },
  { rule: 'CLS',        no:  1, dc: 'D', acc: '3202',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '⚠ 恆迎 28 年沒做這一步',                        remark: '⚠ 恆迎 28 年沒做這一步' },
  { rule: 'CLS',        no:  2, dc: 'C', acc: '3201',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '結轉累積盈餘',                                remark: '結轉累積盈餘' },
  { rule: 'CQ-NG',      no:  1, dc: 'D', acc: '1111',   pattern: null,         basis: 'FACE',   dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: '沖回原先的應收票據',                             remark: '沖回原先的應收票據' },
  { rule: 'CQ-NG',      no:  2, dc: 'C', acc: '1112',   pattern: null,         basis: 'FACE',   dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: '🆕 同樣是第②題抓到的。RC-CQ（收到支票）與 RC-CD（票據到期兌現）都有了，但**跳票沒有**。 ⚠ 退票之後這筆帳回到應收，可能接著走 BAD 呆帳沖銷——兩者要能串起來看。', remark: '🆕 同樣是第②題抓到的。RC-CQ（收到支票）與 RC-CD（票據到期兌現）都有了，但**跳票沒有**。 ⚠ 退票之後這筆帳回到應收，可能接著走 BAD 呆帳沖銷——兩者要能串起來看。' },
  { rule: 'DEP',        no:  1, dc: 'D', acc: '6401',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '⚠ 不吃現金，但壓低應稅所得',                        remark: '⚠ 不吃現金，但壓低應稅所得' },
  { rule: 'DEP',        no:  2, dc: 'C', acc: null,     pattern: '15x2',       basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: true,  cond: '依資產類別對映各自的累計折舊科目',                      remark: '依資產類別對映各自的累計折舊科目' },
  { rule: 'EMP-EXP',    no:  1, dc: 'D', acc: null,     pattern: '6xxx',       basis: 'NET',    dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: true,  cond: null,                                    remark: null },
  { rule: 'EMP-EXP',    no:  2, dc: 'D', acc: '1133',   pattern: null,         basis: 'TAX',    dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'EMP-EXP',    no:  3, dc: 'C', acc: '2111',   pattern: null,         basis: 'GROSS',  dept: false, partner: false, scope: 'EITHER',  bank: false, optional: false, cond: '🔴 缺口：`2111` 的「需往來對象」目前指向往來對象主檔，但**員工不在往來對象裡**。 → 值域要擴充成「往來對象／員工」二選一，否則代墊報支的對象欄只能空白或亂填（這正是恆迎那些「28 年一個值」欄位的長法）。 ⚠ 付款走既有的 `PY-CA`（匯款），不需要新代號。', remark: '🔴 缺口：`2111` 的「需往來對象」目前指向往來對象主檔，但**員工不在往來對象裡**。 → 值域要擴充成「往來對象／員工」二選一，否則代墊報支的對象欄只能空白或亂填（這正是恆迎那些「28 年一個值」欄位的長法）。 ⚠ 付款走既有的 `PY-CA`（匯款），不需要新代號。' },
  { rule: 'EQ-IN',      no:  1, dc: 'D', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: '金額基礎（原文）：出資金額。',                        remark: '金額基礎（原文）：出資金額。' },
  { rule: 'EQ-IN',      no:  2, dc: 'C', acc: '3101',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: '金額基礎（原文）：面額部分。',                        remark: '金額基礎（原文）：面額部分。' },
  { rule: 'EQ-IN',      no:  3, dc: 'C', acc: '3201',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: '金額基礎（原文）：溢價部分。',                        remark: '金額基礎（原文）：溢價部分。' },
  { rule: 'EX-D',       no:  1, dc: 'D', acc: null,     pattern: '6xxx',       basis: 'NET',    dept: true,  partner: true,  scope: 'PARTNER', bank: false, optional: true,  cond: '依費用性質選 6 開頭科目',                         remark: '依費用性質選 6 開頭科目' },
  { rule: 'EX-D',       no:  2, dc: 'D', acc: '1133',   pattern: null,         basis: 'TAX',    dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'EX-D',       no:  3, dc: 'C', acc: '1102',   pattern: null,         basis: 'GROSS',  dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '未付則貸 2111 應付費用',                        remark: '未付則貸 2111 應付費用' },
  { rule: 'EX-N',       no:  1, dc: 'D', acc: null,     pattern: '6xxx',       basis: 'GROSS',  dept: true,  partner: true,  scope: 'PARTNER', bank: false, optional: true,  cond: '⚠ 交際費、自用乘人小客車：稅額併入費用',                  remark: '⚠ 交際費、自用乘人小客車：稅額併入費用' },
  { rule: 'EX-N',       no:  2, dc: 'C', acc: '1102',   pattern: null,         basis: 'GROSS',  dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'FA-ACQ',     no:  1, dc: 'D', acc: null,     pattern: '15xx',       basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: true,  cond: '金額基礎（原文）：取得成本。',                        remark: '金額基礎（原文）：取得成本。' },
  { rule: 'FA-ACQ',     no:  2, dc: 'C', acc: null,     pattern: '1102/2131',  basis: 'AMOUNT', dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: true,  cond: '金額基礎（原文）：同上。',                          remark: '金額基礎（原文）：同上。' },
  { rule: 'FA-DEP',     no:  1, dc: 'D', acc: '6401',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：月折舊合計。',                       remark: '金額基礎（原文）：月折舊合計。' },
  { rule: 'FA-DEP',     no:  2, dc: 'C', acc: null,     pattern: '15x2',       basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: true,  cond: '金額基礎（原文）：同上。',                          remark: '金額基礎（原文）：同上。' },
  { rule: 'FA-DISP',    no:  1, dc: 'D', acc: null,     pattern: '1102/1111',  basis: 'AMOUNT', dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: true,  cond: '金額基礎（原文）：售價（含稅）。',                      remark: '金額基礎（原文）：售價（含稅）。' },
  { rule: 'FA-DISP',    no:  2, dc: 'D', acc: null,     pattern: '15x2',       basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: true,  cond: '金額基礎（原文）：該資產累計折舊。',                     remark: '金額基礎（原文）：該資產累計折舊。' },
  { rule: 'FA-DISP',    no:  3, dc: 'C', acc: null,     pattern: '15xx',       basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: true,  cond: '金額基礎（原文）：取得成本。',                        remark: '金額基礎（原文）：取得成本。' },
  { rule: 'FA-DISP',    no:  4, dc: 'C', acc: '2121',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：售價 × 5%。',                     remark: '金額基礎（原文）：售價 × 5%。' },
  { rule: 'FA-DISP',    no:  5, dc: 'C', acc: null,     pattern: '7103/8102',  basis: 'DIFF',   dept: false, partner: false, scope: 'PARTNER', bank: false, optional: true,  cond: '借貸方向依結果二選一（利益走貸方、損失走借方）。',              remark: null },
  { rule: 'FA-EXP',     no:  1, dc: 'D', acc: '6411',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：取得成本。',                        remark: '金額基礎（原文）：取得成本。' },
  { rule: 'FA-EXP',     no:  2, dc: 'C', acc: null,     pattern: '1102/2131',  basis: 'AMOUNT', dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: true,  cond: '金額基礎（原文）：同上。',                          remark: '金額基礎（原文）：同上。' },
  { rule: 'FA-INS',     no:  1, dc: 'D', acc: '1132',   pattern: null,         basis: 'AMOUNT', dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：保費全額。',                        remark: '金額基礎（原文）：保費全額。' },
  { rule: 'FA-INS',     no:  2, dc: 'C', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：同上。',                          remark: '金額基礎（原文）：同上。' },
  { rule: 'FA-INS',     no:  3, dc: 'D', acc: '6204',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：保費 ÷ 期數。',                     remark: '金額基礎（原文）：保費 ÷ 期數。' },
  { rule: 'FA-INS',     no:  4, dc: 'C', acc: '1132',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：同上。',                          remark: '金額基礎（原文）：同上。' },
  { rule: 'FA-SCRP',    no:  1, dc: 'D', acc: null,     pattern: '15x2',       basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: true,  cond: '金額基礎（原文）：該資產累計折舊。',                     remark: '金額基礎（原文）：該資產累計折舊。' },
  { rule: 'FA-SCRP',    no:  2, dc: 'D', acc: '8102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：帳面淨值。',                        remark: '金額基礎（原文）：帳面淨值。' },
  { rule: 'FA-SCRP',    no:  3, dc: 'C', acc: null,     pattern: '15xx',       basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: true,  cond: '金額基礎（原文）：取得成本。',                        remark: '金額基礎（原文）：取得成本。' },
  { rule: 'FA-SEC',     no:  1, dc: 'D', acc: '1141',   pattern: null,         basis: 'AMOUNT', dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：押金金額。',                        remark: '金額基礎（原文）：押金金額。' },
  { rule: 'FA-SEC',     no:  2, dc: 'C', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：同上。',                          remark: '金額基礎（原文）：同上。' },
  { rule: 'FX',         no:  1, dc: 'D', acc: '8104',   pattern: null,         basis: 'DIFF',   dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '匯損',                                    remark: '匯損' },
  { rule: 'FX',         no:  2, dc: 'C', acc: '8104',   pattern: null,         basis: 'DIFF',   dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '匯兌利益（貸方表示） 🔴 8104 是建議新增的科目。⚠ 恆迎 7102 兌換利益 613 萬、8102 兌換損失 332 萬（近三年淨賺 281 萬）， 但傳票的外幣欄位 100% 沒用（幣別 28 年一個值、匯率全部 1）——用台幣直接入帳，外幣資訊活在系統外。 🔴 對亞羅：進口採購單沒填幣別與匯率就不能過帳，否則它會變成第 N 個 28 年一個值的欄位。 ⚠ 這是既有的對', remark: '匯兌利益（貸方表示） 🔴 8104 是建議新增的科目。⚠ 恆迎 7102 兌換利益 613 萬、8102 兌換損失 332 萬（近三年淨賺 281 萬）， 但傳票的外幣欄位 100% 沒用（幣別 28 年一個值、匯率全部 1）——用台幣直接入帳，外幣資訊活在系統外。 🔴 對亞羅：進口採購單沒填幣別與匯率就不能過帳，否則它會變成第 N 個 28 年一個值的欄位。 ⚠ 這是既有的對映，適用『有帳期』的廠商（月結／月票）。前期主流是預付，走 PO-PRE ＋ PO-RCV。' },
  { rule: 'IADJ',       no:  1, dc: 'D', acc: '1121',   pattern: null,         basis: 'DIFF',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '盤盈',                                    remark: '盤盈' },
  { rule: 'IADJ',       no:  2, dc: 'C', acc: '5103',   pattern: null,         basis: 'DIFF',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '盤盈',                                    remark: '盤盈' },
  { rule: 'IADJ',       no:  3, dc: 'D', acc: '5103',   pattern: null,         basis: 'DIFF',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '盤虧',                                    remark: '盤虧' },
  { rule: 'IADJ',       no:  4, dc: 'C', acc: '1121',   pattern: null,         basis: 'DIFF',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '盤虧 盈與虧擇一。5103 的餘額＝『庫位制度有沒有落實』的直接量測，也是倉管 KPI 計分依據（1-b 起）。', remark: '盤虧 盈與虧擇一。5103 的餘額＝『庫位制度有沒有落實』的直接量測，也是倉管 KPI 計分依據（1-b 起）。' },
  { rule: 'IT-SW',      no:  1, dc: 'D', acc: '6405',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：月費。',                          remark: '金額基礎（原文）：月費。' },
  { rule: 'IT-SW',      no:  2, dc: 'C', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：同上。',                          remark: '金額基礎（原文）：同上。' },
  { rule: 'IWD',        no:  1, dc: 'D', acc: '5105',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '🔴 5105 是建議新增的科目',                       remark: '🔴 5105 是建議新增的科目' },
  { rule: 'IWD',        no:  2, dc: 'C', acc: '1121',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '⚠ 待會計政策定案（成本與淨變現價值孰低法）。BCG 老狗出清需要它。',   remark: '⚠ 待會計政策定案（成本與淨變現價值孰低法）。BCG 老狗出清需要它。' },
  { rule: 'LCA',        no:  1, dc: 'D', acc: '1121',   pattern: null,         basis: 'ALLOC',  dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '按金額比例分攤到批次內各料號',                        remark: '按金額比例分攤到批次內各料號' },
  { rule: 'LCA',        no:  2, dc: 'C', acc: '1122',   pattern: null,         basis: 'ALLOC',  dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '🔴 防火牆的核心：1122 的期末餘額必須趨近於 0。有餘額＝有費用沒分攤進存貨，一眼看得出來。', remark: '🔴 防火牆的核心：1122 的期末餘額必須趨近於 0。有餘額＝有費用沒分攤進存貨，一眼看得出來。' },
  { rule: 'LN-DRAW',    no:  1, dc: 'D', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: '金額基礎（原文）：動用金額。',                        remark: '金額基礎（原文）：動用金額。' },
  { rule: 'LN-DRAW',    no:  2, dc: 'C', acc: null,     pattern: '2151/2501',  basis: 'AMOUNT', dept: false, partner: true,  scope: 'PARTNER', bank: true,  optional: true,  cond: '金額基礎（原文）：動用金額。',                        remark: '金額基礎（原文）：動用金額。' },
  { rule: 'LN-GUAR',    no:  1, dc: 'D', acc: '8101',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：保證手續費。',                       remark: '金額基礎（原文）：保證手續費。' },
  { rule: 'LN-GUAR',    no:  2, dc: 'C', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：同上。',                          remark: '金額基礎（原文）：同上。' },
  { rule: 'LN-REPAY',   no:  1, dc: 'D', acc: null,     pattern: '2151/2501',  basis: 'AMOUNT', dept: false, partner: true,  scope: 'PARTNER', bank: true,  optional: true,  cond: '金額基礎（原文）：本金部分。',                        remark: '金額基礎（原文）：本金部分。' },
  { rule: 'LN-REPAY',   no:  2, dc: 'D', acc: '8101',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: '金額基礎（原文）：利息部分。',                        remark: '金額基礎（原文）：利息部分。' },
  { rule: 'LN-REPAY',   no:  3, dc: 'C', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: '金額基礎（原文）：本息合計。',                        remark: '金額基礎（原文）：本息合計。' },
  { rule: 'NT-DISC',    no:  1, dc: 'D', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: '金額基礎（原文）：貼現淨額。',                        remark: '金額基礎（原文）：貼現淨額。' },
  { rule: 'NT-DISC',    no:  2, dc: 'D', acc: '8101',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: '金額基礎（原文）：貼現息。',                         remark: '金額基礎（原文）：貼現息。' },
  { rule: 'NT-DISC',    no:  3, dc: 'C', acc: '1112',   pattern: null,         basis: 'FACE',   dept: false, partner: true,  scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: null },
  { rule: 'NT-DISC-NG', no:  1, dc: 'D', acc: '1111',   pattern: null,         basis: 'FACE',   dept: false, partner: true,  scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: null },
  { rule: 'NT-DISC-NG', no:  2, dc: 'D', acc: '6406',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: '金額基礎（原文）：退票手續費。',                       remark: '金額基礎（原文）：退票手續費。' },
  { rule: 'NT-DISC-NG', no:  3, dc: 'C', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: null },
  { rule: 'OFFS',       no:  1, dc: 'D', acc: '2101',   pattern: null,         basis: 'AMOUNT', dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: '⚠ 同一往來對象的應付',                           remark: '⚠ 同一往來對象的應付' },
  { rule: 'OFFS',       no:  2, dc: 'C', acc: '1111',   pattern: null,         basis: 'AMOUNT', dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: '同一往來對象的應收。往來對象合一才做得到',                  remark: '同一往來對象的應收。往來對象合一才做得到' },
  { rule: 'OPEN-AP',    no:  1, dc: 'D', acc: '1121',   pattern: null,         basis: 'NET',    dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'OPEN-AP',    no:  2, dc: 'D', acc: '1133',   pattern: null,         basis: 'TAX',    dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '⚠ 須取得合法憑證才可扣抵',                         remark: '⚠ 須取得合法憑證才可扣抵' },
  { rule: 'OPEN-AP',    no:  3, dc: 'C', acc: '2101',   pattern: null,         basis: 'GROSS',  dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: '🔴 承接恆迎庫存時走這組。風險不是分錄是成本口徑——2.99 億裡 1.94 億（65%）不是一年內用得到的。', remark: '🔴 承接恆迎庫存時走這組。風險不是分錄是成本口徑——2.99 億裡 1.94 億（65%）不是一年內用得到的。' },
  { rule: 'OPEN-CA',    no:  1, dc: 'D', acc: '1121',   pattern: null,         basis: 'NET',    dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'OPEN-CA',    no:  2, dc: 'D', acc: '1133',   pattern: null,         basis: 'TAX',    dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'OPEN-CA',    no:  3, dc: 'C', acc: '1102',   pattern: null,         basis: 'GROSS',  dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '同上，差別只在付款方式。',                          remark: '同上，差別只在付款方式。' },
  { rule: 'OPEN-EQ',    no:  1, dc: 'D', acc: '1121',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'OPEN-EQ',    no:  2, dc: 'C', acc: '3101',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '股東以實物抵繳股款 ⚠ 需會計師查核作價。一次性，開帳後鎖定。',       remark: '股東以實物抵繳股款 ⚠ 需會計師查核作價。一次性，開帳後鎖定。' },
  { rule: 'PAY',        no:  1, dc: 'D', acc: '6101',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'PAY',        no:  2, dc: 'D', acc: '6102',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '個績＋團績＋超額抽成',                            remark: '個績＋團績＋超額抽成' },
  { rule: 'PAY',        no:  3, dc: 'D', acc: '6103',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '勞健保雇主負擔',                               remark: '勞健保雇主負擔' },
  { rule: 'PAY',        no:  4, dc: 'D', acc: '6104',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '勞退 6%',                                 remark: '勞退 6%' },
  { rule: 'PAY',        no:  5, dc: 'C', acc: '2113',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '代扣所得稅',                                 remark: '代扣所得稅' },
  { rule: 'PAY',        no:  6, dc: 'C', acc: '2114',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '代扣勞健保自付額',                              remark: '代扣勞健保自付額' },
  { rule: 'PAY',        no:  7, dc: 'C', acc: '2112',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '應付薪資',                                  remark: '應付薪資' },
  { rule: 'PAY',        no:  8, dc: 'C', acc: '2111',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：雇主負擔的勞健保與勞退。',                 remark: '金額基礎（原文）：雇主負擔的勞健保與勞退。' },
  { rule: 'PAY-LV',     no:  1, dc: 'D', acc: '6101',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：當期新增的未休特休折算金額。',               remark: '金額基礎（原文）：當期新增的未休特休折算金額。' },
  { rule: 'PAY-LV',     no:  2, dc: 'C', acc: '2115',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：同上。',                          remark: '金額基礎（原文）：同上。' },
  { rule: 'PAY-NHI2',   no:  1, dc: 'D', acc: '6103',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：雇主應負擔部分。',                     remark: '金額基礎（原文）：雇主應負擔部分。' },
  { rule: 'PAY-NHI2',   no:  2, dc: 'C', acc: '2114',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：員工自負部分（獎金超過投保薪資 4 倍者扣 2.11%）。', remark: '金額基礎（原文）：員工自負部分（獎金超過投保薪資 4 倍者扣 2.11%）。' },
  { rule: 'PAY-SEV',    no:  1, dc: 'D', acc: '6101',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：資遣費 ＋ 預告工資。',                  remark: '金額基礎（原文）：資遣費 ＋ 預告工資。' },
  { rule: 'PAY-SEV',    no:  2, dc: 'C', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：同上。',                          remark: '金額基礎（原文）：同上。' },
  { rule: 'PC-ADV',     no:  1, dc: 'D', acc: '1103',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: '金額基礎（原文）：定額（或調整差額）。',                   remark: '金額基礎（原文）：定額（或調整差額）。' },
  { rule: 'PC-ADV',     no:  2, dc: 'C', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: '金額基礎（原文）：同上。一次性。⭐ 之後 `1103` 的帳面餘額永遠等於定額——**科目餘額本身就是「現金＋未核銷單據＝定額」那道紀律的檢查點。** ⚠ 調整定額要核准（它改的是那個「必須等於的值」）。', remark: '金額基礎（原文）：同上。一次性。⭐ 之後 `1103` 的帳面餘額永遠等於定額——**科目餘額本身就是「現金＋未核銷單據＝定額」那道紀律的檢查點。** ⚠ 調整定額要核准（它改的是那個「必須等於的值」）。' },
  { rule: 'PC-EXP',     no:  1, dc: 'D', acc: null,     pattern: '6xxx',       basis: 'NET',    dept: true,  partner: false, scope: 'PARTNER', bank: true,  optional: true,  cond: null,                                    remark: null },
  { rule: 'PC-EXP',     no:  2, dc: 'D', acc: '1133',   pattern: null,         basis: 'TAX',    dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: null },
  { rule: 'PC-EXP',     no:  3, dc: 'C', acc: '1102',   pattern: null,         basis: 'GROSS',  dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: '⭐ 核銷與撥補一次做完，所以 `1103` 不動——這是定額備用金制的關鍵：**帳上的零用金永遠是定額。** ⚠ 小額支出常常沒有發票只有收據 → 那幾筆走 `EX-N` 的邏輯（不得扣抵），第 2 列不出現。 🔴 撥補前會計必須盤點：現金 ＋ 未核銷單據 ＝ 定額。不符不能過這張單。', remark: '⭐ 核銷與撥補一次做完，所以 `1103` 不動——這是定額備用金制的關鍵：**帳上的零用金永遠是定額。** ⚠ 小額支出常常沒有發票只有收據 → 那幾筆走 `EX-N` 的邏輯（不得扣抵），第 2 列不出現。 🔴 撥補前會計必須盤點：現金 ＋ 未核銷單據 ＝ 定額。不符不能過這張單。' },
  { rule: 'PO',         no:  1, dc: 'D', acc: '1121',   pattern: null,         basis: 'NET',    dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '⚠ 進貨入存貨不入成本；成本在銷貨時才轉',                  remark: '⚠ 進貨入存貨不入成本；成本在銷貨時才轉' },
  { rule: 'PO',         no:  2, dc: 'D', acc: '1133',   pattern: null,         basis: 'TAX',    dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '進項稅額',                                  remark: '進項稅額' },
  { rule: 'PO',         no:  3, dc: 'C', acc: '2101',   pattern: null,         basis: 'GROSS',  dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: '應付帳款',                                  remark: '應付帳款' },
  { rule: 'PO-IMP',     no:  1, dc: 'D', acc: '1122',   pattern: null,         basis: 'NET',    dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '🔴 海運／保險／關稅／報關／拖車',                      remark: '🔴 海運／保險／關稅／報關／拖車' },
  { rule: 'PO-IMP',     no:  2, dc: 'D', acc: '1133',   pattern: null,         basis: 'TAX',    dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '⚠ 進口營業稅走這裡，不進 1122',                    remark: '⚠ 進口營業稅走這裡，不進 1122' },
  { rule: 'PO-IMP',     no:  3, dc: 'C', acc: '2101',   pattern: null,         basis: 'GROSS',  dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: '對象＝貨代／報關行／拖車行 🔴 1122 是本次建議新增的科目。⚠ 關稅計入存貨成本（1122）、進口營業稅是進項稅額（1133）——兩者不可混。', remark: '對象＝貨代／報關行／拖車行 🔴 1122 是本次建議新增的科目。⚠ 關稅計入存貨成本（1122）、進口營業稅是進項稅額（1133）——兩者不可混。' },
  { rule: 'PO-PRE',     no:  1, dc: 'D', acc: '1131',   pattern: null,         basis: 'AMOUNT', dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: '🔴 錢先出去，貨還沒有',                           remark: '🔴 錢先出去，貨還沒有' },
  { rule: 'PO-PRE',     no:  2, dc: 'C', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '🔴 執行長 7/30：恆迎八成廠商要付全額才出貨，亞羅前期量小更談不到票期 → 1131 從邊緣科目變成主科目。 ⚠ 付訂金通常沒有發票，所以進項稅額不在這一段，掛在到貨那一段。⚠ 需預付貨款貨齡表。', remark: '🔴 執行長 7/30：恆迎八成廠商要付全額才出貨，亞羅前期量小更談不到票期 → 1131 從邊緣科目變成主科目。 ⚠ 付訂金通常沒有發票，所以進項稅額不在這一段，掛在到貨那一段。⚠ 需預付貨款貨齡表。' },
  { rule: 'PO-RCV',     no:  1, dc: 'D', acc: '1121',   pattern: null,         basis: 'NET',    dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'PO-RCV',     no:  2, dc: 'D', acc: '1133',   pattern: null,         basis: 'TAX',    dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '此時才有發票',                                remark: '此時才有發票' },
  { rule: 'PO-RCV',     no:  3, dc: 'C', acc: '1131',   pattern: null,         basis: 'PAID',   dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'PO-RCV',     no:  4, dc: 'C', acc: '2101',   pattern: null,         basis: 'UNPAID', dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: '若尚有尾款未付 ⚠ 分批到貨時 1131 要能分次沖銷（一對多）——執行長 7/30：缺櫃或戰爭會導致國外分批到貨。', remark: '若尚有尾款未付 ⚠ 分批到貨時 1131 要能分次沖銷（一對多）——執行長 7/30：缺櫃或戰爭會導致國外分批到貨。' },
  { rule: 'PO-TR',      no:  1, dc: 'D', acc: '1121',   pattern: null,         basis: 'NET',    dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '🔴 個別認定成本，不進移動平均池',                      remark: '🔴 個別認定成本，不進移動平均池' },
  { rule: 'PO-TR',      no:  2, dc: 'D', acc: '1133',   pattern: null,         basis: 'TAX',    dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'PO-TR',      no:  3, dc: 'C', acc: '2101',   pattern: null,         basis: 'GROSS',  dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: '對象是同行；同行常同時是客戶 → 可走 OFFS 抵帳 分錄形狀與 PO 相同，差別在成本方法與自動預留。必須獨立代號，否則報表切不出『調貨佔多少』。', remark: '對象是同行；同行常同時是客戶 → 可走 OFFS 抵帳 分錄形狀與 PO 相同，差別在成本方法與自動預留。必須獨立代號，否則報表切不出『調貨佔多少』。' },
  { rule: 'PR',         no:  1, dc: 'D', acc: '2101',   pattern: null,         basis: 'GROSS',  dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'PR',         no:  2, dc: 'C', acc: '1121',   pattern: null,         basis: 'NET',    dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'PR',         no:  3, dc: 'C', acc: '1133',   pattern: null,         basis: 'TAX',    dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'PY-CA',      no:  1, dc: 'D', acc: '2101',   pattern: null,         basis: 'AMOUNT', dept: false, partner: true,  scope: 'PARTNER', bank: true,  optional: false, cond: '⚠ 需店長覆核',                               remark: '⚠ 需店長覆核' },
  { rule: 'PY-CA',      no:  2, dc: 'C', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: null },
  { rule: 'PY-CD',      no:  1, dc: 'D', acc: '2102',   pattern: null,         basis: 'FACE',   dept: false, partner: true,  scope: 'PARTNER', bank: true,  optional: false, cond: '⚠ 支存戶這天要有錢，否則跳票',                       remark: '⚠ 支存戶這天要有錢，否則跳票' },
  { rule: 'PY-CD',      no:  2, dc: 'C', acc: '1102',   pattern: null,         basis: 'FACE',   dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: null },
  { rule: 'PY-CQ',      no:  1, dc: 'D', acc: '2101',   pattern: null,         basis: 'FACE',   dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'PY-CQ',      no:  2, dc: 'C', acc: '2102',   pattern: null,         basis: 'FACE',   dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: '應付票據；現金還在',                             remark: '應付票據；現金還在' },
  { rule: 'RC-CA',      no:  1, dc: 'D', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: '現金則走 1101',                             remark: '現金則走 1101' },
  { rule: 'RC-CA',      no:  2, dc: 'C', acc: '1111',   pattern: null,         basis: 'AMOUNT', dept: false, partner: true,  scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: null },
  { rule: 'RC-CD',      no:  1, dc: 'D', acc: '1102',   pattern: null,         basis: 'FACE',   dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: '票兌現，現金這時才進來',                           remark: '票兌現，現金這時才進來' },
  { rule: 'RC-CD',      no:  2, dc: 'C', acc: '1112',   pattern: null,         basis: 'FACE',   dept: false, partner: true,  scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: null },
  { rule: 'RC-CQ',      no:  1, dc: 'D', acc: '1112',   pattern: null,         basis: 'FACE',   dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: '⚠ 應收沖掉了，但現金還沒進來',                       remark: '⚠ 應收沖掉了，但現金還沒進來' },
  { rule: 'RC-CQ',      no:  2, dc: 'C', acc: '1111',   pattern: null,         basis: 'FACE',   dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'SCRP',       no:  1, dc: 'D', acc: '5104',   pattern: null,         basis: 'COST',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'SCRP',       no:  2, dc: 'C', acc: '1121',   pattern: null,         basis: 'COST',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '⚠ 只適用良品倉。不良品倉成本已是 0，報廢時只減數量、無分錄。',      remark: '⚠ 只適用良品倉。不良品倉成本已是 0，報廢時只減數量、無分錄。' },
  { rule: 'SD',         no:  1, dc: 'D', acc: '4103',   pattern: null,         basis: 'NET',    dept: true,  partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: '⚠ 毛利率的漏水點，要按客戶盯',                       remark: '⚠ 毛利率的漏水點，要按客戶盯' },
  { rule: 'SD',         no:  2, dc: 'D', acc: '2121',   pattern: null,         basis: 'TAX',    dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'SD',         no:  3, dc: 'C', acc: '1111',   pattern: null,         basis: 'GROSS',  dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'SO-CA',      no:  1, dc: 'D', acc: '1101',   pattern: null,         basis: 'GROSS',  dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '現金收訖；匯款則走 1102',                        remark: '現金收訖；匯款則走 1102' },
  { rule: 'SO-CA',      no:  2, dc: 'C', acc: '4101',   pattern: null,         basis: 'NET',    dept: true,  partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'SO-CA',      no:  3, dc: 'C', acc: '2121',   pattern: null,         basis: 'TAX',    dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'SO-CA',      no:  4, dc: 'D', acc: '5101',   pattern: null,         basis: 'COST',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'SO-CA',      no:  5, dc: 'C', acc: '1121',   pattern: null,         basis: 'COST',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'SO-CR',      no:  1, dc: 'D', acc: '1111',   pattern: null,         basis: 'GROSS',  dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: '應收帳款',                                  remark: '應收帳款' },
  { rule: 'SO-CR',      no:  2, dc: 'C', acc: '4101',   pattern: null,         basis: 'NET',    dept: true,  partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: '銷貨收入',                                  remark: '銷貨收入' },
  { rule: 'SO-CR',      no:  3, dc: 'C', acc: '2121',   pattern: null,         basis: 'TAX',    dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '銷項稅額',                                  remark: '銷項稅額' },
  { rule: 'SO-CR',      no:  4, dc: 'D', acc: '5101',   pattern: null,         basis: 'COST',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '結轉成本（永續盤存）',                            remark: '結轉成本（永續盤存）' },
  { rule: 'SO-CR',      no:  5, dc: 'C', acc: '1121',   pattern: null,         basis: 'COST',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '存貨減少',                                  remark: '存貨減少' },
  { rule: 'SR',         no:  1, dc: 'D', acc: '4102',   pattern: null,         basis: 'NET',    dept: true,  partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: '收入減項',                                  remark: '收入減項' },
  { rule: 'SR',         no:  2, dc: 'D', acc: '2121',   pattern: null,         basis: 'TAX',    dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '沖回銷項稅額',                                remark: '沖回銷項稅額' },
  { rule: 'SR',         no:  3, dc: 'C', acc: '1111',   pattern: null,         basis: 'GROSS',  dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'SR',         no:  4, dc: 'D', acc: '1121',   pattern: null,         basis: 'COST',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '貨退回入庫',                                 remark: '貨退回入庫' },
  { rule: 'SR',         no:  5, dc: 'C', acc: '5101',   pattern: null,         basis: 'COST',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'TAX-FS',     no:  1, dc: 'D', acc: '8201',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: null },
  { rule: 'TAX-FS',     no:  2, dc: 'C', acc: '1135',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: null },
  { rule: 'TAX-FS',     no:  3, dc: 'C', acc: '2131',   pattern: null,         basis: 'DIFF',   dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: '⚠ 財務模型 v3 把營所稅按月攤（20%），但**現金上是一年兩筆**（9 月暫繳、5 月結算）。 🔴 現金最低點必須用實際繳納月份算，否則會低估那兩個月的資金壓力。 ⛔ 不開的三個', remark: '⚠ 財務模型 v3 把營所稅按月攤（20%），但**現金上是一年兩筆**（9 月暫繳、5 月結算）。 🔴 現金最低點必須用實際繳納月份算，否則會低估那兩個月的資金壓力。 ⛔ 不開的三個' },
  { rule: 'TAX-PP',     no:  1, dc: 'D', acc: '1135',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: null },
  { rule: 'TAX-PP',     no:  2, dc: 'C', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: '金額基礎（原文）：同上。🔴 科目表沒有這個科目，只有 `2131 應付所得稅`。暫繳是**預付性質**，記到負債科目會變成負餘額（就是恆迎支存負數那種「金額對、格子錯」的問題）。 ⚠ 這一筆是大額單筆，必須進 13 週預測。', remark: '金額基礎（原文）：同上。🔴 科目表沒有這個科目，只有 `2131 應付所得稅`。暫繳是**預付性質**，記到負債科目會變成負餘額（就是恆迎支存負數那種「金額對、格子錯」的問題）。 ⚠ 這一筆是大額單筆，必須進 13 週預測。' },
  { rule: 'TRF',        no:  1, dc: 'D', acc: '1121',   pattern: null,         basis: 'COST',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '部門＝目的倉或在途倉',                            remark: '部門＝目的倉或在途倉' },
  { rule: 'TRF',        no:  2, dc: 'C', acc: '1121',   pattern: null,         basis: 'COST',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '部門＝來源倉 ⭐ 同科目、不同部門、金額相等 → 不產生任何損益。分兩段：出庫時目的部門＝在途倉，落地時再轉。', remark: '部門＝來源倉 ⭐ 同科目、不同部門、金額相等 → 不產生任何損益。分兩段：出庫時目的部門＝在途倉，落地時再轉。' },
  { rule: 'VAT',        no:  1, dc: 'D', acc: '2121',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '沖銷項',                                   remark: '沖銷項' },
  { rule: 'VAT',        no:  2, dc: 'C', acc: '1133',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '沖進項',                                   remark: '沖進項' },
  { rule: 'VAT',        no:  3, dc: 'C', acc: '2122',   pattern: null,         basis: 'DIFF',   dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '銷項>進項時',                                remark: '銷項>進項時' },
  { rule: 'VAT',        no:  4, dc: 'D', acc: '1134',   pattern: null,         basis: 'DIFF',   dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '進項>銷項時，下期續扣',                           remark: '進項>銷項時，下期續扣' },
  { rule: 'WCLM',       no:  1, dc: 'D', acc: '1121',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '廠商換新品',                                 remark: '廠商換新品' },
  { rule: 'WCLM',       no:  2, dc: 'D', acc: '1113',   pattern: null,         basis: 'AMOUNT', dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: '廠商退款',                                  remark: '廠商退款' },
  { rule: 'WCLM',       no:  3, dc: 'D', acc: '2101',   pattern: null,         basis: 'AMOUNT', dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: '沖抵應付',                                  remark: '沖抵應付' },
  { rule: 'WCLM',       no:  4, dc: 'C', acc: '5101',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '沖回先前認列的保固成本 借方三選一。⭐ 索賠成功率＝該對象的 WCLM ÷ WOUT，是『往來對象績效評等』唯一缺的資料源。', remark: '沖回先前認列的保固成本 借方三選一。⭐ 索賠成功率＝該對象的 WCLM ÷ WOUT，是『往來對象績效評等』唯一缺的資料源。' },
  { rule: 'WHT',        no:  1, dc: 'D', acc: '2113',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: null },
  { rule: 'WHT',        no:  2, dc: 'D', acc: '2114',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: null },
  { rule: 'WHT',        no:  3, dc: 'C', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: '🔴 紀律⑤：`2113`＋`2114` 的期末餘額必須等於「次月要繳的金額」，不可累積跨月。 ⚠ 租金扣繳最容易漏：房東是個人時要扣 10% 所得稅 ＋ 2.11% 二代健保補充保費，而租金是 1-a 第二大固定支出。', remark: '🔴 紀律⑤：`2113`＋`2114` 的期末餘額必須等於「次月要繳的金額」，不可累積跨月。 ⚠ 租金扣繳最容易漏：房東是個人時要扣 10% 所得稅 ＋ 2.11% 二代健保補充保費，而租金是 1-a 第二大固定支出。' },
  { rule: 'WOUT',       no:  1, dc: 'D', acc: '5101',   pattern: null,         basis: 'COST',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '⭐ 不另開『保固費用』科目',                         remark: '⭐ 不另開『保固費用』科目' },
  { rule: 'WOUT',       no:  2, dc: 'C', acc: '1121',   pattern: null,         basis: 'COST',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '⭐ 進 5101：保固成本本質就是這門生意的真實成本，會自動吃掉毛利率。要看花多少用交易代號從傳票切。', remark: '⭐ 進 5101：保固成本本質就是這門生意的真實成本，會自動吃掉毛利率。要看花多少用交易代號從傳票切。' },
];

export async function applyPostingRule(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, actorUserId } = params;

  for (const r of RULES) {
    const data = {
      name: r.name, cycleCode: r.cycle, legalCycleCode: r.legal,
      status: r.status, isSystem: true, isActive: true,
      remark: r.remark, updatedBy: actorUserId,
    };
    await prisma.nx05PostingRule.upsert({
      where: { tenantId_code: { tenantId, code: r.code } },
      create: { tenantId, code: r.code, createdBy: actorUserId, ...data },
      update: data,
    });
  }

  const rules = await prisma.nx05PostingRule.findMany({ where: { tenantId }, select: { id: true, code: true } });
  const ruleIdByCode = new Map(rules.map((r) => [r.code, r.id]));
  const accounts = await prisma.nx05AccountCode.findMany({ where: { tenantId }, select: { id: true, code: true } });
  const accIdByCode = new Map(accounts.map((a) => [a.code, a.id]));

  const orphans: string[] = [];
  for (const l of LINES) {
    const ruleId = ruleIdByCode.get(l.rule);
    if (!ruleId) continue;
    const accountCodeId = l.acc ? (accIdByCode.get(l.acc) ?? null) : null;
    if (l.acc && accountCodeId === null) orphans.push(`${l.rule}#${l.no}→${l.acc}`);
    const data = {
      drCr: l.dc, accountCodeId, accountPattern: l.pattern, amountBasis: l.basis,
      requireDept: l.dept, requirePartner: l.partner, partnerScope: l.scope,
      requireBankAccount: l.bank, isOptional: l.optional,
      condition: l.cond, remark: l.remark, updatedBy: actorUserId,
    };
    await prisma.nx05PostingRuleLine.upsert({
      where: { ruleId_lineNo: { ruleId, lineNo: l.no } },
      create: { ruleId, lineNo: l.no, createdBy: actorUserId, ...data },
      update: data,
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx05_posting_rule_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx05_posting_rule), 0), 1), true)`,
  );
  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx05_posting_rule_line_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx05_posting_rule_line), 0), 1), true)`,
  );

  // 🔴 A 階段完成判準之一：每一條分錄行都要查得到有效科目
  if (orphans.length > 0) {
    throw new Error(`[TEMPLATE] applyPostingRule: 分錄行指向不存在的科目 → ${orphans.join(', ')}`);
  }
  console.log(`✅ [TEMPLATE] applyPostingRule: ${RULES.length} 個交易代號 / ${LINES.length} 條分錄行 (tenant=${tenantId})`);
}
