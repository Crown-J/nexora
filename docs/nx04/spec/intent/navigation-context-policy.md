<!-- D5 Navigation Context Policy — 意圖版 -->
# D5 — Navigation Context Policy 意圖

> 文件類型：意圖文件（Alex 寫，給 Hank 對照真實前端結構實作）
> 撰寫者：Alex
> 日期：2026-04-25
> 對應計畫：plan v1.1 工作項目 D5、Hank D3 v1 review C-03（navigation policy 4 條原則）
> 狀態：Crown 拍板 OK，交給 Hank 對照真實前端寫具體實作
> 銜接文件：D3 意圖版（schema）、D4 意圖版(translator)、各工作台 spec

---

## ⚠️ 文件性質聲明

這份是**意圖文件**，不是 implementation spec。

它說明：「業務在工作台之間切換時，**資料怎麼從一個工作台傳到另一個**」。
它不說明：React Router 怎麼設、Zustand store 結構、useEffect 寫法、TypeScript discriminated union 細節。

具體實作（state 結構、傳遞機制、清理時機）由 Hank 對照 repo 真實前端結構寫。

---

## 1. 業務目標

5 個工作台不是孤島。業務操作經常**跨工作台連動**：

業務情境：
  業務 A 在 W2 國內銷貨 工作台建了一張 SO，含 1 個明細「Z02 倉調撥」
       ↓
  系統自動建 ST 調撥單
       ↓
  業務 A 想立刻通知倉管「調貨快、客戶在等」
       ↓
  按「跳到倉管調撥工作站」
       ↓
  W6 庫存中心調撥工作台 開啟，畫面**自動 highlight 剛剛那張 ST**
       ↓
  業務 A 看到、跟倉管口頭說一聲、回 W2 繼續

設計目標一句話：**讓業務跨工作台時，相關資料自動帶過去，不用手動找**。

---

## 2. 為什麼需要 navigation policy

### 2.1 沒 policy 會發生什麼

如果每個工作台各自實作「接收跨頁參數」，會遇到：

- **A 工作台**塞到 URL query string、**B 工作台**用 sessionStorage、**C 工作台**用全域 store——前端三種模式並存，新工作台不知道用哪種
- 同一個工作台**進兩次**，第二次不知道是「新進入」還是「從別處跳來」，state 殘留
- 業務從 W2 跳到 W6 後再按返回，W6 的 state 可能殘留下次進入時跳一個莫名其妙的東西
- 跨工作台 payload 結構各自定義，refactor 一個欄位要改 5 個地方

### 2.2 policy 要解決的問題

統一以下 4 件事：
1. **怎麼傳**：跨工作台傳 payload 的機制
2. **怎麼收**：目標工作台收到後怎麼處理
3. **何時清**：payload 用完後何時釋放
4. **怎麼演化**：未來欄位變動時怎麼相容

---

## 3. 4 條核心 Policy

對應 Hank 在 D3 v1 review C-03 提的 4 條原則。

### 3.1 一次性 consume + clear

進入目標工作台後，**第一個 useEffect 立刻 consume payload + clear**。

✅ 正確流程：
  W6 mount
    → useEffect 偵測到 incoming payload
    → 用它 highlight ST-XXX
    → 立刻把 payload 從來源清掉

❌ 錯誤流程：
  W6 mount → useEffect highlight → payload 留在 store
  業務手動再進 W6（左側 nav）→ 又 highlight 同一張 ST（莫名其妙）

**核心精神**：payload 是「一次性即拋」的訊息，不是「持久狀態」。

### 3.2 Context missing 時必須有 fallback

工作台必須能**獨立存活**——沒收到 payload 時也能正常開。

✅ 正確：
  W6 進入時 payload 可能存在，可能不存在
  - 存在 → highlight 對應 ST + 開預設清單
  - 不存在 → 純開預設清單（業務從 nav 直接進）

❌ 錯誤：
  W6 進入時假設一定有 payload
  → 沒收到時崩潰、空白畫面、或卡 loading

**核心精神**：navigation context 是 enhance，不是 require。

### 3.3 Payload 結構：discriminated union + version

跨工作台 payload **必須**有兩個 metadata 欄位：

- **type**（discriminated union）：標明這是什麼類型的 payload
- **version**：標明這個 payload 結構的版本

範例（不是規範格式）：
{
  type: 'highlight-st',
  version: 1,
  data: {
    stId: 'ST_XXX',
    fromWarehouse: 'Z01',
    toWarehouse: 'Z02'
  }
}

**為什麼要這樣**：
- type：未來工作台可能接受多種 payload（「highlight 某張單」「預填某個 form」「filter 到某個狀態」）
- version：未來欄位變動時，舊版 caller 還能跑，新版 caller 走新邏輯

**消費端處理**：
✅ 正確：
  if (payload.type === 'highlight-st' && payload.version === 1) {
    // 用第 1 版邏輯
  } else {
    // 不認識的 type/version，當作沒收到（fallback 走預設）
  }

❌ 錯誤：
  // 假設一定是某 type 某 version，直接讀 .data.stId
  highlightSt(payload.data.stId)

### 3.4 跨工作台範圍 = 同一 user session 內

**不**做：
- 跨 user 傳遞（不同業務之間）
- 跨 device 傳遞（手機跳到桌面）
- 跨 session 傳遞（登出後再登入）

**做**：
- 同一 user 在同一個瀏覽器 tab 內，從 A 工作台跳 B 工作台

實作上意味著：**前端記憶體即可**，不需要寫進 sessionStorage / cookie / 後端。
（如果業務 refresh 頁面，payload 應該清掉——這是合理行為，業務既然 refresh 表示他不是接著上一個動作）

---

## 4. Phase 1 W2-mini 的具體應用

W2-mini 是 Pilot，會踩到 navigation policy 的第一個場景：

W2-mini 業務送出 SO（含 1 個 transfer 明細） 
  → translator 自動建 ST
  → 系統提示「ST-XXX 已建立，要看調撥工作台嗎？」
  → 業務按「看」
  → 跳到 W6 庫存中心調撥工作台
  → W6 自動 highlight ST-XXX、其他 ST 列在後面

這個場景必須在 W2-mini 上線時就能跑通——**Phase 1 W2-mini spec 必須引用本文件**。

---

## 5. 邊界與接口

### 5.1 跨工作台導航的「觸發點」

不一定是按鈕。可能是：
- 按鈕（明確「跳到 X 工作台」）
- toast 訊息附帶 link（「ST-XXX 已建立，看詳情 →」）
- 系統 push notification（未來）

**不論哪種觸發點，都走同一套 payload + 導航機制**。

### 5.2 導航 vs 開新分頁

兩者不同：
- **導航**：在當前 tab 切換工作台（payload 走前端記憶體）
- **開新分頁**：開新 tab（payload 走 URL query string）

**Phase 1 範圍只支援導航**。開新分頁未來再說。

### 5.3 navigation policy 不負責的事

- 路由本身的設計（哪個工作台對應哪個 URL → 路由表負責）
- 工作台內部的 state（→ 工作台自己的 store）
- 跨後端的資料同步（→ 後端 API）
- 權限檢查（→ auth middleware）

---

## 6. 對 Hank 的提示

### 6.1 機制選擇由你工程判斷

可選方案（依複雜度）：
- **(a) 全域 navigation store**（Zustand 等）：所有工作台讀同一個 store
- **(b) URL state**：用 React Router state field
- **(c) Context Provider**：包在 router 上層
- **(d) 其他**

我沒立場推哪個——看你現有前端結構決定。

### 6.2 既有前端可能已有類似機制

如果 `apps/nx-ui/src/` 內既有「跨頁傳資料」的做法，**優先升級既有機制**而不是新建。新建一套會跟既有並存、混亂。

### 6.3 Phase 1 W2-mini 跑得通即可

不需要在 D5 階段把 5 個工作台全部接上。Phase 1 W2-mini 用到「W2 → W6 跳轉」這一條，spec 涵蓋這條就夠。

其他工作台的接入是 Phase 2 範圍。

---

## 7. 開放問題（給 Hank 工程判斷）

### Q1：機制選 a/b/c/d？

由你看既有前端結構決定。

### Q2：payload 一旦 consume 後，回到原工作台會發生什麼？

例：W2 → W6（payload 已 consume）→ 業務按瀏覽器返回回 W2 → W2 還在不在原來狀態？

這牽涉「W2 的 state 怎麼保留」，跟 navigation policy 不直接相關。但要在 W2-mini spec 內處理。

建議：W2 的 state 由 W2 自己管（form state 在 React state、可能 unmount 就清），navigation policy 不負責這個。

### Q3：當前 user 同時開兩個 tab，會干擾嗎？

由於我們只做「同一 tab 內導航」，理論上不會。但要確認：
- payload 在前端記憶體 → 兩個 tab 各自有獨立記憶體 → 不會干擾
- 如果用 sessionStorage（Hank 工程選擇）→ 可能跨 tab 影響

建議：不要用 sessionStorage / localStorage 存 payload，避免跨 tab 干擾。

### Q4：如果業務在 W2-mini 送出 SO 但**不**按「看調撥」，ST 還會建嗎？

**會**。translator 是 transaction-bound，業務按送出 = ST 建立完成（D4 §3.1）。「看調撥」按鈕只是一個導航 shortcut，不影響 ST 建立。

這條請 Hank 在 W2-mini spec 內向業務說明。

---

## 8. 不在這份文件範圍

| 項目 | 對應文件 |
|---|---|
| 路由表本身 | docs/_reference/route-table-v2.md |
| 工作台內部 state | 各工作台 spec |
| Translator 邏輯 | D4 |
| Schema | D3 |
| 跨後端資料同步 | 各 API spec |
| 跨 tab / 跨 device 同步 | 不做（明確排除）|
| 開新分頁 | Phase 1 不做 |

---

## 9. 對 Hank 的交付要求

完成 Phase 1 W2-mini 實作時，**順帶**產出：

- `docs/nx04/spec/intent/navigation-context-policy.md`（本意圖版的對應 impl spec，可能很短）
  - **或**：直接在 W2-mini spec 內處理，本意圖版只當 reference
  - 由你判斷
- 4 條 policy 在 W2-mini → W6 場景的具體實作
- 一個極簡 demo：W2-mini 送 SO → 跳 W6 → highlight ST

驗證標準：
- 4 條 policy 逐條 check
- W2-mini 業務跑「送 SO + 看調撥」流程不卡、不亂

如有業務邏輯疑慮 → 暫停回報 Crown。

---

## 10. 跟 D3/D4 意圖版的關係

這份是**前端視角**意圖文件，跟 D3/D4 是**後端視角**意圖文件互補。

| 文件 | 視角 | 處理什麼 |
|---|---|---|
| D3 | 資料層 | schema、雙帳、補貨單關聯 |
| D4 | 後端 service | 業務送單 → 翻譯成系統動作 |
| **D5** | **前端跨工作台** | **業務跨工作台切換時的資料傳遞** |

三者組合起來，業務從「W2 送單 → 系統建 SO+ST → 跳 W6 看 ST」整條動線完整。

---

## 11. 版本歷史

| 日期 | 版本 | 變動 |
|---|---|---|
| 2026-04-25 | 1.0 | 初版意圖文件，對應 Hank D3 v1 review C-03 提的 4 條原則 |

---

*文件結束*
