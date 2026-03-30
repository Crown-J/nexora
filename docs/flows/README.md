# NEXORA 流程文件總覽

本資料夾提供「每個流程一份 md」的規格與範例程式碼，對齊目前 `nx-api` / `nx-ui` 的運作方式。

## 文件索引

- [00-naming-convention.md](./00-naming-convention.md)
- [01-master-data-create.md](./01-master-data-create.md)
- [02-procurement-rfq-po.md](./02-procurement-rfq-po.md)
- [03-inbound-receipt.md](./03-inbound-receipt.md)
- [04-purchase-return.md](./04-purchase-return.md)
- [05-sales-quote-so.md](./05-sales-quote-so.md)
- [10-sales-quote-workbench-ui.md](./10-sales-quote-workbench-ui.md)（銷貨即時報價工作台：單屏整合＋鍵盤規格）
- [06-sales-return.md](./06-sales-return.md)
- [07-stocktaking.md](./07-stocktaking.md)
- [08-transfer.md](./08-transfer.md)
- [09-period-close.md](./09-period-close.md)

## 共通原則

- 外鍵在 UI 一律顯示 `CODE+NAME`，送出仍使用 `id`。
- 狀態轉移必須走服務層狀態機驗證，不可任意寫值。
- 寫入單據時，明細保留快照欄位（如 `partNo`、`partName`、`unitPriceSnapshot`）。
- 所有單據變更需寫入稽核紀錄（Audit Log）。
- 會影響庫存的流程（入庫/出庫/盤點/調撥）需同時更新：
  - `nx09_stock_balance`
  - `nx09_stock_txn`

## 已落地 vs 規格先行

- 已落地（可直接對照現行程式）：採購詢價/採購過帳、銷售報價/出貨、庫存台帳。
- 規格先行（本文件附完整骨架碼，供後續落地）：退貨、銷退、盤點、調撥、關帳。

