// apps/nx-api/src/shared/nx01/compose-partner-address.ts
// 02 對齊第二批 A 軌 CP2 2026-06-06：partner_address 衛星表組字串 helper
//
// 用途：替代舊 partner.address 純文字欄位（已 DROP）。dn-logistics / 退貨取貨 等需要單行
// 地址字串顯示時呼叫此 helper、取 partner 預設送貨地址（addressType='SHIPPING'、isDefault=true）
// 並組成可讀字串。
//
// 國別分流：
//   - country=null（TW）：postalCode + city + district + streetName + lane巷 + alley弄 + buildingNo號 + 之 + floor樓 + roomNo室
//   - country=非 TW：直接用 freeformAddress
import type { PrismaService } from '../../prisma/prisma.service';

export type ResolvedPartnerAddress = {
  oneLine: string;
  recipientName: string | null;
  recipientPhone: string | null;
  raw: {
    addressType: string;
    label: string | null;
    postalCode: string | null;
    cityName: string | null;
    districtName: string | null;
    countryName: string | null;
  };
} | null;

/**
 * 取 partner 預設送貨地址（addressType='SHIPPING' + isDefault=true）並組字串。
 * 若沒有預設、取最近建立的 SHIPPING isActive=true 一筆；若連送貨地址都沒、回 null。
 */
export async function composePartnerDefaultShippingAddress(
  prisma: PrismaService,
  tenantId: string,
  partnerId: string,
): Promise<ResolvedPartnerAddress> {
  const row =
    (await prisma.nx01PartnerAddress.findFirst({
      where: {
        tenantId,
        partnerId,
        addressType: 'SHIPPING',
        isActive: true,
        isDefault: true,
      },
      include: {
        city: { select: { name: true } },
        district: { select: { name: true } },
        country: { select: { name: true, code: true } },
      },
    })) ??
    (await prisma.nx01PartnerAddress.findFirst({
      where: { tenantId, partnerId, addressType: 'SHIPPING', isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        city: { select: { name: true } },
        district: { select: { name: true } },
        country: { select: { name: true, code: true } },
      },
    }));

  if (!row) return null;

  const isTW = !row.countryId || row.country?.code === 'TWN';
  let oneLine = '';
  if (!isTW && row.freeformAddress) {
    oneLine = [row.country?.name, row.postalCode, row.freeformAddress].filter(Boolean).join(' ').trim();
  } else {
    const parts: string[] = [];
    if (row.postalCode) parts.push(row.postalCode);
    if (row.city?.name) parts.push(row.city.name);
    if (row.district?.name) parts.push(row.district.name);
    if (row.streetName) parts.push(row.streetName);
    if (row.lane) parts.push(`${row.lane}巷`);
    if (row.alley) parts.push(`${row.alley}弄`);
    if (row.buildingNo) {
      let bn = `${row.buildingNo}號`;
      if (row.buildingSubNo) bn += `之${row.buildingSubNo}`;
      parts.push(bn);
    }
    if (row.floor) parts.push(`${row.floor}樓`);
    if (row.roomNo) parts.push(`${row.roomNo}室`);
    oneLine = parts.join('').trim();
    // ⚠️ seed／恆迎歷史資料常把台灣地址整串放 freeformAddress（結構化欄只有郵遞區號）——
    // 結構化組不出街道級內容（無 streetName/buildingNo）時把 freeform 併上，
    // 不然這批資料只組得出「106」這種郵碼、甚至空字串（執行長 2026-07-19 拍板直接修；
    // 對齊前端 InstantSalesWorkspace shipAddressOneLine 同款兜底）
    if (row.freeformAddress && !row.streetName && !row.buildingNo) {
      oneLine = [oneLine, row.freeformAddress].filter(Boolean).join(' ').trim();
    }
  }

  return {
    oneLine,
    recipientName: row.recipientName,
    recipientPhone: row.recipientPhone,
    raw: {
      addressType: row.addressType,
      label: row.label,
      postalCode: row.postalCode,
      cityName: row.city?.name ?? null,
      districtName: row.district?.name ?? null,
      countryName: row.country?.name ?? null,
    },
  };
}
