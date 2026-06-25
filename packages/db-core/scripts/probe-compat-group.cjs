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

(async () => {
  try {
    const groupCount = await p.nx01PartCompatGroup.count();
    const memberCount = await p.nx01PartCompatGroupMember.count();
    console.log(`通用件群組 (nx01_part_compat_group)：${groupCount} 筆`);
    console.log(`群組成員 (nx01_part_compat_group_member)：${memberCount} 筆`);

    if (groupCount > 0) {
      const sample = await p.nx01PartCompatGroup.findMany({
        take: 5,
        select: { id: true, tenantId: true, code: true, name: true, isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      console.log('\n群組樣本（最新 5 筆）：');
      sample.forEach((g) => console.log(`  ${g.id} | tenant=${g.tenantId} | ${g.code} · ${g.name} | active=${g.isActive}`));
    }

    if (memberCount > 0) {
      const memberSample = await p.nx01PartCompatGroupMember.findMany({
        take: 5,
        select: { id: true, groupId: true, partId: true, role: true, isActive: true },
      });
      console.log('\n成員樣本（5 筆）：');
      memberSample.forEach((m) => console.log(`  ${m.id} | group=${m.groupId} | part=${m.partId} | role=${m.role} | active=${m.isActive}`));
    }

    const tenantSummary = await p.nx01PartCompatGroup.groupBy({
      by: ['tenantId'],
      _count: { id: true },
    });
    console.log('\n依 tenant 分布：');
    tenantSummary.forEach((t) => console.log(`  tenant=${t.tenantId}：${t._count.id} 個群組`));
  } catch (e) {
    console.error('probe FAIL:', e.code || '', e.message);
    process.exitCode = 1;
  } finally {
    await p.$disconnect();
    await pool.end();
  }
})();
