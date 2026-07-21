// apps/nx-api/src/nx01/customer-grade/dto/customer-grade.dto.ts
// 對應規格：docs/nx01/spec/intent/nx01-07-base-catalog.md v1.0
// Crown 拍 Q1=A：OWNER 可改 marginPct + name + sortNo + isActive、code 鎖（A/B/C/D 4 級固定）
import { Transform, Type } from 'class-transformer';

import { toBoolean } from '../../../shared/dto/to-boolean';
import {
  IsBoolean,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { Nx01ListQueryDto } from '../../../shared/nx01/pagination.dto';

export class ListCustomerGradeQueryDto extends Nx01ListQueryDto {}

/**
 * customer_grade UPDATE DTO（規格 §6 拍 Q1=A）
 *
 * ⚠️ 故意不含 code 欄位 — 業務語意：A/B/C/D 4 級固定、不可改 code
 *    DTO 層攔截、service 不必再做 code lock guard、Whitelist ValidationPipe 自動防護。
 */
export class UpdateCustomerGradeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name?: string;

  /** 最低毛利率（%）、Decimal(5,2)、傳 string 避 JS number 精度 */
  @IsOptional()
  @IsNumberString({ no_symbols: false })
  marginPct?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: boolean;
}
