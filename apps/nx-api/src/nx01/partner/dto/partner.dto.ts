import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { Nx01ListQueryDto } from '../../../shared/nx01/pagination.dto';

// partner 改制七分類：W4 [3-5] 2026-06-06 加 L=散客（B2C 統收、只能現銷、固定二聯）
// 既有六分類（Crown 2026-05-28）：C=保養廠 / O=同行 / S=供應商 / T=外包物流 / B=銀行 / V=一般廠商
// 舊 BOTH/CUST/SUP 已於 migration 20260528100000 backfill 為 C/C/S
const PARTNER_TYPES = ['C', 'O', 'S', 'T', 'V', 'B', 'L'] as const;
// 02 對齊第二批 C 軌 CP2 2026-06-06：0=不開發票（新增）；2=二聯；3=三聯
const INVOICE_COPIES = [0, 2, 3] as const;
const PAY_DOM = ['PREPAY', 'NET30', 'NET60', 'NET90'] as const;
const PAY_IMP = ['TT', 'LC', 'DP', 'DA'] as const;
const CREDIT_STAT = ['N', 'W', 'F'] as const;

export class ListPartnerQueryDto extends Nx01ListQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(PARTNER_TYPES)
  partnerType?: string;

  /** 02 對齊第二批 C 軌 CP2-b：注音搜尋（phoneticFull / phoneticCode contains）*/
  @IsOptional()
  @IsString()
  @MaxLength(100)
  phonetic?: string;
}

/**
 * W3 [3-1] 2026-06-06：往來對象編號類型 + 4 碼制（NX-MANUAL-02 v2.0 §3.1）
 *   - code 未填 → service create 自動取下一個 類型碼+4 碼（每 partnerType 各一條獨立流水）
 *   - code 已填 → 直接用（手動覆寫）；若符合「partnerType+4碼」格式且 ≥ counter.next_no 自動跳號
 *
 * W3 [3-2]：加 legacyCode（舊系統往來對象代號、純對照不綁 FK）
 */
export class CreatePartnerDto {
  /** 往來對象代碼。未填則自動產生 類型碼+4 碼 */
  @IsOptional()
  @IsString()
  @MaxLength(30)
  code?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsIn(PARTNER_TYPES)
  partnerType!: string;

  /** W3 [3-2] 舊系統往來對象代號（純對照） */
  @IsOptional() @IsString() @MaxLength(50) legacyCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  mobile?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  taxId?: string;

  @IsOptional()
  @IsString()
  @IsIn(PAY_DOM)
  paymentTermDomestic?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  customerGradeId?: string;

  /** M2-c：供應商等級 ID（手動指派、partner_type='S' 用為主、API recalc-supplier-grade 端點自動算） */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  supplierGradeId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  creditLimit?: number;

  @IsOptional()
  @IsString()
  @IsIn(CREDIT_STAT)
  creditStatus?: string;

  @IsOptional()
  @IsString()
  @IsIn(PAY_IMP)
  paymentTermImport?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  incoterm?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  /** 可調貨旗標。partner_type='O' 同行 service 層 create 時預設 true；'C' 保養廠可手動開啟。 */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  canTransferStock?: boolean;

  // ── v1.2 對齊 階段 E P2：basic 區補欄（schema 既有、DTO 補對齊） ──
  @IsOptional() @IsString() @MaxLength(50) shortName?: string;
  @IsOptional() @IsString() @MaxLength(100) nameEn?: string;
  @IsOptional() @IsString() @MaxLength(30) fax?: string;
  @IsOptional() @IsString() @MaxLength(200) website?: string;
  @IsOptional() @IsString() @MaxLength(50) serviceLocation?: string;

  // ── v1.2 階段 E P2：sales 區補欄 ──
  @IsOptional() @IsString() @MaxLength(15) defaultWarehouseId?: string;
  @IsOptional() @IsString() @MaxLength(15) salesUserId?: string;

  // ── v1.2 階段 E P2：finance 區補欄 ──
  @IsOptional() @IsString() @MaxLength(15) defaultCurrencyId?: string;

  /** W4 [3-6] 預設發票聯式（2=二聯 / 3=三聯）。散客 L 強制 2、service 端覆寫不可改 */
  @IsOptional() @Type(() => Number) @IsInt() @IsIn(INVOICE_COPIES) defaultInvoiceCopies?: number;

  // ── 02 對齊第二批 C 軌 CP1：地區 / 總公司 / 個別毛利率 ──
  /** 地區 ID（FK nx01_region、不入 partner code 編號） */
  @IsOptional() @IsString() @MaxLength(15) regionId?: string;
  /** 總公司 ID（self-FK nx01_partner、連鎖母子、null=自己就是總公司或無母公司） */
  @IsOptional() @IsString() @MaxLength(15) parentPartnerId?: string;
  /** 個別客戶毛利率覆寫 customer_grade.margin_pct（Decimal 5,2、業務口語「個別折數」） */
  @IsOptional() @Type(() => Number) customMarginPct?: number;
}

export class UpdatePartnerDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(PARTNER_TYPES)
  partnerType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  mobile?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  taxId?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(PAY_DOM)
  paymentTermDomestic?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  customerGradeId?: string | null;

  /** M2-c：供應商等級 ID（手動指派、partner_type='S' 用為主） */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  supplierGradeId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  creditLimit?: number;

  @IsOptional()
  @IsString()
  @IsIn(CREDIT_STAT)
  creditStatus?: string;

  @IsOptional()
  @IsString()
  @IsIn(PAY_IMP)
  paymentTermImport?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  incoterm?: string | null;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  /** 可調貨旗標。partner_type='O' 同行 service 層 create 時預設 true；'C' 保養廠可手動開啟。 */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  canTransferStock?: boolean;

  // ── v1.2 對齊 階段 E P2：basic 區補欄（schema 既有、DTO 補對齊） ──
  @IsOptional() @IsString() @MaxLength(50) shortName?: string | null;
  @IsOptional() @IsString() @MaxLength(100) nameEn?: string | null;
  @IsOptional() @IsString() @MaxLength(30) fax?: string | null;
  @IsOptional() @IsString() @MaxLength(200) website?: string | null;
  @IsOptional() @IsString() @MaxLength(50) serviceLocation?: string | null;

  // ── v1.2 階段 E P2：sales 區補欄 ──
  @IsOptional() @IsString() @MaxLength(15) defaultWarehouseId?: string | null;
  @IsOptional() @IsString() @MaxLength(15) salesUserId?: string | null;

  // ── v1.2 階段 E P2：finance 區補欄 ──
  @IsOptional() @IsString() @MaxLength(15) defaultCurrencyId?: string | null;

  /** W3 [3-2] 舊系統往來對象代號 */
  @IsOptional() @IsString() @MaxLength(50) legacyCode?: string | null;

  /** W4 [3-6] 預設發票聯式（2/3）。散客 L 強制 2 */
  @IsOptional() @Type(() => Number) @IsInt() @IsIn(INVOICE_COPIES) defaultInvoiceCopies?: number;

  // ── 02 對齊第二批 C 軌 CP1：地區 / 總公司 / 個別毛利率 ──
  @IsOptional() @IsString() @MaxLength(15) regionId?: string | null;
  @IsOptional() @IsString() @MaxLength(15) parentPartnerId?: string | null;
  @IsOptional() @Type(() => Number) customMarginPct?: number | null;
}
