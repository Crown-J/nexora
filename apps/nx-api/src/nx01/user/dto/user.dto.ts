import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { Nx01ListQueryDto } from '../../../shared/nx01/pagination.dto';

function csvToIdList(value: unknown): string[] | undefined {
  if (value == null || value === '') return undefined;
  if (Array.isArray(value)) {
    return value
      .flatMap((v) => String(v).split(','))
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 50);
  }
  const s = String(value).trim();
  if (!s) return undefined;
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 50);
}

/** 列表查詢：繼承共用分頁／search／isActive，並支援依「已指派角色」篩選（OR，nx01_user_role） */
export class ListUserQueryDto extends Nx01ListQueryDto {
  @IsOptional()
  @Transform(({ value }) => csvToIdList(value))
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(15, { each: true })
  primaryRoleIds?: string[];
}

export class CreateUserDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  userAccount!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(200)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  userName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateUserDto {
  /**
   * 員編可改（2026-06-02 員工編號制改造）：
   * - userAccount = 登入帳號 = 員工編號（自由輸入、租戶內唯一）
   * - 改完後該員工下次登入要用新帳號
   * - 內碼 id 不變、所有業務資料 / 角色 / 稽核紀錄 / FK 關聯完全保留
   */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  userAccount?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(200)
  password?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  userName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string | null;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
