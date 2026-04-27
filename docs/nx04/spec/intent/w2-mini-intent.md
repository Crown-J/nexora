<!-- W2-mini 意圖版 -->
# W2-mini — 國內銷貨工作台（雙平台 Pilot）意圖

> 文件類型：意圖文件（Alex 寫，給 Hank 對照真實 codebase 寫具體實作）
> 撰寫者：Alex
> 日期：2026-04-27
> 對應計畫：plan v1.1 工作項目 Phase 1 W2-mini（含 Crown 拍板擴大為「Phase 1 W2 工作台」）
> 銜接文件：D3 / D4 / D5 / B2 / B5 意圖版、Hank 既有 W2 資源盤點 (`_alex-prep_w2-existing-inventory.md`)
> 狀態：待 Crown 拍板 → Hank 寫 impl spec

---

## ⚠️ 文件性質聲明

這份是**意圖文件**，不是 implementation spec。

它說明：「業務在工作台從查庫存到送出訂單的**業務流程**、**雙平台 UX 差異**、**跟後端 API 的接合點**」。
它不說明：React 元件結構、Zustand action 簽章、TypeScript 型別、Tailwind class。

具體實作（元件命名、state 結構、UI 細節）由 Hank 對照盤點清單寫。

---

## ⚠️ 寫意圖版時 Alex 的紀律

W2-mini 範圍大（雙平台、7+3 節點、串 5 個後端 API），閉門造車的失誤風險比之前高。

依升級後的 checklist：
- 寫前先讀 Hank 的盤點清單（已讀）
- 任何「跨檔/跨 service 動作」自我紅旗、明確說依賴哪些既有東西
- 不確定就標 ⚠️、讓 Hank 寫 impl 時 catch

---

## 1. 業務目標

W2-mini 是 NEXORA Phase 1 的 Pilot 工作台——**第一個讓業務真正下單進 DB 的工作台**。

```
真實使用情境（Crown 業界拍板）：

  情境 1：業務在公司辦公室
    - 用桌面電腦下單
    - 鍵盤打字快、需要快捷鍵
    - 一次處理 3~5 筆訂單（多客戶並行）
    - 看資料表格密集（一次看多筆 SO 狀態）
    
  情境 2：業務在外面跑客戶
    - 用手機臨時補一筆訂單
    - 觸控、一次處理一筆
    - 簡單就好（不需要看全部節點）
```

設計目標一句話：**桌面版完整、手機版精簡，但兩者都能真的把訂單送進 DB**。

---

## 2. 兩個平台的範圍差異

### 2.1 桌面版（Primary）

涵蓋 **7 個節點**：

```
查庫存 → 詢價 → 報價 → 銷貨 → 出貨 → 完成 → 跳 W6 看 ST
                                       └→ 跳 W4 看 RFQ/QT（同行詢價工作台）
```

不含（屬完整版才做）：
- 調貨（IT 自倉調撥的詳細處理）
- 銷退
- 保固

### 2.2 手機版（Secondary）

涵蓋 **3 個節點**：

```
查庫存 → 送 SO → 看狀態
```

不含（手機版本不做）：
- 詢價
- 報價（手機版無法走 QT→SO 完整鏈）
- 出貨追蹤
- 完成
- 跳 W6（手機版業務不會跳工作台、那是倉管做的事）

**設計理由**：手機版是「臨時補一筆」場景，業務真實情境下不會在路邊用手機處理詢價。

---

## 3. 桌面版完整流程（7 節點 + 跳轉）

### 3.1 節點 1：查庫存

業務情境：客戶詢價、業務先查料號是否有貨。

- 輸入：partId（搜尋）、warehouseId（選倉）、客戶 ID（後續決定價格用）
- 系統顯示：
  - 物理庫存 / 已承諾 / 可承諾（**串 B2 GET /nx03/stock/summary**）
  - 客戶等級對應價（A/B/C/D 級）
  - 一個月內歷史成交價（提示業務）
- 業務動作：
  - 查到有貨 → 進節點 4 銷貨（直接下單）
  - 查到沒貨或不夠 → 進節點 2 詢價（向同行調貨）

### 3.2 節點 2：詢價

業務情境：本倉沒貨、向同行詢價。

- 業務發起 RFQ（**串 D4 translator** 自動建 RFQ stub）
- 採購接到通知、進採購工作台處理（屬 W4 範疇、不是 W2）
- 業務看到「RFQ 已送出、等採購回」
- 採購採用某 QT 後（W4 做的事、串 B5 `/nx02/qt/:id/adopt`）→ 系統自動建 TI、業務看到狀態變「同行已答應」

### 3.3 節點 3：報價

業務情境：手上 RFQ 已有 QT、要回客戶。

- 顯示對應的 QT 資訊（同行價、可供應數量、交期）
- 業務基於 QT 加毛利、給客戶最終報價
- 業務按「送出報價」→ 建 nx04_quote
- 客戶確認後 → 進節點 4 銷貨

### 3.4 節點 4：銷貨

業務情境：客戶確認報價、業務送 SO。

- 業務 review 5 個 lineItem（每筆有 transferSourceType: self/transfer/inquiry/co）
- 按「送出 SO」→ **串 D4 translator `POST /nx04/so/translate`**
- 系統自動：
  - 建 SO + 5 個 lineItem
  - self：直接 transferStatus = completed
  - transfer：自動建 IT
  - inquiry：自動建 RFQ stub
  - co：自動建 CO
  - committed_stock 雙帳更新
- 業務看到「SO-2604-00061 已建立」

### 3.5 節點 5：出貨

業務情境：補貨完成、追蹤出貨進度。

- 顯示 SO 的出貨狀態（撿貨中 / 包貨中 / 配送中 / 已送達）
- 業務看狀態、必要時打電話催倉管
- **這是純查詢介面、不寫入**

### 3.6 節點 6：完成

業務情境：SO 完整完成（已配送 + 已收款）、進入完成池。

- 顯示本月已完成的 SO 列表
- 提供報表下載 / 查詢

### 3.7 跳轉節點：跳 W6 / 跳 W4

業務情境：業務想看「我送的 SO 對倉管造成什麼影響」、按「看調撥工作台」跳 W6。

- **串 D5 navigation policy**：W2 → W6 跳轉、W6 自動 highlight 剛建的 ST
- 同樣機制：W2 → W4（看同行詢價）、W4 自動 highlight 剛送的 RFQ

---

## 4. 手機版精簡流程（3 節點）

### 4.1 節點 1：查庫存

跟桌面版同概念、但 UI 改觸控優先：
- 大型搜尋框 + 觸控鍵盤
- 一次顯示一個料號的結果（不是表格）
- **串 B2 GET /nx03/stock/summary**

### 4.2 節點 2：送 SO

跟桌面版同概念、但簡化：
- 一張 SO 一次只送 1~2 個 lineItem（不適合多筆）
- transferSourceType 預設 self（手機業務真實情境通常是「就現倉的貨、確認下單」）
- 進階情境（需要調撥 / 詢價）→ 提示業務「回辦公室處理、這個訂單比較複雜」
- **串 D4 translator**

### 4.3 節點 3：看狀態

業務在外面想知道「我剛剛下的 SO 倉管處理到哪了」：
- 顯示業務本人最近 5 筆 SO 的狀態
- 點某筆進詳情（純查詢、不寫入）

---

## 5. 5 個關鍵邏輯

### 5.1 跟既有 sop-demo 並存（Crown Q3 拍板）

- 既有 `/dashboard/sale/sop-demo`：保留、繼續走 client mock（sysC.ts）
- 新 W2-mini 進入 R7 workstation 分區、走真實後端 API（D4/B5/B2）
- 兩條 path 各自獨立、不互相影響

實作上意味著：**sysC.ts 不刪、保留給 sop-demo 用**。W2-mini 內部不引用 sysC.ts。

### 5.2 跟既有 R7 4 分區架構整合（Crown Q-A 拍板）

- W2-mini 進駐 R7 既有 `WorkstationSection.tsx`
- 不新建 hub、不破壞既有 4 分區（status / workstation / documents / customer）
- W2-mini 是 workstation 分區的子畫面 / 子工作台

### 5.3 桌面 vs 手機的程式碼分享策略

兩個版本的業務邏輯**相同**（都是查庫存 → 送 SO → 看狀態），但**互動模式截然不同**：
- 桌面：表格密集、鍵盤快捷鍵、一次多筆
- 手機：觸控、SOP 步驟、一次一筆

實作建議（給 Hank 工程判斷）：
- (a) 兩份完全不同的 component、共享 store + API client
- (b) 一份 component、用 responsive class 切換 layout
- (c) 三層：core logic / desktop UI / mobile UI

**Alex 傾向 (a)**——兩個 UX 太不一樣、強行共用 component 反而難維護。但 Hank 看真實 codebase 慣例決定。

### 5.4 Zustand store 的擴增策略（Hank §5.3 點出）

既有 `useSalesStore` (fulfillment) 跟 `useRFQStore` (inquiry) 的內部 logic 是 client-side mock（用 sysC.ts）。W2-mini 要走真後端、需要把這兩個 store 的「內部假裝建單」邏輯改成「呼 API」。

實作建議（給 Hank 工程判斷）：
- (a) 新建 W2-mini 專用 store（隔離）
- (b) 升級既有 store、加 feature flag 切換 mock vs real
- (c) 既有 store 完全廢棄、重新發明

**Alex 傾向 (b)**——既有 store 結構好、actions 命名也對齊後端、改內部 implementation 即可。

### 5.5 Type='G' 同行調貨的 mental model 對齊（Hank §5.3 ⚠️）

**這是 Hank 揭露的關鍵不一致**：

```
client mock 心智（既有 sysC.ts）：
  業務送 SO with type='G' → store 直接建 TI

後端真相（D4 + B5）：
  業務送 SO with type='G' → D4 建 RFQ stub（無 TI）
  → 採購在 W4 採用某 QT
  → B5 採用 QT 才建 TI
```

W2-mini 必須**對齊後端心智**：
- 業務送 SO 後、type='G' lineItem 的 transferStatus 顯示「等同行回價」
- 不能假裝「TI 已建立」（會詐欺業務）
- 業務按「看 RFQ 進度」跳 W4 / 看採購回價狀態

---

## 6. 邊界與接口

### 6.1 W2-mini 串的 5 個後端 API

| API | 用途 | 對應節點 |
|---|---|---|
| `GET /nx03/stock/summary` (B2) | 查庫存總覽 | 節點 1 |
| `GET /nx03/stock/reservations` (B2) | 反查 reserved 來源（進階）| 節點 1 點開「展開」|
| `POST /nx04/so/translate` (D4) | 送 SO + 自動建 IT/RFQ/CO | 節點 4 |
| `GET /nx02/rfq/list-for-purchase` (B5) | 查 RFQ list（業務看自己的）| 節點 2 |
| `POST /nx02/rfq/:id/cancel` (B5) | 取消 RFQ | 節點 2 |

W2-mini **不直接**呼叫的 API（屬 W4 採購工作台範圍）：
- `POST /nx02/qt`（採購輸入同行報價）
- `POST /nx02/qt/:id/adopt`（採購採用 QT）
- `POST /nx02/qt/:id/reject`

業務在 W2-mini 看到的「同行已答應」狀態 = 採購在 W4 操作的結果、透過 SO line item.transferStatus 反映。

### 6.2 跟 D5 navigation policy 對齊

W2-mini 跨工作台跳轉嚴格遵守 D5 4 條原則（D5 §3）：
- 一次性 consume + clear（跳 W6 後、payload 立刻清）
- Context missing 時 fallback（W6 沒收到 payload 也能正常開）
- discriminated union + version
- 同一 user session 內

W2-mini 是 D5 第一個真實使用場景、實作完成 = D5 也驗證完成。

### 6.3 W2-mini 不負責的事

- 同行詢價詳細處理（屬 W4 採購工作台、Phase 2）
- 倉管撿貨/包貨/送貨（屬庫存中心 W6）
- 客戶主檔管理（屬 R7 的 customer 分區）
- 報表（屬 NX08）
- 銷退 / 保固 / 調撥詳情（屬 W2 完整版、Phase 2）

---

## 7. 業務拍板紀錄

| 議題 | 拍板結果 | 對應章節 |
|---|---|---|
| W2-mini 路由位置 | A：掛在既有銷售中心 workstation 分區 | §5.2 |
| sysC.ts client mock 處置 | b：並存（sop-demo 留 mock、W2-mini 走真 API）| §5.1 |
| 桌面 vs 手機 UX 差異 | 桌面為主完整 7 節點、手機為輔簡化 3 節點 | §2 §3 §4 |

---

## 8. 開放問題（給 Hank 工程判斷）

### Q1：桌面版 vs 手機版程式碼分享策略

詳見 §5.3 三選項。Alex 傾向 (a) 兩份獨立 component。

### Q2：Zustand store 擴增策略

詳見 §5.4 三選項。Alex 傾向 (b) 升級既有 store。

### Q3：feature flag 機制

W2-mini 走真 API、sop-demo 走 client mock，兩者切換用什麼機制？
- (a) URL query param（?mock=1）
- (b) 環境變數（NEXT_PUBLIC_USE_MOCK）
- (c) 路由本身分流（路徑就決定走哪個）

由 Hank 看既有慣例決定。

### Q4：跳 W6 / 跳 W4 的觸發點

W2-mini 內哪些畫面可以「按按鈕跳到別的工作台」？
- 節點 4「送 SO 完成」後的提示「要看調撥工作台嗎」？
- 節點 5「出貨追蹤」內單筆 SO 的「看調撥詳情」按鈕？
- 其他？

由 Hank 看 UX 決定、Alex 不立場。

### Q5：手機版「複雜訂單」的 fallback 文案

§4.2 寫「進階情境提示業務回辦公室處理」。具體要顯示什麼？
- (a)「這個訂單需要詢價，建議回辦公室處理」+ 直接擋
- (b)「這個訂單需要詢價，要繼續嗎？」+ 業務確認後仍可送
- (c) 其他

由 Hank 看 UX 決定。

### Q6：Demo 數據要不要等 TASK-SEED-DEMO-02 落地？

W2-mini 開發時會需要真實 mock 數據。等 DEMO-02 落地（1~2 天）才開始、還是先用既有三租戶 fixture 開始？

由 Hank 評估。

---

## 9. 不在這份文件範圍

| 項目 | 對應文件 |
|---|---|
| 後端 API 細節 | D4 / B5 / B2 spec |
| Schema | D3 / B5-A schema patch |
| Translator 邏輯 | D4 |
| RFQ/QT lifecycle | B5 |
| Reverse lookup | B2 |
| 跨工作台導航 | D5 |
| Demo 數據 | TASK-SEED-DEMO-02 |
| W4 採購工作台 | Phase 2 |
| W6 庫存中心調撥工作台 | 既有 R7 庫存中心 |
| W2 完整版（含調貨/銷退/保固）| Phase 2 W2 完整版 |

---

## 10. 對 Hank 的交付要求

完成 W2-mini 實作時請產出：

- `docs/nx04/spec/impl/w2-mini-impl_workstation.md`（實作 spec、含元件結構、store 升級、API 串接）
- 桌面版 W2-mini 元件（位置由你判斷、可能 `apps/nx-ui/src/features/sale/ui/hub/sections/workstation/`）
- 手機版 W2-mini 元件（位置由你判斷）
- store 升級（既有 useSalesStore + useRFQStore 改走真 API）
- 對應的單元測試 + e2e 測試（至少：
  - 桌面版：7 節點各 1 案 = 7 案
  - 手機版：3 節點各 1 案 = 3 案
  - 跨工作台跳轉（D5）1 案
  - 並存 sop-demo 不互相影響 1 案
  - 共 12 案以上）
- 確認本意圖文件 5 條核心邏輯全部滿足

如有業務邏輯疑慮 → 暫停回報 Crown
如有意圖版偏離既有 codebase → 立刻 catch 回報 Alex（過去做得很好、繼續）

---

## 11. 對 Hank 的提示

### 11.1 元件位置

依 Crown Q-A 拍板「掛 R7 workstation」：
- 桌面版：可能掛在 `apps/nx-ui/src/features/sale/ui/hub/sections/WorkstationSection.tsx` 內或子資料夾
- 手機版：同上（R7 hub 已有 mobile 對應）

具體位置由你看真實 codebase 決定。

### 11.2 重用既有資源（盤點清單已列）

- R7 4 分區架構：`features/sale/ui/hub/`
- Module hub primitives：`features/layout/ui/module-hub/`
- Sales fulfillment store：`features/sale/ui/fulfillment/store.ts`
- RFQ inquiry store：`features/sale/ui/inquiry/store.ts`
- Doc number helper：`features/sale/ui/fulfillment/numbering.ts`

### 11.3 sysC.ts 處置

不刪、不改。保留給 sop-demo 用。
W2-mini 內部完全不引用 sysC.ts、所有 SYS-C 邏輯走後端 D4 translator。

### 11.4 type='G' 心智對齊（最重要）

§5.5 描述的不一致是 W2-mini 最關鍵的設計重點。實作時：
- store 內部不假裝 type='G' 直接建 TI
- 業務送 SO with type='G' 後、UI 顯示「等同行回價」（reading from B2 反查 + RFQ 狀態）
- 等採購在 W4 採用 QT、後端建 TI、W2-mini 透過 polling/refresh 看到 TI 已建立

### 11.5 開發節奏建議

範圍大、建議拆 sub-phase：

```
Phase 1A（~1 週）：桌面版骨架
  - R7 workstation 分區進駐
  - 節點 1 查庫存（串 B2）
  - 節點 4 送 SO（串 D4 translator）
  - 節點 5 出貨追蹤（純讀）
  
Phase 1B（~1 週）：桌面版完整節點
  - 節點 2 詢價、節點 3 報價、節點 6 完成
  - 跳轉 W6 / W4（串 D5）
  
Phase 1C（~1 週）：手機版精簡
  - 3 節點、簡化 UX
  - 共用桌面版的 store + API client
  
Phase 1D（~1 週）：整合測試 + Crown 5~10 次親測
  - 修親測發現的 bug
  - 達到 Q4 完成標準
```

---

## 12. 跟其他文件的關係

| 文件 | 關係 |
|---|---|
| D3 意圖版 v1.1 | 雙帳設計、SO line item transferStatus |
| D4 意圖版 | translator 內部邏輯 |
| D5 意圖版 | navigation policy（W2 → W6 / W4 跳轉）|
| B5 意圖版 v2 | RFQ/QT lifecycle |
| B2 意圖版 v1.1 | 庫存反查 |
| Hank 既有 W2 資源盤點 | W2-mini 實作的對照基準 |
| TASK-SEED-DEMO-02 spec | demo 數據（W2-mini 開發 + 親測用）|
| Phase 2 W2 完整版 spec（未寫）| W2-mini 是 Pilot、完整版是後續 |

---

## 13. 版本歷史

| 日期 | 版本 | 變動 |
|---|---|---|
| 2026-04-27 | 1.0 | 初版意圖文件，含 Crown 對 3 個架構題拍板（路由 A / sysC b / 雙平台範圍）|

---

*文件結束*
