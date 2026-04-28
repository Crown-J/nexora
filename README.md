<!-- README.md -->
# NEXORA GRID

汽車零件經銷商專用 SaaS ERP 系統，由伊諾瓦資訊科技（Innova IT）開發。

- **產品**：多租戶 SaaS ERP，三個版本（LITE / PLUS / PRO）
- **目標市場**：台灣 VAG（Volkswagen Audi Group）體系中小型汽車零件經銷商
- **Tech Stack**：Next.js 16.1.6 + NestJS + Prisma 7 + PostgreSQL（pnpm + Turbo monorepo）

## 📚 文件導航

新進團隊成員或新對話的 Alex 請先讀 PROJECT_CONTEXT.md：

- 🎯 [專案總覽與現況](docs/PROJECT_CONTEXT.md)
- 📐 [規格文件](docs/spec/)
- 🔄 [業務流程](docs/workflow/)
- 🎨 [畫面規劃](docs/ui/)
- 📅 [每日工作日誌](dailylog/)

## 🛠 本機開發

PostgreSQL 本機 Docker，**port 統一 5433**（家裡/辦公室兩台機器一致）。

```bash
pnpm install
pnpm prisma migrate dev
pnpm tsx packages/db-core/prisma/seed/index.ts --mode all --tier all
pnpm dev
```

詳細規範見 [CLAUDE.md](CLAUDE.md)（Cursor AI 工作規範）與 [PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md)（專案知識快照）。
