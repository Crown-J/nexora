// apps/nx-api/src/nx02/purchase-stage/dto/purchase-stage.dto.ts
// NX02 PurchaseStage DTO（國外採購 6 階段流轉）
// 對齊 overview §3.7 + Crown Q-C3=A strict（推進）+ Q-C3-detail=b 任意回退

import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class TransitStageDto {
  /** 目標階段（1=備貨中 / 2=要求付款 / 3=待出貨 / 4=出貨上船 / 5=已到港 / 6=驗收完成）。 */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  targetStage!: number;

  /** 業務備註（可選、補充上下文如「報關行 email 通知到港」）。 */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
