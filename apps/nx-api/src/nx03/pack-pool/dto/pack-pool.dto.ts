// apps/nx-api/src/nx03/pack-pool/dto/pack-pool.dto.ts
// 包貨台 DTO（SALES-FLOW 階段 2）。以客戶為單位、預設一箱一單、同客戶小件可併箱。

import { ArrayNotEmpty, IsArray, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

/** 包貨台查詢：可選倉別 + 關鍵字。 */
export class PackPoolQueryDto {
  @IsOptional()
  @IsString()
  warehouseId?: string;

  /** 關鍵字（客戶名 / 銷貨單號 / 料號）。 */
  @IsOptional()
  @IsString()
  search?: string;
}

/**
 * 建包貨單：把某客戶某出貨方式的「已撿完待包」行整批進包貨單。
 * 預設一箱一張銷貨單（自動產包裹）；併箱由後續 mergeParcels。
 */
export class CreatePackingDto {
  @IsString()
  @MinLength(1)
  customerId!: string;

  @IsString()
  @MinLength(1)
  warehouseId!: string;

  /** 出貨方式（D=配送 / P=自取 / C=寄貨）。一張包貨單只含一種出貨方式。 */
  @IsIn(['D', 'P', 'C'])
  deliveryType!: 'D' | 'P' | 'C';
}

/** 併箱：把來源包裹的貨全部併進目標包裹、刪空來源包裹。 */
export class MergeParcelsDto {
  @IsString()
  @MinLength(1)
  plId!: string;

  @IsString()
  @MinLength(1)
  sourceParcelId!: string;

  @IsString()
  @MinLength(1)
  targetParcelId!: string;
}

/** 封箱：包貨單 C→F 完成。 */
export class SealPackingDto {
  @IsString()
  @MinLength(1)
  plId!: string;
}

// ── WMS 包貨兩區重設計（2026-07-24 執行長拍板）：右邊三區建箱、從左拉貨 ──

/** 建空箱：指定出貨方式（自取/寄貨/配送）、進對應區。 */
export class CreateBoxDto {
  @IsIn(['D', 'P', 'C'])
  deliveryType!: 'D' | 'P' | 'C';

  @IsString()
  @MinLength(1)
  warehouseId!: string;
}

/** 加貨進箱：把左邊已撿貨（撿貨明細 id）加進箱（可整張單多筆或單筆）。 */
export class AddToBoxDto {
  @IsString()
  @MinLength(1)
  plId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  pkItemIds!: string[];
}

/** 從箱移出一筆貨（退回左邊已撿貨池）。 */
export class RemoveFromBoxDto {
  @IsString()
  @MinLength(1)
  plId!: string;

  @IsString()
  @MinLength(1)
  pkItemId!: string;
}

/** 丟棄空箱（或把箱內貨全退回池後刪箱）。 */
export class DiscardBoxDto {
  @IsString()
  @MinLength(1)
  plId!: string;
}

// ── WMS 包貨單據頁 + 5 步精靈（2026-07-24 執行長拍板、Phase A）──

/** 包裹列表查詢（DocWorkbench fetchList）。 */
export class PackageListQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  /** 狀態（C=建箱中/F=已封箱/S=已寄出）。 */
  @IsOptional()
  @IsString()
  status?: string;

  /** 出貨方式（D/P/C）。 */
  @IsOptional()
  @IsString()
  deliveryType?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  pageSize?: string;
}

/** 精靈步驟 1：可撿SO查詢（已撿完待包、可選出貨方式過濾）。 */
export class PickableSoQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['D', 'P', 'C'])
  deliveryType?: 'D' | 'P' | 'C';

  @IsOptional()
  @IsString()
  warehouseId?: string;
}

/** 精靈完成：一次把選定的已撿貨（撿貨明細）建成一個包裹。 */
export class CreatePackageDto {
  @IsIn(['D', 'P', 'C'])
  deliveryType!: 'D' | 'P' | 'C';

  @IsString()
  @MinLength(1)
  warehouseId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  pkItemIds!: string[];
}
