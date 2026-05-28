<!-- docs/nx05/spec/intent/nx05-overview.md -->

# NX05 財務管理 — 業務需求 Overview（v0.1.0）

> 性質：業務需求文件（給 Hank impl 對齊用、純需求層、不含 schema / API / 程式碼）
> 撰寫者：Alex（NEXORA 專案 PM AI、Crown 授權 Alex 主導財務業務判斷）
> 拍板者：Crown（NEXORA 創辦人）
> 日期：2026-05-18
> 對應拍板：Crown 跨 3 輪需求討論共 11 題拍板 closure（2026-05-18）
> 依賴揭露：NX05-AUDIT-01 完成（schema 真相 verify ✓）
> 範圍：NEXORA NX05 財務管理模組、亞羅企業（Arco）量身打造
> 戰略定位：NEXORA 業務閉環模組（採購 + 庫存 + 銷貨 + 自動補貨 + **財務**）
> 紀律：首次 Q-RHYTHM-2 全軌連跑啟用（Crown 業務需求 + schema migration 拍完 → Hank 連跑到底）

---

## §0 文件性質

本文件為 NX05 財務管理模組的**業務需求總覽**、Alex 業務需求層產出。

**Crown 授權揭露**：Crown 揭露「財務不熟、Alex 協助判斷」、Alex 接手主導業務範圍判斷、對齊 NEXORA 「先全備、封測評估」哲學。

Hank impl 對齊原則：
- 本文件業務需求 = 真相、所有衝突以本文件為準
- schema migration 寫好 stop Crown review、Crown 拍 A 後 Hank 自跑
- service phase 完成 stop Alex review、不 ping Crown
- 首次 Q-RHYTHM-2：plan 拍完後 Hank 全軌連跑到底、只在重大衝突 stop

---

## §1 NX05 業務本質

### 1.1 NX05 是什麼

**NX05 財務管理 = 亞羅財務部門的工作台、NEXORA 業務閉環的最後一環**。

業務本質回答 5 個核心問題：

1. **欠錢給誰、欠多少？**（AP 應付帳款、向供應商）
2. **誰欠錢、欠多少？**（AR 應收帳款、客戶欠款）
3. **錢怎麼進出？**（Paylog 收付款流水）
4. **帳對得起來嗎？**（Allowance 折讓沖帳、Closing 關帳）
5. **科目分類記什麼？**（AccountCode 會計科目主檔）

### 1.2 NX05 在 NEXORA 全棧的角色

```
上游：
NX02 採購 PO/RR/TI → AP 應付帳款（5 helper：createAp / syncAp / createAllowanceFromPr）
NX04 銷貨 SO/SR → AR 應收帳款（2 helper：createArFromShippedSo / createAllowanceFromSr）
        ↓
NX05 財務完整鏈：
   AccountCode 會計科目 → AP/AR 帳款管理 → Paylog 收付款 → Allowance 沖帳 → 
   Closing 關帳 → Note 票據追蹤 → 對帳單 / 逾期催收
        ↓
業務閉環完成（採購 + 庫存 + 銷貨 + 自動補貨 + 財務）
```

**核心定位**：NEXORA 業務閉環最後一環、跨模組接收 5 helper 已完整化、entry point 順。

### 1.3 NEXORA 戰略意義

⭐⭐⭐ NX05 落地 4 個業界改革候選：

1. **業界標準科目表 seed + 用戶可改可加**（不從 0 key 204 科目）
2. **AR 月底自動產對帳單**（業界月結客戶必備）
3. **逾期催收自動警示**（對齊 NX04 CreditGuard 範式）
4. **業務閉環完整化**（5 helper 跨模組接點全乾淨）

---

## §2 主使用者與權限

### 2.1 主使用者 = FINANCE 財務部門

對齊亞羅 6 部門組織架構：

| 部門 | NEXORA 角色 | 跟 NX05 關係 |
|---|---|---|
| 財務部門 | **FINANCE** | **NX05 主寫入者、收付款執行 / 沖帳 / 關帳** |
| 產品部門 | PURCHASING | 看 AP（哪些採購單已開應付）|
| 銷售部門 | SALES | 看 AR（客戶欠款、跨 NX04 CreditGuard）|
| 倉管部門 | WAREHOUSE | 不涉 NX05 |
| 管理部門 | OWNER | 跨角色 read、月結報表審視 |

### 2.2 權限機制 = 彈性 role_view

對齊 NX02/NX03/NX04 範式：
- 預設 FINANCE 操作
- 用 role_view 彈性權限
- 不設「會計 / 出納 / 主管」雙層角色（Q1=a 拍板）
- 主管簽核走 status enum（如 Allowance APPROVED）

---

## §3 業務功能架構

### 3.1 NX05 9 大業務功能（範圍 A）

對齊 audit §1.2 已落地 + Crown 拍板（Q2 全要 + Q3/Q4 補新）：

| # | 功能 | audit 狀態 | 範圍 A |
|---|---|---|---|
| 1 | **AccountCode 會計科目主檔**（4 類：I 收入/E 支出/A 資產/L 負債）| 🟡 schema 已備、0 CRUD | ✅ 新建 CRUD |
| 2 | AP 應付帳款管理（5 階流、3 來源 PO/RR/TI）| ✅ schema + service | ✅ |
| 3 | AR 應收帳款管理（5 階流含 WRITTEN_OFF、overdueDays 系統算）| ✅ schema + service | ✅ |
| 4 | Allowance 折讓單（P 進貨/S 銷貨雙向、3 處置 O/D/R）| ✅ schema + service | ✅ |
| 5 | Closing 關帳單（每日一筆、4 階）| ✅ schema + service | ✅ |
| 6 | Note 票據（CK 支票/PN 本票、5 階流）| ✅ schema + service | ✅ |
| 7 | Paylog 收付款流水（5 種 payType）| ✅ schema + service | ✅ |
| 8 | ⭐ **AR 月底自動對帳單**（Crown Q3=要做）| 🟡 schema 已備、service 0 | ✅ 新建 |
| 9 | ⭐ **逾期催收自動警示**（Crown Q4=要做）| 🟡 overdueDays 已備、0 警示 | ✅ 新建 |

### 3.2 範圍 A 不涵蓋（封測階段評估）

對齊 Crown 揭露「先全備、封測再評估」、本軌**不裁減**任何上述 9 功能。

後續軌候選（封測階段第二次評估）：
- 發票管理 / 401 報表政府對接
- 應收應付沖抵
- 預付款 / 訂金管理
- 銀行對帳自動化

---

## §4 AccountCode 主檔範式（Crown Q5=b + Q6=a 升級）

### 4.1 業界標準科目表 seed 來源

**對齊 Crown 揭露 + 恆迎參考檔分析**：

| 來源 | 範圍 |
|---|---|
| 恆迎參考（204 科目）| 業界 30 年實證、台灣標準會計科目結構 |
| 改編為「亞羅汽配業專用標準範本」 | 去掉純恆迎特有（如特定銀行帳戶）|

### 4.2 業界 6 大科目分類（恆迎參考分析）

| 首碼 | 業界對應 | 範例 |
|---|---|---|
| 1xxx 資產 | 現金 / 銀行 / 應收帳款 / 存貨 | 1131 應收帳款、1112 銀行存款 |
| 2xxx 負債 | 應付 / 借款 / 稅金 | 2111 應付帳款 |
| 3xxx 業主權益 | 資本 / 盈餘 | — |
| 4xxx 營業收入 | 銷貨收入 | — |
| 5xxx 營業成本 | 銷貨成本 / 期初存貨 | 5205 期初存貨 |
| 6xxx 營業費用 | 薪資 / 交際 / 折舊 | 6130 薪資、6135 交際費 |
| 7xxx 營業外收入 | 利息 | — |
| 8xxx 所得稅 / 損益 | 稅後 | — |

### 4.3 seed + 用戶可改可加（Q5=b）

- 系統 seed 預設「亞羅汽配業標準範本」（約 100~150 科目精選）
- 用戶可改：科目名稱、業務語意
- 用戶可加：新增子科目（如 1112.999 自家銀行帳戶）
- 用戶不可刪（已用過的科目）：軟刪除 isActive=false

### 4.4 科目層級設計

對齊恆迎範式：
- 4 位主碼（如 1112 銀行存款）
- `.子碼` 細分（如 1112.057 銀行存款-玉山支存）
- 業務員可自定子碼

---

## §5 AP 應付帳款（業務閉環上游接點）

### 5.1 3 來源觸發

對齊 audit § 1.4 reverse FK + 5 helper：

| 來源 | 觸發點 | helper | sourceType |
|---|---|---|---|
| NX02 PO | PO CONFIRMED | createApFromConfirmedPo | PO |
| NX02 RR | RR POSTED（LITE 直接路徑）| 待 verify | RR |
| NX02 TI | TI 同行調貨 | 待 verify | TI |

### 5.2 AP 狀態流（audit § 1.2）

```
OPEN（待付）→ PARTIAL（部分付）→ PAID（已付）
             ↓
        OVERDUE（逾期）→ 對齊 Q4 逾期催收警示
        VOID（作廢）
```

### 5.3 AP 沖帳工作流

- 1 AP 對 N Paylog（業界常見：分期付款）
- Paylog 累計 = AP 已付金額
- AP 狀態自動推進（OPEN→PARTIAL→PAID）

---

## §6 AR 應收帳款（業務閉環下游接點）

### 6.1 觸發來源

對齊 audit + helper：

| 來源 | 觸發點 | helper | sourceType |
|---|---|---|---|
| NX04 SO | SO SHIPPED | createArFromShippedSo | SO |

### 6.2 AR 狀態流 + 逾期計算

```
OPEN（待收）→ PARTIAL（部分收）→ PAID（已收）
             ↓
        OVERDUE（逾期、overdueDays 系統每日計算）
        WRITTEN_OFF（呆帳）→ 對齊業界損失提列
```

### 6.3 ⭐ AR 月底自動對帳單（Crown Q3 + Q7=a）

業界 muscle memory：月結客戶必備、業務員不用手動產：

```
每月 1 號 cron job 觸發
   ↓
掃描所有 AR.customerType=月結
   ↓
依 customer 彙整：上月銷貨 / 收款 / 未付 / 本月 carryover
   ↓
產出對帳單（PDF / text 範式、對齊 NX02 RFQ export）
   ↓
業務員 / 業務助理寄 email 給客戶
```

### 6.4 ⭐ 逾期催收警示（Crown Q4 + Q8=a）

對齊 NX04 CreditGuard 15 天範式：
- 既有 overdueDays 系統每日計算
- 閾值 15 天（tenant 層級、用戶可調）
- 觸發後 UI 顯示警示標記
- 跟 NX04 CreditGuard 共享 tenant 設定（同 NX99Tenant.creditOverdueDaysThreshold）

---

## §7 Allowance 折讓單（跨模組沖帳）

### 7.1 兩來源（5 helper 已完整化）

| 來源 | helper | allowanceType |
|---|---|---|
| NX02 PR returnMode=A（進貨折讓）| createAllowanceFromPurchaseReturn | P 進貨 |
| NX04 SR R/D（銷貨退款 / 折讓）| createAllowanceFromSalesReturn | S 銷貨 |

### 7.2 3 種處置（disposalMethod）

| 處置 | 業務 | 落地 |
|---|---|---|
| O 沖銷 | 沖既有應收應付 | 寫 AP/AR PARTIAL 沖帳 |
| D 下次折抵 | 客戶 / 廠商帳上保留 | 對齊 NX02/NX04 範式 |
| R 現金退回 | 退錢 | 走 Paylog payType=RR/RC |

### 7.3 簽核流程

對齊 audit § 1.2 Allowance 5 階：
- DRAFT → PENDING → APPROVED → PROCESSED → VOIDED
- FINANCE 簽核（主管 OWNER 跨角色 read）

---

## §8 Paylog 收付款流水（5 種 payType）

對齊 audit § 1.2：

| payType | 業務 | 對應 |
|---|---|---|
| CR 收款 | 客戶付款 | 沖 AR |
| CP 付款 | 付廠商 | 沖 AP |
| RR 廠商退款 | 廠商退錢 | 沖 Allowance P |
| RC 客戶退款 | 退錢給客戶 | 沖 Allowance S |
| EX 費用 | 雜費 | 跟 AccountCode 連動（EX 時 accountCodeId 必填）|

---

## §9 Closing 關帳單（Q9=a 不整合 401 報表）

### 9.1 範圍 A 範圍

- 每日一筆關帳單
- 4 階流 OPEN/CLOSING/CLOSED/REOPENED
- 純帳務凍結（已 CLOSED 期間禁止異動）
- 對齊 NX02-IMPL-01 Phase 5 揭露的 FinancePeriod 校驗（Allowance bridge backlog 補強）

### 9.2 範圍 A 不涵蓋

- ❌ 401 報表政府對接（屬政府電子申報、獨立技術軌、本軌不做）

### 9.3 後續軌

- 401 報表政府對接（封測後啟動）
- 月結 / 季結 / 年結報表

---

## §10 Note 票據（Q10=a 記錄+沖帳）

### 10.1 業界 muscle memory

- 客戶開支票 / 本票付款（業界常見）
- 系統記錄票據資訊（票號 / 到期日 / 銀行）
- 票據兌現 → 沖 AR（CLEARED 狀態）
- 票據跳票 → 標記 BOUNCED、AR 重新 OPEN

### 10.2 票據狀態流

對齊 audit § 1.2：
```
DRAFT → ACTIVE（已收 / 已開）→ CLEARED（兌現、沖 AR/AP）
                              ↓
                              BOUNCED（跳票）→ AR/AP 重新 OPEN
                              VOIDED（作廢）
```

### 10.3 沖帳邏輯

- 票據沖 AR：Note.partnerId=客戶、type=R 應收、CLEARED 時觸發 Paylog payType=CR
- 票據沖 AP：Note.partnerId=供應商、type=P 應付、CLEARED 時觸發 Paylog payType=CP

---

## §11 跨模組接點

### 11.1 上游接點（reverse FK + 5 helper）

| 上游 | 觸發 | NX05 寫入 | helper |
|---|---|---|---|
| NX02 Po CONFIRMED | AP create | sourceType=PO | createApFromConfirmedPo ✓ |
| NX02 Po update | AP sync 金額 | sourceType=PO | syncApLedgerFromPo ✓ |
| NX02 Rr POSTED | AP create（LITE 路徑）| sourceType=RR | 待 verify |
| NX02 Ti 同行調貨 | AP create | sourceType=TI | 待 verify |
| NX02 Pr returnMode=A | Allowance create | type=P | createAllowanceFromPurchaseReturn ✓ |
| NX04 So SHIPPED | AR create | sourceType=SO | createArFromShippedSo ✓ |
| NX04 Sr R/D | Allowance create | type=S | createAllowanceFromSalesReturn ✓ |

### 11.2 NX05 內部接點

- AP/AR ↔ Paylog（沖帳）
- AP/AR ↔ Allowance（折讓沖抵）
- AP/AR ↔ Note（票據沖帳）
- Paylog ↔ AccountCode（EX 費用必填科目）
- 全表 ↔ Closing（已關帳期間禁異動）

### 11.3 不屬於 NX05 範圍

- **發票管理 / 401 報表**：政府對接、獨立技術軌
- **銀行對帳自動化**：第三方 API 整合
- **預付款 / 訂金**：對應 NX02/NX04 範圍 B

---

## §12 範圍 closure 定義

### 12.1 範圍 A 涵蓋（9 業務功能）

| # | 功能 | 範圍 A |
|---|---|---|
| 1 | AccountCode 會計科目主檔（seed + CRUD）| ✅ |
| 2 | AP 應付帳款（3 來源、5 階流、沖帳工作流）| ✅ |
| 3 | AR 應收帳款（5 階流、overdueDays 計算）| ✅ |
| 4 | Allowance 折讓單（雙向、3 處置）| ✅ |
| 5 | Closing 關帳單（每日、4 階）| ✅ |
| 6 | Note 票據（記錄 + 沖帳）| ✅ |
| 7 | Paylog 收付款（5 種 payType）| ✅ |
| 8 | AR 月底自動對帳單 | ✅ |
| 9 | 逾期催收自動警示（共享 tenant 設定）| ✅ |

### 12.2 範圍 A closure 標準

- 9 業務功能 schema + service + endpoint 全落地
- 5 跨模組 helper 補完 NX02 RR/TI AP 接點（audit § 1.4 部分待 verify）
- AccountCode seed 業界標準範本（約 100~150 科目）
- AR 對帳單自動產（每月 1 號 cron）
- 逾期催收警示共享 NX04 tenant 閾值
- Closing 跟既有 NX02 Allowance bridge FinancePeriod 校驗整合

### 12.3 範圍 A 不涵蓋（封測階段第二次評估）

- 發票管理 / 401 報表政府對接
- 應收應付沖抵
- 預付款 / 訂金
- 銀行對帳自動化

---

## §13 後續軌 backlog

### 13.1 NX05 範圍 B 戰略軌（封測後啟動）

- 401 報表政府對接
- 應收應付沖抵
- 預付款 / 訂金管理

### 13.2 NX05 既有殘留處理（audit-01 揭露）

- features/finance/FinanceCenterHub.tsx 命名孤兒清理
- menu.nx05.ts 建立（既有 0 檔、NX04 Phase 6 已修轉接）
- dashboard 1 placeholder 升 5 placeholder（對齊 NX02/NX04 範式）
- 全表 0 index、量大後補 index 軌

### 13.3 範圍 A 完成後預備

- TASK-NX05-IMPL-UI-01（UI 獨立軌）
- TASK-NX05-IMPL-02-TEST（測試獨立軌、補 0 spec 缺口）
- TASK-NX05-DEMO-CLEANUP（features/finance 清 + menu 建）

---

## §14 文件變更歷史

| 版本 | 日期 | 變更摘要 |
|---|---|---|
| v0.1.0 | 2026-05-18 | 首版、整合 Crown 3 輪 11 題拍板 + Alex 主導判斷 + NX05-AUDIT-01 + 恆迎科目參考 |

---

> **本文件純業務需求層、不含 schema / API / 程式碼細節**
> Hank 後續 impl 階段對齊本文件業務需求、schema / service / UI 拓樸排序自決
> 任何 schema / API 設計衝突、以本文件業務需求為真相
> Q-RHYTHM-2 首次落地：schema migration 拍完後 Hank 全軌連跑到底
