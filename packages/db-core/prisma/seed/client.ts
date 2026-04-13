import 'dotenv/config';
import { PrismaClient } from '../../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { poolConfigFromDatabaseUrl } from '../../scripts/pgTlsPoolConfig';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || typeof databaseUrl !== 'string') {
  throw new Error('DATABASE_URL is not set or is not a string');
}

const pool = new pg.Pool(poolConfigFromDatabaseUrl(String(databaseUrl)));
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
  await pool.end();
}
