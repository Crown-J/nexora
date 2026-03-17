/**
 * File: packages/db-core/prisma/scripts/reset-admin.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - DB Script：檢查目前 admin 使用者並重設密碼
 *
 * Notes:
 * - 執行方式（在 packages/db-core）：
 *   pnpm exec tsx prisma/scripts/reset-admin.ts
 */

import { PrismaClient } from '../../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || typeof databaseUrl !== 'string') {
    throw new Error('DATABASE_URL is not set or not a string');
  }

  const pool = new pg.Pool({
    connectionString: String(databaseUrl),
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const users = await prisma.nx00User.findMany({
      select: { id: true, username: true, displayName: true },
      orderBy: { id: 'asc' },
    });

    if (!users.length) {
      console.log('No users found in nx00_user.');
      return;
    }

    // 1) 優先找 username = 'admin'
    let admin = users.find((u) => u.username === 'admin');

    // 2) 再找綁定 ADMIN 角色的使用者
    if (!admin) {
      const adminRole = await prisma.nx00Role.findFirst({
        where: { code: 'ADMIN' },
        select: { id: true },
      });

      if (adminRole) {
        const ur = await prisma.nx00UserRole.findFirst({
          where: { roleId: adminRole.id },
          select: { userId: true },
        });
        if (ur) {
          const u = users.find((x) => x.id === ur.userId);
          if (u) admin = u;
        }
      }
    }

    // 3) 若以上都找不到，就挑第一個 user 當 admin 處理
    if (!admin) {
      admin = users[0];
    }

    const newPassword = 'changeme';
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.nx00User.update({
      where: { id: admin.id },
      data: { passwordHash },
    });

    console.log(
      JSON.stringify(
        {
          adminId: admin.id,
          username: admin.username,
          displayName: admin.displayName,
          newPassword,
        },
        null,
        2,
      ),
    );

    await prisma.$disconnect();
    await pool.end();
  } catch (e) {
    console.error('reset-admin failed:', e);
    process.exitCode = 1;
  }
}

main();

