<!-- docs/_team/sales-fulfillment-phase2-packing-schema-proposal.md -->
<!-- 檔案版本：v0.1（階段 2 schema 提案、待執行長 review 後才實作） -->
<!-- 檔案說明：撿包送階段 2「包貨可跨多張 SO」(D2) 的 schema 微調提案。
     2026-07-22 Hank 依 grep 現況撰寫。動 schema 前必經執行長拍板（CLAUDE.md §12）。 -->

# 階段 2 包貨 schema 提案：一張包貨單跨多張 SO

**版本** v0.1 提案 ｜ **狀態** 待執行長 review ｜ **依據** [[sales-fulfillment-pick-pack-ship-design]] §5-B D2、§5-D

---

## 1. 目標（D2 拍板）
一張包貨單可**跨多張銷貨單（SO）**——同車同客戶的多張 SO 併成一張包貨單一起包、封箱。
一張 SO 也可拆多箱（多包裹）。

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

## 6. ⚠️ 待你拍板的小決策
1. **跨 SO 併單的邊界**：同倉＋同出貨方式是硬條件。要不要再加「**同客戶／同送貨地址**」才准併？（配送＝同地址才有意義；自取／寄貨＝同客戶較合理）
   - 建議：配送要求同送貨地址；自取／寄貨要求同客戶。
2. **`pkId` 單源填 / 跨源 null** 這個做法 OK，還是你偏好**一律 null**（完全不靠 pl.pkId、只認 plItem 溯源）？
   - 建議：保留「單源填」，單張 SO 的常見情況資料較完整、報表好讀。
3. **要不要在 `Nx03Pl` 加一個 `primaryCustomerId` 客戶快照**（方便包裝箱單／三區清單直接顯示客戶、不用每次溯源）？還是靠 plItem 溯源即可、不加欄？
   - 建議：先不加、靠溯源；真的嫌慢再補（YAGNI）。

## 7. 影響摘要
- Schema 動 1 欄（widening、非破壞）。
- 破壞性等級：**低**——無資料遷移、無既有讀路徑受損、前端零改。
- migration 走 `prisma migrate dev` 產生單一 `DROP NOT NULL`；套用後 verify `\d nx03_pl` 確認 pk_id nullable。
