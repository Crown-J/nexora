// apps/nx-api/src/nx01/partner-contact/dto/partner-contact.dto.ts
// 02 第三批 T2 2026-06-07：partner 聯絡窗口子表 DTO
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreatePartnerContactDto {
  @IsString() @MinLength(1) @MaxLength(50) contactName!: string;
  @IsOptional() @IsString() @MaxLength(50) jobTitle?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsString() @MaxLength(20) phoneExt?: string;
  @IsOptional() @IsString() @MaxLength(30) mobile?: string;
  @IsOptional() @IsString() @MaxLength(100) email?: string;
  @IsOptional() @IsString() @MaxLength(200) note?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortNo?: number;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}

export class UpdatePartnerContactDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(50) contactName?: string;
  @IsOptional() @IsString() @MaxLength(50) jobTitle?: string | null;
  @IsOptional() @IsString() @MaxLength(30) phone?: string | null;
  @IsOptional() @IsString() @MaxLength(20) phoneExt?: string | null;
  @IsOptional() @IsString() @MaxLength(30) mobile?: string | null;
  @IsOptional() @IsString() @MaxLength(100) email?: string | null;
  @IsOptional() @IsString() @MaxLength(200) note?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortNo?: number;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}
