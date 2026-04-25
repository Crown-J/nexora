<!-- docs/README.md -->
# NEXORA GRID — 文件總索引

> 維護人：Crown Lin（創辦人）
> 最後更新：2026-04-25
> 文件結構版本：v2（2026-04-25 重整，C 方案：按 NX 模組分）

NEXORA GRID 的所有業務文件、設計契約、決策紀錄、UI 規劃、業務流程都在 `docs/` 下。
程式碼工程說明（Tech Stack、命名規則、開發鐵律）請看根目錄 [CLAUDE.md](../CLAUDE.md)。

---

## 一、資料夾架構（按 NX 模組劃分）

```
docs/
├── README.md                  ← 你正在讀的
├── _shared/                   ← 跨模組共用
│   ├── decisions/             ← ADR 決策紀錄（業界標準）
│   ├── plans/                 ← Master Plan（roadmap）
│   ├── reference/             ← 全 repo 都會用到的真相來源
│   └── system/                ← 跨模組系統層（首頁、版型、SYS-W 流程）
│       └── workflow/
│
├── nx01/ ... nx10/            ← 業務模組（對齊 CLAUDE.md §3）
│   ├── reference/             ← 模組 schema CSV、欄位對照
│   ├── spec/                  ← 設計契約（只在需要時長）
│   │   ├── intent/            ← Alex 寫的「要什麼功能 / 要什麼結果」
│   │   └── impl/              ← Hank 對照真實 repo 寫的具體 spec
│   ├── ui/                    ← 工作台畫面規劃
│   └── workflow/              ← 業務流程
│       ├── primary/           ← 主流程（W 系列）
│       └── sub/               ← 子流程
│
├── nx98/                      ← 共用核心（doc-link 等基礎設施）
├── nx99/                      ← 系統管理（多租戶、方案、功能開關）
└── archive/                   ← 已完成的歷史
    └── 2026-04/               ← 按月份歸檔
```

---

## 二、各模組對應業務領域

| 模組 | 業務領域 | 主要文件 |
|---|---|---|
| nx01 | 主檔管理 | reference/master-field-matrix.md |
| nx02 | 採購管理（含產品/廠商） | ui/po-workspace.md, workflow/primary/p-w*.md |
| nx03 | 庫存管理（含撿貨/包貨/盤點） | ui/warehouse-workspace.md, workflow/primary/i-w*.md |
| nx04 | 銷售管理（含客戶） | ui/so-workspace.md, workflow/primary/s-w*.md |
| nx05 | 財務管理 | ui/finance-workspace.md, workflow/primary/f-w*.md |
| nx06 | 物流管理 | ui/logistics-workspace.md, workflow/sub/l*.md |
| nx07 | 人資管理 | ui/hr-workspace.md, workflow/primary/h-w*.md |
| nx08 | 經營分析（報表） | ui/report-workspace.md, workflow/primary/r-w*.md |
| nx09 | 知識管理 | ui/km-workspace.md |
| nx10 | 遊戲化系統 | ui/game-workspace.md |
| nx98 | 共用核心（不對外顯示） | reference/field-definitions.csv |
| nx99 | 系統管理（不對外顯示） | reference/field-definitions.csv |

---

## 三、五種文件類型 — 用途速查

| 類型 | 位置 | 寫者 | 何時讀 |
|---|---|---|---|
| **ADR**（決策紀錄） | `_shared/decisions/` | Alex | 想知道某個架構決策的「為什麼」 |
| **Plan**（roadmap） | `_shared/plans/` | Alex | 想知道 Phase 排序、時程、依賴 |
| **Spec/Intent**（意圖） | `nxXX/spec/intent/` | Alex | 想知道某個功能要達成什麼效果 |
| **Spec/Impl**（實作） | `nxXX/spec/impl/` | Hank | 想知道 schema、API、translator 的具體寫法 |
| **Reference**（真相來源） | `_shared/reference/`、`nxXX/reference/` | 共同維護 | 查欄位定義、單據編號規則、版本方案 |
| **UI 工作台** | `nxXX/ui/`、`_shared/system/` | Alex + Hank | 想知道某個頁面的版面跟操作流 |
| **Workflow** | `nxXX/workflow/` | Crown 主導 | 想知道業務作業的 SOP |

---

## 四、命名規則

- **資料夾**：全小寫 + kebab，例 `nx04/spec/intent/`
- **檔名**：全小寫 + kebab + `.md` / `.csv`，業務字母前綴 + 流水號保留（例 `s-w01-domestic-sales.md`）
- **ADR/Plan**：ISO 日期 + kebab，例 `2026-04-24_workstation-pivot.md`
- **Archive**：原檔名直接 kebab 化，月份桶 `archive/YYYY-MM/`

---

## 五、團隊分工（2026-04-25 確立）

```
Crown = 決策者（提需求、最終拍板）
Alex  = 整合者（彙整需求、寫意圖文件，不寫具體 schema/SQL/Prisma DSL）
Hank  = 執行者（看 repo 全貌、對照真實狀態實作 + 寫具體細節）
```

對應到資料夾：
- Crown 拍板 ADR/Plan、定義 workflow
- Alex 寫 `_shared/decisions/`、`_shared/plans/`、各 `nxXX/spec/intent/`
- Hank 寫各 `nxXX/spec/impl/`、`nxXX/reference/master-field-matrix.md` 類對照表

---

## 六、跨模組文件交叉引用慣例

文件互相引用時用相對路徑：
```markdown
[Workstation Pivot ADR](../_shared/decisions/2026-04-24_workstation-pivot.md)
[NX04 SO 工作台](./ui/so-workspace.md)        ← 同模組
[NX02 採購主流程](../nx02/workflow/primary/p-w01-domestic-purchase.md)  ← 跨模組
```

避免絕對路徑（`docs/...`）— 未來資料夾遷移時連結會壞。

---

## 七、新加文件時的決策樹

1. 是「業務作業 SOP」？ → `nxXX/workflow/primary|sub/`
2. 是「畫面規劃」？ → `nxXX/ui/`（跨模組共用 → `_shared/system/`）
3. 是「設計契約」？
   - Alex 寫的「要什麼」？ → `nxXX/spec/intent/`
   - Hank 寫的「怎麼寫」？ → `nxXX/spec/impl/`
4. 是「決策紀錄」？ → `_shared/decisions/YYYY-MM-DD_*.md`
5. 是「計畫書」？ → `_shared/plans/YYYY-MM-DD_*.md`
6. 是「不變的真相來源」（schema CSV、規則表）？
   - 跨模組？ → `_shared/reference/`
   - 單模組？ → `nxXX/reference/`
7. 已完成的 task log？ → `archive/YYYY-MM/`

---

## 八、相關文件

- [CLAUDE.md](../CLAUDE.md) — 工程說明（Tech Stack、命名規則、開發鐵律）
- [_shared/reference/route-table-v2.md](_shared/reference/route-table-v2.md) — 路由標準表 v2.0
- [_shared/reference/nx-table.csv](_shared/reference/nx-table.csv) — 124 張表格清單
- [_shared/reference/version-feature-matrix.csv](_shared/reference/version-feature-matrix.csv) — 83 項功能 × 3 版本對應

---

*文件結束*
