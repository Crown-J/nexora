import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

import { Nx07ListQueryDto } from '../../shared/nx07/nx07-list-query.dto';

export class Nx08KpiTargetListQueryDto extends Nx07ListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  periodYear?: number;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  userId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  kpiTemplateId?: string;
}
