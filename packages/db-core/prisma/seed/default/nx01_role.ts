import type { PrismaClient } from '../../../generated/prisma';
import { DEMO_TENANT_ID, SYSADMIN_USER_ID } from './constants';

const ROLE_SPECS = [
  { code: 'ADMIN', name: '系統管理員', isSystem: true, sortNo: 1, description: '全系統與租戶設定' },
  { code: 'PURCHASE', name: '採購', isSystem: true, sortNo: 2, description: '採購模組' },
  { code: 'SALES', name: '業務', isSystem: true, sortNo: 3, description: '銷售模組' },
  { code: 'WAREHOUSE', name: '倉管', isSystem: true, sortNo: 4, description: '庫存／倉儲' },
  { code: 'FINANCE', name: '財務', isSystem: true, sortNo: 5, description: '財務模組' },
  { code: 'LOGISTICS', name: '物流', isSystem: true, sortNo: 6, description: '物流模組' },
  { code: 'HR', name: '人資', isSystem: true, sortNo: 7, description: '人資模組' },
];

export async function seedNx01Role(prisma: PrismaClient): Promise<void> {
  for (const spec of ROLE_SPECS) {
    const existing = await prisma.nx01Role.findFirst({
      where: { tenantId: DEMO_TENANT_ID, code: spec.code },
    });
    if (existing) {
      await prisma.nx01Role.update({
        where: { id: existing.id },
        data: {
          name: spec.name,
          description: spec.description ?? null,
          isSystem: spec.isSystem,
          sortNo: spec.sortNo,
          isActive: true,
          updatedBy: SYSADMIN_USER_ID,
        },
      });
    } else {
      await prisma.nx01Role.create({
        data: {
          tenantId: DEMO_TENANT_ID,
          code: spec.code,
          name: spec.name,
          description: spec.description ?? null,
          isSystem: spec.isSystem,
          sortNo: spec.sortNo,
          isActive: true,
          createdBy: SYSADMIN_USER_ID,
          updatedBy: SYSADMIN_USER_ID,
        },
      });
    }
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_role_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_role), 0), 1), true)`,
  );

  console.log(`✅ default/nx01_role: ${ROLE_SPECS.length} 筆`);
}
