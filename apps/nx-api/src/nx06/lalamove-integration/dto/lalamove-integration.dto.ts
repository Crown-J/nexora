// apps/nx-api/src/nx06/lalamove-integration/dto/lalamove-integration.dto.ts
// NX06 LalamoveIntegration DTO（Lalamove API 半自動整合）
// 對齊 overview §3.1 #9 + Crown Q6=b

import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/** Lalamove callback status enum（webhook 更新）。 */
const CALLBACK_STATUSES = ['PENDING', 'ASSIGNING', 'PICKED_UP', 'COMPLETED', 'CANCELLED'] as const;

export class CreateLalamoveOrderDto {
  /** 額外備註（給 Lalamove driver）。 */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  driverNote?: string;
}

export class LalamoveWebhookDto {
  /** Lalamove API 訂單 ID。 */
  @IsString()
  @MaxLength(50)
  lalamoveOrderId!: string;

  /** 最新狀態（webhook payload）。 */
  @IsString()
  @IsIn(CALLBACK_STATUSES as unknown as string[])
  callbackStatus!: 'PENDING' | 'ASSIGNING' | 'PICKED_UP' | 'COMPLETED' | 'CANCELLED';

  /** 追蹤碼（可選、ASSIGNING 後填入）。 */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  trackingNo?: string;

  /** 實際配送費用（COMPLETED 時 Lalamove 回傳）。 */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  actualFee?: string;
}
