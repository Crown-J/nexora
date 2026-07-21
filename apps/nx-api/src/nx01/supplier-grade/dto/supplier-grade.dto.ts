// apps/nx-api/src/nx01/supplier-grade/dto/supplier-grade.dto.ts
// LITE 階段 1 M2-c：供應商分級主檔 DTO。
// 05 批 T4 2026-06-07：半開放升級 — 開放 Create、A/B/C/D 內建 lock（不可刪、code 不可改）。
//   保住 partner.recalcSupplierGradeByPaymentTerm 的自動分級邏輯（依賴內建 A/B/C/D）。
import { Transform, Type } from 'class-transformer';

import { toBoolean } from '../../../shared/dto/to-boolean';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { Nx01ListQueryDto } from '../../../shared/nx01/pagination.dto';

export class ListSupplierGradeQueryDto extends Nx01ListQueryDto {}

/**
 * 05 批 T4 2026-06-07：CREATE DTO（開放客戶新增自訂等級、例：VIP / 列管）
 * code 由 service 端 trim + uppercase；不限制必為 A/B/C/D（客戶可自由命名）。
 */
export class CreateSupplierGradeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: boolean;
}

/**
 * supplier_grade UPDATE DTO（M2-c）
 *
 * ⚠️ 故意不含 code 欄位 — 業務語意：建立後不可改 code（lockedOnEdit 範式）
 *    DTO 層攔截、service 不必再做 code lock guard。
 */
export class UpdateSupplierGradeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: boolean;
}
