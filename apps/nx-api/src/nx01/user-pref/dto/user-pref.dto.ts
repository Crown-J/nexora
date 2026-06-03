// apps/nx-api/src/nx01/user-pref/dto/user-pref.dto.ts
// 使用者偏好設定 DTO

import { IsObject, IsString, MaxLength, MinLength } from 'class-validator';

export class UpsertUserPrefDto {
  /** 偏好設定值（JSONB、彈性結構）*/
  @IsObject()
  prefValue!: Record<string, unknown>;
}

export class PrefKeyParamDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  prefKey!: string;
}
