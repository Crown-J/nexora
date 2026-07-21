// apps/nx-api/src/nx01/part-kit/dto/part-kit.dto.ts
// 2026-06-26：組合/拆解組件關係 DTO
// 業務：一個「整體件」= 一組「組件（含數量）」。種類3 拆解 / 種類4 組合。
import { Transform, Type } from 'class-transformer';

import { toBoolean } from '../../../shared/dto/to-boolean';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { Nx01ListQueryDto } from '../../../shared/nx01/pagination.dto';

export class ListPartKitQueryDto extends Nx01ListQueryDto {
  /** 依整體件過濾（查某料號被拆/組成哪些組件） */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  wholePartId?: string;
}

export class PartKitItemInput {
  @IsString()
  @MinLength(1)
  @MaxLength(15)
  partId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  qty!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string | null;
}

export class CreatePartKitDto {
  /** 整體件 FK（被替代的單一料號：種類3=正廠總成 / 種類4=副廠合成件） */
  @IsString()
  @MinLength(1)
  @MaxLength(15)
  wholePartId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string | null;

  /** 組件明細（至少 1 筆） */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartKitItemInput)
  items!: PartKitItemInput[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePartKitDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string | null;

  /** 提供時整批取代組件明細；undefined 則不動 */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartKitItemInput)
  items?: PartKitItemInput[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isActive?: boolean;
}
