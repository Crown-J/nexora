// apps/nx-api/src/nx02/ti/dto/ti.dto.ts
// NX02-TI-SHELL 2026-07-11：同行調貨單 DTO（TI 管理面首發）
//   ⛔ 無 CreateTiDto：TI 只能由兩個正規入口產生（SO 缺貨行群組建單 / 比價採用 adoptQt）、
//     明細 sourceSoItemId 為 schema 必填、不能憑空建單。

import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsNumber, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class UpdateTiDto {
  @IsOptional()
  @IsDateString()
  tiDate?: string;

  /** 狀態動作（API 全名）：SENT 發出 / REPLIED 同行已回覆；P/C 由轉進貨與 RR 過帳系統寫、不收 */
  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string | null;
}

export class PatchTiItemDto {
  @IsOptional()
  @IsNumber()
  qty?: number;

  /** 同行回價回填（寫入 unit_cost） */
  @IsOptional()
  @IsNumber()
  unitPriceSnapshot?: number;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  locationId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string | null;
}

export class TiToRrItemDto {
  @IsString()
  @MaxLength(15)
  tiItemId!: string;

  @IsNumber()
  qty!: number;

  @IsString()
  @MaxLength(15)
  locationId!: string;
}

export class TiToRrDto {
  @IsString()
  @MaxLength(15)
  warehouseId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TiToRrItemDto)
  items!: TiToRrItemDto[];
}
