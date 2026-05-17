// apps/nx-api/src/nx05/overdue-watcher/dto/overdue-watcher.dto.ts
// NX05 OverdueWatcher DTO（逾期催收警示查詢）
// 對齊 overview §6.4 + Crown Q4 + Q8=a（共享 NX04 CreditGuard tenant 閾值）

import { IsOptional, IsString, MaxLength } from 'class-validator';

export class OverdueWatcherListQueryDto {
  /** 過濾特定客戶（null=全 tenant 所有客戶）。 */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  customerId?: string;
}
