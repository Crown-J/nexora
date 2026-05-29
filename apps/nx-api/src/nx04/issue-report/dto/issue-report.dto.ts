// apps/nx-api/src/nx04/issue-report/dto/issue-report.dto.ts
// NX04-M2 §A C6：跨單據問題回報入口 DTO（QT/SO/SR detail 右上「問題回報」按鈕）
import { IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

const SOURCE_DOC_TYPES = ['QT', 'SO', 'SR'] as const;
const ISSUE_TYPES = ['D', 'E', 'S', 'L', 'O'] as const; // 損毀/過期/短缺/放錯庫位/其他
const DISPOSITION_TYPES = ['R', 'W', 'C', 'D', 'N'] as const; // 退貨/保固/重組/報廢/未處置

export class CreateNx04IssueReportDto {
  @IsString()
  @IsIn(SOURCE_DOC_TYPES as unknown as string[])
  sourceDocType!: 'QT' | 'SO' | 'SR';

  @IsString()
  @MaxLength(15)
  sourceDocId!: string;

  @IsString()
  @MaxLength(15)
  partId!: string;

  @IsNumber()
  @Min(0)
  qty!: number;

  @IsString()
  @IsIn(ISSUE_TYPES as unknown as string[])
  issueType!: 'D' | 'E' | 'S' | 'L' | 'O';

  @IsOptional()
  @IsString()
  @IsIn(DISPOSITION_TYPES as unknown as string[])
  dispositionType?: 'R' | 'W' | 'C' | 'D' | 'N';

  @IsString()
  @MaxLength(15)
  warehouseId!: string;

  /// issueType='L' 放錯庫位時必填、其他選填
  @IsOptional()
  @IsString()
  @MaxLength(15)
  locationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
