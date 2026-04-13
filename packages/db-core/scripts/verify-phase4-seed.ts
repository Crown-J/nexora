import 'dotenv/config';
import { PrismaClient } from '../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { poolConfigFromDatabaseUrl } from './pgTlsPoolConfig';

const pool = new pg.Pool(poolConfigFromDatabaseUrl(String(process.env.DATABASE_URL)));
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const [v, rv, sysadmin, admin] = await Promise.all([
    prisma.nx01View.count(),
    prisma.nx01RoleView.count(),
    prisma.nx01User.findUnique({
      where: { id: 'NX01USER0000001' },
      select: { userAccount: true, isActive: true },
    }),
    prisma.nx01User.findUnique({
      where: { id: 'NX01USER0000002' },
      select: { userAccount: true, isActive: true },
    }),
  ]);

  console.log(
    JSON.stringify(
      {
        nx01_view: v,
        nx01_role_view: rv,
        sysadmin,
        admin,
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
  await pool.end();
}

void main();
