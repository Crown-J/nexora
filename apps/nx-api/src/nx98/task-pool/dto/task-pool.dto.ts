// apps/nx-api/src/nx98/task-pool/dto/task-pool.dto.ts
// LITE 階段 1 M4：共享待辦池 DTO

import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const PRIORITIES = ['L', 'M', 'H'] as const;
const STATUSES = ['OPEN', 'CLAIMED', 'DONE', 'VOIDED'] as const;

export class ListTaskPoolQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number;
  @IsOptional() @IsString() @MaxLength(100) search?: string;

  /** 狀態過濾（OPEN/CLAIMED/DONE/VOIDED） */
  @IsOptional() @IsString() @IsIn(STATUSES) status?: string;

  /** 分類過濾（PURCHASE_RECEIVE/SALES_PICK 等） */
  @IsOptional() @IsString() @MaxLength(30) category?: string;

  /** scope: mine = 我的待辦（assigneeUserId = current user）/ pool = 池中（status=OPEN、無 assignee） / dept = 部門池（同 dept、unclaimed）。default = all */
  @IsOptional() @IsString() @IsIn(['mine', 'pool', 'dept', 'all']) scope?: string;

  /** 來源模組過濾 */
  @IsOptional() @IsString() @MaxLength(10) sourceModule?: string;
}

export class CreateTaskPoolDto {
  @IsString() @MinLength(1) @MaxLength(200) title!: string;

  @IsOptional() @IsString() @MaxLength(1000) description?: string;

  @IsString() @MinLength(1) @MaxLength(30) category!: string;

  @IsOptional() @IsString() @IsIn(PRIORITIES) priority?: string;

  @IsOptional() @IsDateString() dueDate?: string;

  @IsOptional() @IsString() @MaxLength(15) departmentId?: string;

  /** 建單時可選直接指派；不傳 = 留池中 */
  @IsOptional() @IsString() @MaxLength(15) assigneeUserId?: string;

  /** 來源單據追蹤（可空）*/
  @IsOptional() @IsString() @MaxLength(10) sourceModule?: string;
  @IsOptional() @IsString() @MaxLength(10) sourceDocType?: string;
  @IsOptional() @IsString() @MaxLength(15) sourceDocId?: string;
  @IsOptional() @IsString() @MaxLength(30) sourceDocNo?: string;
}

export class UpdateTaskPoolDto {
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string | null;
  @IsOptional() @IsString() @MaxLength(30) category?: string;
  @IsOptional() @IsString() @IsIn(PRIORITIES) priority?: string;
  @IsOptional() @IsDateString() dueDate?: string | null;
  @IsOptional() @IsString() @MaxLength(15) departmentId?: string | null;
}

export class AssignTaskPoolDto {
  /** assigneeUserId、null 表示放回池 */
  @IsOptional() @IsString() @MaxLength(15) assigneeUserId?: string | null;
}

export class CompleteTaskPoolDto {
  @IsOptional() @IsString() @MaxLength(500) completedRemark?: string;
}
