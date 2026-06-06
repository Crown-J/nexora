// apps/nx-api/src/shared/nx01/resolve-brand-refs.ts
// W6-Phase 5 2026-06-06：舊 nx01_part_brand / nx01_car_brand 已 DROP、helper 簡化為單表驗證
// 接 brand.id、驗證 isCar=true / isPart=true、回單一 brandId 欄位（caller 也不再雙寫）
import type { PrismaService } from '../../prisma/prisma.service';

export type CarBrandRefs = { brandId: string | null };

export async function resolveCarBrandRefs(
  prisma: PrismaService,
  tenantId: string,
  input: string | null | undefined,
): Promise<CarBrandRefs> {
  const id = input?.trim();
  if (!id) return { brandId: null };
  const b = await prisma.nx01Brand.findFirst({
    where: { id, tenantId, isCar: true },
    select: { id: true },
  });
  return { brandId: b?.id ?? null };
}

export type PartBrandRefs = { brandId: string | null };

export async function resolvePartBrandRefs(
  prisma: PrismaService,
  tenantId: string,
  input: string | null | undefined,
): Promise<PartBrandRefs> {
  const id = input?.trim();
  if (!id) return { brandId: null };
  const b = await prisma.nx01Brand.findFirst({
    where: { id, tenantId, isPart: true },
    select: { id: true },
  });
  return { brandId: b?.id ?? null };
}
