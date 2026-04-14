import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpsertKpiRecordDto {
  @IsString()
  @MaxLength(15)
  kpiTemplateId!: string;

  @IsString()
  @MaxLength(15)
  userId!: string;

  @Type(() => Number)
  @IsInt()
  periodYear!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  periodValue?: number;

  @Type(() => Number)
  @IsNumber()
  actualValue!: number;

  /** 若找不到對應 nx01_kpi_target，可手動帶入當期目標快照 */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  targetValueSnapshot?: number;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  kpiTargetId?: string;
}
