// apps/nx-api/src/nx03/issue-report/dto/issue-report.dto.ts
// NX03-STOCK-LITE M2-C：異常回報跨模組共用 DTO
//
// issueType（5 異常）：D=損毀 / E=過期 / S=數量短缺 / L=放錯庫位 / O=其他
// dispositionType（6 處置）：R=退貨 / W=保固 / C=重組分解 / D=報廢 / N=未處置 / X=特價售出（F1 2026-06-08）
// status（生命週期）：DRAFT / REPORTED / PROCESSING / CLOSED / CANCELLED

import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const ISSUE_TYPES = ['D', 'E', 'S', 'L', 'O'] as const;
export type IssueType = (typeof ISSUE_TYPES)[number];

// F1 特價售出 2026-06-08：第 6 處置 X（總經理拍板：借 SO + specialPriceFlag、成本原 avgCost、不走折讓直接特價）
export const DISPOSITION_TYPES = ['R', 'W', 'C', 'D', 'N', 'X'] as const;
export type DispositionType = (typeof DISPOSITION_TYPES)[number];

export const ISSUE_STATUSES = ['DRAFT', 'REPORTED', 'PROCESSING', 'CLOSED', 'CANCELLED'] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export class ListIssueReportQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

  @IsOptional()
  @IsIn(ISSUE_TYPES)
  issueType?: IssueType;

  @IsOptional()
  @IsIn(DISPOSITION_TYPES)
  dispositionType?: DispositionType;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  warehouseId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  partId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  sourceModule?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class CreateIssueReportDto {
  @IsDateString()
  reportDate!: string;

  @IsString()
  @MaxLength(15)
  warehouseId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  locationId?: string;

  @IsString()
  @MaxLength(15)
  partId!: string;

  @IsNumber()
  @Min(0)
  qty!: number;

  @IsIn(ISSUE_TYPES)
  issueType!: IssueType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;

  // 跨模組來源（軟連結、不建 FK）
  @IsOptional()
  @IsString()
  @MaxLength(10)
  sourceModule?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  sourceDocType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  sourceDocId?: string;
}

export class UpdateIssueReportDto {
  @IsOptional()
  @IsDateString()
  reportDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  locationId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  qty?: number;

  @IsOptional()
  @IsIn(ISSUE_TYPES)
  issueType?: IssueType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;
}

/** 處置分流 DTO：dispositionType + 關聯處置單據 ID（軟連結） */
export class DisposeIssueReportDto {
  @IsIn(DISPOSITION_TYPES)
  dispositionType!: DispositionType;

  // dispositionType ≠ 'N' 時建議帶（軟連結到對應模組單據）
  @IsOptional()
  @IsString()
  @MaxLength(15)
  relatedDocId?: string;

  // F1 特價售出 2026-06-08：dispositionType='X' 時、若 relatedDocId 為空、
  // service 會自動建一張特價 SO（specialPriceFlag=true）、需帶這幾個欄位：
  // - customerId（必、partner_type=C）
  // - warehouseId（出貨倉、預設取自 IR.warehouseId）
  // - unitPrice（業務手動填特價、單筆 line）
  @IsOptional()
  @IsString()
  @MaxLength(15)
  customerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  warehouseId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  // W5 異常鏈 Step 3 2026-07-11：一鍵開單。true 且 relatedDocId 為空時：
  // - D 報廢：IR 資料直建 Disposal DRAFT
  // - R 退貨 / W 保固：僅進貨驗收來源（IR 存有原 rrItem）可自動建、其他來源提示手動
  // - C 重組分解：outputs 需人工定義、不支援（提示手動建單後連結）
  @IsOptional()
  @IsBoolean()
  autoCreate?: boolean;
}

/** 結案 DTO：可帶 remark */
export class CloseIssueReportDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}
