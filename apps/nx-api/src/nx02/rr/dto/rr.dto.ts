import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

// T2-b 進貨對齊批次 2026-06-07：驗收欄位後端補（5 欄）
// 業務規則：defectQty>0 時 defectType+defectDesc 必填；warrantyExpiredAt 預設由 part.warrantyMonths 自動算；
//          batchNo 預設由 service 依 RR 日期 + line_no 自動產（YYYYMM + 3 碼）。
const DEFECT_TYPES = ['D', 'F', 'W', 'O'] as const;

export class CreateRrItemDto {
  @IsString()
  @MaxLength(15)
  partId!: string;

  @IsString()
  @MaxLength(15)
  locationId!: string;

  @IsNumber()
  qty!: number;

  @IsNumber()
  /** 單位成本（寫入 unit_cost，即單價快照） */
  unitPriceSnapshot!: number;

  @IsOptional()
  @IsNumber()
  expectedQty?: number;

  @IsOptional()
  @IsNumber()
  actualQty?: number | null;

  // T2-b：瑕疵 / 批號 / 保固 5 欄
  @IsOptional()
  @IsNumber()
  defectQty?: number;

  @IsOptional()
  @IsString()
  @IsIn(DEFECT_TYPES as unknown as string[])
  defectType?: 'D' | 'F' | 'W' | 'O' | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  defectDesc?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  batchNo?: string | null;

  @IsOptional()
  @IsDateString()
  warrantyExpiredAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class CreateRrDto {
  @IsDateString()
  rrDate!: string;

  @IsString()
  @MaxLength(15)
  warehouseId!: string;

  @IsString()
  @MaxLength(15)
  supplierId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  rfqId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  poId?: string;

  // NX02-TI-SHELL 2026-07-11：來源同行調貨單（TI 轉進貨用；過帳時回寫 TI 完成 + SO 缺貨行補貨完成）
  @IsOptional()
  @IsString()
  @MaxLength(15)
  tiId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currencyId?: string;

  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateRrItemDto)
  items!: CreateRrItemDto[];
}

export class UpdateRrDto {
  @IsOptional()
  @IsDateString()
  rrDate?: string;

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

  // T6 進貨對齊批次 2026-06-08：提貨單號（國外進口用、報關行核發）
  @IsOptional()
  @IsString()
  @MaxLength(50)
  deliveryOrderNo?: string | null;
}

export class PatchRrItemDto {
  @IsOptional()
  @IsNumber()
  qty?: number;

  @IsOptional()
  @IsNumber()
  unitPriceSnapshot?: number;

  @IsOptional()
  @IsNumber()
  expectedQty?: number;

  @IsOptional()
  @IsNumber()
  actualQty?: number | null;

  // T2-b：瑕疵 / 批號 / 保固 5 欄
  @IsOptional()
  @IsNumber()
  defectQty?: number;

  @IsOptional()
  @IsString()
  @IsIn(DEFECT_TYPES as unknown as string[])
  defectType?: 'D' | 'F' | 'W' | 'O' | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  defectDesc?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  batchNo?: string | null;

  @IsOptional()
  @IsDateString()
  warrantyExpiredAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string | null;
}
