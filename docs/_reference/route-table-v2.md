# NEXORA GRID — 路由標準表 v2.0

> 建立：2026-04-13
> 狀態：✅ Crown 確認
> 原則：語意化路由，不使用模組代碼（nx01 等）

---

## 一、系統層

| 路由 | 頁面說明 | 版本 |
|------|---------|------|
| `/` | 登入頁 | ALL |
| `/dashboard` | 首頁儀表板 | ALL |
| `/dashboard/settings` | 個人設定 | ALL |
| `/dashboard/system` | 系統設定 | ALL |
| `/dashboard/bulletin` | 公告列表 | ALL |

---

## 二、主檔管理（原 NX01）

| 路由 | 頁面說明 | 版本 |
|------|---------|------|
| `/dashboard/base` | 主檔管理首頁 | ALL |
| `/dashboard/base/users` | 使用者管理 | ALL |
| `/dashboard/base/roles` | 職務權限管理 | ALL |
| `/dashboard/base/partners` | 廠商 / 客戶主檔 | ALL |
| `/dashboard/base/warehouses` | 倉庫主檔 | ALL |
| `/dashboard/base/parts` | 料號主檔 | ALL |

> ⚠️ 現有 `/base/*` 需新增 redirect → `/dashboard/base/*`，避免舊書籤 / 連結失效

---

## 三、採購管理（原 NX02）

| 路由 | 頁面說明 | 版本 |
|------|---------|------|
| `/dashboard/purchase` | 採購模組首頁 | ALL |
| `/dashboard/purchase/domestic` | 國內採購作業工作台 | ALL |
| `/dashboard/purchase/import` | 國外採購作業工作台 | PLUS+ |
| `/dashboard/purchase/special` | 特殊採購（掃貨）| ALL |
| `/dashboard/purchase/product` | 產品管理（定價 / 安全量）| ALL |
| `/dashboard/purchase/vendor` | 廠商管理 | ALL |

---

## 四、庫存管理（原 NX03）

| 路由 | 頁面說明 | 版本 |
|------|---------|------|
| `/dashboard/inventory` | 庫存模組首頁 | ALL |
| `/dashboard/inventory/workspace` | 庫存作業工作台（入庫 / 出庫 / 盤點）| ALL |
| `/dashboard/inventory/setting` | 庫位管理 + 安全量建議 | ALL |

---

## 五、銷售管理（原 NX04）

| 路由 | 頁面說明 | 版本 |
|------|---------|------|
| `/dashboard/sales` | 銷售模組首頁 | ALL |
| `/dashboard/sales/domestic` | 國內銷售作業工作台 | ALL |
| `/dashboard/sales/export` | 國外銷售作業工作台 | PLUS+ |
| `/dashboard/sales/customer` | 客戶管理 | ALL |

---

## 六、財務管理（原 NX05）

| 路由 | 頁面說明 | 版本 |
|------|---------|------|
| `/dashboard/finance` | 財務模組首頁 | ALL |
| `/dashboard/finance/workspace` | 財務作業工作台 | ALL |

---

## 七、物流管理（原 NX06）

| 路由 | 頁面說明 | 版本 |
|------|---------|------|
| `/dashboard/logistics` | 物流模組首頁 | ALL |
| `/dashboard/logistics/workspace` | 物流作業工作台 | ALL |

---

## 八、人資管理（原 NX07）

| 路由 | 頁面說明 | 版本 |
|------|---------|------|
| `/dashboard/hr` | 人資模組首頁 | PRO |
| `/dashboard/hr/workspace` | 人資作業工作台 | PRO |

---

## 九、經營分析（原 NX08）

| 路由 | 頁面說明 | 版本 |
|------|---------|------|
| `/dashboard/report` | 分析模組首頁 | PRO |
| `/dashboard/report/workspace` | 報表分析工作台 | PRO |
| `/dashboard/report/daily` | 個人工作日誌填寫 | PRO |
| `/dashboard/report/monthly` | 月度目標詳細 | PRO |

---

## 十、知識管理（原 NX09）

| 路由 | 頁面說明 | 版本 |
|------|---------|------|
| `/dashboard/knowledge` | 知識管理首頁 | PRO |
| `/dashboard/knowledge/workspace` | 知識管理工作台 | PRO |

---

## 十一、手機版專屬路由

| 路由 | 頁面說明 | 版本 |
|------|---------|------|
| `/m/inventory` | 倉管手機版 | ALL |
| `/driver` | 外務司機手機版 | ALL |

---

## 十二、模組選單快捷鍵對照（Alt+X）

| 字母鍵 | 模組 | 目標路由 |
|--------|------|---------|
| `H` | 首頁 | `/dashboard` |
| `B` | 主檔管理 | `/dashboard/base` |
| `P` | 採購管理 | `/dashboard/purchase/domestic` |
| `W` | 庫存管理 | `/dashboard/inventory/workspace` |
| `S` | 銷售管理 | `/dashboard/sales/domestic` |
| `M` | 財務管理 | `/dashboard/finance/workspace` |
| `L` | 物流管理 | `/dashboard/logistics/workspace` |
| `A` | 人資管理 | `/dashboard/hr/workspace` |
| `R` | 經營分析 | `/dashboard/report/workspace` |
| `K` | 知識管理 | `/dashboard/knowledge/workspace` |
| `G` | 遊戲化 | `/dashboard/game` |

> PRO 限定模組（L / A / R / K / G）：LITE / PLUS 版選單不顯示這五個選項

---

## 附註：命名原則

1. 語意化英文，不使用模組代碼（`nx01` 等）
2. 所有模組統一掛在 `/dashboard/*` 之下（含主檔管理）
3. 現有 `/base/*` 需加 redirect 到 `/dashboard/base/*`
4. 手機版統一用 `/m/` 前綴（外務司機例外，維持 `/driver`）
5. 本表確認後為 Hank 實作標準，路由變更須經 Crown 同意並更新本表版本號
