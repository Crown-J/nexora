// apps/nx-api/src/nx06/dn-ops/dto/dn-ops.dto.ts
// NX06 DnOps DTO（停點/件項層級異常 + 內部成本）

import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const ITEM_EXCEPTION_TYPES = ['W', 'Q', 'D', 'O'] as const;

export class MarkStopExceptionDto {
  /** 停點異常說明（例：客戶不在 / 地址錯誤）。 */
  @IsString()
  @MaxLength(200)
  exceptionRemark!: string;
}

export class MarkItemExceptionDto {
  /** 異常類型（W=送錯料號 / Q=數量不符 / D=貨物損壞 / O=其他）。 */
  @IsString()
  @IsIn(ITEM_EXCEPTION_TYPES as unknown as string[])
  exceptionType!: 'W' | 'Q' | 'D' | 'O';

  /** 異常說明（選填）。 */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  exceptionReason?: string;
}

export class SetItemInternalCostDto {
  /** 件項內部成本（Decimal 14,2 字串、非負）。 */
  @IsString()
  @MaxLength(20)
  internalCost!: string;
}
