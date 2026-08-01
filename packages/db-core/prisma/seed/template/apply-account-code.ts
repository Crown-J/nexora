// packages/db-core/prisma/seed/template/apply-account-code.ts
// @FUNCTION_CODE SYS-TMPL-SVC-007-F01
// 範本：會計科目（總帳脊椎 A 階段 2026-08-01 改版）。
//
// ⚠️ 本檔於 A 階段整批換代：舊版 12 列用 4100/5100/6132/6200 體例，
//    新版 113 列改用亞羅《核心主檔 v1》體例 4101/5101/6201/6101。
//    換代前實測 nx05_account_code 0 筆、nx05_paylog 0 筆 → 無既有資料受影響。
//
// 資料來源：亞羅核心主檔-v1.xlsx『會計科目』分頁（113 列）＋ A 階段補建 4 個科目。
// 🔴 補建的 4 個不是臆測——是「交易科目對映」實際引用、而亞羅科目表漏建的：
//      2115（PAY-LV 引用）／2116（BON-P·BON-U 引用）／6411（FA-EXP 引用）／7103（FA-DISP 引用）
// ⚠️ 1901 開辦費：建但停用（現行準則已刪除其遞延資產屬性、待記帳士確認）。
//
// upsert by tenantId_code；分兩趟寫入：先建全部（不含 parent/tax），再回填 parentId 與 defaultTaxCodeId。

import type { PrismaClient } from '../../../generated/prisma';
import type { ApplyTemplateParams } from './index';

interface AccountRow {
  code: string; name: string; level: number; parent: string | null;
  postable: boolean; cf: string; dept: boolean; partner: boolean; scope: string;
  tax: string | null; section: string | null; active: boolean; remark: string | null;
}

const ROWS: readonly AccountRow[] = [
  { code: '11',    name: '流動資產',                level: 2, parent: '1',    postable: false, cf: 'N',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: null },
  { code: '1101',  name: '現金',                  level: 3, parent: '11',   postable: true,  cf: 'C',  dept: true,  partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '零錢箱與收銀現金。⚠ 不設「現金-台北／新莊」子科目，店別走部門維度' },
  { code: '1102',  name: '銀行存款',                level: 3, parent: '11',   postable: true,  cf: 'C',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '⚠ 只有一個科目。每一個帳戶是「銀行帳戶主檔」的一列，不是一個子科目。恆迎 24 個銀行子科目有 18 個三年沒動，「外匯活存(馬克)」躺了 24 年' },
  { code: '1103',  name: '零用金',                 level: 3, parent: '11',   postable: true,  cf: 'C',  dept: true,  partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '定額備用金' },
  { code: '1111',  name: '應收帳款',                level: 3, parent: '11',   postable: true,  cf: 'O',  dept: false, partner: true,  scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '客戶欠的貨款。餘額由單據算，不掛在客戶主檔' },
  { code: '1112',  name: '應收票據',                level: 3, parent: '11',   postable: true,  cf: 'O',  dept: false, partner: true,  scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '收到的客票。⚠ 應收沖掉不等於現金進來——票到期才是' },
  { code: '1113',  name: '其他應收款',               level: 3, parent: '11',   postable: true,  cf: 'O',  dept: false, partner: true,  scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '代墊款、員工借支' },
  { code: '1121',  name: '存貨',                  level: 3, parent: '11',   postable: true,  cf: 'O',  dept: true,  partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '永續盤存。數量由單據算，不掛在零件主檔（恆迎四個倉共用一個數字，永遠對不起來）' },
  { code: '1122',  name: '進貨附加成本',              level: 3, parent: '11',   postable: true,  cf: 'O',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: '存貨',          active: true,  remark: '🔴 運費防火牆。進口費用（海運／保險／關稅／報關／拖車）先歸集在這裡，再按金額比例分攤進 1121 存貨。⭐ 期末餘額必須趨近於 0——有餘額＝有費用沒分攤進存貨，一個科目、一個數字就是防火牆。⚠ 關稅走這裡（計入存貨成本）、進口營業稅走 1133 進項稅額（可扣抵），兩者不可混。⚠ 恆迎把附加成本埋進進貨單價，導致「貨款 vs 完全成本」永遠分不開（F14 已證）——亞羅需要拆開，否則無法比較「自己進口 vs 貿易商 vs 同行調貨」三條路的真實成本。' },
  { code: '1131',  name: '預付貨款',                level: 3, parent: '11',   postable: true,  cf: 'O',  dept: false, partner: true,  scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '先付給供應商的訂金' },
  { code: '1132',  name: '預付費用',                level: 3, parent: '11',   postable: true,  cf: 'O',  dept: true,  partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '預付租金、預付保費' },
  { code: '1133',  name: '進項稅額',                level: 3, parent: '11',   postable: true,  cf: 'O',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '買東西付的 5%。⚠ 自用乘人小客車不得扣抵，貨車與機車可以' },
  { code: '1134',  name: '留抵稅額',                level: 3, parent: '11',   postable: true,  cf: 'O',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '進項大於銷項時的累積可扣抵數' },
  { code: '1135',  name: '預付所得稅',               level: 3, parent: '11',   postable: true,  cf: 'O',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: '其他流動資產',      active: true,  remark: '🔴 9 月營所稅暫繳走這裡。⚠ 暫繳是**預付性質**，記到 2131 應付所得稅會變成負餘額——就是恆迎支存負數那種「金額對、格子錯」的問題。次年 5 月結算時沖銷。⚠ 財務模型 v4 已把暫繳（50%）與結算分成兩筆現金流出。' },
  { code: '1141',  name: '存出保證金',               level: 3, parent: '11',   postable: true,  cf: 'O',  dept: true,  partner: true,  scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '店面押金 14 萬（70 坪×1,000×2 個月）' },
  { code: '1151',  name: '短期投資',                level: 3, parent: '11',   postable: true,  cf: 'I',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: false, remark: '🆕 v2 · 循環決策 1️⃣ 的配套。⚠ 投資循環 v1 砍掉，但照策略骨架 §4「範圍砍掉 ≠ 架構焊死」：**科目位要留，總帳脊椎不得假設「不會有投資類分錄」。**⛔ 狀態為預留，不可記帳；要啟用須執行長核准並補會計政策。' },
  { code: '15',    name: '固定資產',                level: 2, parent: '1',    postable: false, cf: 'N',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: null },
  { code: '1501',  name: '生財器具',                level: 3, parent: '15',   postable: true,  cf: 'I',  dept: true,  partner: false, scope: 'PARTNER', tax: 'P5',   section: null,          active: true,  remark: '貨架 30 萬。耐用年數 5 年' },
  { code: '1502',  name: '累計折舊－生財器具',           level: 3, parent: '15',   postable: true,  cf: 'N',  dept: true,  partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '⚠ 每類資產各自一個累計折舊，不再另設「累計折舊-全部」。恆迎兩套並存，沒人知道該記哪個' },
  { code: '1511',  name: '資訊設備',                level: 3, parent: '15',   postable: true,  cf: 'I',  dept: true,  partner: false, scope: 'PARTNER', tax: 'P5',   section: null,          active: true,  remark: '電腦、印表機、監視器。耐用年數 3–5 年。單價 ≤8 萬可直接列費用' },
  { code: '1512',  name: '累計折舊－資訊設備',           level: 3, parent: '15',   postable: true,  cf: 'N',  dept: true,  partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: null },
  { code: '1521',  name: '運輸設備',                level: 3, parent: '15',   postable: true,  cf: 'I',  dept: true,  partner: false, scope: 'PARTNER', tax: 'P5',   section: null,          active: true,  remark: '機車（M13 起、2 台×8 萬）。耐用年數 3 年' },
  { code: '1522',  name: '累計折舊－運輸設備',           level: 3, parent: '15',   postable: true,  cf: 'N',  dept: true,  partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: null },
  { code: '1531',  name: '租賃改良物',               level: 3, parent: '15',   postable: true,  cf: 'I',  dept: true,  partner: false, scope: 'PARTNER', tax: 'P5',   section: null,          active: true,  remark: '裝潢 70 萬。⚠ 攤提年限＝耐用年限與剩餘租期取短，租約簽幾年決定攤幾年' },
  { code: '1532',  name: '累計折舊－租賃改良物',          level: 3, parent: '15',   postable: true,  cf: 'N',  dept: true,  partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: null },
  { code: '16',    name: '長期投資',                level: 2, parent: '1',    postable: false, cf: 'N',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: false, remark: '🆕 v2 · 中類。同上，只留位不啟用。' },
  { code: '1601',  name: '長期股權投資',              level: 3, parent: '16',   postable: true,  cf: 'I',  dept: false, partner: true,  scope: 'PARTNER', tax: null,   section: null,          active: false, remark: '🆕 v2 · 循環決策 1️⃣ 的配套。🔴 恆迎三十年沒有投資部位——錢全部拿去買貨了（庫存 2.9 億／其中超額 1.13 億）。亞羅 1-a 現金最低點 −429 萬，連閒置資金都不存在。⭐ 但「評估過所以不設」與「沒想過」是兩回事，這一列就是留痕。' },
  { code: '19',    name: '其他資產',                level: 2, parent: '1',    postable: false, cf: 'N',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: null },
  { code: '1901',  name: '開辦費',                 level: 3, parent: '19',   postable: true,  cf: 'I',  dept: false, partner: false, scope: 'PARTNER', tax: 'P5',   section: null,          active: false, remark: '設立登記、資本額簽證、規費｜🆕 v2 ·『回頭要補的』#72：**這個科目不該存在**——現行商業會計處理準則已刪除開辦費的遞延資產屬性，開辦費用應於發生時列費用。⚠ 先停用不刪（歷史欄位一刪就查不回來），待記帳士確認後移除。⭐ 這是資訊循環「定期整理淘汰」在亞羅自己身上抓到的**第一筆**，而亞羅的科目表才建了四天。' },
  { code: '2',     name: '負債',                  level: 1, parent: null,   postable: false, cf: 'N',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: null },
  { code: '21',    name: '流動負債',                level: 2, parent: '2',    postable: false, cf: 'N',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: null },
  { code: '2101',  name: '應付帳款',                level: 3, parent: '21',   postable: true,  cf: 'O',  dept: false, partner: true,  scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '欠供應商的貨款' },
  { code: '2102',  name: '應付票據',                level: 3, parent: '21',   postable: true,  cf: 'O',  dept: false, partner: true,  scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '開出去的票。⚠ 應付沖掉不等於現金出去' },
  { code: '2111',  name: '應付費用',                level: 3, parent: '21',   postable: true,  cf: 'O',  dept: true,  partner: true,  scope: 'EITHER',  tax: null,   section: null,          active: true,  remark: '🔴 v1 修正：「需往來對象」的值域要擴充成「往來對象／員工」二選一——員工代墊報支的對象是員工，而員工不在往來對象主檔裡。⚠ 不改的話這一欄只能空白或亂填，就是恆迎那些「28 年一個值」欄位的長法。｜已發生未付款的費用' },
  { code: '2112',  name: '應付薪資',                level: 3, parent: '21',   postable: true,  cf: 'O',  dept: true,  partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '含底薪、職務加給、個績、團績、超額抽成' },
  { code: '2113',  name: '代扣所得稅',               level: 3, parent: '21',   postable: true,  cf: 'O',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '薪資代扣' },
  { code: '2114',  name: '代扣勞健保費',              level: 3, parent: '21',   postable: true,  cf: 'O',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '員工自付部分' },
  { code: '2115',  name: '應付特休假薪資',             level: 3, parent: '21',   postable: true,  cf: 'O',  dept: true,  partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '🆕 v2 ·『回頭要補的』#54。🔴 勞基法 §38（2017 修法）：年度終結或契約終止時未休特休一律折發工資，**且不得約定拋棄**。⚠ 它是**逐月累積、年底一次爆發**的負債，而沒有任何人會提醒你。量級：Y1 約 3.7 萬、Y2 約 8.6 萬（8 人全部未休的最壞情況）。⭐ 配套：會計政策第 15 項（按月估列）＋ 人資外環「員工自己看得到特休餘額」——看得到就會去排休，負債自然下降。' },
  { code: '2116',  name: '應付獎金（獎金池）',           level: 3, parent: '21',   postable: true,  cf: 'O',  dept: true,  partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '🆕 v2 ·『回頭要補的』#88。⛔ **不可塞 `2111 應付費用`**（那一格已經給員工代墊報支用了，混在一起就分不出是欠員工墊款還是欠獎金）。⭐ 獎金池是規則不是帳戶（人資行為 ㉚），但提撥出來的錢是真的負債，要有科目承接。⚠ 三個參數（提撥比例 X%／池子上限／動用條件）待執行長定，見『代碼參數表』最後一段與『問題登錄簿』#63。' },
  { code: '2121',  name: '銷項稅額',                level: 3, parent: '21',   postable: true,  cf: 'O',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '賣東西收的 5%' },
  { code: '2122',  name: '應付營業稅',               level: 3, parent: '21',   postable: true,  cf: 'O',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '每兩個月申報的淨額' },
  { code: '2131',  name: '應付所得稅',               level: 3, parent: '21',   postable: true,  cf: 'O',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '次年 5 月繳' },
  { code: '2141',  name: '預收貨款',                level: 3, parent: '21',   postable: true,  cf: 'O',  dept: false, partner: true,  scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '客戶先付的訂金' },
  { code: '2151',  name: '短期借款',                level: 3, parent: '21',   postable: true,  cf: 'F',  dept: false, partner: true,  scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '銀行融資 500 萬中一年內到期部分' },
  { code: '25',    name: '長期負債',                level: 2, parent: '2',    postable: false, cf: 'N',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: null },
  { code: '2501',  name: '長期借款',                level: 3, parent: '25',   postable: true,  cf: 'F',  dept: false, partner: true,  scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '銀行融資 500 萬中一年以上部分' },
  { code: '3',     name: '權益',                  level: 1, parent: null,   postable: false, cf: 'N',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: null },
  { code: '31',    name: '投入資本',                level: 2, parent: '3',    postable: false, cf: 'N',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: null },
  { code: '3101',  name: '股本',                  level: 3, parent: '31',   postable: true,  cf: 'F',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '股東出資 500 萬（三位股東）' },
  { code: '3102',  name: '資本公積',                level: 3, parent: '31',   postable: true,  cf: 'F',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '🆕 v2 ·『回頭要補的』#48 的**訂正**。⚠ 該項原寫「權益類科目（3xxx）尚未建」，但 v1 其實已經建了 `3101 股本`／`3201 累積盈餘`／`3202 本期損益` ——**那一項的描述已經過期，真正缺的只有資本公積這一格。**🔴 這是「做完的事沒回頭改清單」的第三個實例（前兩個是 BCUP 與那條掛 13 天的待回填）。' },
  { code: '32',    name: '保留盈餘',                level: 2, parent: '3',    postable: false, cf: 'N',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: null },
  { code: '3201',  name: '累積盈餘',                level: 3, parent: '32',   postable: true,  cf: 'N',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '⚠ 每年度結帳必須把損益結轉進來。恆迎 28 年從未結轉，資產負債表要重算才平' },
  { code: '3202',  name: '本期損益',                level: 3, parent: '32',   postable: true,  cf: 'N',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '年度結帳時結轉至 3201' },
  { code: '4',     name: '營業收入',                level: 1, parent: null,   postable: false, cf: 'N',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: null },
  { code: '41',    name: '營業收入',                level: 2, parent: '4',    postable: false, cf: 'N',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: null },
  { code: '4101',  name: '銷貨收入',                level: 3, parent: '41',   postable: true,  cf: 'O',  dept: true,  partner: true,  scope: 'PARTNER', tax: 'S53',  section: null,          active: true,  remark: '⚠ 不按客戶類別分科目。批發／保養廠／散客走「往來對象」的類別欄，報表再切' },
  { code: '4102',  name: '銷貨退回',                level: 3, parent: '41',   postable: true,  cf: 'O',  dept: true,  partner: true,  scope: 'PARTNER', tax: 'S53',  section: null,          active: true,  remark: '收入的減項' },
  { code: '4103',  name: '銷貨折讓',                level: 3, parent: '41',   postable: true,  cf: 'O',  dept: true,  partner: true,  scope: 'PARTNER', tax: 'S53',  section: null,          active: true,  remark: '收入的減項。⚠ 這一格是毛利率的漏水點，要按客戶盯' },
  { code: '5',     name: '營業成本',                level: 1, parent: null,   postable: false, cf: 'N',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: null },
  { code: '51',    name: '銷貨成本',                level: 2, parent: '5',    postable: false, cf: 'N',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: null },
  { code: '5101',  name: '銷貨成本',                level: 3, parent: '51',   postable: true,  cf: 'O',  dept: true,  partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '永續盤存：銷貨當下由存貨轉入' },
  { code: '5102',  name: '進貨折讓',                level: 3, parent: '51',   postable: true,  cf: 'O',  dept: true,  partner: true,  scope: 'PARTNER', tax: 'P5',   section: null,          active: true,  remark: '成本的減項' },
  { code: '5103',  name: '存貨盤盈虧',               level: 3, parent: '51',   postable: true,  cf: 'O',  dept: true,  partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '盤點差異。⚠ 這是倉管 KPI 的計分依據（1-b 起）' },
  { code: '5104',  name: '存貨報廢損失',              level: 3, parent: '51',   postable: true,  cf: 'O',  dept: true,  partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '呆滯品處理' },
  { code: '5105',  name: '存貨跌價損失',              level: 3, parent: '51',   postable: true,  cf: 'O',  dept: true,  partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '⚠ 待會計政策第 14 項（存貨評價）定案後啟用。5103 是盤盈虧、5104 是報廢，「貨還在但不值錢」原本無處可記。⭐ BCG 老狗出清需要它，否則會跟報廢混在一起分不開。' },
  { code: '6',     name: '營業費用',                level: 1, parent: null,   postable: false, cf: 'N',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: null },
  { code: '61',    name: '用人費用',                level: 2, parent: '6',    postable: false, cf: 'N',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: null },
  { code: '6101',  name: '薪資支出',                level: 3, parent: '61',   postable: true,  cf: 'O',  dept: true,  partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '底薪＋店長職務加給。恆迎近三年 1.26 億，佔全部費用 57.5%' },
  { code: '6102',  name: '業績獎金',                level: 3, parent: '61',   postable: true,  cf: 'O',  dept: true,  partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '個績達標＋團績＋超額毛利抽成 8%。⚠ 與底薪分開，才看得出激勵成本佔毛利多少' },
  { code: '6103',  name: '勞健保費－雇主負擔',           level: 3, parent: '61',   postable: true,  cf: 'O',  dept: true,  partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '勞保 8.4%＋健保 4.91%' },
  { code: '6104',  name: '勞工退休金提繳',             level: 3, parent: '61',   postable: true,  cf: 'O',  dept: true,  partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '6% 法定' },
  { code: '6105',  name: '職工福利',                level: 3, parent: '61',   postable: true,  cf: 'O',  dept: true,  partner: false, scope: 'PARTNER', tax: 'P5',   section: null,          active: true,  remark: null },
  { code: '6106',  name: '伙食費',                 level: 3, parent: '61',   postable: true,  cf: 'O',  dept: true,  partner: false, scope: 'PARTNER', tax: 'P5',   section: null,          active: true,  remark: '每人每月 3,000 元內免稅' },
  { code: '62',    name: '場地費用',                level: 2, parent: '6',    postable: false, cf: 'N',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: null },
  { code: '6201',  name: '租金支出',                level: 3, parent: '62',   postable: true,  cf: 'O',  dept: true,  partner: true,  scope: 'PARTNER', tax: 'P5',   section: null,          active: true,  remark: '70 坪×1,000＝70,000/月。恆迎佔費用 9.7%' },
  { code: '6202',  name: '水電瓦斯費',               level: 3, parent: '62',   postable: true,  cf: 'O',  dept: true,  partner: false, scope: 'PARTNER', tax: 'P5',   section: null,          active: true,  remark: null },
  { code: '6203',  name: '修繕維護費',               level: 3, parent: '62',   postable: true,  cf: 'O',  dept: true,  partner: false, scope: 'PARTNER', tax: 'P5',   section: null,          active: true,  remark: null },
  { code: '6204',  name: '保險費－財產',              level: 3, parent: '62',   postable: true,  cf: 'O',  dept: true,  partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '火險、竊盜險' },
  { code: '63',    name: '營運費用',                level: 2, parent: '6',    postable: false, cf: 'N',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: null },
  { code: '6301',  name: '運費',                  level: 3, parent: '63',   postable: true,  cf: 'O',  dept: true,  partner: true,  scope: 'PARTNER', tax: 'P5',   section: null,          active: true,  remark: '⚠ 進貨運費與銷貨運費要分開看時，用往來對象或部門切，不要開兩個科目' },
  { code: '6302',  name: '油資',                  level: 3, parent: '63',   postable: true,  cf: 'O',  dept: true,  partner: false, scope: 'PARTNER', tax: 'P5',   section: null,          active: true,  remark: '外務自有機車實報實銷 2,500/人/月。每筆要有加油單據與經手人' },
  { code: '6303',  name: '車輛維護費',               level: 3, parent: '63',   postable: true,  cf: 'O',  dept: true,  partner: false, scope: 'PARTNER', tax: 'P5',   section: null,          active: true,  remark: '機車購入後：保養、牌照、燃料費' },
  { code: '6304',  name: '保險費－責任',              level: 3, parent: '63',   postable: true,  cf: 'O',  dept: true,  partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '⚠ 雇主意外責任險 1,500/月。員工騎自有機車送貨，職災與第三人責任在公司' },
  { code: '6305',  name: '文具用品',                level: 3, parent: '63',   postable: true,  cf: 'O',  dept: true,  partner: false, scope: 'PARTNER', tax: 'P5',   section: null,          active: true,  remark: null },
  { code: '6306',  name: '郵電通訊費',               level: 3, parent: '63',   postable: true,  cf: 'O',  dept: true,  partner: false, scope: 'PARTNER', tax: 'P5',   section: null,          active: true,  remark: null },
  { code: '6307',  name: '交通旅費',                level: 3, parent: '63',   postable: true,  cf: 'O',  dept: true,  partner: false, scope: 'PARTNER', tax: 'P5',   section: null,          active: true,  remark: null },
  { code: '6308',  name: '交際費',                 level: 3, parent: '63',   postable: true,  cf: 'O',  dept: true,  partner: true,  scope: 'PARTNER', tax: 'PND',  section: null,          active: true,  remark: '⚠ 交際費的進項稅額不得扣抵' },
  { code: '6309',  name: '廣告推廣費',               level: 3, parent: '63',   postable: true,  cf: 'O',  dept: true,  partner: false, scope: 'PARTNER', tax: 'P5',   section: null,          active: true,  remark: null },
  { code: '6310',  name: '包裝用品',                level: 3, parent: '63',   postable: true,  cf: 'O',  dept: true,  partner: false, scope: 'PARTNER', tax: 'P5',   section: null,          active: true,  remark: '🔴 紙箱／膠帶／氣泡布／棧板 ＋ 標籤紙／碳帶。⚠ 它既不是合約固定費用（A 類）也不該走零用金（會爆掉 15,000 的定額）→ 走一般採購、廠商月結。⭐ 它是庫存層「入庫上架時貼碼」決策的隱含成本，財務模型 v4 已補列 9,500／月（24 個月約 23 萬）。' },
  { code: '64',    name: '管理費用',                level: 2, parent: '6',    postable: false, cf: 'N',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: null },
  { code: '6401',  name: '折舊費用',                level: 3, parent: '64',   postable: true,  cf: 'N',  dept: true,  partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '⚠ 不吃現金，但會壓低應稅所得。合法的稅盾，別忘了提' },
  { code: '6402',  name: '各項攤提',                level: 3, parent: '64',   postable: true,  cf: 'N',  dept: true,  partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '開辦費攤提' },
  { code: '6403',  name: '稅捐',                  level: 3, parent: '64',   postable: true,  cf: 'O',  dept: true,  partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '牌照稅、燃料稅、印花稅。⚠ 所得稅不放這裡，走 8201' },
  { code: '6404',  name: '會計師與顧問費',             level: 3, parent: '64',   postable: true,  cf: 'O',  dept: false, partner: true,  scope: 'PARTNER', tax: 'P5',   section: null,          active: true,  remark: '稅務簽證。執行長自任會計，此項應遠低於恆迎' },
  { code: '6405',  name: '資訊系統費',               level: 3, parent: '64',   postable: true,  cf: 'O',  dept: false, partner: true,  scope: 'PARTNER', tax: 'P5',   section: null,          active: true,  remark: '軟體訂閱、網路' },
  { code: '6406',  name: '銀行手續費',               level: 3, parent: '64',   postable: true,  cf: 'O',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: null },
  { code: '6407',  name: '呆帳損失',                level: 3, parent: '64',   postable: true,  cf: 'O',  dept: true,  partner: true,  scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '⚠ 與信用額度制度連動。恆迎客戶等級 99.88% 空白，等於沒有這道閘' },
  { code: '6408',  name: '教育訓練費',               level: 3, parent: '64',   postable: true,  cf: 'O',  dept: true,  partner: false, scope: 'PARTNER', tax: 'P5',   section: null,          active: true,  remark: null },
  { code: '6409',  name: '什項支出',                level: 3, parent: '64',   postable: true,  cf: 'O',  dept: true,  partner: false, scope: 'PARTNER', tax: 'P5',   section: null,          active: true,  remark: '⚠ 這格如果超過費用的 2%，代表科目表不夠用，該補科目而不是往這裡塞' },
  { code: '6411',  name: '什項購置',                level: 3, parent: '64',   postable: true,  cf: 'O',  dept: true,  partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '🆕 v2 ·『回頭要補的』#70。🔴 承接「單價 8 萬以下、依會計政策第 7 項一次列費用」的設備採購。⚠ 沒有它就只能塞 `6409 什項支出`，而 `6409` 有一道「不得超過費用 2%」的品質閘——1-a 開辦期光監視系統（6 萬）＋事務機（5 萬）就是 11 萬，一次撞破。⭐ 判準：它是「買了一個東西但不資本化」，與 `6409`（買不到東西的雜支）性質不同。' },
  { code: '7',     name: '營業外收入',               level: 1, parent: null,   postable: false, cf: 'N',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: null },
  { code: '71',    name: '營業外收入',               level: 2, parent: '7',    postable: false, cf: 'N',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: null },
  { code: '7101',  name: '利息收入',                level: 3, parent: '71',   postable: true,  cf: 'O',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: null },
  { code: '7102',  name: '其他收入',                level: 3, parent: '71',   postable: true,  cf: 'O',  dept: true,  partner: true,  scope: 'PARTNER', tax: 'S53',  section: null,          active: true,  remark: '廢料變賣、供應商獎勵金' },
  { code: '7103',  name: '財產交易利益',              level: 3, parent: '71',   postable: true,  cf: 'I',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '🆕 v2 ·『回頭要補的』#71。🔴 有 `8102 財產交易損失` 卻沒有對稱的利益科目，出售資產賺錢時只能塞 `7102 其他收入`。⭐⭐ 順帶得到一條可複用的檢查：**凡是有損失科目而沒有利益科目的地方，遲早會有一筆錢無處可放。**⚠ 營業人出售固定資產屬營業稅課稅範圍，要開發票（見『值域新增－固資與資訊』處分方式 SELL）。' },
  { code: '8',     name: '營業外支出',               level: 1, parent: null,   postable: false, cf: 'N',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: null },
  { code: '81',    name: '營業外支出',               level: 2, parent: '8',    postable: false, cf: 'N',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: null },
  { code: '8101',  name: '利息支出',                level: 3, parent: '81',   postable: true,  cf: 'F',  dept: false, partner: true,  scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '銀行融資 500 萬×2.5%＝月約 1 萬' },
  { code: '8102',  name: '財產交易損失',              level: 3, parent: '81',   postable: true,  cf: 'I',  dept: true,  partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: null },
  { code: '8103',  name: '其他損失',                level: 3, parent: '81',   postable: true,  cf: 'O',  dept: true,  partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: null },
  { code: '8104',  name: '兌換損益',                level: 3, parent: '81',   postable: true,  cf: 'O',  dept: true,  partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '🔴 恆迎用 7102 兌換利益 613 萬／8102 兌換損失 332 萬（近三年淨賺 281 萬），但傳票的外幣欄位 **100% 沒用**——幣別 28 年一個值、匯率全部是 1，外幣資訊活在系統外。⚠ 對亞羅：**進口採購單沒填幣別與匯率就不能過帳**，否則它會變成第 N 個 28 年一個值的欄位。' },
  { code: '82',    name: '所得稅',                 level: 2, parent: '8',    postable: false, cf: 'N',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: null },
  { code: '8201',  name: '所得稅費用',               level: 3, parent: '82',   postable: true,  cf: 'O',  dept: false, partner: false, scope: 'PARTNER', tax: null,   section: null,          active: true,  remark: '⚠ 獨立一個中類，不混在營業費用裡。恆迎把它放在 6143.002（稅捐）底下' },
];

export async function applyAccountCode(
  prisma: PrismaClient,
  params: ApplyTemplateParams,
): Promise<void> {
  const { tenantId, actorUserId } = params;

  // 科目類別（首碼 1~8）先查出來，供 accountClassId 帶入
  const classes = await prisma.nx05AccountClass.findMany({
    where: { tenantId },
    select: { id: true, code: true },
  });
  const classIdByCode = new Map(classes.map((c) => [c.code, c.id]));

  // 舊版 category（I/E/A/L）保留回填：nx08 損益表仍在讀它
  const legacyCategory = (code: string): string => {
    const head = code[0];
    if (head === '1') return 'A';
    if (head === '2' || head === '3') return 'L';
    if (head === '4' || head === '7') return 'I';
    return 'E';
  };

  // 第 1 趟：建立/更新本體（不含 parentId / defaultTaxCodeId，避免順序相依）
  for (const r of ROWS) {
    const data = {
      name: r.name,
      category: legacyCategory(r.code),
      accountClassId: classIdByCode.get(r.code[0]) ?? null,
      level: r.level,
      isPostable: r.postable,
      cashFlowType: r.cf,
      requireDept: r.dept,
      requirePartner: r.partner,
      partnerScope: r.scope,
      statementSection: r.section,
      isSystem: true,
      isActive: r.active,
      remark: r.remark,
      updatedBy: actorUserId,
    };
    await prisma.nx05AccountCode.upsert({
      where: { tenantId_code: { tenantId, code: r.code } },
      create: { tenantId, code: r.code, createdBy: actorUserId, ...data },
      update: data,
    });
  }

  // 第 2 趟：回填 parentId 與 defaultTaxCodeId
  const all = await prisma.nx05AccountCode.findMany({
    where: { tenantId }, select: { id: true, code: true },
  });
  const idByCode = new Map(all.map((a) => [a.code, a.id]));
  const taxes = await prisma.nx05TaxCode.findMany({
    where: { tenantId }, select: { id: true, code: true },
  });
  const taxIdByCode = new Map(taxes.map((t) => [t.code, t.id]));

  for (const r of ROWS) {
    const id = idByCode.get(r.code);
    if (!id) continue;
    const parentId = r.parent ? (idByCode.get(r.parent) ?? null) : null;
    const defaultTaxCodeId = r.tax ? (taxIdByCode.get(r.tax) ?? null) : null;
    if (parentId === null && defaultTaxCodeId === null) continue;
    await prisma.nx05AccountCode.update({
      where: { id },
      data: { parentId, defaultTaxCodeId, updatedBy: actorUserId },
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx05_account_code_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx05_account_code), 0), 1), true)`,
  );

  console.log(`✅ [TEMPLATE] applyAccountCode: ${ROWS.length} 筆 (tenant=${tenantId})`);
}
