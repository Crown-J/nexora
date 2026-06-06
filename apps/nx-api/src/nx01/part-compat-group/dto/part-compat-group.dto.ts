// apps/nx-api/src/nx01/part-compat-group/dto/part-compat-group.dto.ts
// 02 對齊第二批 C 軌 CP2-c 2026-06-06：通用件群組 + member DTO
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

import { Nx01ListQueryDto } from '../../../shared/nx01/pagination.dto';

// role enum：1=PRIMARY 主件 / 2=ALT 替代品
const COMPAT_ROLES = [1, 2] as const;

export class ListPartCompatGroupQueryDto extends Nx01ListQueryDto {}

export class CreatePartCompatGroupDto {
  @IsString() @MinLength(1) @MaxLength(30) code!: string;
  @IsString() @MinLength(1) @MaxLength(100) name!: string;
  @IsOptional() @IsString() @MaxLength(200) remark?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortNo?: number;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}

export class UpdatePartCompatGroupDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(200) remark?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortNo?: number;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}

export class CreateGroupMemberDto {
  @IsString() @MinLength(1) @MaxLength(15) partId!: string;
  /** 1=PRIMARY 主件 / 2=ALT 替代品 */
  @IsOptional() @Type(() => Number) @IsInt() @IsIn(COMPAT_ROLES) role?: number;
  /** 群組內專屬售價（null=用 part.priceA 預設） */
  @IsOptional() @Type(() => Number) @IsNumber() customPrice?: number;
  /** true=A↔B 雙向互為替代品；false=A→B 單向 */
  @IsOptional() @Type(() => Boolean) @IsBoolean() isBidirectional?: boolean;
  @IsOptional() @IsString() @MaxLength(200) remark?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortNo?: number;
}

export class UpdateGroupMemberDto {
  @IsOptional() @Type(() => Number) @IsInt() @IsIn(COMPAT_ROLES) role?: number;
  @IsOptional() @Type(() => Number) @IsNumber() customPrice?: number | null;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isBidirectional?: boolean;
  @IsOptional() @IsString() @MaxLength(200) remark?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortNo?: number;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}
