// apps/nx-api/src/nx01/permission-level/dto/permission-level.dto.ts
// 職務↔權限拆分軌 Step3：權限等級 DTO

import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { Nx01ListQueryDto } from '../../../shared/nx01/pagination.dto';

export class ListPermissionLevelQueryDto extends Nx01ListQueryDto {}

export class CreatePermissionLevelDto {
  @IsString() @MinLength(1) @MaxLength(30) code!: string;
  @IsString() @MinLength(1) @MaxLength(50) name!: string;
  @IsOptional() @IsString() @MaxLength(200) description?: string;
  @IsOptional() @Type(() => Number) @IsInt() sortNo?: number;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}

export class UpdatePermissionLevelDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(50) name?: string;
  @IsOptional() @IsString() @MaxLength(200) description?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() sortNo?: number;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}

export class SetLevelPermissionsDto {
  @IsArray() @ArrayMinSize(0) @IsString({ each: true }) permissionCodes!: string[];
}
