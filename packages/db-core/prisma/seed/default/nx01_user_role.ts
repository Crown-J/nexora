import type { PrismaClient } from '../../../generated/prisma';
import { DEMO_TENANT_ID, SYSADMIN_USER_ID, TENANT_ADMIN_USER_ID } from './constants';

export async function seedNx01UserRole(prisma: PrismaClient): Promise<void> {
  const adminRole = await prisma.nx01Role.findFirstOrThrow({
    where: { tenantId: DEMO_TENANT_ID, code: 'ADMIN' },
  });

  const existing = await prisma.nx01UserRole.findFirst({
    where: { tenantId: DEMO_TENANT_ID, userId: TENANT_ADMIN_USER_ID, roleId: adminRole.id },
  });

  if (!existing) {
    await prisma.nx01UserRole.create({
      data: {
        tenantId: DEMO_TENANT_ID,
        userId: TENANT_ADMIN_USER_ID,
        roleId: adminRole.id,
        isPrimary: true,
        assignedBy: SYSADMIN_USER_ID,
      },
    });
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_user_role_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_user_role), 0), 1), true)`,
  );

  console.log('✅ default/nx01_user_role: admin → ADMIN');
}
