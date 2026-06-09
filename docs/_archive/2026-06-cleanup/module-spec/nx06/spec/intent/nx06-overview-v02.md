<!-- docs/nx06/spec/intent/nx06-overview.md -->

# NX06 物流配送 — 業務需求 Overview（v0.2.0）

> 性質：業務需求文件（給 Hank impl 對齊用）
> 撰寫者：Alex（NEXORA 專案 PM AI）
> 拍板者：Crown（NEXORA 創辦人）
> 日期：2026-05-18
> 對應拍板：Crown 跨 5 輪需求討論共 18 題拍板 closure
> 依賴揭露：NX06-AUDIT-01 + NX06-AUDIT-02 完成（schema + 技術選型 verify ✓）
> 戰略定位：NEXORA 業務模組第一階段最後拼圖 + **亞羅核心競爭力（送貨快速）**
> 變更：v0.1.0 → v0.2.0 整合 IMPL-02 路線優化技術選型

---

## §0 文件性質

兩軌實作（拍板）：
- **TASK-NX06-IMPL-01**：物流基礎（已 closure、v0.8.0-nx06-closure ✓）
- **TASK-NX06-IMPL-02**：路線優化 + 動態交接（亞羅核心競爭力 ⭐⭐⭐）

本軌已 closure 部分（v0.1.0 範圍）已落地、本 v0.2.0 重點為 IMPL-02 範圍。

---

## §1 NX06 業務本質（v0.1.0 保留）

### 1.1 戰略意義
NX06 = 亞羅倉管組長的工作台 + 外務員的 PWA App、**送貨快速 = 市場差異化**。

### 1.2 跨模組接點（v0.1.0 已落地）
- NX04 SO SHIPPED → DN ✓
- NX04 SR R/D → RETURN_PICKUP ✓
- NX03 Parcel → DnItem（pure export）
- NX05 Paylog EX（pure export）

---

## §2 主使用者與權限（v0.1.0 保留）

- **WAREHOUSE 倉管組長**：配單、路線優化、動態交接拍板、異常處理 ⭐
- **WAREHOUSE 外務員**：收任務、執行配送、現場簽收、動態交接接受
- role_view 彈性權限

---

## §3 TASK-NX06-IMPL-01 範圍（已 closure）

對齊既有 docs/nx06/spec/impl/nx06-impl-01-plan.md：
- 10 業務功能全 closure ✓
- Lalamove + 熱感印表機 mock 框架（封測二階實測）
- 8 commit / 2 migration / v0.8.0-nx06-closure tag

---

## §4 TASK-NX06-IMPL-02 範圍 ⭐⭐⭐（本 v0.2.0 重點）

### 4.1 業務功能

| # | 功能 | 範圍 | 技術選型 |
|---|---|---|---|
| 1 | 路線優化（單車）| 一個外務員 N 任務最短路徑 | Google Maps Distance Matrix API |
| 2 | **路線優化（多車調度）** ⭐ | 倉管組長一次分派 N 任務 M 外務員 | OR-Tools VRP（亞羅 100 張/日 必備）|
| 3 | **動態任務轉派（亞羅核心競爭力）** ⭐⭐⭐ | 業界改革 | 亞羅簡化版（半徑 + 任務量平衡 + ETA、半自動倉管組長拍板）|
| 4 | 外務員 App | 收任務 + GPS + 簽收 + 動態交接 | PWA（Next.js + next-pwa）|
| 5 | 倉管組長地圖視圖 | 地圖 + 待派任務 + 動態交接建議 | dashboard polling 10s |
| 6 | 推播服務 | 任務分派 + 動態交接通知 | Web Push API + Email fallback |
| 7 | GPS realtime sync | 外務員位置上傳 + dashboard 顯示 | driver POST 30s + dashboard polling 10s |

### 4.2 路線優化技術選型（Crown Q1=100/日 拍板）

**Google Maps Distance Matrix API + OR-Tools VRP**：
- 單車場景：Google Maps Distance Matrix（簡單最短路徑）
- 多車場景：OR-Tools VRP solver（亞羅 100 張/日 必備）
- 業界中小 ERP 標準範式

⚠️ Crown 揭露：亞羅日均 DN 量 100 張、落在 30~100 邊界上：
- 多外務員調度（不只單車）
- 簡化版 VRP（限制 ≤ 5 外務員、≤ 100 任務、計算時間 ≤ 30 秒）
- 後續軌可升級完整 VRP solver

### 4.3 動態任務轉派（亞羅簡化版）⭐⭐⭐

業界稱「Crowdsourced Routing」或「騎手交接」：

**場景**：
```
外務 A 在 X 店家附近、B 從店裡出發要送 X + Y
   ↓ 系統算「機會匹配」
建議：B 在 Z 路口交 X 給 A、B 直接跑 Y
   ↓ 倉管組長一鍵分派（半自動）
推播通知：
   A：「接 B 在 Z 路口、收 X 貨物」
   B：「在 Z 路口交貨給 A、然後直接跑 Y」
   ↓ GPS 追蹤交接完成
更新 DN 任務歸屬
```

**亞羅簡化版**（封測一階）：
- 半自動：倉管組長拍板（不全自動 AI）
- 演算法：半徑判斷（X km 內）+ 任務量平衡（N 任務 vs M 任務）+ ETA 預估
- 業界對標：Uber Eats / DoorDash / Lalamove 簡化
- NEXORA 中小汽配 ERP 業界第一個 ⭐⭐⭐

### 4.4 外務員 App 範式（Crown Q2=c 混合）

**PWA（Progressive Web App）**：
- 既有 Next.js + next-pwa（開發 2~3 週）
- 不需開原生 App、降低成本
- Service Worker 支援離線 + push

**iOS + Android 混合（Crown Q2=c）**：
- **Android 全支援** Web Push（PWA 完整功能）
- **iOS 16.4+ 支援** PWA Web Push（2023 年才開放）
- **iOS 15 及以下**：Email fallback（外務員手機老的）

### 4.5 推播服務（Crown Q3=a 不做客戶推播）

- **Web Push API**（PWA 原生支援、Android + iOS 16.4+）
- **Email fallback**（iOS 舊版）
- **客戶端推播**：本軌不做（範圍 B 後續軌候選）

### 4.6 dashboard 即時性（Crown Q4=a polling）

- **polling 10 秒**：簡單、伺服器負擔小
- SSE Server-Sent Events 列後續軌升級

### 4.7 GPS realtime sync

- **driver 30 秒 POST 上傳**：外務員 PWA 背景定時送
- **dashboard 10 秒 polling**：倉管組長地圖視圖
- schema：既有 NX06 Dn.lastLat/Lng/locationAt 單點（不動）

---

## §5 跨模組接點（v0.2.0 升級）

### 5.1 外部 API 整合

| API | 用途 | 範圍 |
|---|---|---|
| **Google Maps Distance Matrix** | 路線優化 + ETA 預估 | IMPL-02 ⭐ |
| **OR-Tools VRP solver** | 多車調度（local lib）| IMPL-02 ⭐ |
| **Web Push API** | 任務分派 + 動態交接通知 | IMPL-02 ⭐ |
| Lalamove API（mock）| 物流外包 | IMPL-01 mock、封測二階 wire |

### 5.2 NEXORA 內接點

- NX06 既有 schema lastLat/Lng/locationAt ✓
- 倉管組長 dashboard 走既有 dn-logistics.service
- 外務員 App 走新 driver-mobile.controller

---

## §6 範圍 closure 定義

### 6.1 TASK-NX06-IMPL-02 範圍（7 業務功能）

| # | 功能 | IMPL-02 |
|---|---|---|
| 1 | 路線優化（單車）Google Maps API | ✅ |
| 2 | 路線優化（多車 VRP）OR-Tools | ✅ |
| 3 | 動態任務轉派（亞羅簡化版）⭐⭐⭐ | ✅ |
| 4 | 外務員 PWA App | ✅ |
| 5 | 倉管組長地圖視圖 | ✅ |
| 6 | 推播服務（Web Push + Email）| ✅ |
| 7 | GPS realtime sync（30s + 10s polling）| ✅ |

### 6.2 範圍 closure 標準

- 7 業務功能 schema + service + endpoint 全落地
- Google Maps API 整合（Crown 需提供 API key）
- OR-Tools VRP solver 整合（local lib、無外部 API）
- PWA App 落地（next-pwa 設定）
- Web Push 訂閱 + 通知流程完整
- GPS sync 流程完整
- 動態交接演算法落地（半自動、倉管組長拍板）

### 6.3 範圍不涵蓋（後續軌）

- 客戶端配送進度推播（Crown Q3=a）
- SSE realtime（Crown Q4=a polling 即可）
- 原生 App（PWA 已涵蓋）
- 完整 VRP solver（亞羅 100 張/日 簡化版即可、後續軌升級）
- 配送預約時段
- 簽收照片 OCR

---

## §7 範圍 B 戰略軌 backlog（封測後啟動）

- 客戶端配送進度推播（line / SMS / email）
- SSE realtime（dashboard 升級）
- 配送預約時段
- 配送成本分析儀表板（NX08 範圍延伸）
- 完整 VRP solver（亞羅規模升級後）

---

## §8 文件變更歷史

| 版本 | 日期 | 變更摘要 |
|---|---|---|
| v0.1.0 | 2026-05-18 | 首版、13 拍板（IMPL-01 物流基礎）|
| v0.2.0 | 2026-05-18 | 整合 IMPL-02 路線優化（+5 戰略題：100/日 / iOS+Android / 不做客戶推播 / polling / 同軌）+ Google Maps + OR-Tools + PWA + Web Push 技術選型 |

---

> **本文件純業務需求層、不含 schema / API / 程式碼細節**
> Hank IMPL-02 階段對齊本文件、技術細節 Hank 自決
> Q-RHYTHM-2 全軌連跑套用、預估 15~20 commit / 2.5~3 小時
