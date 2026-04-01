/**
 * Quick TCP/Postgres check for nx-api vs db-core .env DATABASE_URL (no secrets printed).
 * Usage: node scripts/test-env-db-connection.cjs
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadDatabaseUrl(envPath) {
    const raw = fs.readFileSync(envPath, 'utf8');
    const line = raw.split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
    if (!line) throw new Error('DATABASE_URL not found in ' + envPath);
    let url = line.slice('DATABASE_URL='.length).trim();
    if (
        (url.startsWith('"') && url.endsWith('"')) ||
        (url.startsWith("'") && url.endsWith("'"))
    ) {
        url = url.slice(1, -1);
    }
    return url;
}

function hostSummary(url) {
    try {
        const u = new URL(url.replace(/^postgresql:/i, 'http:'));
        return `${u.hostname}:${u.port || '5432'} db=${u.pathname.replace(/^\//, '') || '(default)'}`;
    } catch {
        return '(unparseable URL)';
    }
}

async function probe(label, envPath) {
    console.log('\n--- ' + label + ' ---');
    console.log('env file:', envPath);
    let url;
    try {
        url = loadDatabaseUrl(envPath);
    } catch (e) {
        console.error('read env:', e.message);
        return;
    }
    console.log('target:', hostSummary(url));

    const c = new Client({ connectionString: url });
    try {
        await c.connect();
        const db = await c.query('SELECT current_database() AS db, version() AS v');
        console.log('status: OK');
        console.log('current_database:', db.rows[0].db);
        const tbl = await c.query(
            `SELECT COUNT(*)::int AS n FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'nx00_user'`,
        );
        if (tbl.rows[0].n === 0) {
            console.log('nx00_user: table missing (migrate/seed not applied here?)');
        } else {
            const cnt = await c.query('SELECT COUNT(*)::int AS n FROM nx00_user');
            console.log('nx00_user rows:', cnt.rows[0].n);
        }
    } catch (e) {
        console.error('status: FAIL', e.code || '', e.message);
    } finally {
        await c.end().catch(() => {});
    }
}

const root = path.resolve(__dirname, '..', '..', '..');
const nxApiEnv = path.join(root, 'apps', 'nx-api', '.env');
const dbCoreEnv = path.join(root, 'packages', 'db-core', '.env');

(async () => {
    console.log('NEXORA DB connection probe (nx-api backend vs db-core prisma)');
    await probe('Backend API (apps/nx-api/.env)', nxApiEnv);
    await probe('Prisma / seed (packages/db-core/.env)', dbCoreEnv);
})();
