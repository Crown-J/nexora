// apps/nx-api/src/nx01/phonetic-dictionary/dto/phonetic-dictionary.dto.ts
// 對應規格：docs/nx01/spec/intent/nx01-10-phonetic-search.md v1.0 §4.1
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { Nx01ListQueryDto } from '../../../shared/nx01/pagination.dto';

export class ListPhoneticDictionaryQueryDto extends Nx01ListQueryDto {
  /** 依注音首碼篩選（如 ㄅ） */
  @IsOptional()
  @IsString()
  @MaxLength(2)
  primaryInitial?: string;
}

export class CreatePhoneticDictionaryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4)
  character!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10)
  primaryPhonetic!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  altPhonetics?: string[];

  @IsString()
  @MinLength(1)
  @MaxLength(2)
  primaryInitial!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  usageFreq?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePhoneticDictionaryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  primaryPhonetic?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  altPhonetics?: string[];

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2)
  primaryInitial?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  usageFreq?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
