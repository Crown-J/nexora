<!-- docs/_team/nexora-lite-complete-walkthrough.md -->

# NEXORA LITE 完整實測動線（v2.1.0-lite-complete）

> 撰寫者：Hank（階段 I closure 產出）
> 撰寫時間：2026-06-01
> 對應 tag：`v2.1.0-lite-complete`
> 用途：總經理當新客戶測 LITE 完整版的完整路徑

⭐ **這份文件是 LITE 完整版的「使用者旅程」、按順序測完表示 LITE 端對端可用。**

---

## §1. 開戶 → 登入 → 改密碼

| 步驟 | 操作 | 預期 |
|------|------|------|
| 1.1 | SYSADMIN 進 `/dashboard/admin/onboarding`、新建租戶 + 負責人帳號 | 拿到帳號 + 預設密碼 |
| 1.2 | 用負責人帳號登入 `/login` | 首次登入強制跳改密頁 |
| 1.3 | 改密成功 → 跳設定精靈 | 引導完成基本資訊（公司名 / 起算日） |

✅ 對應 closure：階段 C 開戶後台 + 階段 D 設定精靈

---

## §2. 建主檔（手動 or 匯入）

| 步驟 | 操作 | 預期 |
|------|------|------|
| 2.1 | `/dashboard/base` 主檔中心 hub、看到 25+ 主檔卡片 | 各卡片可進入 |
| 2.2 | 客戶 `/dashboard/base/partners`、新增 1 個客戶（partner_type=C） | 列表顯示新客戶 |
| 2.3 | 供應商 `/dashboard/base/partners`、新增 1 個供應商（partner_type=S） | 列表顯示新供應商 |
| 2.4 | 產品 `/dashboard/base/parts`、新增 1 個料號 + 安全庫存 | 列表顯示新產品 |
| 2.5 | 倉庫 `/dashboard/base/warehouses` + 庫位 `/dashboard/base/location` | 兩表都有資料 |
| 2.6 | 員工 `/dashboard/base/users`、新增業務員 + 採購員 | 列表顯示 |
| 2.7 | （可選）匯入精靈：上傳 Excel 一次建多筆 | 匯入成功、數量正確 |

✅ 對應 closure：階段 C 匯入精靈 + 階段 E 主檔範式 + 階段 A NX01 鋼鐵星球

---

## §3. 進貨流程（採購業務）

| 步驟 | 路徑 | 操作 | 預期 |
|------|------|------|------|
| 3.1 | `/dashboard/purchase/demand` 採購需求 | 看 3 來源聚合（補貨自動 / 客訂 / 手動） | 列表正常 |
| 3.2 | 同上、「+ 手動新增」 | 建一筆客訂需求 | 列表新增一筆 demandType=O |
| 3.3 | `/dashboard/purchase/rfq` 詢價 | 從需求建詢價單 | RFQ 建立、發給供應商 |
| 3.4 | `/dashboard/purchase/po` 採購單 | 採購組長核可 PO → 廠商確認 → CONFIRMED | 應付帳款（AP）自動產生 |
| 3.5 | `/dashboard/purchase/foreign` 國外進貨（若 PO type=I） | 6 階段 timeline 推進 | 時間戳依序紀錄 |
| 3.6 | `/dashboard/inventory/receiving` 驗收（手機可掃條碼）| 掃條碼確認品項 → 完成驗收 | 庫存增加、PO 變 RECEIVED |
| 3.7 | `/dashboard/purchase/rr` 進貨單 | 查既有 RR list | 列表顯示 |
| 3.8 | `/dashboard/nx01/pr` 退貨（若需要） | 退貨選「走保固」三選一 → 過帳 | 走保固自動建 N 張保固單 |

✅ 對應 closure：階段 F NX05 財務（AP）+ 階段 I P2/P3/P4

---

## §4. 銷貨流程（銷售員）

| 步驟 | 路徑 | 操作 | 預期 |
|------|------|------|------|
| 4.1 | `/dashboard/nx04/quote` 報價單 | 開報價、發給客戶、客戶確認 | 報價有效期、可拉舊報價 |
| 4.2 | `/dashboard/nx04/sales-order` 銷貨單 | 從報價建 SO（DRAFT） | 若庫存不足 → 自動建 demand(O) |
| 4.3 | 同上、SO 推進 DRAFT → CONFIRMED | 庫存不足且本倉外有 → 自動建 ST 調撥 | ST 自動建、SoItem.stId 連結 |
| 4.4 | 同上、SO → PICKING → 撿貨工作站 | 倉管手機 `/dashboard/inventory/picking` 完成撿貨 | PK 完成、自動建包貨單 |
| 4.5 | 倉管手機 `/dashboard/inventory/packing` 完成包貨 | 包裹編號 BX-YYYYMM-倉碼-NNNNN 自動產生 | 標籤可印（API 已生） |
| 4.6 | 司機手機 `/dashboard/inventory/delivery` | 派車出發 → 客戶簽收 | SO 變 SHIPPED + AR 自動建 |
| 4.7 | （若需要）`/dashboard/nx04/sales-return` 銷退 | 開銷退單、好品/壞品分流 | 銷退過帳、AR 沖銷或反向 |

✅ 對應 closure：NX04 sales lite + 階段 G 手機版 + 階段 I P3 銷貨缺貨 hook

---

## §5. 庫存日常

| 步驟 | 路徑 | 操作 | 預期 |
|------|------|------|------|
| 5.1 | `/dashboard/inventory/stock-query` | 查料件即時庫存 | 顯示各倉位 onHand / reserved |
| 5.2 | `/dashboard/inventory/stocktake` 盤點 | 開盤點單 → 點「📱 手機掃條碼模式」 | 跳手機掃碼頁 |
| 5.3 | `/dashboard/inventory/stocktake/[id]/scan` | 掃條碼 → 輸入實盤數量 → 自動算差異 | 差異原因 4 選一 |
| 5.4 | 同上、盤點主管核可 | 核可後過帳 + ledger 寫入 | 庫存調整完成 |
| 5.5 | `/dashboard/inventory/transfer` 調撥 | 倉間調撥（若需要） | 兩倉庫存對轉 |

✅ 對應 closure：NX03 stock lite + 階段 G 盤點掃條碼

---

## §6. 財務作業

| 步驟 | 路徑 | 操作 | 預期 |
|------|------|------|------|
| 6.1 | `/dashboard/finance/ar` 應收帳款 | 列出客戶欠款 | 含 SO 來源 + PR 廠商退費來源 |
| 6.2 | 同上、點客戶 → 收款（票據/現金/匯款） | 一票對多沖銷支援 | 沖銷紀錄寫入 paylog_settlement |
| 6.3 | `/dashboard/finance/ap` 應付帳款 | 列出欠廠商款 | 含 PO 來源 |
| 6.4 | 同上、付款 | 沖銷對應 ApLedger | 餘額更新 |
| 6.5 | `/dashboard/finance/voucher` 票據 | 票據新增 / 兌現 / 退票 | 4 種付款方式 |
| 6.6 | `/dashboard/finance/closing` 月關帳 + 401 上報 | 月關帳 → 雙月一期產 401 | TXT 兩檔對齊財政部格式 |

✅ 對應 closure：階段 F NX05 財務全套

---

## §7. 看報表

| 步驟 | 路徑 | 操作 | 預期 |
|------|------|------|------|
| 7.1 | `/dashboard/report` 報表中心 hub | 看 6 張可用報表卡片 | 全部可點進 |
| 7.2 | `/dashboard/report/personal` 個人月報 | 員工下拉 + 期間日/月 | 業績 4 KPI + 開單 3 卡 + 工作量 3 卡 |
| 7.3 | `/dashboard/report/sales` 銷售報表 | 切換產品 / 客戶 / 員工角度 | 圖表 + 表格 |
| 7.4 | `/dashboard/report/purchase` 進貨報表 | PO 狀態 + 供應商 Top10 + 比價 | 圖表正常 |
| 7.5 | `/dashboard/report/inventory` 庫存報表 | 週轉 / 呆滯 / 低庫存三 tab | 警告數量正確 |
| 7.6 | `/dashboard/report/pnl` 損益表 | 期間選擇 → 看瀑布圖 + 會計式 | 進銷淨額簡化法 |
| 7.7 | `/dashboard/report/ops` 營運報表（OWNER） | 部門 + KPI + BCG matrix | 無權限會被擋 |
| 7.8 | 任一報表「匯出 Excel」 | 下載 .xlsx | 數字 Number 型別、可 SUM |

✅ 對應 closure：階段 H NX08 報表（桌面 + 手機 + Excel）

---

## §8. 手機端工作站（倉管 / 司機）

手機版 `lg:hidden` 元件：
- **底部 dock 5 圖示**：驗收 / 撿貨 / 包貨 / 配送 / 盤點（全 dashboard 顯示）
- **右下浮動 ⊕**：點開 4 分類抽屜（進貨 / 銷貨 / 庫存 / 報表、權限過濾）

| 工作站 | 路徑 | 操作 |
|--------|------|------|
| 驗收 | `/dashboard/inventory/receiving` → 點卡 → 詳情 | 掃條碼確認品項 → 完成驗收 |
| 撿貨 | `/dashboard/inventory/picking` | 一鍵完成撿貨（P→C→F sequential） |
| 包貨 | `/dashboard/inventory/packing` | 一鍵完成包貨 + 自動生包裹編號 BX-... |
| 配送 | `/dashboard/inventory/delivery` | DRAFT 派車出發 / DISPATCHED 客戶簽收或失敗 |
| 盤點 | `/dashboard/inventory/stocktake/[id]/scan` | 掃條碼 → 開數量 dialog → 差異 4 原因 |

✅ 對應 closure：階段 G 手機版

---

## §9. 設定精靈（首次登入 + 主動重看）

| 步驟 | 路徑 | 操作 | 預期 |
|------|------|------|------|
| 9.1 | 首次進任一工作台 | 自動跳引導精靈第一步 | AutoPageGuide 自動觸發 |
| 9.2 | 右上「?」按鈕 | 重看當前頁引導 | Guide 重新顯示 |
| 9.3 | `/dashboard/wizard/reset` | 重置所有引導狀態 | 下次每頁都重跑 |

✅ 對應 closure：階段 D 設定精靈 framework + 22 工作台引導

---

## §10. 驗收快速 checklist

- [ ] 三租戶 seed 全綠（LITE / PLUS / PRO）
- [ ] 全 hub 卡片無空連結（11 個 placeholder 已 redirect）
- [ ] 桌面（≥640）+ 手機（<640）兩種視窗測過
- [ ] 退貨「走保固」自動建保固單（PR 過帳 → N 張 WC）
- [ ] SO 缺貨自動建 demand(O) → SO cancel 自動忽略
- [ ] 國外 PO 6 階段 timeline 推進 + 時間戳
- [ ] 6 報表桌面 + 手機 + Excel 匯出
- [ ] 5 工作站手機 dock + 浮動 ⊕ 都顯示
- [ ] 條碼掃描（驗收 + 盤點兩處）能用後鏡頭
- [ ] PnL 損益表期間切換 + 瀑布圖正確

---

## §11. 後續軌清單（LITE 之後可選）

| 軌 | 範疇 | 規模 |
|----|------|------|
| **TASK-RAILWAY-ENV-SPLIT** | dev/prod env 分離 + 92 支 migration 上 Railway | 大、第一客戶簽約前 2-4 週必做 |
| **付費模組 - 地圖配送** | Google Map 路線規劃 + Lalamove webhook | 中、加值收費 |
| **付費模組 - 推播通知** | web-push 客戶端 + 司機追蹤 | 中、加值收費 |
| **NX06 物流深化** | IntlShipping CRUD + Parcel 拆包 | 中 |
| **NX07 工務模組** | 派工單 / 工時 / 維保 / SLA | 大 |
| **NX09~10** | HR / 排行榜深化 | 大 |
| **主檔分區編輯重做** | v1.2 §11 §6.4「同份客戶各模組看自己欄位」 | 大 |
| **RBAC 自訂角色** | v1.2 §12.2「負責人從零建角色 + 自由命名」 | XL |
| **報表 v2** | 個人月報移動平均 COGS + Excel 圖表嵌入 | 小 |

⚠️ Railway production migration 累計落後 92 支（含階段 I P1 兩個 additive 變動）。

---

⭐ **動線測完 = LITE 完整版驗收通過、可以接第一個真實客戶。**
