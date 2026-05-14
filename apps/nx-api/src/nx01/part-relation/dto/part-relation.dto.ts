// apps/nx-api/src/nx01/part-relation/dto/part-relation.dto.ts
// 對應規格：docs/nx01/spec/intent/nx01-17-part-version-relation.md v1.0
// 軸 1：relationType 升 SmallInt 1~5
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { Nx01ListQueryDto } from '../../../shared/nx01/pagination.dto';

/** relationType：1=改號 / 2=同款 / 3=改版換周邊 / 4=組合包 / 5=拆解包 */
export const RELATION_TYPE_MIN = 1;
export const RELATION_TYPE_MAX = 5;

export class ListPartRelationQueryDto extends Nx01ListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(15)
  partIdFrom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  partIdTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(RELATION_TYPE_MIN)
  @Max(RELATION_TYPE_MAX)
  relationType?: number;
}

export class CreatePartRelationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(15)
  partIdFrom!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(15)
  partIdTo!: string;

  @Type(() => Number)
  @IsInt()
  @Min(RELATION_TYPE_MIN)
  @Max(RELATION_TYPE_MAX)
  relationType!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePartRelationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(RELATION_TYPE_MIN)
  @Max(RELATION_TYPE_MAX)
  relationType?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortNo?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
