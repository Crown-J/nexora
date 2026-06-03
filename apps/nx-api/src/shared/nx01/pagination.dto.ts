import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * query string boolean 解析（class-transformer @Type(()=>Boolean) 的坑：
 *   Boolean('false') = true、Boolean('0') = true，會導致 isActive=false 失效）。
 * 顯式接受：boolean 直送 / 'true'|'1' → true / 'false'|'0' → false / 空字串或 undefined → undefined
 */
function toOptionalBool(value: unknown): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  const s = String(value).trim().toLowerCase();
  if (s === '') return undefined;
  if (s === 'true' || s === '1') return true;
  if (s === 'false' || s === '0') return false;
  return undefined;
}

/** 列表共用：分頁 + 模糊搜尋 + isActive 篩選 */
export class Nx01ListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalBool(value))
  @IsBoolean()
  isActive?: boolean;
}
