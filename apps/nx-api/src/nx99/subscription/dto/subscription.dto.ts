import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ListSubscriptionsQueryDto {
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

  /** 平台管理員可指定租戶；未指定則依 JWT tenantId */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  tenantId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['A', 'E', 'C'])
  status?: string;
}
