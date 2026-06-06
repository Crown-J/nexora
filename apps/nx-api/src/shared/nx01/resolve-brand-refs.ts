// apps/nx-api/src/shared/nx01/resolve-brand-refs.ts
// W6-切換軌 2026-06-06：vehicle 字典 / VinLookup brand 雙寫 helper
// 過渡期 picker value 可能是 brand.id（新 nx01_brand）或 car_brand.id（舊 nx01_car_brand）。
// 本 helper 兩種輸入都接、回兩個欄位 id 用於 dual-write（後續軌 drop 舊欄位後改寫此 helper）。
import type { PrismaService } from '../../prisma/prisma.service';

export type CarBrandRefs = { brandId: string | null; carBrandId: string | null };

/** 接收 input（brand.id 或 car_brand.id），雙向 lookup 回兩個欄位 id。 */
export async function resolveCarBrandRefs(
  prisma: PrismaService,
  tenantId: string,
  input: string | null | undefined,
): Promise<CarBrandRefs> {
  const id = input?.trim();
  if (!id) return { brandId: null, carBrandId: null };

  // try new brand 表 first（picker 走 nx01/brands?isCar=true 的新路徑）
  const b = await prisma.nx01Brand.findFirst({
    where: { id, tenantId, isCar: true },
    select: { id: true, code: true },
  });
  if (b) {
    const cb = await prisma.nx01CarBrand.findFirst({
      where: { tenantId, code: b.code },
      select: { id: true },
    });
    return { brandId: b.id, carBrandId: cb?.id ?? null };
  }

  // fallback：舊 car_brand.id（向後相容 picker 還未切換的 caller）
  const cb = await prisma.nx01CarBrand.findFirst({
    where: { id, tenantId },
    select: { id: true, code: true },
  });
  if (cb) {
    const nb = await prisma.nx01Brand.findFirst({
      where: { tenantId, code: cb.code, isCar: true },
      select: { id: true },
    });
    return { brandId: nb?.id ?? null, carBrandId: cb.id };
  }

  return { brandId: null, carBrandId: null };
}

export type PartBrandRefs = { brandId: string | null; partBrandId: string | null };

/** 接收 input（brand.id 或 part_brand.id），雙向 lookup 回兩個欄位 id。 */
export async function resolvePartBrandRefs(
  prisma: PrismaService,
  tenantId: string,
  input: string | null | undefined,
): Promise<PartBrandRefs> {
  const id = input?.trim();
  if (!id) return { brandId: null, partBrandId: null };

  const b = await prisma.nx01Brand.findFirst({
    where: { id, tenantId, isPart: true },
    select: { id: true, code: true },
  });
  if (b) {
    const pb = await prisma.nx01PartBrand.findFirst({
      where: { tenantId, code: b.code },
      select: { id: true },
    });
    return { brandId: b.id, partBrandId: pb?.id ?? null };
  }

  const pb = await prisma.nx01PartBrand.findFirst({
    where: { id, tenantId },
    select: { id: true, code: true },
  });
  if (pb) {
    const nb = await prisma.nx01Brand.findFirst({
      where: { tenantId, code: pb.code, isPart: true },
      select: { id: true },
    });
    return { brandId: nb?.id ?? null, partBrandId: pb.id };
  }

  return { brandId: null, partBrandId: null };
}
