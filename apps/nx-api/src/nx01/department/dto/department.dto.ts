// apps/nx-api/src/nx01/department/dto/department.dto.ts
// 02 第三批 T1 後續：部門主檔 CRUD DTO（schema 已存在、補 controller / service）
import { Transform, Type } from 'class-transformer';

import { toBoolean } from '../../../shared/dto/to-boolean';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

import { Nx01ListQueryDto } from '../../../shared/nx01/pagination.dto';

export class ListDepartmentQueryDto extends Nx01ListQueryDto {}

export class CreateDepartmentDto {
  @IsString() @MinLength(1) @MaxLength(20) code!: string;
  @IsString() @MinLength(1) @MaxLength(50) name!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortNo?: number;
  @IsOptional() @Transform(toBoolean) @IsBoolean() isActive?: boolean;
}

export class UpdateDepartmentDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(50) name?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortNo?: number;
  @IsOptional() @Transform(toBoolean) @IsBoolean() isActive?: boolean;
}
