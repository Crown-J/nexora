// apps/nx-api/src/nx01/supplier-grade/dto/supplier-grade.dto.ts
// LITE 階段 1 M2-c：供應商分級主檔 DTO。
// 對齊 customer-grade DTO 範式、code 鎖（A/B/C/D 固定、由 seed 維護、tenant 不可加/刪）。
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { Nx01ListQueryDto } from '../../../shared/nx01/pagination.dto';

export class ListSupplierGradeQueryDto extends Nx01ListQueryDto {}

/**
 * supplier_grade UPDATE DTO（M2-c）
 *
 * ⚠️ 故意不含 code 欄位 — 業務語意：A/B/C/D 4 級固定、不可改 code
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
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
