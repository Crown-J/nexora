# 統一命名規範

## 1) 單據編號規則

格式：

`{TypeCode}{YYYYMM}{WarehouseCode}{Seq5}`

範例：

- `R202603Z0100001` 詢價單
- `P202603Z0100001` 採購單
- `S202603Z0100001` 銷貨單

TypeCode：

- `R` 詢價單
- `P` 採購單
- `I` 進貨單
- `O` 退貨單
- `Q` 報價單
- `S` 銷貨單
- `C` 銷退單
- `E` 調撥單
- `W` 盤點單
- `T` 撿貨單
- `D` 送貨單

## 2) 狀態常數命名

- 常數集合：`DOC_STATUS.<DOC>.<STATE>`
- 例如：
  - `DOC_STATUS.RFQ.DRAFT`
  - `DOC_STATUS.PO.POSTED`
  - `DOC_STATUS.SO.SHIPPED`

## 3) 服務與函式命名

- 服務：`<domain>FlowService`
  - `procurementFlowService`
  - `salesFlowService`
  - `inventoryFlowService`
- 轉單函式：`create<ToDoc>From<FromDoc>()`
  - `createPoFromRfq()`
  - `createSoFromQuote()`
  - `createPurchaseReturnFromReceipt()`

## 4) DTO / API 命名

- DTO:
  - `<Doc>Dto`
  - `Create<Doc>Body`
  - `Update<Doc>Body`
  - `List<Doc>Query`
- API 路徑：
  - `/nx01/rfq`
  - `/nx01/rfq/:id/to-po`
  - `/nx03/quote/:id/accept`

## 5) DB 欄位命名建議

- 表頭：
  - `doc_no`, `doc_date`, `status`, `currency`
- 明細：
  - `line_no`, `part_id`, `qty`, `unit_price`
- 快照：
  - `part_no`, `part_name`, `unit_cost_snapshot`, `unit_price_snapshot`
- 稽核：
  - `created_at`, `created_by`, `updated_at`, `updated_by`

## 6) 程式層統一原則

- Controller 僅負責請求/回應。
- Service 負責狀態機與交易流程。
- 涉及多表寫入一律 `prisma.$transaction(...)`。
- 狀態變更、轉單、過帳都要寫 audit log。

