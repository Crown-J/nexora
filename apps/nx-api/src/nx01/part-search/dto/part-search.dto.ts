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
  /** 廠牌 ID（保留、若有就走 ID 精準篩；前端 v2 改用 brandQuery）*/
  @IsOptional() @IsString() @MaxLength(15) brandId?: string;

  /** 廠牌關鍵字（brand.code 或 brand.name 含此字、執行長 2026-06-17 拍板四欄都 input）*/
  @IsOptional() @IsString() @MaxLength(100) brandQuery?: string;

  /** 零件族群 ID（保留、若有就走 ID 精準篩；前端 v2 改用 partGroupQuery）*/
  @IsOptional() @IsString() @MaxLength(15) partGroupId?: string;

  /** 零件族群關鍵字（part_group.code 或 name 含此字）*/
  @IsOptional() @IsString() @MaxLength(100) partGroupQuery?: string;

  /**
   * 車型關鍵字（model.code 或 name 含此字、經 part_model 關聯篩出適用該車型之料件）。
   * 執行長 2026-06-26：品名/廠牌/族群 三查法加車型縮小範圍用（次要 AND 篩選）。
   */
  @IsOptional() @IsString() @MaxLength(100) modelQuery?: string;

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

  /**
   * 通用件群組樹模式（執行長 2026-06-24 F2 視窗 1 重做）。
   * true → 在回應內補 groups + ungrouped：以「主件→替代品」歸組顯示。
   * 不影響既有 rows 欄位（向下相容、舊版第三版 modal 仍可用）。
   */
  @IsOptional()
  @Type(() => Object)
  @Transform(({ value }) => toOptionalBool(value))
  @IsBoolean()
  groupByCompat?: boolean;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}
