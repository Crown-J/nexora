// apps/nx-api/src/nx01/part-search/dto/part-search.dto.ts
// F2 料號即時搜尋 query DTO（執行長 2026-06-17 拍板）
//
// 四欄篩選：brandId（廠牌）/ partGroupId（族群）/ keyword（品名含注音）/ partNo（料號含正廠/副廠/舊料號/正廠對應）
// 防全表掃描：service 端強制至少一欄非空。
// pageSize 上限 100（沿用 Nx01ListQueryDto 設計）；前端 infinite scroll、累計上限 500 筆。
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

function toOptionalBool(value: unknown): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  const s = String(value).trim().toLowerCase();
  if (s === '') return undefined;
  if (s === 'true' || s === '1') return true;
  if (s === 'false' || s === '0') return false;
  return undefined;
}

export class PartSearchQueryDto {
  /** 廠牌 ID（refOptions value）*/
  @IsOptional() @IsString() @MaxLength(15) brandId?: string;

  /** 零件族群 ID */
  @IsOptional() @IsString() @MaxLength(15) partGroupId?: string;

  /**
   * 品名關鍵字（同時打：name contains + 注音聲母碼 contains）。
   * 前端 F4 候選下拉若選定具體中文詞，會把該詞填回此欄。
   */
  @IsOptional() @IsString() @MaxLength(100) keyword?: string;

  /**
   * 使用料號（正規化比對：code / oldCode / secCode / oemCode 子表）。
   * 支援 VAG-03H、VAG 03H、03H 115 562、03H.115.562 都命中（去 [ #-*.]）。
   */
  @IsOptional() @IsString() @MaxLength(100) partNo?: string;

  /** 含停用品（預設 false：只看 isActive=true）*/
  @IsOptional()
  @Type(() => Object)
  @Transform(({ value }) => toOptionalBool(value))
  @IsBoolean()
  includeInactive?: boolean;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}
