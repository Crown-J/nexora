import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class Nx03StockBalanceListQueryDto {
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
  @MaxLength(15)
  warehouseId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  partId?: string;

  /// 庫存狀態篩選（all=全部、in_stock=有庫存、zero=零庫存、negative=負庫存、對齊 AUDIT-03 業務語意）
  @IsOptional()
  @IsString()
  @IsIn(['all', 'in_stock', 'zero', 'negative'])
  status?: 'all' | 'in_stock' | 'zero' | 'negative';
}
