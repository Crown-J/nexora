<!-- docs/README.md -->
# NEXORA GRID — 文件總索引

> 維護人：Crown Lin（創辦人）
> 最後更新：2026-05-15
> 文件結構版本：v3（2026-05-15 平鋪重組 + 規範合一）

NEXORA GRID 所有業務文件、規範、設計契約、決策紀錄、UI 規劃、業務流程都在 `docs/` 下。
規範合一手冊（紀律 / 工作流 / 失誤紀錄）請看 [PROJECT_RULES.md](PROJECT_RULES.md)。

---

## 一、頂層平鋪結構

```
docs/
├── README.md                  ← 你正在讀的
├── PROJECT_CONTEXT.md         ← 專案介紹（業務 / Yaro / 恆迎 / 三人團隊、v2.1）
├── PROJECT_RULES.md           ← 規範合一手冊（Part I 共通 + Part II Alex + Part III Hank）
│
├── _team/                     ← 三人團隊動態
│   ├── git-state.md           ← branch 狀態、main HEAD（每 merge 更新）
│   ├── system-architecture.md ← Hank 蓋的房子快照
│   └── worklog.md             ← 跨模組 task log（5 段範式：起源 / 設計 / 實作 / 文件 / backlog）
│
├── _reference/                ← 跨模組真相表
│   ├── nx-table.csv           ← 全模組 schema 表清單 + ID prefix
│   ├── doc-number-rules.csv   ← 業務單據 prefix（RF/PO/SO/QT...）
│   ├── route-table-v2.md      ← 前端路由標準
│   └── version-feature-matrix.csv  ← LITE/PLUS/PRO × 功能對照
│
├── _template/
│   └── spec-template.md       ← 規格書 11 段範本（Alex 寫新規格參照）
│
├── _system/                   ← 系統層
│   ├── sys-dashboard.md       ← 首頁工作台
│   ├── sys-layout.md          ← 版型
│   ├── plan-sys-dashboard.md  ← 首頁 plan
│   └── workflow/              ← SYS-W 流程
│
├── _archive/                  ← 一次性歷史（frozen）
│   ├── 2026-04-24_workstation-pivot.md         ← ADR 工作站轉型
│   ├── 2026-04-24_workstation-pivot-plan.md    ← 對應 Plan
│   ├── 2026-04-28_file-placement-decisions.md  ← Q5 拍板過程
│   └── 2026-04/               ← 歷史 task log（business-restructure / demo-emergency / d3-so 等）
│
├── nx01/ ... nx09/            ← 業務模組
│   ├── nxXX-overview.md       ← 主檔規格書（Alex 寫）
│   ├── nxXX-summary.md        ← Claude.AI 上傳簡化版（待 Alex 撰寫）
│   ├── nxXX-worklog.md        ← 模組 task log（Hank 寫）
│   ├── spec/intent/           ← 子規格書（Alex 寫）
│   ├── spec/impl/             ← 實作架構書（Hank 寫、按需）
│   ├── ui/                    ← 工作台畫面規劃
│   ├── workflow/primary/      ← 主流程（W 系列）
│   ├── workflow/sub/          ← 子流程
│   └── reference/             ← 模組 schema CSV / 欄位對照
│
├── nx98/                      ← 共用核心（不對外顯示、僅 reference）
└── nx99/                      ← 系統管理（不對外顯示、僅 reference）
```

⭐ v3 vs v2 變化（2026-05-15 重組）：
- 頂層平鋪：`_shared/` 7 子層 → 5 個 `_` 前綴頂層（_team / _reference / _template / _system / _archive）
- 規範合一：CLAUDE.md（459 行）+ hank-charter.md（462）+ file-placement（224）+ PROJECT_CONTEXT 紀律段 → 統合 PROJECT_RULES.md
- root CLAUDE.md：保 stub 15 行（Cursor / Claude Code 入口指向）

---

## 二、模組對應業務領域

| 模組 | 業務領域 | 入口 |
|---|---|---|
| nx01 | 主檔管理 | `nx01/spec/intent/nx01-overview.md` + 17 子規格 |
| nx02 | 採購管理 | `nx02/ui/po-workspace.md` + workflow/primary/p-w*.md |
| nx03 | 庫存管理 | `nx03/ui/warehouse-workspace.md` + workflow/primary/i-w*.md |
| nx04 | 銷售管理 | `nx04/ui/so-workspace.md` + workflow/primary/s-w*.md |
| nx05 | 財務管理 | `nx05/ui/finance-workspace.md` + workflow/primary/f-w*.md |
| nx06 | 物流管理 | `nx06/ui/logistics-workspace.md` + workflow/sub/l*.md |
| nx07 | 人資管理（PRO）| `nx07/ui/hr-workspace.md` + workflow/primary/h-w*.md |
| nx08 | 經營分析（PRO）| `nx08/ui/report-workspace.md` + workflow/primary/r-w*.md |
| nx09 | 知識管理（PRO）| `nx09/ui/km-workspace.md` |
| nx98 | 共用核心 | `nx98/reference/field-definitions.csv` |
| nx99 | 系統管理 | `nx99/reference/field-definitions.csv` |

---

## 三、五種文件類型

| 類型 | 位置 | 寫者 | 何時讀 |
|---|---|---|---|
| **規範** | `PROJECT_RULES.md` | Crown 拍板 + Alex/Hank 撰寫 | 紀律 / 工作流 / 失誤紀錄 |
| **專案介紹** | `PROJECT_CONTEXT.md` | Hank 撰寫 + Alex review | 業務脈絡 / 角色 / Tech Stack |
| **Spec/Intent**（意圖）| `nxXX/spec/intent/` | Alex | 想知道某功能要達成什麼效果 |
| **Spec/Impl**（實作）| `nxXX/spec/impl/` | Hank | schema / API / translator 具體寫法 |
| **Reference**（真相來源）| `_reference/` / `nxXX/reference/` | 共同 | 欄位定義 / 單據編號 / 版本方案 |
| **UI / Workflow** | `nxXX/ui/` / `nxXX/workflow/` / `_system/` | Alex + Crown | 頁面版型 / 業務 SOP |
| **動態狀態** | `_team/` | Hank | branch 狀態 / 蓋的房子 / 跨模組 task log |
| **ADR / Plan** | `_archive/` | Alex / Crown | 歷史決策紀錄（frozen） |

---

## 四、命名規則（PROJECT_RULES §III.7.5 拍板）

- **兩端統一**：GitHub repo + Claude.ai 都用英文 kebab-case + 模組前綴
- **資料夾**：全小寫 + kebab、例 `nx04/spec/intent/`
- **檔名**：`nxXX-{feature}.md`（規格書）/ `nxXX-NN-{feature}.md`（子規格書）
- **ADR/Plan**：ISO 日期 + kebab、例 `2026-04-24_workstation-pivot.md`
- **檔頭路徑註解**：`.md` 第一行 `<!-- 相對 repo root 的路徑 -->`

---

## 五、團隊分工

```
Crown = 決策者（提需求、最終拍板、業界 muscle memory 源頭）
Alex  = 整合者（彙整需求、寫意圖文件、跟 Crown 互動）
Hank  = 執行者（看 repo 全貌、寫程式 / schema / migration、真相揭露）
```

對應資料夾：
- Crown 拍板 ADR/Plan、業務語意、規則升級
- Alex 寫 `nxXX/spec/intent/`、`PROJECT_CONTEXT` review
- Hank 寫 `nxXX/spec/impl/`、`nxXX-worklog.md`、`_team/*`、PROJECT_CONTEXT / PROJECT_RULES 撰寫

詳見 [PROJECT_RULES.md Part 0.1](PROJECT_RULES.md) 三人團隊紀律分工。

---

## 六、新加文件決策樹

1. 是「業務作業 SOP」？ → `nxXX/workflow/primary|sub/`
2. 是「畫面規劃」？ → `nxXX/ui/`（跨模組共用 → `_system/`）
3. 是「設計契約」？
   - Alex 寫的「要什麼」？ → `nxXX/spec/intent/`
   - Hank 寫的「怎麼寫」？ → `nxXX/spec/impl/`
4. 是「決策紀錄」？ → `_archive/YYYY-MM-DD_*.md`
5. 是「計畫書」？ → `_archive/YYYY-MM-DD_*.md`
6. 是「不變的真相來源」？
   - 跨模組？ → `_reference/`
   - 單模組？ → `nxXX/reference/`
7. 已完成的歷史 task log？ → `_archive/YYYY-MM/`
8. 動態狀態（branch / 蓋的房子 / 跨模組進度）？ → `_team/`

---

## 七、相關文件入口

- [CLAUDE.md](../CLAUDE.md) — Cursor / Claude Code 自動讀入口（stub 15 行、指向 PROJECT_RULES.md）
- [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) — 專案介紹 v2.1
- [PROJECT_RULES.md](PROJECT_RULES.md) — 規範合一手冊（Part I + II + III）
- [_team/git-state.md](_team/git-state.md) — 動態 branch 狀態
- [_team/worklog.md](_team/worklog.md) — 跨模組 task log（最新主題揭露當前進度）
- [_reference/route-table-v2.md](_reference/route-table-v2.md) — 路由標準
- [_reference/nx-table.csv](_reference/nx-table.csv) — 全模組表清單
- [_reference/version-feature-matrix.csv](_reference/version-feature-matrix.csv) — 版本方案功能矩陣

---

*文件結束*
