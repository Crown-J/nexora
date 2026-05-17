// apps/nx-api/src/nx04/credit-guard/dto/credit-guard.dto.ts
// NX04 CreditGuard DTO（客戶授信擋單 4 機制查詢）
// 對齊 overview §4 + Crown Q3 + Q7 + Q-C4=A 執行順序

import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class CheckCreditDto {
  /** 客戶 ID（FK nx01_partner partner_type='C'）。 */
  @IsString()
  @MaxLength(15)
  customerId!: string;

  /** 本次 SO 金額（含稅、用於額度超額判斷）。 */
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  soAmount!: number;

  /** 預期付款條件（可選、CreditGuard 可能改寫成現金銷售）。 */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  paymentTerm?: string;
}
