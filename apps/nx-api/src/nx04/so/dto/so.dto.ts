import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

// W4 [3-6] 2026-06-06 發票聯式：銷貨單可逐筆改、預設帶 partner.defaultInvoiceCopies
// 02 對齊第二批 C 軌 CP2 2026-06-06：0=不開發票（新增）；2=二聯；3=三聯
const INVOICE_COPIES = [0, 2, 3] as const;

export class CreateSoItemDto {
  @IsString()
  @MaxLength(15)
  partId!: string;

  @IsString()
  @MaxLength(15)
  warehouseId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  locationId?: string;

  @IsNumber()
  @Min(0.0001)
  qty!: number;

  @IsNumber()
  @Min(0)
  unitPriceSnapshot!: number;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  quoteItemId?: string;

  /// 補貨來源類型（S=本倉/T=自倉調撥/G=同行調貨/B=客戶訂單）。
  /// NX04-M2 §A C2：允許業務手動指定、預設由 schema default 'S' 帶入、
  /// 服務層連動寫入 transferStatus（S→C 補貨完成 / T,G,B→P 待補）
  @IsOptional()
  @IsString()
  @MaxLength(1)
  transferSourceType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  belowMinReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class CreateSoDto {
  @IsString()
  @MaxLength(15)
  warehouseId!: string;

  @IsDateString()
  soDate!: string;

  @IsString()
  @MaxLength(15)
  customerId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  quoteId?: string;

  @IsString()
  @MaxLength(1)
  deliveryType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  currencyId?: string;

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
  @Type(() => CreateSoItemDto)
  @ArrayMinSize(0)
  items?: CreateSoItemDto[];

  /** W4 [3-6] 發票聯式（2/3）。未填則從 partner.defaultInvoiceCopies 帶入；散客 L service 端強制 2 */
  @IsOptional() @Type(() => Number) @IsInt() @IsIn(INVOICE_COPIES) invoiceCopies?: number;

  /** F1 特價售出 2026-06-08：標記此 SO 來自異常處置 X 特價售出（成本走 avgCost、單價=特價、不走折讓）。
   *  業務情境：異常品低價出清、由 IssueReportService.dispose 自動建單帶入。
   *  Caller（前端 / 一般 SO 建單流程）不應傳此旗標；service 信任 caller 但不額外驗證。 */
  @IsOptional() specialPriceFlag?: boolean;
}

export class UpdateSoDto {
  @IsOptional()
  @IsDateString()
  soDate?: string;

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
  cancelReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1)
  deliveryType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  deliveryAddress?: string;

  /** W4 [3-6] 發票聯式（2/3）。SO 編輯時逐筆改；散客 L 不可改（service 端守門） */
  @IsOptional() @Type(() => Number) @IsInt() @IsIn(INVOICE_COPIES) invoiceCopies?: number;
}

export class PatchSoItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(15)
  locationId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  qty?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPriceSnapshot?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

/// NX04-M2 §A C3：從 SO 行群組建 Nx02Ti 同行調貨單草稿
export class CreateTiFromSoDto {
  /// 同行對象（partner_type='O' OR canTransferStock=true）
  @IsString()
  @MaxLength(15)
  partnerId!: string;

  /// SO line item IDs（需 transferSourceType='G' + transferStatus='P'）
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  soItemIds!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}
