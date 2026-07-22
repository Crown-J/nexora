// apps/nx-api/src/nx03/ship-zones/dto/ship-zones.dto.ts
// 出貨三區 DTO（SALES-FLOW 階段 3b）。封箱後依出貨方式路由：自取 / 寄貨 / 配送。

import { ArrayMinSize, IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** 三區佇列查詢：可選倉別。 */
export class ShipZonesQueryDto {
  @IsOptional()
  @IsString()
  warehouseId?: string;
}

/** 自取簽收：客人來取、核對後簽收 → 過帳完成。 */
export class SignPickupDto {
  @IsString()
  @MinLength(1)
  plId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  signerName!: string;
}

/** 寄貨寄出：交物流、輸入物流商 + 單號 → 視同送達過帳完成（D5）。 */
export class ShipMailDto {
  @IsString()
  @MinLength(1)
  plId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  logisticsProvider!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  trackingNo!: string;
}

/** 配送配單：把多張已封箱的配送包貨單組成一趟（一張配送單、指派外務）。 */
export class CreateDeliveryRunDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  plIds!: string[];

  @IsString()
  @MinLength(1)
  driverUserId!: string;
}
