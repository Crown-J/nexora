// apps/nx-api/src/nx06/dynamic-handover/dto/dynamic-handover.dto.ts
// NX06 動態任務轉派 DTO

import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

const HANDOVER_STATUSES = ['SUGGESTED', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED'] as const;

/** 推薦動態交接候選（演算法輸入）。 */
export class SuggestHandoverDto {
  /** 要轉派的 DN id。 */
  @IsString()
  @MaxLength(15)
  dnId!: string;

  /** 半徑（km、可選、預設 5km）。 */
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  radiusKm?: number;

  /** 候選 driver 最大任務量（≥此值的 driver 被排除、預設 10）。 */
  @IsOptional()
  @IsInt()
  @Min(1)
  maxLoadPerDriver?: number;
}

/** 倉管組長拍板：建立 Handover 紀錄並送推播。 */
export class CreateHandoverDto {
  /** DN id。 */
  @IsString()
  @MaxLength(15)
  dnId!: string;

  /** 接手 driver user_id。 */
  @IsString()
  @MaxLength(15)
  toDriverId!: string;

  /** 交接地點 lat（演算法推薦時填）。 */
  @IsOptional()
  @IsNumber()
  handoverLat?: number;

  /** 交接地點 lng。 */
  @IsOptional()
  @IsNumber()
  handoverLng?: number;

  /** 交接地點地址。 */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  handoverAddress?: string;

  /** 演算法推薦理由（半徑 X km / 任務量平衡 / ETA 短 N 分）。 */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

/** 變更 handover 狀態（外務員 App 接受/拒絕、完成、取消）。 */
export class UpdateHandoverStatusDto {
  /** 新狀態（SUGGESTED → ACCEPTED → COMPLETED；任意 → CANCELLED；ACCEPTED 前 → REJECTED）。 */
  @IsString()
  @IsIn(HANDOVER_STATUSES as unknown as string[])
  status!: 'SUGGESTED' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
}
