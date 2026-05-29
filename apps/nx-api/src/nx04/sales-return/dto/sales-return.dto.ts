import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * 銷退退款方式 returnAction（Crown Q-C3=A、仿 NX02 returnMode F/P/A）
 *   R = 退錢給客戶（走 NX05 Allowance allowanceType='S'、Phase 4 commit 4）
 *   D = 折讓下次採購（走 NX05 ArLedger 沖帳、Phase 4 commit 4）
 *   X = 換新品（不沖庫存、業務員手動建新 SO）
 * 本軌 純 dto 接收（schema 0 加欄、TODO 後續軌可加 returnAction 欄持久化）。
 */
const RETURN_ACTIONS = ['R', 'D', 'X'] as const;

export class CreateSalesReturnItemDto {
  @IsString()
  @MaxLength(15)
  soItemId!: string;

  @IsNumber()
  @Min(0.0001)
  qty!: number;

  @IsString()
  @MaxLength(1)
  returnReason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  returnType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  locationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  concessionReason?: string;

  /// 好品/壞品旗標（NX04-M2 §A C4 Crown 2026-05-29 Q5 方案 B）
  /// G=好品 → applyQtyInWithLedger 入主倉
  /// B=壞品 → 寫 Nx03IssueReport（issueType='D' 損毀）
  /// 預設 NULL（未檢查狀態）、過帳前必填（returnAction='X' 換新除外）
  @IsOptional()
  @IsString()
  @IsIn(['G', 'B'])
  @MaxLength(1)
  dispositionFlag?: 'G' | 'B';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class CreateSalesReturnDto {
  @IsString()
  @MaxLength(15)
  soId!: string;

  @IsDateString()
  srDate!: string;

  @IsString()
  @MaxLength(1)
  returnMethod!: string;

  @IsNumber()
  @Min(0)
  taxRate!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalesReturnItemDto)
  @ArrayMinSize(0)
  items?: CreateSalesReturnItemDto[];
}

export class UpdateSalesReturnDto {
  @IsOptional()
  @IsDateString()
  srDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  rejectReason?: string;

  /**
   * 退款方式（status=POSTED 時建議帶入、純 in-memory 分流：
   *   R/D → 既有 ledger 入庫 source=R + Phase 4 NX05 Allowance bridge
   *   X 換新 → skip ledger（業務員手動建新 SO）
   * NX04-IMPL-01 Phase 3 commit 3c 新增、本軌 schema 0 加欄。
   */
  @IsOptional()
  @IsString()
  @IsIn(RETURN_ACTIONS as unknown as string[])
  returnAction?: 'R' | 'D' | 'X';
}

export class PatchSalesReturnItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(15)
  locationId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  qty?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  returnReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  returnType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  concessionReason?: string;

  /// 好品/壞品旗標（NX04-M2 §A C4）
  @IsOptional()
  @IsString()
  @IsIn(['G', 'B'])
  @MaxLength(1)
  dispositionFlag?: 'G' | 'B';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}
