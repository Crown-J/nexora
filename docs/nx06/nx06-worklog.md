<!-- docs/nx06/nx06-worklog.md -->

# NEXORA - NX06 - 物流模組工作日誌

> 撰寫者：Hank
> 涵蓋範圍：NX06 物流管理（delivery / pickup / intl-shipping / return-pickup + dn-logistics service helper）+ NX06 主導的跨模組接收側（NX04 → NX06 自動建單）
> 起算點：v7_baseline migration（2026-04-13）之後
> 對應分支：歷史在 `feature/sys-dashboard` → merge 進 `main`

---

## 結構說明

- 按主題（不按時間順序）累加 3 個主題、給 Alex 跨對話讀的考古手冊
- 每個主題下：起源 / 設計決策 / 實作歷程 / 踩坑 / 對應文件 五段式
- ⚠️ **NX06 是「穩定模組真誠揭露」第二例**（沿用 NX05 範式、Phase5 落地後即穩定）
- **跨模組或公版主題不寫進本日誌**、寫進 [_shared/worklog.md](../_shared/worklog.md)（過帳通用規則 / 公版 component / TASK-BUSINESS-RESTRUCTURE 大塊 2 Phase 7「跨中心連動 SO→PK→BX→DN」/ A002 drift）

---

## 主題 1｜v7_baseline + Phase5-NX06 第七批 API 落地（混合架構：4 controller + 1 service helper）

### 起源

`spec_v7_baseline` 建好 NX06 schema（dn 主表 + items / pickup / intl-shipping / return-pickup）。Phase5「第七批 API」按序填模組（... → NX05 → **NX06**）。

> ⚠️ **NX06 沒有 spec 目錄**（跟 NX05 同模式）：`docs/nx06/spec/intent/` + `workflow/primary/` 都不存在、只有 `reference/` + `ui/` + `workflow/sub/`。
>
> ⚠️ **業務真相來源不確定**：推估 0416 落地（依 migration 名 `20260416120000_nx06_dn_logistics_status_gps_intl`），但 [dailylog/20260416.md](../../dailylog/) **不存在**。最可靠來源是 SYS-DASH-P5 大批 commit `c210ce2`（0413 一次到位 NX01-NX10 backend）— Alex 寫 NX06 規格書要從 git log + dn-logistics.service.ts 原始碼挖、不是從 spec/intent/ 找。

### 設計決策（核心：混合架構為什麼這樣切）

#### 4 子模組 controller + 1 cross-cutting service helper

```
apps/nx-api/src/nx06/
├── nx06.module.ts
├── dn-logistics.service.ts    ⭐ cross-cutting service helper（不是子模組）
├── dto/
│   └── nx06-signature.dto.ts  ← 4 子模組共用簽收 DTO
├── delivery/                   ← 國內送貨
│   ├── delivery.controller.ts
│   └── delivery.dto.ts
├── pickup/                     ← 自取
├── intl-shipping/              ← 國際運送
└── return-pickup/              ← 退貨取貨
```

**為什麼 dn-logistics 抽成 service helper、不獨立成 controller**：

1. **4 子模組共用「DN 主表」**：delivery / pickup / intl-shipping / return-pickup 在 DB 是同一張 `nx06_dn` + `nx06_dn_item` + `nx06_dn_logistics_kind` 區分、不是 4 張獨立表
2. **業務動作有共用邏輯**：state transition / docNo 配發 / GPS 軌跡寫入 / 跨子模組查詢都重複
3. **如果各自寫 service 會大量複製**：第一版各 controller 自己 inject `PrismaService`、各自寫 transition 邏輯、3 處 bug fix 要改 3 次
4. **抽出 dn-logistics service 統一 import**：`dn-logistics.service.ts` import 4 個子模組 DTO + 統一處理 transition / docNo / GPS、4 個 controller 只剩薄殼層

**這是 NX06 跟其他模組（NX02/03/04/05）結構差異點**：其他模組每個子模組都有自己 service、NX06 有一個 cross-cutting service helper 跨 4 子模組。

#### 共用 utils（4 個、跟 NX05 9 個對比、NX06 偏少）

| Util | 用途 |
|------|------|
| `nx06-create-delivery-from-so.ts` | 接收側建單（見主題 2） |
| `nx06-doc-no.ts` | DN- 前綴單號（4 子模組共用一個 sequence） |
| `nx06-list-query.dto.ts` | 列表分頁 |
| `nx06-state-machine.ts` | DN 狀態 + LogisticsKind enum（CREATED/SHIPPED/DELIVERED/RETURNED 等）|

#### nx06-signature.dto.ts（電子簽收）

電子簽收 DTO 抽出獨立、4 子模組都用：
- `signerType`（單字元、收件人類型 C/B/V 等）
- `signerName`（簽名人姓名、≤ 50 字）
- `signatureUrl`（簽名圖 URL、可選）
- `stopId`（停靠站 ID、多點配送用）

### 實作歷程

- 2026-04-13 `c210ce2` | SYS-DASH-P5 complete all backend API modules NX01-NX10（NX06 含在內、無獨立 commit）
- 2026-04-16（migration）`20260416120000_nx06_dn_logistics_status_gps_intl` | DN status + GPS + intl-shipping schema baseline drift fix
- 之後再無單獨 NX06 backend commit

### 踩坑 / 學到的

- **「4 子模組共用同一 DB 表」是業務本質**、不是設計選擇。物流業務的 DN（delivery note）天然包含「我送 / 客戶取 / 國際 / 退貨取」4 種類型、不應拆 4 張表（會破壞跨類型查詢）。教訓：**schema 拆表前先看業務本質、不要 OOP 思維「不同類型 = 不同表」**。
- **cross-cutting service 是合法的反 1-controller-1-service**：常規 NestJS 模式是 controller-service 一對一、NX06 是「4 controller 共用 1 service helper」、第一次寫時擔心違反 convention、Crown 看了同意「**convention 是工具、不是教條**」。
- **0416 dailylog 不存在是工作日誌斷層**：之後遇到「某天的工作只能從 git log 推估」的情況、應在 worklog 起源段明確標 ⚠️ 給 Alex 知道從哪挖。沿用 NX05 主題 1 同模式。

### Migration 列表（NX06 直接相關）

| Migration | 性質 |
|-----------|------|
| `20260413120000_spec_v7_baseline` | NX06 schema 建立（dn / dn_item / dn_logistics_kind / pickup / intl-shipping / return-pickup） |
| `20260416120000_nx06_dn_logistics_status_gps_intl` | DN status enum + GPS 欄位（lat/lng/at）+ intl-shipping baseline drift fix |

### 對應文件

- 後端：[apps/nx-api/src/nx06/](../../apps/nx-api/src/nx06/) + [shared/nx06/](../../apps/nx-api/src/shared/nx06/)
- 業務真相來源：[dailylog/20260415.md](../../dailylog/20260415.md) 部分提及 + git log SYS-DASH-P5 commit
- ⚠️ Alex 寫 NX06 規格書建議從 `dn-logistics.service.ts` 原始碼 + state-machine 反推

---

## 主題 2｜跨模組接收側：NX04 → NX06 自動建單（沿用 NX05 範式、第二次套用）

> ⚠️ 本主題沿用 [NX05 主題 2](../nx05/worklog.md#主題-2跨模組業務鏈nx02--nx04--nx05-自動建單) 「接收側設計」範式。**第二次套用、確認範式可重複**。差異點：NX05 接 PO/SO、NX06 只接 SO（採購不直接觸發物流）。

### 起源

業務鏈：銷貨出貨（SO SHIPPED）→ **應該自動產生 DN（送貨單）** 給物流。問題：自動建單邏輯放哪？跟 NX05 同樣 3 方案對焦：

| 方案 | 做法 | 取捨 |
|------|------|------|
| **i** ⭐ | NX06 主導、提供 `create-delivery-from-so` helper、NX04 SO SHIPPED 時呼叫 | 沿用 NX05 範式：物流模組對 DN 100% 控制、NX04 不需懂物流細節 |
| ii | NX04 主導、SO service 內嵌物流邏輯 | 散落、改物流邏輯要動 NX04 |
| iii | trigger 自動建單 | 跨表 trigger 太複雜 |

選方案 i：**「自動建單在接收側 NX06、業務模組只發訊號」**（跟 NX05 完全一樣）。

### 設計決策（沿用範式 + NX06 特殊點）

1. **`create-delivery-from-so.ts`（NX04 觸發）**：SO `SHIPPED` 在 transaction 內呼叫此 helper、依 SO header（地址 / 客戶 / 配送方式）建 DN 主帳 + DN item N 筆。DN 編號 NX06 自己決定（DN- 前綴）。
2. **跟 NX05 對稱結構**：API signature / state machine / error handling 全跟 `nx05-create-ar-from-so.ts` 對稱、未來若有 NX08 報表類似業務鏈也走同樣模板。
3. **NX06 特殊點：依 customer 配送方式選 LogisticsKind**：
   - 客戶要求「自取」→ 建 pickup（不是 delivery）
   - 客戶在國外 → 建 intl-shipping（不是 delivery）
   - 預設 → 建 delivery
   - 這個「依 SO header 推 LogisticsKind」邏輯在 helper 內、NX04 不需要知道

### 跨模組業務鏈表

| 業務動作 | 觸發模組 | 接收側 | 接收側 helper | 過帳結果 |
|---------|---------|--------|--------------|---------|
| SO SHIPPED | NX04 | NX06 | `create-delivery-from-so` | 依 customer 配送方式建 DN（delivery / pickup / intl-shipping）|
| SR POSTED | NX04 | NX06 | （未實作）| ⚠️ return-pickup 自動建單缺口（demo→prod 接面）|

### 實作歷程

- 2026-04-13 `feature/sys-dashboard` | `nx06-create-delivery-from-so.ts` + NX04 so.service 內呼叫點

### 踩坑 / 學到的

- **「接收側設計」第二次套用驗證範式**：NX05 寫的時候是設計決策、NX06 寫的時候直接套用、沒重新對焦 — 確認**範式可重複**、不只是 NX05 個案。教訓：**重複套用範式時要在 worklog 顯式聲明「沿用」、避免 Alex 以為這是 NX06 獨立發明**。
- **「依 SO header 推 LogisticsKind」是封裝勝利**：NX04 SO service 不需要 if-else 判斷物流類型、helper 內部處理。NX04 只發訊號（`createDeliveryFromSo(tx, soId, actor)`）、helper 自己決定建哪種 DN。教訓：**接收側設計的關鍵收益是「業務模組免懂接收側細節」**。
- **作廢對稱缺口跟 NX05 同**：第一版做 `create-delivery-from-so` 沒做 `void-delivery-from-so-cancel`、SO 取消後 DN 還活。**這跟 NX05 主題 2「create 沒對應 void」是同類缺口**、之後寫 _shared 時應統合「接收側設計的 5 個必備配對」（create/void/sync/lock/audit）。

### 對應文件

- 共用 helper：[apps/nx-api/src/shared/nx06/nx06-create-delivery-from-so.ts](../../apps/nx-api/src/shared/nx06/nx06-create-delivery-from-so.ts)
- 範式來源：[NX05 主題 2](../nx05/worklog.md#主題-2跨模組業務鏈nx02--nx04--nx05-自動建單)（第一次定義「接收側設計」範式）
- 跨模組關聯：[NX04 主題 1](../nx04/worklog.md)（SO SHIPPED 過帳同步呼叫 create-delivery）

---

## 主題 3｜DN logistics + GPS + intl-shipping + 電子簽收（NX06 物流獨有功能）

> Alex 觀察建議：4 個功能用 3A/3B/3C/3D 子段落組織（單主題內子段落、不是拆小節）。

### 起源

NX06 不只「建 DN」、還要支援物流業務 4 個獨有功能：DN 狀態機 / GPS 軌跡 / 國際運送 / 電子簽收。其他模組沒有這 4 種需求 — 這 4 個功能是 NX06 的差異化。

### 3A. DN 狀態機（dn-logistics service）

```
DN 狀態流：
CREATED → SHIPPED → DELIVERED ✓
                 → RETURNED   ← 客戶拒收 / 收件人不在
CANCELLED ← 任意狀態（過帳前）
```

設計重點：
- `nx06-state-machine.ts` 定義 `assertDnStatusTransition` + `LogisticsKind` enum
- 狀態變動寫 `nx01_audit_log`（moduleCode: NX06）
- DN 過帳本身不寫 stock_ledger（庫存已在 SO SHIPPED 時扣完、DN 是物流追蹤層、不重複扣帳）

⚠️ **這跟 NX02/NX03 過帳模式不同**：NX02 RR / NX03 inbound/outbound 過帳會寫 ledger、NX06 DN 只追蹤物流狀態、不動庫存。要避免新人誤以為「DN SHIPPED 要扣帳」。

### 3B. GPS 軌跡欄位

migration `20260416120000_nx06_dn_logistics_status_gps_intl` 加：
- `dn.gps_lat`（DECIMAL）
- `dn.gps_lng`（DECIMAL）
- `dn.gps_at`（TIMESTAMP）

設計考量：
- **單點而非軌跡陣列**：欄位是「最新位置 + 時間戳」、不是「歷史軌跡 JSON」。理由：90% 業務只需要「現在在哪」、歷史軌跡靠 audit log 反推、不需主表存 array
- **手動寫入 + 第三方 webhook 都可用**：`PATCH /nx06/delivery/:id/location` endpoint 接收 GPS update、來源可以是司機 APP / 第三方物流商 webhook
- ⚠️ **缺口**：前端沒地圖 component 顯示 GPS、目前只是 schema 有欄位（demo→prod 接面缺口）

### 3C. intl-shipping 國際運送

獨立子模組（不併入 delivery）：
- 報關欄位（commercial invoice / packing list / 出口報單號）
- 提單欄位（B/L number / shipping line）
- 國際物流商（DHL / FedEx / 海運代理）

⚠️ **缺口**：intl-shipping **業務 spec 沒寫**（`docs/nx06/spec/` 不存在）、controller 是 skeleton、業務邏輯（報關時序 / 提單核對 / 國際物流商選擇）都還沒設計。schema 缺漏型缺口、需 Alex 寫 spec 後補 schema migration。

### 3D. 電子簽收（nx06-signature.dto.ts）

簽收欄位：
- `signerType`（單字元、收件人類型）
- `signerName`（簽名人姓名）
- `signatureUrl`（簽名圖 URL、base64 上 S3 後存 URL）
- `stopId`（停靠站 ID、多點配送用）

設計考量：
- **簽名圖存 URL 不存 base64**：S3 / Cloudflare R2 上傳後存 URL、避免 DB 大欄位
- **多點配送**：一張 DN 可能含多個 stop（送一車去 5 個客戶）、每個 stop 各自簽收
- 法律意義：電子簽章對齊台灣《電子簽章法》、簽收時間戳是法律憑證

### 實作歷程

- 2026-04-16（migration）`20260416120000_nx06_dn_logistics_status_gps_intl` | DN status + GPS + intl-shipping schema 一次到位
- 2026-04-13 `feature/sys-dashboard` SYS-DASH-P5 commit | dn-logistics.service.ts + signature.dto.ts + intl-shipping controller skeleton

### 踩坑 / 學到的

- **「DN 不重複扣帳」是物流模組教學重點**：第一版我以為 SO SHIPPED 跟 DN SHIPPED 都要扣帳、結果跑出來庫存被扣兩次。教訓：**過帳設計要對齊業務本質**（沿用 NX05 主題 3 教訓、不能跨模組複製貼上）。SO 是商業承諾（扣帳）、DN 是物流追蹤（不扣帳）、語意不同。
- **GPS 單點 vs 軌跡陣列的取捨對齊「90% 場景優先」**：選 schema 設計時、用 80/20 思考「最常用的查詢需求」、不為 10% 的軌跡查詢拖累 90% 的位置查詢。教訓：**schema 取捨看 query pattern、不看欄位完整性**。
- **電子簽章法律意義要在 worklog 寫清楚**：簽名圖 + 時間戳是法律憑證、未來客戶上稽核 / 法務時、Hank 看 worklog 就知道「為什麼這欄位是 NOT NULL」。教訓：**法規驅動的欄位設計要在 worklog 揭露法規來源**。

### 對應文件

- service：[apps/nx-api/src/nx06/dn-logistics.service.ts](../../apps/nx-api/src/nx06/dn-logistics.service.ts)
- DTO：[apps/nx-api/src/nx06/dto/nx06-signature.dto.ts](../../apps/nx-api/src/nx06/dto/nx06-signature.dto.ts)
- 跨模組關聯：[NX05 主題 3](../nx05/worklog.md)（過帳設計對齊業務本質、本主題 3A 同精神）

---

## 揭露的設計缺口（NX06 全部 3 個、按處理路徑分性質）

| # | 缺口 | 性質 | 處理路徑 |
|---|------|------|---------|
| 1 | 大塊 2 PK→BX→DN 連動仍 demo（前端 Zustand mock、後端 helper 沒對接）| **demo→prod 接面缺口** | W4 銷貨工作台真實落地時 wire up |
| 2 | intl-shipping 業務 spec 沒寫（controller 是 skeleton）| **schema 缺漏 / spec 缺漏** | Alex 寫 NX06 國際運送規格書 → 補 schema migration |
| 3 | GPS 軌跡欄位有但前端沒地圖 component | **demo→prod 接面缺口** | 前端 W4 / W6 工作台落地時加地圖 component |

額外（跨主題）：
- 4. ⚠️ **return-pickup 自動建單未實作**（主題 2 對稱缺口）：SR POSTED 應自動建 return-pickup 取貨單、目前手動 — **業務鏈缺口**（沿用 NX05 SR allowance 缺口同類）

---

## 給未來新對話 Hank 的提示

- 本日誌沿用 [NX01](../nx01/worklog.md) ~ [NX05](../nx05/worklog.md) worklog 五段式結構
- ⚠️ **「穩定模組真誠揭露」第二次套用驗證**（NX05 第一例、NX06 第二例）：之後 NX07~NX10 若工作量真的小、可繼續沿用此範式、worklog 大小反映真實工作量、不為對稱湊字數
- ⚠️ **「揭露缺口分性質」新範式**（本日誌建立、Crown 拍板）：
  | 性質 | 範例 | 處理路徑 |
  |------|------|---------|
  | **業務鏈缺口** | NX05 SR allowance / NX06 return-pickup 自動建單 | Alex 規格書補設計 |
  | **demo→prod 接面缺口** | NX06 大塊 2 PK→BX→DN 連動 / GPS 前端 | 真實工作台落地時 wire up |
  | **schema 缺漏 / spec 缺漏** | NX06 intl-shipping | 補 spec 或 schema migration |
  | **規範不一致** | A021 角色細分方向 | 進架構債、春酒後處理 |
  寫缺口時要分類清楚、給 Alex 知道「該怎麼處理 / 誰處理」。
- **「接收側設計」範式第二次套用**（NX05 → NX06）：之後 NX08 報表 / NX07 人資若有跨模組接收業務鏈、可繼續沿用、不需重新對焦
- **混合架構**（4 controller + 1 cross-cutting service helper）是 NX06 獨有結構、其他模組沒這個 pattern、之後若遇到「N 個子模組共用同一 DB 表」可參考 NX06 切法
- 跨模組或公版（過帳通用規則 / 公版 component / BUSINESS-RESTRUCTURE 大塊 2 / A002 / 接收側設計的 5 個必備配對 / 跨模組測試基礎設施演進）**不寫進本日誌**、之後寫 `_shared/worklog.md` 統合
- 下一輪預期：[docs/nx07/worklog.md](../nx07/worklog.md)（NX07 人資模組、Phase5-NX07 + 出勤/排班/薪資/績效、預期工作量視 PRO 業務複雜度而定、可能小可能中）

---

> 文件版本：v1.0（初版、3 主題、~4500 字、穩定模組真誠揭露第二例）
> 下次更新觸發：return-pickup 自動建單補上 / intl-shipping 業務 spec 寫完 / GPS 前端地圖落地 / NX06 出現新工作（先 audit 性質）
