<!-- docs/nx06/spec/impl/nx06-impl-01-plan.md -->

# TASK-NX06-IMPL-01 — 拓樸排序 + Migration 拆軌計畫（v0.1.0）

> 性質：實作前置計畫文件、**Q-RHYTHM-2 完整自主授權**（Crown + Alex 預批、Hank 全軌連跑、僅 Final merge 介入）
> 撰寫者：Hank
> 日期：2026-05-18
> 分支：`feature/nx06-logistics`（自 main HEAD `4362f50` 切出、NX05 v0.7.0 + audit-01 後）
> 對應依據：[nx06-overview v0.1.0](../intent/nx06-overview.md) + [nx06-audit-01](../../nx06-audit-01.md)
> 紀律：對齊 NX05-IMPL-01 範式（Q-RHYTHM-2 首次落地驗證後）

---

## §0 計畫文件性質

Q-RHYTHM-2 範式下、plan 完成即進 Phase 1 連跑。

**Hank 紀律承諾**：plan commit 後全軌連跑、僅以下情境 stop：
- 業務語意衝突（overview 沒提到的新需求）
- 跨模組行為改變（需動既有 production 行為）
- Lalamove API 整合遇限制（如需 webhook 公網 endpoint）
- 熱感印表機硬體 SDK 不可行（本軌純 backend、SDK 對接屬 UI 軌）
- 全軌完成（stop 給 Crown + Alex 驗收）

---

## §1 範圍 A 10 業務功能（對齊 overview §8.1）

| # | 功能 | 既有 schema | 新增 schema | service | UI |
|---|---|---|---|---|---|
| 1 | DN 4 物流類型管理 | ✅ schema 成熟 | 0 | dn-logistics.service 升 | 🟡 stub |
| 2 | NX04 SO SHIPPED → DN | ✅ helper + wire | 0 | 0 改（純 verify）| — |
| 3 | NX04 SR returnMethod='C' → RETURN_PICKUP | ✅ schema reverse | 0 | 新建 helper + sales-return.service wire | — |
| 4 | NX03 Parcel → DnItem wire | ✅ schema reverse | 0 | 新建 helper（純 export）| — |
| 5 | **倉管組長配單**（指派外務 + 車輛）| ✅ schema 已備 | 0 | 新建 DispatchService | 🟡 stub |
| 6 | **電子簽 + 照片簽收 + GPS** ⭐ | ✅ schema 已備 | 0 | dn-logistics.service 升簽收 | 🟡 stub |
| 7 | **現場熱感印表機列印** ⭐ | ❌ 0 schema | M2 +printerDeviceId/printedAt | 新建 PrinterIntegrationService | — |
| 8 | **配送異常處理**（FAILED 重派）| ✅ schema status FAILED | 0 | dn-logistics.service 升異常 | — |
| 9 | **Lalamove API 半自動整合** ⭐⭐ | ❌ 0 schema | M2 +lalamoveOrderId/TrackingNo/CallbackStatus | 新建 LalamoveIntegrationService（service shell、HTTP 環境變數可關）| — |
| 10 | **配送成本內部記錄** ⭐ | ❌ 0 schema | M1 +internalCost | dn-logistics.service 升 + NX05 Paylog EX wire | — |

---

## §2 拓樸排序 4 層

### L1 — 基礎層（schema + 新建 3 service）

- M1 Nx06DnItem +internalCost（配送成本內部）
- M2 Nx06Dn +5 欄（printer 2 + Lalamove 3）
- 新建 3 service：
  - **DispatchService**（倉管組長配單：指派外務 + 車輛）
  - **PrinterIntegrationService**（熱感印表機列印 endpoint）
  - **LalamoveIntegrationService**（Lalamove API service shell）

### L2 — 既有 service 升級

⭐ **dn-logistics.service 升 3 接點**：
- 簽收邏輯升（signatureUrl / photoUrls / GPS）
- 異常處理升（FAILED 重派、status 流轉）
- 配送成本寫入（internalCost）

### L3 — 跨模組 wire 補完

⭐ **3 inline helper**：
- 新建 `nx06-create-return-pickup-from-sr.ts`（NX04 SR → RETURN_PICKUP DN、wire 到 sales-return.service）
- 新建 `nx06-create-dn-item-from-parcel.ts`（NX03 Parcel → DnItem、純 export 不 wire）
- 新建 `nx06-create-paylog-from-dn-cost.ts`（DN COMPLETED → NX05 Paylog EX、純 export）

### L4 — UI stub + menu + 文件

- UI workspace 升 desc + 4 新 placeholder（dispatch / signing / lalamove / cost）
- menu.nx06.ts 建立（audit-01 揭露既有 0 檔）

---

## §3 Migration 拆軌策略（A041 精確 = **2 軌**）

### M1 — `nx06_dn_item_internal_cost`（配送成本內部）

範圍：
- `nx06_dn_item` ADD COLUMN `internal_cost` DECIMAL(14,2) NULL

風險：低（純加欄、nullable、無 backfill、對外 SEL 不 expose）
commit 數：1

### M2 — `nx06_dn_printer_lalamove_columns`（5 欄合併）

範圍：
- `printer_device_id` VARCHAR(50) NULL
- `printed_at` TIMESTAMP(3) NULL
- `lalamove_order_id` VARCHAR(50) NULL
- `lalamove_tracking_no` VARCHAR(50) NULL
- `lalamove_callback_status` VARCHAR(30) NULL

風險：低（純加欄、全 nullable、無 backfill）
commit 數：1

### Migration 軌總計

**M1 + M2 = 2 軌、2 migration、2 commit**

---

## §4 commit 拆軌策略（A041 估計）

| 階段 | commit 數 | 範圍 |
|---|---|---|
| Phase 0 | 1 | plan v0.1.0 |
| Phase 1 | 2 | M1 internalCost / M2 printer + lalamove |
| Phase 2 | 3 | L1 新 3 service（Dispatch / PrinterIntegration / LalamoveIntegration）|
| Phase 3 | 1 | L2 dn-logistics.service 升 3 接點 |
| Phase 4 | 1 | L3 3 inline helper |
| Phase 5 | 1 | UI workspace 升 + 4 placeholder + menu.nx06.ts |
| Phase 6 | 3 | summary + worklog + merge verify report |

**總計：12 commit / 2 migration / 對齊 NX05 10 commit 範式**

---

## §5 紀律對齊（簡要）

- tsc 0 error per commit
- 對齊 NX05 Q-RHYTHM-2 範式
- 外部 API（Lalamove）純 service shell、HTTP call 環境變數可關
- 熱感印表機純 backend、SDK 對接屬 UI 軌
- 配送成本對外不顯示（DnSEL 不 expose internalCost）

不擅自處理範圍外：
- INTL_SHIPPING（Crown Q5）
- 路線優化 / 動態交接（TASK-NX06-IMPL-02）
- AI 調度 / 報表（NX08 範圍 B）
- features/inventory + sale 殘留（TASK-NX06-DEMO-CLEANUP）

---

## §6 D1~D8 關鍵設計決策（Q-RHYTHM-2 預批）

- D1 拓樸 4 層（L1 schema+service → L2 既有升 → L3 helper → L4 UI）
- D2 2 軌 migration（M1 internalCost + M2 printer/lalamove 5 欄）
- D3 Lalamove 純 service shell（HTTP 環境變數可關）
- D4 熱感印表機純 backend
- D5 配送成本對外不顯示（純 internalCost 欄）
- D6 NX04 SR wire 仿 NX02/NX04 inline helper 範式
- D7 NX03 Parcel 純 export helper 不 wire
- D8 UI 全 stub 對齊 NX05 範式

---

## §7 風險（5 項）

1. Lalamove API webhook 公網需求（純 shell）
2. 熱感印表機 SDK 屬前端（純 backend 觸發）
3. NX04 sales-return.service wire 改既有（小 touch）
4. NX03 Parcel 不 wire（純 export）
5. dn-logistics.service 規模大 797 lines（升 3 接點謹慎）

---

## §8 接續工作（連跑、不送 review）

Plan commit → Phase 1 M1 → 連跑 Phase 6 → Final merge verify → stop 給 Crown + Alex 驗收。

⚠️ 揭露可能不完整、Crown / Alex 想補的直接說。
