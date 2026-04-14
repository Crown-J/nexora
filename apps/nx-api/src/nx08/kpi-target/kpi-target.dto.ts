import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateKpiTargetDto {
  @IsString()
  @MaxLength(15)
  kpiTemplateId!: string;

  @IsString()
  @MaxLength(1)
  targetType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  roleId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  userId?: string;

  @Type(() => Number)
  @IsInt()
  periodYear!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  periodValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  targetValue?: number;
}

export class PatchKpiTargetDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  targetValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  periodValue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  targetType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  roleId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  userId?: string;
}
