// packages/db-core/scripts/wms-bin-backfill.mjs
// WMS 庫位級庫存 P0 回填（2026-07-23、規格 docs/_team/bin-level-stock-proposal.md）。
// 冪等、可重跑（本機 + Railway 同套）：
//   1) 每倉預建 4 個系統庫位（K 待包暫存／B 待上架／R 收貨暫存／U 未指定），已存在則跳過。
//   2) 回填庫位級餘額：每料每倉的倉庫 onHand（≠0）灌進「料件預設庫位」；沒設或跨倉則進該倉「U 未指定」格。
//      只對「尚無任何庫位餘額」的料件+倉插入（NOT EXISTS 守衛）→ 不覆寫 P1 之後的多格分佈。
//   3) 對帳：每料每倉 Σ(庫位 onHand) vs 倉庫 onHand，印出不一致（應為 0 筆）。
// 執行：node packages/db-core/scripts/wms-bin-backfill.mjs
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const ROOT = process.cwd();
const envTxt = fs.readFileSync(path.join(ROOT, 'apps/nx-api/.env'), 'utf8');
const DATABASE_URL = envTxt.match(/DATABASE_URL\s*=\s*"?([^"\n]+)/)[1].replace(/^"|"$/g, '');

const SYS_BINS = [
  { type: 'K', name: '待包暫存', sort: 9001 },
  { type: 'B', name: '待上架', sort: 9002 },
  { type: 'R', name: '收貨暫存', sort: 9003 },
  { type: 'U', name: '未指定', sort: 9004 },
];

const db = new pg.Client({ connectionString: DATABASE_URL });
await db.connect();
try {
  // 1) 系統庫位（每倉每型至少一格；冪等 NOT EXISTS）
  let binsCreated = 0;
  for (const b of SYS_BINS) {
    const r = await db.query(
      `INSERT INTO nx01_location (tenant_id, warehouse_id, code, name, location_type, sort_no, created_by, updated_by, updated_at)
       SELECT w.tenant_id, w.id, $1::varchar, $2::varchar, $3::varchar, $4::int, w.created_by, w.created_by, now()
       FROM nx01_warehouse w
       WHERE w.is_active
         AND NOT EXISTS (SELECT 1 FROM nx01_location l
                         WHERE l.tenant_id=w.tenant_id AND l.warehouse_id=w.id AND l.location_type=$3::varchar)`,
      [`SYS-${b.type}`, b.name, b.type, b.sort],
    );
    binsCreated += r.rowCount;
  }
  console.log(`① 系統庫位：新建 ${binsCreated} 格（已存在的跳過）`);

  // 2) 回填庫位級餘額（尚無任何庫位餘額的料件+倉才灌；進預設庫位、否則進 U 未指定）
  const bf = await db.query(
    `INSERT INTO nx03_stock_location_balance
       (tenant_id, part_id, warehouse_id, location_id, on_hand_qty, last_move_at, created_by, updated_by, updated_at)
     SELECT sb.tenant_id, sb.part_id, sb.warehouse_id,
            COALESCE(dl.id, ub.id) AS location_id,
            sb.on_hand_qty, now(), sb.created_by, sb.created_by, now()
     FROM nx03_stock_balance sb
     LEFT JOIN nx03_part_stock_setting ps
            ON ps.tenant_id=sb.tenant_id AND ps.part_id=sb.part_id AND ps.warehouse_id=sb.warehouse_id
     LEFT JOIN nx01_location dl
            ON dl.id=ps.default_location_id AND dl.is_active AND dl.warehouse_id=sb.warehouse_id
     LEFT JOIN nx01_location ub
            ON ub.warehouse_id=sb.warehouse_id AND ub.location_type='U'
     WHERE sb.on_hand_qty <> 0
       AND COALESCE(dl.id, ub.id) IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM nx03_stock_location_balance lb
                       WHERE lb.tenant_id=sb.tenant_id AND lb.part_id=sb.part_id AND lb.warehouse_id=sb.warehouse_id)`,
  );
  console.log(`② 餘額回填：新增 ${bf.rowCount} 筆庫位餘額`);

  // 3) 對帳：每料每倉 Σ庫位 vs 倉庫 onHand
  const mismatch = await db.query(
    `SELECT sb.tenant_id, sb.part_id, sb.warehouse_id, sb.on_hand_qty AS wh_qty,
            COALESCE(SUM(lb.on_hand_qty),0) AS loc_qty
     FROM nx03_stock_balance sb
     LEFT JOIN nx03_stock_location_balance lb
            ON lb.tenant_id=sb.tenant_id AND lb.part_id=sb.part_id AND lb.warehouse_id=sb.warehouse_id
     WHERE sb.on_hand_qty <> 0
     GROUP BY sb.tenant_id, sb.part_id, sb.warehouse_id, sb.on_hand_qty
     HAVING sb.on_hand_qty <> COALESCE(SUM(lb.on_hand_qty),0)`,
  );
  const total = await db.query(`SELECT count(*)::int AS n FROM nx03_stock_balance WHERE on_hand_qty <> 0`);
  console.log(`③ 對帳：${total.rows[0].n} 筆有量的（料件×倉），不一致 ${mismatch.rowCount} 筆`);
  if (mismatch.rowCount) {
    console.log('   ⚠️ 不一致明細（前 10）：');
    for (const m of mismatch.rows.slice(0, 10)) {
      console.log(`   - ${m.part_id}@${m.warehouse_id}：倉=${m.wh_qty} 庫位Σ=${m.loc_qty}`);
    }
  } else {
    console.log('   ✅ 全對：每料每倉 Σ庫位 = 倉庫 onHand');
  }
} finally {
  await db.end();
}
