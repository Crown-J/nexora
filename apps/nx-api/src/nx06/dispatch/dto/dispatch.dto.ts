// apps/nx-api/src/nx06/dispatch/dto/dispatch.dto.ts
// NX06 Dispatch DTO（倉管組長配單）
// 對齊 overview §3.1 #5 + Crown Q1（WAREHOUSE 倉管組長主操作）

import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AssignDispatchDto {
  /** 指派外務員 ID（FK nx01_user）。 */
  @IsString()
  @MaxLength(15)
  driverUserId!: string;

  /** 車牌號碼（選填）。 */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  vehicleNo?: string;
}
