import type { PrismaClient } from '../../../generated/prisma';
import {
  ADMIN_PASSWORD_HASH,
  DEMO_TENANT_ID,
  SYSADMIN_PASSWORD_HASH,
  SYSADMIN_USER_ID,
  TENANT_ADMIN_USER_ID,
} from './constants';

export async function seedNx01User(prisma: PrismaClient): Promise<void> {
  await prisma.nx01User.upsert({
    where: { id: SYSADMIN_USER_ID },
    create: {
      id: SYSADMIN_USER_ID,
      tenantId: DEMO_TENANT_ID,
      userAccount: 'sysadmin',
      passwordHash: SYSADMIN_PASSWORD_HASH,
      userName: '系統管理員（SYSADMIN）',
      isActive: false,
      createdBy: SYSADMIN_USER_ID,
      updatedBy: SYSADMIN_USER_ID,
    },
    update: {
      isActive: false,
      passwordHash: SYSADMIN_PASSWORD_HASH,
      updatedBy: SYSADMIN_USER_ID,
    },
  });

  await prisma.nx01User.upsert({
    where: { id: TENANT_ADMIN_USER_ID },
    create: {
      id: TENANT_ADMIN_USER_ID,
      tenantId: DEMO_TENANT_ID,
      userAccount: 'admin',
      passwordHash: ADMIN_PASSWORD_HASH,
      userName: '租戶管理員',
      isActive: true,
      createdBy: SYSADMIN_USER_ID,
      updatedBy: SYSADMIN_USER_ID,
    },
    update: {
      passwordHash: ADMIN_PASSWORD_HASH,
      isActive: true,
      updatedBy: SYSADMIN_USER_ID,
    },
  });

  await prisma.$executeRawUnsafe(
    `SELECT setval('seq_nx01_user_id', GREATEST(COALESCE((SELECT MAX(SUBSTRING(id FROM 9)::int) FROM nx01_user), 0), 1), true)`,
  );

  console.log('✅ default/nx01_user: SYSADMIN + admin');
}
