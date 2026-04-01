require('dotenv').config({ path: require('path').join(__dirname, '../../../apps/nx-api/.env') });
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../generated/prisma');

const url = process.env.DATABASE_URL;
if (!url) {
    console.error('DATABASE_URL missing (load apps/nx-api/.env)');
    process.exit(1);
}
const pool = new Pool({ connectionString: url });
const p = new PrismaClient({ adapter: new PrismaPg(pool) });
p.nx00Part.findMany({
    take: 1,
    include: {
        partBrand: { select: { code: true, name: true } },
        carBrand: { select: { code: true, name: true } },
        createdByUser: { select: { displayName: true } },
        updatedByUser: { select: { displayName: true } },
    },
})
    .then((r) => {
        console.log('Prisma nx00Part list probe: OK, sample count=', r.length);
    })
    .catch((e) => {
        console.error('Prisma nx00Part list probe: FAIL');
        console.error(e.code || '', e.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await p.$disconnect();
        await pool.end();
    });
