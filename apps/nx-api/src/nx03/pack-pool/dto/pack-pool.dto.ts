// apps/nx-api/src/nx03/pack-pool/dto/pack-pool.dto.ts
// 包貨台 DTO（SALES-FLOW 階段 2）。以客戶為單位、預設一箱一單、同客戶小件可併箱。

import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

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
