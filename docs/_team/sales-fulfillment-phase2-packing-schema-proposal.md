<!-- docs/_team/sales-fulfillment-phase2-packing-schema-proposal.md -->
<!-- 檔案版本：v0.2（2026-07-22 執行長澄清「以客戶為單位、預設一箱一單、同客戶小件可 opt-in 併箱」後修正） -->
<!-- 檔案說明：撿包送階段 2「包貨」的 schema 微調提案。
     2026-07-22 Hank 依 grep 現況撰寫、當日依執行長澄清修正 D2 語意。動 schema 前必經執行長拍板（CLAUDE.md §12）。 -->

# 階段 2 包貨 schema 提案：包貨以客戶為單位、同客戶小件可併箱

**版本** v0.2 提案 ｜ **狀態** 待執行長 review ｜ **依據** [[sales-fulfillment-pick-pack-ship-design]] §5-B D2、§5-D

---

## 1. 目標（D2 澄清後語意，2026-07-22）
- **預設：一箱一張銷貨單**——一個包裹裡只有一張 SO 的貨，追溯最乾淨。一張 SO 可拆多箱（大件分箱）。
- **例外（省包材）：同一客戶的多張小單可 opt-in 併成一箱**——packer 當下手動勾選，非系統自動。
  背景：即時銷貨會讓同客戶開一堆各含一樣小東西的單，一單一箱浪費包材。
- 包貨台**以客戶為單位**呈現：同客戶的已撿完貨疊一起，預設各單各箱、需要時才併箱。
- ⚠️ 併箱三條件：**同倉 + 同出貨方式 + 同客戶**（一箱只能進一個三區、故出貨方式必須一致；配送再要求同送貨地址）。

## 2. 現況約束（grep 實測、動手前的真相）
| 欄位 / 邏輯 | 現況 | 對跨 SO 的阻礙 |
|---|---|---|
| `Nx03Pl.pkId` | **必填** FK → 一張撿貨單 | ⛔ 一張包貨單只能綁一張撿貨單。撿貨池改制後「一 SO 一張隱形撿貨單」，跨 SO＝跨多張撿貨單，塞不進單一 pkId |
| `Nx03PlItem.pkItemId` | 必填 FK → 撿貨明細 | ✅ 不阻礙。逐行溯源 pk_item→refSoItemId→SO，跨 SO 仍可完整追 |
| `pl.service.create` | 讀 `dto.pkId`、只從那**一張** PK 撈 status=C 的行、且 `plType 必須=pk.deliveryType` | 🛠 service 層邏輯要改（非 schema），見 §4 |
| 前端 `Pl.pkId` 型別 / 顯示 | 型別已 `pkId?: string \| null`、顯示 `pkNo ?? pkId ?? '—'` | ✅ 早已當可空處理、不會壞 |
| 報表 / 其他 join | grep 全庫：**無**其他讀路徑依賴 pl.pkId 非空 | ✅ 安全 |

## 3. 核心 schema 改動（就這一個）
**把 `Nx03Pl.pkId` 從必填改成選填（nullable）。**

```prisma
// 變更前
pkId  String  @map("pk_id") @db.VarChar(15)
pk    Nx03Pk  @relation("R_Nx03Pl_pkId", fields: [pkId], references: [id])

// 變更後
pkId  String?  @map("pk_id") @db.VarChar(15)   // 選填：單一撿貨單來源時填；跨 SO（多撿貨單）時留 null，逐行靠 plItem.pkItemId 溯源
pk    Nx03Pk?  @relation("R_Nx03Pl_pkId", fields: [pkId], references: [id])
```

- **語意**：`pkId` 只在「這張包貨單全部來自同一張（隱形）撿貨單」時填；跨 SO 時留 null。真正的逐行來源永遠靠 `PlItem.pkItemId` → `pk_item.refSoItemId` → SO，跨不跨 SO 都追得到。
- **migration**：`ALTER TABLE nx03_pl ALTER COLUMN pk_id DROP NOT NULL` —— **非破壞性 widening**，既有資料一列不動（現有 rows 的 pkId 仍在）。
- **回滾注意**：若日後要回填 NOT NULL，需先確保無 null 列（跨 SO 的包貨單會是 null）。屬單向放寬、實務上不會回收。

## 4. 連帶的 service 改法（非 schema、屬階段 2 實作，先讓你知道全貌）
`pl.service.create` 改成**從撿貨池「已撿完」的行撈貨**，不再綁單一 pkId：
- 入參從 `pkId` 改成 `pkItemIds: string[]`（倉管在包貨台勾選的已撿完行、可跨 SO / 跨隱形撿貨單）。
- 校驗：全部 `pk_item.status='C'`（已撿完）、**同一出貨倉**、**同一出貨方式**（deliveryType 一致）、且**未被包過**（無其他非作廢包貨單已引用該 pk_item）。
- 建 PL：`pkId` 單源時填該撿貨單、跨源時 null；`plType` = 那批行共同的出貨方式。
- `PlItem` 每行照舊帶 `pkItemId`（溯源不變）。
- 既有「PL 啟動→行 fulfillStatus PK→PL」推手（`soItemIdsOfPl` 經 plItem→pkItem 反查）**跨 SO 自動成立、不用改**。

## 5. 不動的部分
- `Nx03Parcel`（包裹）：BX-年月-倉-流水 編號、parcelType 都在，一張 PL 拆多箱本就支援（`PlItem.parcelId` 逐行分箱）。**零改動**。
- `Nx03PlItem.pkItemId`：維持必填、維持逐行溯源。
- 扣庫存 / 開應收：仍不在包貨動（依 D4/D6 留到階段 3 簽收才搬）。

## 6. 決策狀態
1. **併箱邊界**：✅ 定案（2026-07-22）＝同倉 + 同出貨方式 + 同客戶；配送再要求同送貨地址。預設一箱一單、併箱為 packer opt-in。
2. **`pkId` 單源填 / 跨源 null**：⚠️ 待拍。建議保留「單源填、併箱時 null」，單張 SO 的常見情況資料較完整、報表好讀。（替代：一律 null、完全改認 plItem 溯源）
3. **要不要在 `Nx03Pl` 加 `primaryCustomerId` 客戶快照**：⚠️ 待拍。因包貨改「以客戶為單位」、一張包貨單天然對一個客戶，加一欄客戶快照可讓三區清單／裝箱單免溯源直接顯示。建議**這次加**（比 v0.1 更划算，因為單位就是客戶）。若加，schema 改動變 2 欄（pkId nullable + 新增 customerId）。

## 7. 影響摘要
- Schema 動 1~2 欄：`pkId` DROP NOT NULL（widening、非破壞）；若拍板 #3 再新增 `customerId`（nullable、additive）。兩者皆非破壞。
- 破壞性等級：**低**——無資料遷移、無既有讀路徑受損、前端零改。
- migration 走 `prisma migrate dev`；套用後 verify `\d nx03_pl` 確認 pk_id nullable（＋ customer_id 若加）。
- ⚠️ 依 [[feedback_prisma7_quirks]]：migrate dev 產出若含誤植 `DROP INDEX`（PRZ-01）需移除；multi-clause ALTER 拆獨立 statement（PRZ-02）。
