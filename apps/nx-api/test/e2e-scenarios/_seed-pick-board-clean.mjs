// apps/nx-api/test/e2e-scenarios/_seed-pick-board-clean.mjs
// 清除 _seed-pick-board-demo.mjs 造的撿貨看板測試資料（remark/cancel_reason 帶「撿貨看板測試」）。
// 還原庫位餘額到儲位、刪 pk/pk_item/so/so_item/ar。執行：node ...(此檔)
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const url = fs.readFileSync(path.join(process.cwd(), 'apps/nx-api/.env'), 'utf8').match(/DATABASE_URL\s*=\s*"?([^"\n]+)/)[1].replace(/^"|"$/g, '');
const c = new pg.Client({ connectionString: url }); await c.connect();
const T = 'NX99TANT9900004';
try {
  const ids = (await c.query(
    `SELECT id FROM nx04_so WHERE tenant_id=$1 AND (remark LIKE '%撿貨看板測試%' OR cancel_reason LIKE '%撿貨看板測試%')`, [T]
  )).rows.map((r) => r.id);
  if (!ids.length) { console.log('無測試資料'); await c.end(); process.exit(0); }
  const pkIds = (await c.query(`SELECT DISTINCT pk_id FROM nx03_pk_item WHERE ref_so_id = ANY($1)`, [ids])).rows.map((r) => r.pk_id).filter(Boolean);
  // 未取消單的貨在待包 K、取消單的在待上架 B → 撿貨明細刪除前先把量搬回儲位（保恆等式）
  const items = (await c.query(
    `SELECT pi.part_id, pk.warehouse_id, pi.qty, (so.cancelled_at IS NOT NULL) AS cancelled
     FROM nx03_pk_item pi JOIN nx03_pk pk ON pk.id=pi.pk_id JOIN nx04_so so ON so.id=pi.ref_so_id
     WHERE pi.ref_so_id = ANY($1) AND pi.status='C'`, [ids])).rows;
  for (const it of items) {
    const fromType = it.cancelled ? 'B' : 'K';
    const from = (await c.query(`SELECT id FROM nx01_location WHERE tenant_id=$1 AND warehouse_id=$2 AND location_type=$3 AND is_active ORDER BY sort_no LIMIT 1`, [T, it.warehouse_id, fromType])).rows[0];
    const to = (await c.query(
      `SELECT COALESCE(
         (SELECT default_location_id FROM nx03_part_stock_setting WHERE tenant_id=$1 AND part_id=$2 AND warehouse_id=$3),
         (SELECT id FROM nx01_location WHERE tenant_id=$1 AND warehouse_id=$3 AND location_type='U' AND is_active LIMIT 1)) AS id`, [T, it.part_id, it.warehouse_id])).rows[0];
    if (from?.id) await c.query(`UPDATE nx03_stock_location_balance SET on_hand_qty=on_hand_qty-$4 WHERE tenant_id=$1 AND part_id=$2 AND warehouse_id=$3 AND location_id=$5`, [T, it.part_id, it.warehouse_id, it.qty, from.id]);
    if (to?.id) await c.query(
      `INSERT INTO nx03_stock_location_balance (tenant_id,part_id,warehouse_id,location_id,on_hand_qty,last_move_at,created_by,updated_by,updated_at)
       VALUES ($1,$2,$3,$4,$5,now(),'SYSTEM','SYSTEM',now())
       ON CONFLICT (tenant_id,part_id,warehouse_id,location_id) DO UPDATE SET on_hand_qty=nx03_stock_location_balance.on_hand_qty+$5`, [T, it.part_id, it.warehouse_id, to.id, it.qty]);
  }
  if (pkIds.length) { await c.query(`DELETE FROM nx03_pk_item WHERE pk_id = ANY($1)`, [pkIds]); await c.query(`DELETE FROM nx03_pk WHERE id = ANY($1)`, [pkIds]); }
  await c.query(`DELETE FROM nx05_ar_ledger WHERE tenant_id=$1 AND so_id = ANY($2)`, [T, ids]);
  await c.query(`DELETE FROM nx04_so_item WHERE so_id = ANY($1)`, [ids]);
  await c.query(`DELETE FROM nx04_so WHERE id = ANY($1)`, [ids]);
  console.log(`已清 ${ids.length} 張測試單 + ${pkIds.length} 張撿貨單、庫位量搬回儲位`);
} finally {
  await c.end();
}
