<!-- docs/nx06/spec/intent/nx06-overview.md -->

# NX06 物流配送 — 業務需求 Overview（v0.1.0）

> 性質：業務需求文件（給 Hank impl 對齊用、純需求層、不含 schema / API / 程式碼）
> 撰寫者：Alex（NEXORA 專案 PM AI）
> 拍板者：Crown（NEXORA 創辦人）
> 日期：2026-05-18
> 對應拍板：Crown 跨 4 輪需求討論共 13 題拍板 closure（2026-05-18）
> 依賴揭露：NX06-AUDIT-01 完成（schema 真相 verify ✓）
> 範圍：NEXORA NX06 物流配送模組、亞羅企業（Arco）量身打造
> 戰略定位：NEXORA 業務模組第一階段最後拼圖 + **亞羅核心競爭力（送貨快速）**
> 紀律：Q-RHYTHM-2 拆 2 軌套用（TASK-NX06-IMPL-01 物流基礎 + TASK-NX06-IMPL-02 路線優化）

---

## §0 文件性質

本文件為 NX06 物流配送模組的**業務需求總覽**、Alex 業務需求層產出。

Crown 拍板拆 2 軌實作：
- **TASK-NX06-IMPL-01**：物流基礎（DN + 簽收 + 配送異常 + Lalamove + 配送成本）
- **TASK-NX06-IMPL-02**：路線優化 + 動態交接（亞羅核心競爭力）

每軌獨立套 Q-RHYTHM-2 全軌連跑、各自 final merge。

Hank impl 對齊原則：
- 本文件業務需求 = 真相、所有衝突以本文件為準
- 兩軌獨立 plan + impl + merge
- 遇 schema / 業務語意衝突 → 停下回報

---

## §1 NX06 業務本質

### 1.1 NX06 是什麼

**NX06 物流配送 = 亞羅倉管組長的工作台 + 外務員的手機 App**。

業務本質回答 4 個核心問題：

1. **要送哪些？**（NX04 SHIPPED → DN 自動建）
2. **誰送、怎麼送、走哪條路？**（倉管組長配單 + 路線優化）⭐
3. **送完了嗎？**（簽收 + 異常處理）
4. **總成本多少？**（內部成本記錄、對外不顯示）⭐

### 1.2 NX06 在 NEXORA 全棧的角色

```
上游：
NX04 SO SHIPPED → DN 自動建（既有 helper createDeliveryDnFromShippedSo ✓）
NX04 SR returnMethod='C' → RETURN_PICKUP（schema 已備、wire 待補）
NX03 Parcel → DnItem（schema 已備、wire 待補）
        ↓
NX06 物流配送鏈：
   倉管組長配單 → 路線優化 → 外務員手機 App → GPS 追蹤 →
   現場簽收（電子簽 + 照片 + 熱感印表機）→ 異常處理 → 配送完成
        ↓
NX06 內部成本記錄（油錢 / Lalamove 費用、對外不顯示）
業務閉環延伸完成
```

**核心定位**：業務模組第一階段最後拼圖、亞羅「送貨快速」核心競爭力落地點。

### 1.3 NEXORA 戰略意義

⭐⭐⭐ NX06 落地 5 個業界改革候選（**最強業界差異化模組**）：

1. **動態任務轉派 / 騎手交接**（業界中小 ERP 0、對標 Uber Eats / Lalamove）⭐⭐⭐
2. **路線優化多車調度**（部分大型物流 ERP 有、中小 ERP 0）
3. **現場熱感印表機列印**（業務員手機 App 對接、業界差異化）
4. **配送成本內部記錄、對外不顯示**（汽配業界 muscle memory 落地）
5. **Lalamove API 半自動整合**（業界中小 ERP 0）

---

## §2 主使用者與權限

### 2.1 主使用者分層

對齊 Crown Q1 拍板：

| 角色 | 業務動作 |
|---|---|
| **WAREHOUSE 倉管組長** ⭐ | **配單、路線優化、分派外務、異常處理**（Crown 揭露主操作者）|
| **WAREHOUSE 外務員** | 收任務、執行配送、現場簽收、回報異常 |
| **SALES 業務員** | 看客戶配送進度（read-only）|
| **OWNER 管理** | 跨角色 read、配送成本分析 |

⚠️ Alex 失誤揭露：Alex 上輪推 SALES 主操作、Crown 校正「**倉管組長配單**」。配送業務歸 WAREHOUSE、不是 SALES。

### 2.2 權限機制 = 彈性 role_view

對齊 NX02/NX03/NX04/NX05 範式：
- 預設 WAREHOUSE 操作
- 用 role_view 彈性權限
- 不細分「倉管組長 / 外務員」雙層、走 status enum + UI 角色視角

---

## §3 業務功能架構 — TASK-01 物流基礎

### 3.1 TASK-NX06-IMPL-01 範圍（9 業務功能）

| # | 功能 | audit 狀態 | TASK-01 |
|---|---|---|---|
| 1 | DN 送貨單管理（4 物流類型、單表覆蓋）| ✅ schema + service | ✅ 升級 |
| 2 | NX04 SO SHIPPED → DN 自動建 | ✅ helper 完整 wire | ✅ verify |
| 3 | NX04 SR returnMethod='C' → RETURN_PICKUP wire | 🟡 schema 已備、半接通 | ✅ 補 wire |
| 4 | NX03 Parcel → DnItem wire | 🟡 schema 已備、半接通 | ✅ 補 wire |
| 5 | **倉管組長配單**（指派外務、選車輛）| 🟡 schema 已備 | ✅ 新建 service |
| 6 | **電子簽 + 照片簽收**（GPS 定位、業界改革 ⭐）| 🟡 schema 已備 | ✅ 新建 service |
| 7 | **現場熱感印表機列印**（手機 App 對接）⭐ | ❌ 0 schema | ✅ 新建 + schema |
| 8 | **配送異常處理**（送錯 / 客戶不在 → 重派）| ✅ schema 異常 4 enum | ✅ 升級 service |
| 9 | **Lalamove API 半自動整合**（partner_type=T）⭐ | ❌ 0 service | ✅ 新建 + API |
| 10 | **配送成本內部記錄**（油錢 + Lalamove 費用、對外不顯示）⭐ | ❌ 0 schema | ✅ 新建 schema 欄 |

⚠️ INTL_SHIPPING 不在範圍（Crown Q5 揭露：國外走寄貨、不走自家配送）。

### 3.2 配送 SOP（Crown 5+3 題揭露核心流程）

```
NX04 SO SHIPPED
   ↓ 自動建 helper（既有）
NX06 DN（4 物流類型自動分流）
   ├─ DELIVERY 自家配送（機車/貨車）
   ├─ PICKUP 客戶自取
   ├─ RETURN_PICKUP 銷退取件（NX04 SR returnMethod='C'）
   └─ Lalamove 外包（partner_type=T、Lalamove API 半自動）
   ↓
倉管組長配單（指派外務員 + 車輛 + 路線）
   ↓
外務員手機 App 收任務
   ↓
GPS 追蹤（既有 schema lastLat/Lng/locationAt）
   ↓
現場執行
   ├─ 電子簽 + 照片（schema signatureUrl / photoUrls）
   ├─ 熱感印表機列印（Bluetooth Thermal Printer 對接）
   └─ 配送異常（送錯 / 客戶不在 / 貨損 → status FAILED → 倉管組長重派）
   ↓
配送完成 → 內部成本記錄（油錢估算 / Lalamove 回傳費用）
```

---

## §4 業務功能架構 — TASK-02 路線優化 + 動態交接 ⭐⭐⭐

### 4.1 TASK-NX06-IMPL-02 範圍（亞羅核心競爭力）

#### 功能 1：路線優化（單車）
- 一個外務員 N 個任務、系統算最短路徑
- Google Maps Distance Matrix API 候選（簡單 / 有費用）
- OSRM 候選（開源 / 自架）
- OR-Tools 候選（Google 開源最佳化求解器）
- **Alex 推 Google Maps**（API 整合最快、亞羅範圍小、費用可控）

#### 功能 2：路線優化（多車調度）
- 倉管組長一次分派 N 個任務給 M 個外務員
- 系統算「**哪個外務員跑哪些任務**」最優解
- 對齊亞羅「送貨快速」核心競爭力

#### 功能 3：動態任務轉派（Crown 揭露的核心特色）⭐⭐⭐
業界稱「**Crowdsourced Routing**」或「**騎手交接**」：

```
場景：外務 A 在 X 店家附近、B 從店裡出發要送 X + Y

傳統做法：
   B 從店裡 → X → Y、A 完成任務回店

亞羅核心優化：
   1. 系統算「機會匹配」：B 出發前、檢查 A 位置 + 剩餘任務
   2. A 在 X 附近 + 空閒 → 系統建議「交給 A」
   3. 倉管組長一鍵分派（或自動分派）
   4. 推播通知：
      - A：「接 B 在 Z 路口、收 X 貨物」
      - B：「在 Z 路口交貨給 A、然後直接跑 Y」
   5. 系統追蹤交接完成 → 更新 DN 任務歸屬
```

業界對標：
- Uber Eats / DoorDash 高峰期常用
- Lalamove 有「合單」概念類似
- 物流業界叫「Hub-less Cross-docking」
- **中小汽配 ERP 業界 0**

#### 功能 4：外務員手機 App（路線優化必備）
- 收任務 push notification
- GPS realtime 上傳
- 動態交接接受/拒絕
- 現場簽收（電子簽 + 照片 + 熱感印表機）
- 異常回報

#### 功能 5：倉管組長配單 UI 升級
- 地圖視圖（所有外務員 + 待派任務）
- 動態交接建議（系統提示）
- 一鍵分派 / 自動分派切換

### 4.2 動態交接技術元素

| 元素 | 技術範式 | 對齊既有 |
|---|---|---|
| 即時 GPS 定位 | schema lastLat/Lng/locationAt | ✅ audit § 1 |
| 機會匹配演算法 | 半徑 X km 內 + A 空閒判斷 + 任務量平衡 | 新建 service |
| 推播 trigger | Firebase Cloud Messaging / Apple Push | 新建 service |
| 交接完成 sync | 兩外務員 + 系統三方協調 | 新建 schema |

---

## §5 跨模組接點

### 5.1 上游接點

| 上游 | 觸發 | NX06 接收 | wire 狀態 |
|---|---|---|---|
| NX04 SO SHIPPED | DN DELIVERY 建 | createDeliveryDnFromShippedSo | ✅ 完整 |
| NX04 SR returnMethod='C' | DN RETURN_PICKUP 建 | 待補 helper | 🟡 TASK-01 補 |
| NX03 Parcel | DnItem 連動 | 待補 wire | 🟡 TASK-01 補 |

### 5.2 下游接點

| 下游 | 接收 | NX06 提供 |
|---|---|---|
| NX05 Paylog EX | 配送成本（油錢 / Lalamove）| 內部成本記錄 |
| NX08 報表 | 配送成本分析 | 後續軌 |

### 5.3 外部整合

| API | TASK | 用途 |
|---|---|---|
| Lalamove API | TASK-01 | 物流外包半自動下單 + 對帳 |
| Google Maps Distance Matrix | TASK-02 | 路線優化 |
| Firebase / Apple Push | TASK-02 | 外務員 App 推播 |

---

## §6 簽收業務範式（Crown Q3 + Q7 拍板）

### 6.1 內部電子簽 + 照片 + 列印

對齊 Crown 揭露：
- **內部標準**：電子簽 + 照片（schema 已備）
- **客戶需求**：保養廠記帳用、需紙本

### 6.2 現場列印支援（Crown Q7=a）⭐

業界範式 — **藍牙熱感印表機**：
- 業界品牌：Brother / Epson / 漢印 / 芝商熱敏
- 成本：每台 NTD 2000~5000
- 外務員手機 App 配對 → 現場印單據
- 業界應用：物流業 / 餐飲外送 / 工地簽收

### 6.3 fallback：倉管組長補印

外務員未配備熱感印表機時：
- 倉管組長產 PDF（NEXORA 系統內）
- 寄客戶 / 下次配送補給

---

## §7 配送成本記錄（Crown Q8 + Q9 拍板）⭐

### 7.1 汽配業界 muscle memory

對齊 Crown 揭露：
- **客戶不另收運費**（含在貨價裡、業界慣例）
- **但內部需要記錄**（油錢 / Lalamove 費用）
- **對外單據 0 運費欄**

### 7.2 系統範式

對齊 Crown Q9=a：
- DnItem 加 `internalCost` 內部欄
- 自家配送：油錢估算（公式可彈性、距離 × 單價）
- Lalamove 配送：API 回傳實際費用
- 對外 SO / DN 0 顯示
- 對內 NX05 Paylog EX 入帳（NX05 既有 accountCodeId）

### 7.3 後續軌（NX08 範圍）

- 配送成本分析儀表板
- 油錢 / Lalamove / 其他類型成本比例
- 配送效率 vs 成本對比

---

## §8 範圍 closure 定義

### 8.1 TASK-NX06-IMPL-01 範圍 closure（9 業務功能）

| # | 功能 | TASK-01 |
|---|---|---|
| 1 | DN 4 物流類型管理 | ✅ |
| 2 | NX04 SO SHIPPED → DN（既有）| ✅ verify |
| 3 | NX04 SR RETURN_PICKUP wire 補 | ✅ |
| 4 | NX03 Parcel → DnItem wire 補 | ✅ |
| 5 | 倉管組長配單 service | ✅ |
| 6 | 電子簽 + 照片簽收 | ✅ |
| 7 | 現場熱感印表機列印 | ✅ |
| 8 | 配送異常處理 | ✅ |
| 9 | Lalamove API 半自動整合 | ✅ |
| 10 | 配送成本內部記錄 | ✅ |

### 8.2 TASK-NX06-IMPL-02 範圍 closure（路線優化）

| # | 功能 | TASK-02 |
|---|---|---|
| 1 | 路線優化（單車）+ Google Maps API | ✅ |
| 2 | 路線優化（多車調度）| ✅ |
| 3 | 動態任務轉派（騎手交接）⭐⭐⭐ | ✅ |
| 4 | 外務員手機 App（推播 + GPS + 簽收 + 動態交接）| ✅ |
| 5 | 倉管組長配單 UI 升級（地圖視圖 + 動態交接建議）| ✅ |

### 8.3 closure 標準

**TASK-NX06-IMPL-01**：
- 10 業務功能 schema + service + endpoint 全落地
- Lalamove API 半自動整合（測試環境）
- 熱感印表機對接（待 Hank verify 硬體 SDK）
- 3 個半接通 wire 補完
- 配送成本內部記錄完整

**TASK-NX06-IMPL-02**：
- 路線優化（單車 + 多車）API 整合落地
- 動態交接演算法 + 推播完整 service
- 外務員 App（建議 Web App / PWA、不開原生）
- 倉管組長地圖視圖 UI 完整

### 8.4 範圍 A 不涵蓋

- INTL_SHIPPING（Crown Q5 揭露國外走寄貨）
- 全自動 AI 調度（範圍 C 後續軌、等亞羅累積數據）
- 配送成本分析儀表板（屬 NX08 範圍）

---

## §9 範圍 B 戰略軌（NX06 上線後啟動）

### 9.1 後續候選

- 全自動 AI 調度（學習歷史路線 + 預測最佳分派）
- 配送預約時段（客戶 9-12 / 14-18 等）
- 配送成本分析儀表板（NX08 範圍延伸）
- 簽收照片 OCR 識別（識別簽收人姓名）
- 配送地址智慧校正（Google Geocoding）

---

## §10 後續軌 backlog

### 10.1 NX06 既有殘留處理（audit-01 揭露）

- features/inventory/workstation/delivery 命名孤兒清理
- features/sale/Step6DeliveryMethod 命名孤兒清理
- menu.nx06.ts 建立（既有 0 檔）
- dashboard 1 placeholder 升 N placeholder

### 10.2 範圍 A 完成後預備

- TASK-NX06-IMPL-UI-01（UI 獨立軌、地圖視圖深化）
- TASK-NX06-IMPL-02-TEST（測試獨立軌、補 0 spec）
- TASK-NX06-DEMO-CLEANUP（殘留清）

---

## §11 文件變更歷史

| 版本 | 日期 | 變更摘要 |
|---|---|---|
| v0.1.0 | 2026-05-18 | 首版、整合 Crown 4 輪 13 題拍板 + 拆 2 軌 + NX06-AUDIT-01 |

---

> **本文件純業務需求層、不含 schema / API / 程式碼細節**
> Hank 後續 impl 階段對齊本文件業務需求、schema / service / UI 拓樸排序自決
> 任何 schema / API 設計衝突、以本文件業務需求為真相
> 兩軌獨立 plan + impl + merge、各自套 Q-RHYTHM-2 全軌連跑
