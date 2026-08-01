// packages/db-core/prisma/seed/template/apply-posting-rule.ts
// @FUNCTION_CODE SYS-TMPL-SVC-020-F01
// 範本：過帳規則／交易科目對映（總帳脊椎 A 階段 2026-08-01）。
//
// ⭐ 這是缺口 1「總帳脊椎」的核心規格輸入：單據要怎麼過帳，全部看這裡。
// 資料來源：亞羅核心主檔-v1『交易科目對映』（彙總 43 個代號）
//           ＋ 營運循環-v10 五張分循環分頁（另 20 個代號）＝ 共 67 個交易代號、182 條分錄行。
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
  { code: 'BK-TRF',     name: '帳戶間調撥（軋票撥款）',         cycle: 'FUND',       legal: 'PURCHASE_PAYMENT', status: 'ACTIVE',   remark: '⚠ 法定歸屬＝採購及付款（支援作業・硬塞）：借貸同科目(1102)、不同銀行帳戶、金額相等，沒有對外交易、沒有對手方、不產生損益。掛採購及付款是因為它服務的是開票與票據到期的票款，不是因為它本身是採購行為。⛔ 對外報告要如實寫成「支援作業」。' },
  { code: 'BON-P',      name: '🆕 獎金提撥（v10）',         cycle: 'HR',         legal: 'PAYROLL',          status: 'ACTIVE',   remark: null },
  { code: 'BON-U',      name: '🆕 獎金池動用（v10）',        cycle: 'HR',         legal: 'PAYROLL',          status: 'ACTIVE',   remark: null },
  { code: 'CLS',        name: '年度結帳',                cycle: 'FUND',       legal: 'NONE',             status: 'ACTIVE',   remark: '⛔ 法定九大無對應：年度結帳是帳務程序、不是交易循環。' },
  { code: 'CQ-NG',      name: '票據退票',                cycle: 'FUND',       legal: 'SALES_RECEIPT',    status: 'ACTIVE',   remark: null },
  { code: 'DEP',        name: '折舊提列',                cycle: 'FIXEDASSET', legal: 'FIXEDASSET',       status: 'ACTIVE',   remark: null },
  { code: 'EMP-EXP',    name: '員工代墊報支',              cycle: 'FUND',       legal: 'PURCHASE_PAYMENT', status: 'ACTIVE',   remark: '⚠ 對手方是員工，但性質是墊付的營運費用、不是勞務對價 → 歸採購及付款不歸薪工。判準：薪工循環管的是「因提供勞務而付的錢」，代墊報支是「員工先幫公司付了廠商的錢」。' },
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
  { code: 'FX',         name: '兌換差額',                cycle: 'FUND',       legal: 'PURCHASE_PAYMENT', status: 'ACTIVE',   remark: null },
  { code: 'IADJ',       name: '盤點盈虧',                cycle: 'INVENTORY',  legal: 'INVENTORY',        status: 'ACTIVE',   remark: null },
  { code: 'IT-SW',      name: '軟體訂閱',                cycle: 'IT',         legal: 'IT',               status: 'ACTIVE',   remark: null },
  { code: 'IWD',        name: '存貨跌價',                cycle: 'INVENTORY',  legal: 'INVENTORY',        status: 'PENDING',  remark: null },
  { code: 'LCA',        name: 'Landed Cost 分攤',      cycle: 'PURCHASE',   legal: 'PURCHASE_PAYMENT', status: 'ACTIVE',   remark: null },
  { code: 'LN-DRAW',    name: '借款動用',                cycle: 'FINANCE',    legal: 'FINANCING',        status: 'ACTIVE',   remark: null },
  { code: 'LN-GUAR',    name: '信保保證手續費',             cycle: 'FINANCE',    legal: 'FINANCING',        status: 'ACTIVE',   remark: null },
  { code: 'LN-RECL',    name: '長期借款重分類（轉列一年內到期）',    cycle: 'FINANCE',    legal: 'FINANCING',        status: 'ACTIVE',   remark: '🔴 A 階段補建：長期借款的期末重分類（把未來一年內到期的本金轉列流動負債）。⚠ 為什麼非有不可——只在動用當下分流是不夠的，**時間會走**：原本掛 2501 的長期部分會逐漸變成「一年內到期」，不重分類的話流動負債被低估、流動比率一路虛高，而流動比率正是銀行授信看的第一個數字。⭐ 這一條在亞羅 v11 沒有——它的 LN-DRAW 備註寫了「一年內走 2151、超過一年走 2501」，但只寫了動用那一刻，沒有處理時間經過。⚠ 每期末（或至少每年結帳）跑一次，金額＝未來 12 個月內到期的本金。' },
  { code: 'LN-REPAY',   name: '借款還本付息',              cycle: 'FINANCE',    legal: 'FINANCING',        status: 'ACTIVE',   remark: null },
  { code: 'NT-DISC',    name: '應收票據貼現',              cycle: 'FINANCE',    legal: 'FINANCING',        status: 'ACTIVE',   remark: null },
  { code: 'NT-DISC-NG', name: '貼現票據退票（追索）',          cycle: 'FINANCE',    legal: 'FINANCING',        status: 'ACTIVE',   remark: null },
  { code: 'OFFS',       name: '抵帳（同行互抵）',            cycle: 'FUND',       legal: 'DUAL_SALES_PURCHASE', status: 'ACTIVE',   remark: '🔴 27 行裡唯一同時屬於兩條的行為：同一往來對象既是客戶（應收）又是供應商（應付），一張抵帳單同時沖兩邊。⚠ 對外報告時兩條循環的敘述都要提到它，只寫一邊會出現「這筆應收怎麼消掉的」斷點。' },
  { code: 'OPEN-AP',    name: '期初存貨（承接·賒欠）',         cycle: 'INVENTORY',  legal: 'INVENTORY',        status: 'ACTIVE',   remark: null },
  { code: 'OPEN-CA',    name: '期初存貨（承接·現購）',         cycle: 'INVENTORY',  legal: 'INVENTORY',        status: 'ACTIVE',   remark: null },
  { code: 'OPEN-EQ',    name: '期初存貨（實物出資）',          cycle: 'INVENTORY',  legal: 'INVENTORY',        status: 'ACTIVE',   remark: null },
  { code: 'PAY',        name: '薪資計提',                cycle: 'HR',         legal: 'PAYROLL',          status: 'ACTIVE',   remark: null },
  { code: 'PAY-LV',     name: '🔴 未休特休估列（本輪發現的缺口）',   cycle: 'HR',         legal: 'PAYROLL',          status: 'ACTIVE',   remark: null },
  { code: 'PAY-NHI2',   name: '⚠ 二代健保補充保費',          cycle: 'HR',         legal: 'PAYROLL',          status: 'ACTIVE',   remark: null },
  { code: 'PAY-SEV',    name: '資遣費與預告工資',            cycle: 'HR',         legal: 'PAYROLL',          status: 'ACTIVE',   remark: null },
  { code: 'PC-ADV',     name: '零用金設立／定額調整',          cycle: 'FUND',       legal: 'PURCHASE_PAYMENT', status: 'ACTIVE',   remark: null },
  { code: 'PC-EXP',     name: '零用金核銷撥補',             cycle: 'FUND',       legal: 'PURCHASE_PAYMENT', status: 'ACTIVE',   remark: null },
  { code: 'PD',         name: '進貨折讓',                cycle: 'PURCHASE',   legal: 'PURCHASE_PAYMENT', status: 'ACTIVE',   remark: '🔴 A 階段補建：亞羅原本把「進貨退出」與「進貨折讓」壓在同一個代號 PR，而那條規則只長了「退出」的形狀（貸 1121 存貨）→ 科目表建了 5102 進貨折讓卻沒有任何代號承接它。⭐ 對稱依據就在亞羅自己的銷貨側：SR 銷貨退回（動存貨）與 SD 銷貨折讓（不動存貨）是兩個代號、兩個科目（4102／4103）。進貨側照同一個形狀拆開即可。⚠ 關鍵差別：退出是貨真的退回廠商 → 存貨減少；折讓是貨留著、只降價 → 存貨不動、走成本減項。📌 NEXORA 這邊單據早就分好了——nx05_allowance.allowance_type 的 P＝進貨折讓、S＝銷貨折讓，缺的一直只是過帳規則。' },
  { code: 'PO',         name: '進貨',                  cycle: 'PURCHASE',   legal: 'PURCHASE_PAYMENT', status: 'ACTIVE',   remark: null },
  { code: 'PO-IMP',     name: '進口費用歸集',              cycle: 'PURCHASE',   legal: 'PURCHASE_PAYMENT', status: 'ACTIVE',   remark: null },
  { code: 'PO-PRE',     name: '預付貨款（付款段）',           cycle: 'PURCHASE',   legal: 'PURCHASE_PAYMENT', status: 'ACTIVE',   remark: null },
  { code: 'PO-RCV',     name: '到貨（預付轉存貨）',           cycle: 'PURCHASE',   legal: 'PURCHASE_PAYMENT', status: 'ACTIVE',   remark: null },
  { code: 'PO-TR',      name: '調貨進貨',                cycle: 'PURCHASE',   legal: 'PURCHASE_PAYMENT', status: 'ACTIVE',   remark: null },
  { code: 'PR',         name: '進貨退出',                cycle: 'PURCHASE',   legal: 'PURCHASE_PAYMENT', status: 'ACTIVE',   remark: '⚠ A 階段正名：亞羅原名「進貨退出／折讓」把兩件事壓在一個代號。本規則貸的是 1121 存貨，那是「貨真的退回廠商」的形狀 → 正名為進貨退出。只降價不退貨的情形改走新代號 PD 進貨折讓（貸 5102 成本減項、存貨不動）。⭐ 與銷貨側的 SR 銷貨退回／SD 銷貨折讓 拆法對稱。' },
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
  { code: 'SO-DLV',     name: '出貨（預收轉收入）',           cycle: 'SALES',      legal: 'SALES_RECEIPT',    status: 'ACTIVE',   remark: '🔴 A 階段補建：SO-PRE 的沖銷段。⚠ 沒有這一段，2141 只會進不會出、餘額永遠對不平。對稱依據＝採購側的 PO-RCV（到貨時把 1131 預付貨款沖掉）。⚠ 分批出貨時 2141 要能分次沖銷（一對多），與 PO-RCV 的分批到貨同構。' },
  { code: 'SO-PRE',     name: '預收貨款（收款段）',           cycle: 'SALES',      legal: 'SALES_RECEIPT',    status: 'ACTIVE',   remark: '🔴 A 階段補建（亞羅對映表沒有）：客戶先付訂金、貨還沒出。⭐ 對稱依據——採購側有 PO-PRE 預付貨款，銷貨側原本沒有對應的預收，導致科目表建了 2141 卻沒有任何交易代號承接它。⚠ 業務語意假設：比照亞羅 PO-PRE 的處置「付訂金通常沒有發票、稅不在這一段」，收訂金亦不開發票、銷項稅額掛在出貨那一段（SO-DLV）。🔴 需記帳士確認：若實務上收訂金即須開立發票，本規則要拆出 2121 銷項稅額。' },
  { code: 'SR',         name: '銷貨退回',                cycle: 'SALES',      legal: 'SALES_RECEIPT',    status: 'ACTIVE',   remark: null },
  { code: 'TAX-FS',     name: '營所稅結算（5 月）',          cycle: 'FUND',       legal: 'NONE',             status: 'ACTIVE',   remark: '⛔ 法定九大無對應：同上。⚠ 9 月暫繳、5 月結算兩筆都是大額單筆 → 必須進 13 週預測。' },
  { code: 'TAX-PP',     name: '營所稅暫繳（9 月）',          cycle: 'FUND',       legal: 'NONE',             status: 'ACTIVE',   remark: '⛔ 法定九大無對應：所得稅是全公司損益的結果，不是任何一條交易循環的產物。' },
  { code: 'TRF',        name: '倉庫調撥',                cycle: 'INVENTORY',  legal: 'INVENTORY',        status: 'ACTIVE',   remark: null },
  { code: 'VAT',        name: '營業稅申報',               cycle: 'FUND',       legal: 'NONE',             status: 'ACTIVE',   remark: '⛔ 法定九大無對應：銷項稅額來自銷售及收款、進項稅額來自採購及付款，申報這個動作把兩條的產物加總後對外——它不屬任何一條，是兩條的匯流點。' },
  { code: 'WCLM',       name: '保固索賠回收',              cycle: 'INVENTORY',  legal: 'INVENTORY',        status: 'ACTIVE',   remark: null },
  { code: 'WHT',        name: '代扣款項繳納',              cycle: 'FUND',       legal: 'PAYROLL',          status: 'ACTIVE',   remark: '🔴 拍板時未預見的第三條：2113 代扣所得稅／2114 代扣勞健保費的來源是薪資發放 → 屬薪工循環的產物；房東是個人時的租金扣繳屬採購及付款。決策 3️⃣ 的循環名維持原寫法，差異記在這裡。' },
  { code: 'WOUT',       name: '保固換貨出庫',              cycle: 'INVENTORY',  legal: 'INVENTORY',        status: 'ACTIVE',   remark: null },
];

const LINES: readonly LineRow[] = [
  { rule: 'BAD',        no:  1, dc: 'D', acc: '6407',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'BAD',        no:  2, dc: 'C', acc: '1111',   pattern: null,         basis: 'AMOUNT', dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '🆕 三題檢查表第②題（錢動了、貨沒動）抓到的。科目 6407 早就存在，但沒有任何交易代號承接它。 ⚠ 會計政策第 8 項：呆帳採**直接沖銷法**（確定收不回才認列），所以不做期末估提。 ⚠ 6407 的說明已寫：『與信用額度制度連動。恆迎客戶等級 99.88% 空白，等於沒有這道閘。』' },
  { rule: 'BK-TRF',     no:  1, dc: 'D', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: null },
  { rule: 'BK-TRF',     no:  2, dc: 'C', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: '🔴 同科目、不同**銀行帳戶**、金額相等 → 不產生任何損益。與 `TRF` 倉庫調撥是同一種形狀（同科目跨維度）。 ⚠ 所以「銀行帳戶」必須是傳票上的一個維度，不能只靠科目——否則這一組分錄借貸同科目同金額，會看起來像沒發生任何事。 ⭐ 恆迎用 `1113 轉入現金`／`1114 轉出現金` 兩個科目來處理這件事；亞羅用維度，科目表不用膨脹。' },
  { rule: 'BON-P',      no:  1, dc: 'D', acc: '6102',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：當月獎金 × X%',                    remark: '金額基礎（原文）：當月獎金 × X%。🔴 它不是「額外多提一筆」，是**當月已賺到、延後發**——所以借方仍是 6102，不另開科目' },
  { rule: 'BON-P',      no:  2, dc: 'C', acc: '2116',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：同上',                           remark: '金額基礎（原文）：同上。🔴 **不可塞 `2111 應付費用`**——那個科目已經給員工代墊報支用（往來對象＝員工），混進去餘額就讀不出來。⭐ 而獎金池要能看到「餘額等於幾個月」，所以它必須有自己的科目' },
  { rule: 'BON-U',      no:  1, dc: 'D', acc: '2116',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：核准動用金額',                       remark: '金額基礎（原文）：核准動用金額。🔴 動用需執行長核准，且單次不超過池餘額的 1/2' },
  { rule: 'BON-U',      no:  2, dc: 'C', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：同上',                           remark: '金額基礎（原文）：同上。⭐ 隨當月薪資一起發，⛔ 不另開一次付款' },
  { rule: 'CLS',        no:  1, dc: 'D', acc: '3202',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '⚠ 恆迎 28 年沒做這一步' },
  { rule: 'CLS',        no:  2, dc: 'C', acc: '3201',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '結轉累積盈餘' },
  { rule: 'CQ-NG',      no:  1, dc: 'D', acc: '1111',   pattern: null,         basis: 'FACE',   dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '沖回原先的應收票據' },
  { rule: 'CQ-NG',      no:  2, dc: 'C', acc: '1112',   pattern: null,         basis: 'FACE',   dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '🆕 同樣是第②題抓到的。RC-CQ（收到支票）與 RC-CD（票據到期兌現）都有了，但**跳票沒有**。 ⚠ 退票之後這筆帳回到應收，可能接著走 BAD 呆帳沖銷——兩者要能串起來看。' },
  { rule: 'DEP',        no:  1, dc: 'D', acc: '6401',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '⚠ 不吃現金，但壓低應稅所得' },
  { rule: 'DEP',        no:  2, dc: 'C', acc: null,     pattern: '15x2',       basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: true,  cond: null,                                    remark: '依資產類別對映各自的累計折舊科目' },
  { rule: 'EMP-EXP',    no:  1, dc: 'D', acc: null,     pattern: '6xxx',       basis: 'NET',    dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: true,  cond: null,                                    remark: null },
  { rule: 'EMP-EXP',    no:  2, dc: 'D', acc: '1133',   pattern: null,         basis: 'TAX',    dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'EMP-EXP',    no:  3, dc: 'C', acc: '2111',   pattern: null,         basis: 'GROSS',  dept: false, partner: false, scope: 'EITHER',  bank: false, optional: false, cond: null,                                    remark: '🔴 缺口：`2111` 的「需往來對象」目前指向往來對象主檔，但**員工不在往來對象裡**。 → 值域要擴充成「往來對象／員工」二選一，否則代墊報支的對象欄只能空白或亂填（這正是恆迎那些「28 年一個值」欄位的長法）。 ⚠ 付款走既有的 `PY-CA`（匯款），不需要新代號。' },
  { rule: 'EQ-IN',      no:  1, dc: 'D', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: '金額基礎（原文）：出資金額',                         remark: '金額基礎（原文）：出資金額。' },
  { rule: 'EQ-IN',      no:  2, dc: 'C', acc: '3101',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: '金額基礎（原文）：面額部分',                         remark: '金額基礎（原文）：面額部分。' },
  { rule: 'EQ-IN',      no:  3, dc: 'C', acc: '3102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: '金額基礎（原文）：超過面額部分',                       remark: '金額基礎（原文）：超過面額部分。🆕 v2 ·『回頭要補的』#53 ＋ #48。🔴 `3102 資本公積` 是 v2 才補的科目——**沒有它，超過面額的出資無處可放。**⚠ 有限公司通常按出資額計股本、不必然有溢價，但股東分次增資、換算比例不同時就會出現差額（記帳士確認）。' },
  { rule: 'EX-D',       no:  1, dc: 'D', acc: null,     pattern: '6xxx',       basis: 'NET',    dept: true,  partner: true,  scope: 'PARTNER', bank: false, optional: true,  cond: null,                                    remark: '依費用性質選 6 開頭科目' },
  { rule: 'EX-D',       no:  2, dc: 'D', acc: '1133',   pattern: null,         basis: 'TAX',    dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'EX-D',       no:  3, dc: 'C', acc: '1102',   pattern: null,         basis: 'GROSS',  dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '未付則貸 2111 應付費用' },
  { rule: 'EX-N',       no:  1, dc: 'D', acc: null,     pattern: '6xxx',       basis: 'GROSS',  dept: true,  partner: true,  scope: 'PARTNER', bank: false, optional: true,  cond: null,                                    remark: '⚠ 交際費、自用乘人小客車：稅額併入費用' },
  { rule: 'EX-N',       no:  2, dc: 'C', acc: '1102',   pattern: null,         basis: 'GROSS',  dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'FA-ACQ',     no:  1, dc: 'D', acc: null,     pattern: '15xx',       basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: true,  cond: '金額基礎（原文）：取得成本',                         remark: '金額基礎（原文）：取得成本。' },
  { rule: 'FA-ACQ',     no:  2, dc: 'C', acc: null,     pattern: '1102/2131',  basis: 'AMOUNT', dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: true,  cond: '金額基礎（原文）：同上',                           remark: '金額基礎（原文）：同上。' },
  { rule: 'FA-DEP',     no:  1, dc: 'D', acc: '6401',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：月折舊合計',                        remark: '金額基礎（原文）：月折舊合計。' },
  { rule: 'FA-DEP',     no:  2, dc: 'C', acc: null,     pattern: '15x2',       basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: true,  cond: '金額基礎（原文）：同上',                           remark: '金額基礎（原文）：同上。' },
  { rule: 'FA-DISP',    no:  1, dc: 'D', acc: null,     pattern: '1102/1111',  basis: 'AMOUNT', dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: true,  cond: '金額基礎（原文）：售價（含稅）',                       remark: '金額基礎（原文）：售價（含稅）。' },
  { rule: 'FA-DISP',    no:  2, dc: 'D', acc: null,     pattern: '15x2',       basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: true,  cond: '金額基礎（原文）：該資產累計折舊',                      remark: '金額基礎（原文）：該資產累計折舊。' },
  { rule: 'FA-DISP',    no:  3, dc: 'C', acc: null,     pattern: '15xx',       basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: true,  cond: '金額基礎（原文）：取得成本',                         remark: '金額基礎（原文）：取得成本。' },
  { rule: 'FA-DISP',    no:  4, dc: 'C', acc: '2121',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：售價 × 5%',                      remark: '金額基礎（原文）：售價 × 5%。' },
  { rule: 'FA-DISP',    no:  5, dc: 'C', acc: null,     pattern: '7103/8102',  basis: 'DIFF',   dept: false, partner: false, scope: 'PARTNER', bank: false, optional: true,  cond: '借貸方向依結果二選一（利益走貸方、損失走借方）。',              remark: null },
  { rule: 'FA-EXP',     no:  1, dc: 'D', acc: '6411',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：取得成本',                         remark: '金額基礎（原文）：取得成本。' },
  { rule: 'FA-EXP',     no:  2, dc: 'C', acc: null,     pattern: '1102/2131',  basis: 'AMOUNT', dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: true,  cond: '金額基礎（原文）：同上',                           remark: '金額基礎（原文）：同上。' },
  { rule: 'FA-INS',     no:  1, dc: 'D', acc: '1132',   pattern: null,         basis: 'AMOUNT', dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：保費全額',                         remark: '金額基礎（原文）：保費全額。' },
  { rule: 'FA-INS',     no:  2, dc: 'C', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：同上',                           remark: '金額基礎（原文）：同上。' },
  { rule: 'FA-INS',     no:  3, dc: 'D', acc: '6204',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：保費 ÷ 期數',                      remark: '金額基礎（原文）：保費 ÷ 期數。' },
  { rule: 'FA-INS',     no:  4, dc: 'C', acc: '1132',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：同上',                           remark: '金額基礎（原文）：同上。' },
  { rule: 'FA-SCRP',    no:  1, dc: 'D', acc: null,     pattern: '15x2',       basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: true,  cond: '金額基礎（原文）：該資產累計折舊',                      remark: '金額基礎（原文）：該資產累計折舊。' },
  { rule: 'FA-SCRP',    no:  2, dc: 'D', acc: '8102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：帳面淨值',                         remark: '金額基礎（原文）：帳面淨值。' },
  { rule: 'FA-SCRP',    no:  3, dc: 'C', acc: null,     pattern: '15xx',       basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: true,  cond: '金額基礎（原文）：取得成本',                         remark: '金額基礎（原文）：取得成本。' },
  { rule: 'FA-SEC',     no:  1, dc: 'D', acc: '1141',   pattern: null,         basis: 'AMOUNT', dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：押金金額',                         remark: '金額基礎（原文）：押金金額。' },
  { rule: 'FA-SEC',     no:  2, dc: 'C', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：同上',                           remark: '金額基礎（原文）：同上。' },
  { rule: 'FX',         no:  1, dc: 'D', acc: '8104',   pattern: null,         basis: 'DIFF',   dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '匯損' },
  { rule: 'FX',         no:  2, dc: 'C', acc: '8104',   pattern: null,         basis: 'DIFF',   dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '匯兌利益（貸方表示） 🔴 8104 是建議新增的科目。⚠ 恆迎 7102 兌換利益 613 萬、8102 兌換損失 332 萬（近三年淨賺 281 萬）， 但傳票的外幣欄位 100% 沒用（幣別 28 年一個值、匯率全部 1）——用台幣直接入帳，外幣資訊活在系統外。 🔴 對亞羅：進口採購單沒填幣別與匯率就不能過帳，否則它會變成第 N 個 28 年一個值的欄位。 ⚠ 這是既有的對映，適用『有帳期』的廠商（月結／月票）。前期主流是預付，走 PO-PRE ＋ PO-RCV。' },
  { rule: 'IADJ',       no:  1, dc: 'D', acc: '1121',   pattern: null,         basis: 'DIFF',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '盤盈' },
  { rule: 'IADJ',       no:  2, dc: 'C', acc: '5103',   pattern: null,         basis: 'DIFF',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '盤盈' },
  { rule: 'IADJ',       no:  3, dc: 'D', acc: '5103',   pattern: null,         basis: 'DIFF',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '盤虧' },
  { rule: 'IADJ',       no:  4, dc: 'C', acc: '1121',   pattern: null,         basis: 'DIFF',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '盤虧 盈與虧擇一。5103 的餘額＝『庫位制度有沒有落實』的直接量測，也是倉管 KPI 計分依據（1-b 起）。' },
  { rule: 'IT-SW',      no:  1, dc: 'D', acc: '6405',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：月費',                           remark: '金額基礎（原文）：月費。' },
  { rule: 'IT-SW',      no:  2, dc: 'C', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：同上',                           remark: '金額基礎（原文）：同上。' },
  { rule: 'IWD',        no:  1, dc: 'D', acc: '5105',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '🔴 5105 是建議新增的科目' },
  { rule: 'IWD',        no:  2, dc: 'C', acc: '1121',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '⚠ 待會計政策定案（成本與淨變現價值孰低法）。BCG 老狗出清需要它。' },
  { rule: 'LCA',        no:  1, dc: 'D', acc: '1121',   pattern: null,         basis: 'ALLOC',  dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '按金額比例分攤到批次內各料號' },
  { rule: 'LCA',        no:  2, dc: 'C', acc: '1122',   pattern: null,         basis: 'ALLOC',  dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '🔴 防火牆的核心：1122 的期末餘額必須趨近於 0。有餘額＝有費用沒分攤進存貨，一眼看得出來。' },
  { rule: 'LN-DRAW',    no:  1, dc: 'D', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: '金額基礎（原文）：動用金額',                         remark: '金額基礎（原文）：動用金額。銀行撥款進帳' },
  { rule: 'LN-DRAW',    no:  2, dc: 'C', acc: null,     pattern: '2151/2501',  basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: true,  cond: '金額基礎（原文）：動用金額　條件性出現：依借款契約到期日分流：一年內到期走 2151 短期借款、超過一年走 2501 長期借款。🆕 v2 ·『回頭要補的』#53。⚠ 一年內到期走 `2151 短期借款`、超過一年走 `2501 長期借款`；**綜合額度可分次動用 → 一份契約多筆動用，額度餘額看「借款契約主檔」不看科目餘額。**', remark: '金額基礎（原文）：動用金額。依借款契約到期日分流：一年內到期走 2151 短期借款、超過一年走 2501 長期借款。🆕 v2 ·『回頭要補的』#53。⚠ 一年內到期走 `2151 短期借款`、超過一年走 `2501 長期借款`；**綜合額度可分次動用 → 一份契約多筆動用，額度餘額看「借款契約主檔」不看科目餘額。**' },
  { rule: 'LN-GUAR',    no:  1, dc: 'D', acc: '8101',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：保證手續費',                        remark: '金額基礎（原文）：保證手續費。🆕 v2 ·『回頭要補的』#53。🔴🔴 **不記 `6406 銀行手續費`**——否則「實質資金成本」永遠算不出來。⚠ 新設公司無財報無擔保幾乎只能走信保基金，保證手續費 0.5–1.5% × 保證成數 80–90% → **實質年利率 2.90–3.85%，不是目標值 2.5%。**' },
  { rule: 'LN-GUAR',    no:  2, dc: 'C', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：保證手續費',                        remark: '金額基礎（原文）：保證手續費。' },
  { rule: 'LN-RECL',    no:  1, dc: 'D', acc: '2501',   pattern: null,         basis: 'AMOUNT', dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：重分類金額',                        remark: '金額基礎（原文）：重分類金額。沖減長期借款（非流動）' },
  { rule: 'LN-RECL',    no:  2, dc: 'C', acc: '2151',   pattern: null,         basis: 'AMOUNT', dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：重分類金額',                        remark: '金額基礎（原文）：重分類金額。轉列短期借款（流動）。⚠ 金額＝未來 12 個月內到期的本金' },
  { rule: 'LN-REPAY',   no:  1, dc: 'D', acc: null,     pattern: '2151/2501',  basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: true,  cond: '金額基礎（原文）：本金部分　條件性出現：本金部分依該筆借款當初的分流結果沖銷對應科目。本息均攤裡的本金', remark: '金額基礎（原文）：本金部分。本金部分依該筆借款當初的分流結果沖銷對應科目。本息均攤裡的本金' },
  { rule: 'LN-REPAY',   no:  2, dc: 'D', acc: '8101',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: '金額基礎（原文）：利息部分',                         remark: '金額基礎（原文）：利息部分。⭐ 貫穿原則：**凡資金成本一律進 `8101 利息支出`**' },
  { rule: 'LN-REPAY',   no:  3, dc: 'C', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: '金額基礎（原文）：月付金額',                         remark: '金額基礎（原文）：月付金額。🆕 v2。🔴 還本付息這個**行為**在資金循環（付款端），但**科目對映**放這裡與融資工具綁在一起——一筆月付要拆本金與利息，那個拆法是契約決定的。' },
  { rule: 'NT-DISC',    no:  1, dc: 'D', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: '金額基礎（原文）：票面 － 貼現息',                     remark: '金額基礎（原文）：票面 － 貼現息。實得金額' },
  { rule: 'NT-DISC',    no:  2, dc: 'D', acc: '8101',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: '金額基礎（原文）：貼現息',                          remark: '金額基礎（原文）：貼現息。⭐ 同上，資金成本一律進 8101' },
  { rule: 'NT-DISC',    no:  3, dc: 'C', acc: '1112',   pattern: null,         basis: 'FACE',   dept: false, partner: true,  scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: '🆕 v2 ·『回頭要補的』#53。🔴 **附追索權**——票據責任沒有解除，應收票據狀態改為 `X 已貼現`（不是消失），客戶退票時銀行回頭追索。⭐⭐ 票貼買的是「時間」不是「錢」：收款等效 75 天 → 45 天，現金最低點改善 263 萬，而 24 個月貼現成本只有 23–45 萬（6–11 倍）。' },
  { rule: 'NT-DISC-NG', no:  1, dc: 'D', acc: '1111',   pattern: null,         basis: 'FACE',   dept: false, partner: true,  scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: '帳回到該客戶的應收帳款' },
  { rule: 'NT-DISC-NG', no:  2, dc: 'C', acc: '1102',   pattern: null,         basis: 'FACE',   dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: '🆕 v2。🔴 銀行從我方帳戶扣回——**這是「附追索權」的實質**。⚠ 接著走逾期階梯最高段（鎖貨），可能再走 `BAD` 呆帳沖銷。' },
  { rule: 'NT-DISC-NG', no:  3, dc: 'C', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: null },
  { rule: 'OFFS',       no:  1, dc: 'D', acc: '2101',   pattern: null,         basis: 'AMOUNT', dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '⚠ 同一往來對象的應付' },
  { rule: 'OFFS',       no:  2, dc: 'C', acc: '1111',   pattern: null,         basis: 'AMOUNT', dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '同一往來對象的應收。往來對象合一才做得到' },
  { rule: 'OPEN-AP',    no:  1, dc: 'D', acc: '1121',   pattern: null,         basis: 'NET',    dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'OPEN-AP',    no:  2, dc: 'D', acc: '1133',   pattern: null,         basis: 'TAX',    dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '⚠ 須取得合法憑證才可扣抵' },
  { rule: 'OPEN-AP',    no:  3, dc: 'C', acc: '2101',   pattern: null,         basis: 'GROSS',  dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '🔴 承接恆迎庫存時走這組。風險不是分錄是成本口徑——2.99 億裡 1.94 億（65%）不是一年內用得到的。' },
  { rule: 'OPEN-CA',    no:  1, dc: 'D', acc: '1121',   pattern: null,         basis: 'NET',    dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'OPEN-CA',    no:  2, dc: 'D', acc: '1133',   pattern: null,         basis: 'TAX',    dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'OPEN-CA',    no:  3, dc: 'C', acc: '1102',   pattern: null,         basis: 'GROSS',  dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '同上，差別只在付款方式。' },
  { rule: 'OPEN-EQ',    no:  1, dc: 'D', acc: '1121',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'OPEN-EQ',    no:  2, dc: 'C', acc: '3101',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '股東以實物抵繳股款 ⚠ 需會計師查核作價。一次性，開帳後鎖定。' },
  { rule: 'PAY',        no:  1, dc: 'D', acc: '6101',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'PAY',        no:  2, dc: 'D', acc: '6102',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '個績＋團績＋超額抽成' },
  { rule: 'PAY',        no:  3, dc: 'D', acc: '6103',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '勞健保雇主負擔' },
  { rule: 'PAY',        no:  4, dc: 'D', acc: '6104',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '勞退 6%' },
  { rule: 'PAY',        no:  5, dc: 'C', acc: '2113',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '代扣所得稅' },
  { rule: 'PAY',        no:  6, dc: 'C', acc: '2114',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '代扣勞健保自付額' },
  { rule: 'PAY',        no:  7, dc: 'C', acc: '2112',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '應付薪資' },
  { rule: 'PAY',        no:  8, dc: 'C', acc: '2111',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：雇主負擔的勞健保與勞退',                  remark: '金額基礎（原文）：雇主負擔的勞健保與勞退。' },
  { rule: 'PAY-LV',     no:  1, dc: 'D', acc: '6101',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：當期新增的未休特休折算金額',                remark: '金額基礎（原文）：當期新增的未休特休折算金額。' },
  { rule: 'PAY-LV',     no:  2, dc: 'C', acc: '2115',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：同上',                           remark: '金額基礎（原文）：同上。' },
  { rule: 'PAY-NHI2',   no:  1, dc: 'D', acc: '6103',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：雇主應負擔部分',                      remark: '金額基礎（原文）：雇主應負擔部分。' },
  { rule: 'PAY-NHI2',   no:  2, dc: 'C', acc: '2114',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：員工自負部分（獎金超過投保薪資 4 倍者扣 2.11%）', remark: '金額基礎（原文）：員工自負部分（獎金超過投保薪資 4 倍者扣 2.11%）。' },
  { rule: 'PAY-SEV',    no:  1, dc: 'D', acc: '6101',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：資遣費 ＋ 預告工資',                   remark: '金額基礎（原文）：資遣費 ＋ 預告工資。' },
  { rule: 'PAY-SEV',    no:  2, dc: 'C', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: '金額基礎（原文）：同上',                           remark: '金額基礎（原文）：同上。' },
  { rule: 'PC-ADV',     no:  1, dc: 'D', acc: '1103',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: '金額基礎（原文）：定額（或調整差額）',                    remark: '金額基礎（原文）：定額（或調整差額）。' },
  { rule: 'PC-ADV',     no:  2, dc: 'C', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: '金額基礎（原文）：同上',                           remark: '金額基礎（原文）：同上。一次性。⭐ 之後 `1103` 的帳面餘額永遠等於定額——**科目餘額本身就是「現金＋未核銷單據＝定額」那道紀律的檢查點。** ⚠ 調整定額要核准（它改的是那個「必須等於的值」）。' },
  { rule: 'PC-EXP',     no:  1, dc: 'D', acc: null,     pattern: '6xxx',       basis: 'NET',    dept: true,  partner: false, scope: 'PARTNER', bank: true,  optional: true,  cond: null,                                    remark: null },
  { rule: 'PC-EXP',     no:  2, dc: 'D', acc: '1133',   pattern: null,         basis: 'TAX',    dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: null },
  { rule: 'PC-EXP',     no:  3, dc: 'C', acc: '1102',   pattern: null,         basis: 'GROSS',  dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: '⭐ 核銷與撥補一次做完，所以 `1103` 不動——這是定額備用金制的關鍵：**帳上的零用金永遠是定額。** ⚠ 小額支出常常沒有發票只有收據 → 那幾筆走 `EX-N` 的邏輯（不得扣抵），第 2 列不出現。 🔴 撥補前會計必須盤點：現金 ＋ 未核銷單據 ＝ 定額。不符不能過這張單。' },
  { rule: 'PD',         no:  1, dc: 'D', acc: '2101',   pattern: null,         basis: 'GROSS',  dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '沖減應付廠商的貨款' },
  { rule: 'PD',         no:  2, dc: 'C', acc: '5102',   pattern: null,         basis: 'NET',    dept: true,  partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '進貨折讓＝營業成本的減項。⚠ 貨沒有退、只是價格降下來，所以存貨 1121 不動' },
  { rule: 'PD',         no:  3, dc: 'C', acc: '1133',   pattern: null,         basis: 'TAX',    dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '沖回原先認列的進項稅額' },
  { rule: 'PO',         no:  1, dc: 'D', acc: '1121',   pattern: null,         basis: 'NET',    dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '⚠ 進貨入存貨不入成本；成本在銷貨時才轉' },
  { rule: 'PO',         no:  2, dc: 'D', acc: '1133',   pattern: null,         basis: 'TAX',    dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '進項稅額' },
  { rule: 'PO',         no:  3, dc: 'C', acc: '2101',   pattern: null,         basis: 'GROSS',  dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '應付帳款' },
  { rule: 'PO-IMP',     no:  1, dc: 'D', acc: '1122',   pattern: null,         basis: 'NET',    dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '🔴 海運／保險／關稅／報關／拖車' },
  { rule: 'PO-IMP',     no:  2, dc: 'D', acc: '1133',   pattern: null,         basis: 'TAX',    dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '⚠ 進口營業稅走這裡，不進 1122' },
  { rule: 'PO-IMP',     no:  3, dc: 'C', acc: '2101',   pattern: null,         basis: 'GROSS',  dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '對象＝貨代／報關行／拖車行 🔴 1122 是本次建議新增的科目。⚠ 關稅計入存貨成本（1122）、進口營業稅是進項稅額（1133）——兩者不可混。' },
  { rule: 'PO-PRE',     no:  1, dc: 'D', acc: '1131',   pattern: null,         basis: 'AMOUNT', dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '🔴 錢先出去，貨還沒有' },
  { rule: 'PO-PRE',     no:  2, dc: 'C', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '🔴 執行長 7/30：恆迎八成廠商要付全額才出貨，亞羅前期量小更談不到票期 → 1131 從邊緣科目變成主科目。 ⚠ 付訂金通常沒有發票，所以進項稅額不在這一段，掛在到貨那一段。⚠ 需預付貨款貨齡表。' },
  { rule: 'PO-RCV',     no:  1, dc: 'D', acc: '1121',   pattern: null,         basis: 'NET',    dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'PO-RCV',     no:  2, dc: 'D', acc: '1133',   pattern: null,         basis: 'TAX',    dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '此時才有發票' },
  { rule: 'PO-RCV',     no:  3, dc: 'C', acc: '1131',   pattern: null,         basis: 'PAID',   dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'PO-RCV',     no:  4, dc: 'C', acc: '2101',   pattern: null,         basis: 'UNPAID', dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '若尚有尾款未付 ⚠ 分批到貨時 1131 要能分次沖銷（一對多）——執行長 7/30：缺櫃或戰爭會導致國外分批到貨。' },
  { rule: 'PO-TR',      no:  1, dc: 'D', acc: '1121',   pattern: null,         basis: 'NET',    dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '🔴 個別認定成本，不進移動平均池' },
  { rule: 'PO-TR',      no:  2, dc: 'D', acc: '1133',   pattern: null,         basis: 'TAX',    dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'PO-TR',      no:  3, dc: 'C', acc: '2101',   pattern: null,         basis: 'GROSS',  dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '對象是同行；同行常同時是客戶 → 可走 OFFS 抵帳 分錄形狀與 PO 相同，差別在成本方法與自動預留。必須獨立代號，否則報表切不出『調貨佔多少』。' },
  { rule: 'PR',         no:  1, dc: 'D', acc: '2101',   pattern: null,         basis: 'GROSS',  dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'PR',         no:  2, dc: 'C', acc: '1121',   pattern: null,         basis: 'NET',    dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'PR',         no:  3, dc: 'C', acc: '1133',   pattern: null,         basis: 'TAX',    dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'PY-CA',      no:  1, dc: 'D', acc: '2101',   pattern: null,         basis: 'AMOUNT', dept: false, partner: true,  scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: '⚠ 需店長覆核' },
  { rule: 'PY-CA',      no:  2, dc: 'C', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: null },
  { rule: 'PY-CD',      no:  1, dc: 'D', acc: '2102',   pattern: null,         basis: 'FACE',   dept: false, partner: true,  scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: '⚠ 支存戶這天要有錢，否則跳票' },
  { rule: 'PY-CD',      no:  2, dc: 'C', acc: '1102',   pattern: null,         basis: 'FACE',   dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: null },
  { rule: 'PY-CQ',      no:  1, dc: 'D', acc: '2101',   pattern: null,         basis: 'FACE',   dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'PY-CQ',      no:  2, dc: 'C', acc: '2102',   pattern: null,         basis: 'FACE',   dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '應付票據；現金還在' },
  { rule: 'RC-CA',      no:  1, dc: 'D', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: '現金則走 1101' },
  { rule: 'RC-CA',      no:  2, dc: 'C', acc: '1111',   pattern: null,         basis: 'AMOUNT', dept: false, partner: true,  scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: null },
  { rule: 'RC-CD',      no:  1, dc: 'D', acc: '1102',   pattern: null,         basis: 'FACE',   dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: '票兌現，現金這時才進來' },
  { rule: 'RC-CD',      no:  2, dc: 'C', acc: '1112',   pattern: null,         basis: 'FACE',   dept: false, partner: true,  scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: null },
  { rule: 'RC-CQ',      no:  1, dc: 'D', acc: '1112',   pattern: null,         basis: 'FACE',   dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '⚠ 應收沖掉了，但現金還沒進來' },
  { rule: 'RC-CQ',      no:  2, dc: 'C', acc: '1111',   pattern: null,         basis: 'FACE',   dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'SCRP',       no:  1, dc: 'D', acc: '5104',   pattern: null,         basis: 'COST',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'SCRP',       no:  2, dc: 'C', acc: '1121',   pattern: null,         basis: 'COST',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '⚠ 只適用良品倉。不良品倉成本已是 0，報廢時只減數量、無分錄。' },
  { rule: 'SD',         no:  1, dc: 'D', acc: '4103',   pattern: null,         basis: 'NET',    dept: true,  partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '⚠ 毛利率的漏水點，要按客戶盯' },
  { rule: 'SD',         no:  2, dc: 'D', acc: '2121',   pattern: null,         basis: 'TAX',    dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'SD',         no:  3, dc: 'C', acc: '1111',   pattern: null,         basis: 'GROSS',  dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'SO-CA',      no:  1, dc: 'D', acc: '1101',   pattern: null,         basis: 'GROSS',  dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '現金收訖；匯款則走 1102' },
  { rule: 'SO-CA',      no:  2, dc: 'C', acc: '4101',   pattern: null,         basis: 'NET',    dept: true,  partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'SO-CA',      no:  3, dc: 'C', acc: '2121',   pattern: null,         basis: 'TAX',    dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'SO-CA',      no:  4, dc: 'D', acc: '5101',   pattern: null,         basis: 'COST',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'SO-CA',      no:  5, dc: 'C', acc: '1121',   pattern: null,         basis: 'COST',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'SO-CR',      no:  1, dc: 'D', acc: '1111',   pattern: null,         basis: 'GROSS',  dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '應收帳款' },
  { rule: 'SO-CR',      no:  2, dc: 'C', acc: '4101',   pattern: null,         basis: 'NET',    dept: true,  partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '銷貨收入' },
  { rule: 'SO-CR',      no:  3, dc: 'C', acc: '2121',   pattern: null,         basis: 'TAX',    dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '銷項稅額' },
  { rule: 'SO-CR',      no:  4, dc: 'D', acc: '5101',   pattern: null,         basis: 'COST',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '結轉成本（永續盤存）' },
  { rule: 'SO-CR',      no:  5, dc: 'C', acc: '1121',   pattern: null,         basis: 'COST',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '存貨減少' },
  { rule: 'SO-DLV',     no:  1, dc: 'D', acc: '2141',   pattern: null,         basis: 'PAID',   dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '沖掉先前收的訂金（已收部分）' },
  { rule: 'SO-DLV',     no:  2, dc: 'C', acc: '4101',   pattern: null,         basis: 'NET',    dept: true,  partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '銷貨收入' },
  { rule: 'SO-DLV',     no:  3, dc: 'C', acc: '2121',   pattern: null,         basis: 'TAX',    dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '銷項稅額——發票開在這一段' },
  { rule: 'SO-DLV',     no:  4, dc: 'D', acc: '1111',   pattern: null,         basis: 'UNPAID', dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: true,  cond: '條件性出現：若訂金未涵蓋全額、尾款掛應收（未收部分）',            remark: '若訂金未涵蓋全額、尾款掛應收（未收部分）' },
  { rule: 'SO-DLV',     no:  5, dc: 'D', acc: '5101',   pattern: null,         basis: 'COST',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '結轉成本（永續盤存）' },
  { rule: 'SO-DLV',     no:  6, dc: 'C', acc: '1121',   pattern: null,         basis: 'COST',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '存貨減少' },
  { rule: 'SO-PRE',     no:  1, dc: 'D', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: '錢先進來、貨還沒出。現金收訖則走 1101 現金' },
  { rule: 'SO-PRE',     no:  2, dc: 'C', acc: '2141',   pattern: null,         basis: 'AMOUNT', dept: false, partner: true,  scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: '預收貨款＝欠客戶一批貨的負債' },
  { rule: 'SR',         no:  1, dc: 'D', acc: '4102',   pattern: null,         basis: 'NET',    dept: true,  partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '收入減項' },
  { rule: 'SR',         no:  2, dc: 'D', acc: '2121',   pattern: null,         basis: 'TAX',    dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '沖回銷項稅額' },
  { rule: 'SR',         no:  3, dc: 'C', acc: '1111',   pattern: null,         basis: 'GROSS',  dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'SR',         no:  4, dc: 'D', acc: '1121',   pattern: null,         basis: 'COST',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '貨退回入庫' },
  { rule: 'SR',         no:  5, dc: 'C', acc: '5101',   pattern: null,         basis: 'COST',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: null },
  { rule: 'TAX-FS',     no:  1, dc: 'D', acc: '8201',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: null },
  { rule: 'TAX-FS',     no:  2, dc: 'C', acc: '1135',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: null },
  { rule: 'TAX-FS',     no:  3, dc: 'C', acc: '2131',   pattern: null,         basis: 'DIFF',   dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: '⚠ 財務模型 v3 把營所稅按月攤（20%），但**現金上是一年兩筆**（9 月暫繳、5 月結算）。 🔴 現金最低點必須用實際繳納月份算，否則會低估那兩個月的資金壓力。 ⛔ 不開的三個' },
  { rule: 'TAX-PP',     no:  1, dc: 'D', acc: '1135',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: null },
  { rule: 'TAX-PP',     no:  2, dc: 'C', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: '金額基礎（原文）：同上',                           remark: '金額基礎（原文）：同上。🔴 科目表沒有這個科目，只有 `2131 應付所得稅`。暫繳是**預付性質**，記到負債科目會變成負餘額（就是恆迎支存負數那種「金額對、格子錯」的問題）。 ⚠ 這一筆是大額單筆，必須進 13 週預測。' },
  { rule: 'TRF',        no:  1, dc: 'D', acc: '1121',   pattern: null,         basis: 'COST',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '部門＝目的倉或在途倉' },
  { rule: 'TRF',        no:  2, dc: 'C', acc: '1121',   pattern: null,         basis: 'COST',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '部門＝來源倉 ⭐ 同科目、不同部門、金額相等 → 不產生任何損益。分兩段：出庫時目的部門＝在途倉，落地時再轉。' },
  { rule: 'VAT',        no:  1, dc: 'D', acc: '2121',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '沖銷項' },
  { rule: 'VAT',        no:  2, dc: 'C', acc: '1133',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '沖進項' },
  { rule: 'VAT',        no:  3, dc: 'C', acc: '2122',   pattern: null,         basis: 'DIFF',   dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '銷項>進項時' },
  { rule: 'VAT',        no:  4, dc: 'D', acc: '1134',   pattern: null,         basis: 'DIFF',   dept: false, partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '進項>銷項時，下期續扣' },
  { rule: 'WCLM',       no:  1, dc: 'D', acc: '1121',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '廠商換新品' },
  { rule: 'WCLM',       no:  2, dc: 'D', acc: '1113',   pattern: null,         basis: 'AMOUNT', dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '廠商退款' },
  { rule: 'WCLM',       no:  3, dc: 'D', acc: '2101',   pattern: null,         basis: 'AMOUNT', dept: false, partner: true,  scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '沖抵應付' },
  { rule: 'WCLM',       no:  4, dc: 'C', acc: '5101',   pattern: null,         basis: 'AMOUNT', dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '沖回先前認列的保固成本 借方三選一。⭐ 索賠成功率＝該對象的 WCLM ÷ WOUT，是『往來對象績效評等』唯一缺的資料源。' },
  { rule: 'WHT',        no:  1, dc: 'D', acc: '2113',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: null },
  { rule: 'WHT',        no:  2, dc: 'D', acc: '2114',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: null },
  { rule: 'WHT',        no:  3, dc: 'C', acc: '1102',   pattern: null,         basis: 'AMOUNT', dept: false, partner: false, scope: 'PARTNER', bank: true,  optional: false, cond: null,                                    remark: '🔴 紀律⑤：`2113`＋`2114` 的期末餘額必須等於「次月要繳的金額」，不可累積跨月。 ⚠ 租金扣繳最容易漏：房東是個人時要扣 10% 所得稅 ＋ 2.11% 二代健保補充保費，而租金是 1-a 第二大固定支出。' },
  { rule: 'WOUT',       no:  1, dc: 'D', acc: '5101',   pattern: null,         basis: 'COST',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '⭐ 不另開『保固費用』科目' },
  { rule: 'WOUT',       no:  2, dc: 'C', acc: '1121',   pattern: null,         basis: 'COST',   dept: true,  partner: false, scope: 'PARTNER', bank: false, optional: false, cond: null,                                    remark: '⭐ 進 5101：保固成本本質就是這門生意的真實成本，會自動吃掉毛利率。要看花多少用交易代號從傳票切。' },
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
