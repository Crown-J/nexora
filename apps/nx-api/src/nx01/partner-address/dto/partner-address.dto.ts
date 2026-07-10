// apps/nx-api/src/nx01/partner-address/dto/partner-address.dto.ts
// 02 對齊第二批 A 軌 CP3 2026-06-06：partner_address 衛星 CRUD DTO
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const ADDRESS_TYPES = ['BILLING', 'SHIPPING'] as const;

export class CreatePartnerAddressDto {
  /** BILLING 收帳（同 partner 最多 1 筆）/ SHIPPING 送貨（多筆、一筆 isDefault） */
  @IsString() @IsIn(ADDRESS_TYPES) addressType!: string;

  @IsOptional() @IsString() @MaxLength(50) label?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isDefault?: boolean;

  /** 國別 FK；null 視為 TW 預設（走字典） */
  @IsOptional() @IsString() @MaxLength(15) countryId?: string;

  // TW 字典欄位（非 TW 可空）
  @IsOptional() @IsString() @MaxLength(15) cityId?: string;
  @IsOptional() @IsString() @MaxLength(15) districtId?: string;
  @IsOptional() @IsString() @MaxLength(10) postalCode?: string;

  // 結構化門牌（TW 用）
  @IsOptional() @IsString() @MaxLength(100) streetName?: string;
  @IsOptional() @IsString() @MaxLength(20) lane?: string;
  @IsOptional() @IsString() @MaxLength(20) alley?: string;
  @IsOptional() @IsString() @MaxLength(20) buildingNo?: string;
  @IsOptional() @IsString() @MaxLength(20) buildingSubNo?: string;
  @IsOptional() @IsString() @MaxLength(20) floor?: string;
  @IsOptional() @IsString() @MaxLength(20) roomNo?: string;

  // 國外 freeform
  @IsOptional() @IsString() @MaxLength(500) freeformAddress?: string;

  @IsOptional() @IsString() @MaxLength(50) recipientName?: string;
  @IsOptional() @IsString() @MaxLength(50) recipientPhone?: string;
  /** 發票抬頭（BILLING 該筆各自開票；空=用 partner.invoiceTitle）。偉盟設計檢視 P1-2 2026-07-10 */
  @IsOptional() @IsString() @MaxLength(120) invoiceTitle?: string;
  @IsOptional() @IsString() @MaxLength(200) note?: string;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}

export class UpdatePartnerAddressDto {
  @IsOptional() @IsString() @MaxLength(50) label?: string | null;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsString() @MaxLength(15) countryId?: string | null;
  @IsOptional() @IsString() @MaxLength(15) cityId?: string | null;
  @IsOptional() @IsString() @MaxLength(15) districtId?: string | null;
  @IsOptional() @IsString() @MaxLength(10) postalCode?: string | null;
  @IsOptional() @IsString() @MaxLength(100) streetName?: string | null;
  @IsOptional() @IsString() @MaxLength(20) lane?: string | null;
  @IsOptional() @IsString() @MaxLength(20) alley?: string | null;
  @IsOptional() @IsString() @MaxLength(20) buildingNo?: string | null;
  @IsOptional() @IsString() @MaxLength(20) buildingSubNo?: string | null;
  @IsOptional() @IsString() @MaxLength(20) floor?: string | null;
  @IsOptional() @IsString() @MaxLength(20) roomNo?: string | null;
  @IsOptional() @IsString() @MaxLength(500) freeformAddress?: string | null;
  @IsOptional() @IsString() @MaxLength(50) recipientName?: string | null;
  @IsOptional() @IsString() @MaxLength(50) recipientPhone?: string | null;
  /** 發票抬頭（BILLING 用；空=用 partner.invoiceTitle）。偉盟設計檢視 P1-2 2026-07-10 */
  @IsOptional() @IsString() @MaxLength(120) invoiceTitle?: string | null;
  @IsOptional() @IsString() @MaxLength(200) note?: string | null;
  @IsOptional() @Type(() => Boolean) @IsBoolean() isActive?: boolean;
}
