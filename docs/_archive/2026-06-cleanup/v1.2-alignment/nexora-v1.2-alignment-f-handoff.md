<!-- docs/_team/nexora-v1.2-alignment-f-handoff.md -->

# NEXORA LITE v1.2 對齊軌 階段 F closure handoff

> 撰寫者：Hank（Claude Code）
> 撰寫時間：2026-06-01
> 對應分支：`feature/v1.2-alignment-f`
> 對應 tag：`v2.0.6-alignment-f-complete`
> 前棒：`docs/_team/nexora-v1.2-alignment-e-handoff.md`
> 規格：v1.2 §8 財務作業 + 階段 F 意圖書（總經理 2026-05-31 逐題拍板）

---

## §1. 本軌範圍 — P0~P6 全做 + P5-B 4 子畫面

| 子任務 | 範圍 | 狀態 |
|--------|------|------|
| P0 | 意圖書 v1.0 落檔（總經理逐題拍板）| ✅ |
| P1 | schema 變動：ArLedger 多來源 + Closing 401 上報旗標 | ✅ |
| P2 | blueprint §8.5 法規事實錯誤修正（月末關帳 → 月關帳 + 401 雙月一期）| ✅ |
| P3 | 後端業務規則 7 子項（PoStatus / createArFromPr / period-lock / 401 預覽 / 上報旗標 / payableView 等）| ✅ |
| P3-fu | PO 補「主管直接改」（APPROVED 允許改 line items）| ✅ |
| P4 | 前端 5 頁面（應收/應付/票據/關帳/帳戶）| ✅ |
| P5-schema | STOP-1 通過、3 項 schema 變動（paylog_settlement / ar_reminder_log / warranty.refund_*）| ✅ |
| P5 | application code（401 TXT / 票據沖銷 / 催款 / 折讓核可 / 保固理賠三方式）| ✅ |
| P5-B (1) | 票據新增 dialog（4 種付款方式 + 一票對多沖銷）| ✅ |
| P5-B (2) | 折讓 dialog + 主管核可 UI（AR/AP 折讓按鈕）| ✅ |
| P5-B (3) | 保固理賠 registerResult 加退款金額 + 方式 UI | ✅ |
| P5-B (4) | 沖銷檢視 dialog（AR/AP 沖銷歷史追溯）| ✅ |

## §2. 12 commits 整軌

| Commit | 範圍 |
|--------|------|
| `ffa3b19` | P0 意圖書 v1.0 落檔 |
| `ede45f1` | P1 schema 變動（ArLedger sourceType+prId+soId NULL / Closing 加 3 欄）|
| `27916f6` | P2 blueprint §8.5 修正 |
| `d4d0ec7` | P3 後端 7 子項（無 schema 變動）|
| `c67891c` | P3-fu PO「主管直接改」|
| `235ba98` | P4 前端 5 頁面 |
| `1220905` | P5-schema 3 項變動（paylog_settlement / ar_reminder_log / warranty.refund_*）|
| `6865ad4` | P5 application code（401 TXT / 票據沖銷 / 催款 / 折讓核可 / 保固理賠三方式）|
| `8b0353d` | P5-B (1) 票據新增 dialog |
| `2b5c014` | P5-B (2) 折讓 dialog + 主管核可 UI + partnerType 過濾防呆 |
| `e4ef742` | P5-B (3) 保固退錢 UI |
| `33fa42f` | P5-B (4) 沖銷檢視 dialog |

**整軌淨變動**：46 files、+5682 / -100（**淨增 5582 行**）

---

## §3. 三個重點業務決策（總經理拍板）

### 3.1 採購單狀態流改（NX02→NX05 接點）

```
舊：DRAFT → CONFIRMED → PARTIAL_RECEIVED / RECEIVED → CLOSED
新：DRAFT → APPROVED → SUBMITTED → CONFIRMED → ... 
                                       ↑
                          廠商確認 = 應付產生點
                          createApFromConfirmedPo 觸發點不動
```

業務語意：
- DRAFT 草稿
- APPROVED 主管審核通過（寫 approvedAt + approvedBy）
- SUBMITTED 已向廠商提出
- CONFIRMED 廠商確認備貨（先款後貨、應付產生）

「主管直接改」（總經理拍板補）：APPROVED 狀態也允許改 line items、避免主管駁回→開單人改→再送審的來回浪費。

### 3.2 月關帳 vs 401 雙月一期（C 案上報旗標）

```
規格書 §8.5 原寫「每月關帳產出 401」= 法規事實錯誤
新版（總經理授權修正）：
  - 月關帳（內部控管）：每月關一次、鎖當月單據
  - 401 雙月一期：1-2月 / 3-4月 / 5-6月 / 7-8月 / 9-10月 / 11-12月（共 6 期）
  - 期碼格式 YYYY-EE（EE=01~06）
```

C 案上報旗標：
- `Nx05Closing` 加 3 欄：`reportPeriod` + `reportFiledAt` + `reportFiledBy`
- 期已上報（`reportFiledAt` 非 null）→ 整期所有月鎖死（period-lock）
- 期未上報、月 CLOSED 但未 REOPENED → 月鎖（可解鎖）

### 3.3 保固理賠退錢三方式（總經理「一次做到位」）

```
Nx02WarrantyClaim result='REF' 退錢：
  - refundAmount：系統建議 = 進貨成本 × 數量、業務可改
  - refundMethod 三選一：
    O = Offset    下次扣抵（純記錄、業務手動扣）
    A = Allowance 自動建 DRAFT Allowance（財務核可後沖 AP）
    R = Refund    直接匯款退現（純記錄、業務用 paylog 沖）
```

---

## §4. 11 頁面交付清單

| # | 路徑 | 性質 |
|---|------|------|
| 1 | `/dashboard/finance` | hub（接 5 卡片 href）|
| 2 | `/dashboard/nx05/ar` | 應收帳款工作台（含催款 + 沖銷 + 折讓 + 歷史按鈕）|
| 3 | `/dashboard/nx05/ap` | 應付帳款工作台（含彙整 SR Allowance + 沖銷 + 折讓 + 歷史）|
| 4 | `/dashboard/nx05/notes` | 票據管理（含「+新增收款/付款」按鈕）|
| 5 | `/dashboard/nx05/closing` | 關帳作業（401 期預覽 + 標記上報 + 解鎖 + **下載 TXT**）|
| 6 | `/dashboard/nx05/allowance` | 折讓核可工作台（DRAFT/核可/駁回）|
| 7 | `/dashboard/finance/account` | 帳戶管理（Tab：往來 vs 自有銀行 placeholder）|
| 8 | `/dashboard/nx02/warranty-claim` | 保固理賠（既有頁、擴 REF 退錢 UI）|
| 9 | （dialog）PaylogCreateDialog | 票據新增（多 settlement 沖銷）|
| 10 | （dialog）AllowanceCreateDialog | 折讓 DRAFT 建立 |
| 11 | （dialog）SettlementHistoryDialog | AR/AP 沖銷歷史追溯 |

---

## §5. schema 變動完整清單（兩次 STOP-1 通過）

### P1 STOP-1（commit `ede45f1`、總經理 2026-05-31 拍板）

| 表 | 變動 |
|----|------|
| nx05_ar_ledger | + source_type / + pr_id / **so_id DROP NOT NULL**（容納 PR 來源）|
| nx05_closing | + report_period / + report_filed_at / + report_filed_by |

### P5-schema STOP-1（commit `1220905`、總經理 2026-06-01 拍板）

| 表 | 變動 |
|----|------|
| nx05_paylog_settlement | **新表**（一票對多沖銷、含 ar XOR ap check constraint）|
| nx05_ar_reminder_log | **新表**（催款歷史、純內部記錄）|
| nx02_warranty_claim | + refund_amount（NULL）+ refund_method（NULL、O/A/R）|

**兩次 STOP-1 全屬「ADD COLUMN / 新表 / DROP NOT NULL」、無破壞性 column 改型、既有 row 影響極小**（既有 197 筆 ar_ledger 自動 source_type='SO'、其他新欄全 NULL）。

---

## §6. 跨模組接點（含 P5 新加 helper）

### 既有（階段 F 前）
- NX02 PO CONFIRMED → `createApFromConfirmedPo`
- NX02 RR POSTED → `createApFromRr`
- NX02 PR returnMode='A' POSTED → `createAllowanceFromPurchaseReturn`
- NX02 TI → `createApFromTi`
- NX04 SO SHIPPED → `createArFromShippedSo`
- NX04 SR → `createAllowanceFromSr`
- 薪資 → `createPaylogFromSalary`

### 階段 F 新加
- **NX02 PR returnMode='F'/'P' POSTED → `createArFromPostedPr`**（Q1=a-1、廠商退費衍生應收）
- **任意 paylog → `applySettlementsForPaylog`**（一對多沖 AR/AP、自動更新餘額 + status）
- **NX02 WarrantyClaim REF + method='A' → 自動建 DRAFT Nx05Allowance**（待財務核可）

---

## §7. 新 endpoint 清單（19 個）

| Method | Path | 用途 |
|--------|------|------|
| GET | `/nx05/period-close/period/:yp/preview` | 401 期銷項/進項彙整預覽 |
| POST | `/nx05/period-close/:id/mark-filed` | 標記 401 期已上報、整期鎖 |
| GET | `/nx05/period-close/period/:yp/txt-export` | 401 TXT 兩檔 base64 |
| GET | `/nx05/ap/payable-view` | 應付彙整視圖（AP + SR Allowance）|
| POST | `/nx05/paylog/with-settlements` | 票據新增 + 多 settlement 自動沖 |
| POST | `/nx05/ar/:id/notify-overdue` | 催款（純內部記錄）|
| GET | `/nx05/ar/:id/settlements` | AR 沖銷歷史 |
| GET | `/nx05/ap/:id/settlements` | AP 沖銷歷史 |
| POST | `/nx05/allowance/manual` | 人工開折讓（DRAFT）|
| POST | `/nx05/allowance/:id/approve` | 主管核可（建 paylog 自動沖）|
| PATCH | `/nx05/allowance/:id`（status=REJECTED）| 駁回折讓 |

既有 endpoint 擴：
- `PATCH /nx02/warranty-claim/:id/register-result`（result='REF' 加 refundAmount + refundMethod 校驗 + A 方式自動建 Allowance）
- `PATCH /nx02/po/:id`（拆 isApproving / isVendorConfirming 觸發時機）

---

## §8. 401 TXT 格式對齊（依財政部規範）

### 兩個檔案
1. `{統編}.TXT` 進銷項資料檔：**fixed-width 81 字元 / 行**、ASCII、無分隔符
2. `{統編}.TET_U` 401 主表檔：**112 欄、用「|」分隔**

### 進銷項欄位（81 字元、依 Alex 規範 §20）
```
申報營業人(9) + 流水號(7) + 民國年月(5) + 格式代號(2) +
買受人統編(8) + 銷售人統編(8) + 銷售額(12, 左補0) +
課稅別(1) + 營業稅額(10, 左補0) + 扣抵代號(1) +
補空白(18) = 81
```

### 格式代號（對應 NEXORA 單據）
- 31 銷項三聯 ← NX04 SO
- 33 銷貨退/折讓 ← NX04 SR
- 21 進項三聯 ← NX02 RR
- 23 進貨退/折讓 ← NX02 PR

### 5% 稅率拆算
```
tax = round(gross / 1.05 × 0.05)
sales = gross - tax
```
既有 schema 有 subtotal + taxAmount + totalAmount、直接用、taxAmount=0 才呼叫 splitTaxFromGross。

### 民國年
```
rocYear = 西元 − 1911
```

---

## §9. closure 後續軌（不在本軌、Alex 登記）

| 項目 | 估時 |
|------|------|
| 401 主表完整 112 欄精確對照（依 GL009478 附件六）| 0.5 天 |
| 催款自動寄 email / 簡訊（純內部記錄已可用）| 1 天 |
| Note 表 vs Paylog 表術語整合（業務層混淆釐清）| 0.5 天 |
| AR/AP 按鈕密度 / 沖銷 vs 折讓視覺區分（待總經理實測回饋）| 0.5 天 |
| 廠商逾期自動失效（兩段式：提醒 → 失效、客戶可自訂天數）| 1.5 天 |
| 自有銀行帳戶 schema（nx05_bank_account）+ UI | 1 天 |
| AR/AP list 加 partner filter（後端 query 參數）| 0.5 天 |
| Note 表狀態流（CK/PN 票據 vs 收付款 paylog 整合）| 後續軌 |
| 沖銷視圖完整化（settlement 可手動編輯/沖正）| 1 天 |
| 駁回折讓改 modal（從 prompt 升級）| 0.5 天 |

---

## §10. 對齊「總經理當第一個真客戶實測」需求

| 需求 | 落實 |
|------|------|
| 一次做到位、能完整實測 | 4 個 P5-B 畫面全接通（票據/折讓/保固/沖銷視圖）|
| 改參數要生效（驗算對得起來）| 401 期碼動態算（依當前月）、稅額用既有 schema、毛利率讀 customer-grades 已階段 E 修 |
| 法規事實正確 | §8.5 修正「月關帳 + 401 雙月一期」|
| 操作流程可追溯 | settlement 歷史 dialog（每筆沖銷可看「誰沖的、何時沖的、沖多少」）|
| 防呆（避免實測誤操作）| partnerType 過濾、refundMethod 必選、沖銷總額=金額、refundAmount>0、catch-22 不會卡住 |

---

## §11. tag + memory

- tag：`v2.0.6-alignment-f-complete`
- memory：`project_v1_2_alignment_f_closure.md`

---

## §12. 給下棒 Hank 的 known 議題

1. **Note 表 vs Paylog 表業務語意**：
   - Note 既有意義 = 票據實體（CK/PN 支票本票）
   - Paylog 既有意義 = 所有收付款記錄（含現金/匯款/支票/信用卡）
   - 本軌「票據管理」UI 涵蓋 Paylog 全 4 方式、但表名仍叫 Note（業務層混淆）
   - 後續軌：要嘛改 UI 詞、要嘛新建 PaylogWorkbench 替換

2. **401 TXT 主表 112 欄基礎版**：依 Alex 給的關鍵欄位填、未完整對照 GL009478 附件六、實際申報前需依規範補完。

3. **AR list 後端無 customerId filter**：PaylogCreateDialog 前端 filter 全載（pageSize=100）再過濾、量大時不佳、後續軌補 query param。

4. **partnerType 過濾僅含 6 種 partnerType**：T 物流目前無獨立 master 入口、暫歸 master.vendor 控制（階段 E PRE-P3 已揭露）。

5. **catch-22 schema**：兩次 STOP-1 都對齊「ADD COLUMN / 新表 / DROP NOT NULL 放寬」原則、沒做「ADD NOT NULL without DEFAULT」這種會回填炸的變動。

---

✅ **closure 完成。下棒可接 v1.2 §15 階段 G 或其他軌**。
