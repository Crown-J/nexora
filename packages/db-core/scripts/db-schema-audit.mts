// packages/db-core/scripts/db-schema-audit.mts
// 唯讀盤點：本端 + 遠端兩個 PostgreSQL 的所有 table / column metadata
// 對齊 schema.prisma 的 /// 文檔註解（中文說明）→ 輸出 HTML 對照表
//
// 執行：pnpm exec tsx packages/db-core/scripts/db-schema-audit.mts
// 輸出：docs/_team/db-schema-audit.html
//
// 注意：URL 不寫進原始碼，由 dotenv 從 .env / .env.railway 讀取

import { Client } from 'pg';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../..');
const DB_CORE = path.resolve(__dirname, '..');

const SCHEMA_PATH = path.join(DB_CORE, 'prisma', 'schema.prisma');
const LOCAL_ENV = path.join(DB_CORE, '.env');
const REMOTE_ENV = path.join(DB_CORE, '.env.railway');
const OUT_HTML = path.join(ROOT, 'docs', '_team', 'db-schema-audit.html');
const OUT_JSON = path.join(ROOT, 'docs', '_team', 'db-schema-audit.json');

// ============================================================
// 1. parse schema.prisma → model/table 對照 + /// 註解
// ============================================================
type FieldDoc = {
  prismaName: string;
  dbColumn: string;
  doc: string;
};
type ModelDoc = {
  modelName: string;
  tableName: string;
  modelDoc: string;
  fields: Map<string, FieldDoc>; // key = dbColumn
};

function parseSchema(src: string): Map<string, ModelDoc> {
  const out = new Map<string, ModelDoc>();
  const lines = src.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const m = line.match(/^model\s+(\w+)\s*\{/);
    if (!m) {
      i++;
      continue;
    }
    const modelName = m[1];
    // 往回收集 model 上方連續 /// 註解
    let modelDoc = '';
    let j = i - 1;
    const docBuf: string[] = [];
    while (j >= 0 && /^\s*\/\/\//.test(lines[j])) {
      docBuf.unshift(lines[j].replace(/^\s*\/\/\/\s?/, '').trim());
      j--;
    }
    modelDoc = docBuf.filter((l) => !/^=+$/.test(l) && !/^\w+\s*—\s*DB\s+table/.test(l)).join(' / ').trim();

    // 解析 model body
    i++;
    const fields = new Map<string, FieldDoc>();
    let tableName = '';
    let pendingDoc: string[] = [];
    while (i < lines.length && !/^\}/.test(lines[i])) {
      const ln = lines[i];
      const docMatch = ln.match(/^\s*\/\/\/\s?(.*)$/);
      if (docMatch) {
        pendingDoc.push(docMatch[1].trim());
        i++;
        continue;
      }
      const mapMatch = ln.match(/^\s*@@map\("([^"]+)"\)/);
      if (mapMatch) {
        tableName = mapMatch[1];
        i++;
        continue;
      }
      // 欄位 line: name TYPE ...
      const fieldMatch = ln.match(/^\s*(\w+)\s+(\S+)/);
      if (fieldMatch && !ln.trim().startsWith('@@') && !ln.trim().startsWith('//')) {
        const prismaName = fieldMatch[1];
        const colMapMatch = ln.match(/@map\("([^"]+)"\)/);
        const dbColumn = colMapMatch ? colMapMatch[1] : toSnake(prismaName);
        // 去掉「；啟用最低需求版本：XXX」尾巴，太吵
        const doc = pendingDoc
          .join(' / ')
          .replace(/；?\s*啟用最低需求版本[：:]\s*[A-Z\-]+\s*$/g, '')
          .trim();
        // 過濾掉純關聯欄位（沒 type 像 String/Int/Boolean/DateTime/Json/Decimal/Float/BigInt）
        const type = fieldMatch[2];
        const isScalar = /^(String|Int|Boolean|DateTime|Json|Decimal|Float|BigInt|Bytes)\??$/.test(type);
        if (isScalar) {
          fields.set(dbColumn, { prismaName, dbColumn, doc });
        }
        pendingDoc = [];
        i++;
        continue;
      }
      // 其他行（空白、@@unique、@@index、relation field 等）
      if (!docMatch) pendingDoc = [];
      i++;
    }
    if (!tableName) tableName = toSnake(modelName);
    out.set(tableName, { modelName, tableName, modelDoc, fields });
    i++;
  }
  return out;
}

function toSnake(s: string): string {
  return s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

// ============================================================
// 2. 連 DB 拉 information_schema metadata
// ============================================================
type ColumnInfo = {
  table: string;
  column: string;
  dataType: string;
  udtName: string;
  charLen: number | null;
  numPrecision: number | null;
  numScale: number | null;
  isNullable: boolean;
  default: string | null;
  ordinal: number;
};
type ConstraintInfo = {
  table: string;
  column: string;
  type: 'PK' | 'UQ' | 'FK';
  refTable?: string;
  refColumn?: string;
};

type DbSnapshot = {
  tables: string[];
  columns: Map<string, ColumnInfo[]>; // key=table
  constraints: Map<string, ConstraintInfo[]>; // key=table
};

async function pullDb(url: string, label: string): Promise<DbSnapshot> {
  console.log(`  [${label}] 連線中...`);
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const colsRes = await client.query(`
      SELECT table_name, column_name, data_type, udt_name,
             character_maximum_length, numeric_precision, numeric_scale,
             is_nullable, column_default, ordinal_position
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `);
    const consRes = await client.query(`
      SELECT
        tc.constraint_type, tc.table_name, kcu.column_name,
        ccu.table_name AS ref_table, ccu.column_name AS ref_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
       AND tc.table_schema = ccu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type IN ('PRIMARY KEY','UNIQUE','FOREIGN KEY')
    `);
    const tablesRes = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' AND table_type='BASE TABLE'
      ORDER BY table_name
    `);

    const columns = new Map<string, ColumnInfo[]>();
    for (const row of colsRes.rows) {
      const list = columns.get(row.table_name) ?? [];
      list.push({
        table: row.table_name,
        column: row.column_name,
        dataType: row.data_type,
        udtName: row.udt_name,
        charLen: row.character_maximum_length,
        numPrecision: row.numeric_precision,
        numScale: row.numeric_scale,
        isNullable: row.is_nullable === 'YES',
        default: row.column_default,
        ordinal: row.ordinal_position,
      });
      columns.set(row.table_name, list);
    }
    const constraints = new Map<string, ConstraintInfo[]>();
    for (const row of consRes.rows) {
      const list = constraints.get(row.table_name) ?? [];
      const type =
        row.constraint_type === 'PRIMARY KEY'
          ? 'PK'
          : row.constraint_type === 'UNIQUE'
            ? 'UQ'
            : 'FK';
      list.push({
        table: row.table_name,
        column: row.column_name,
        type,
        refTable: type === 'FK' ? row.ref_table : undefined,
        refColumn: type === 'FK' ? row.ref_column : undefined,
      });
      constraints.set(row.table_name, list);
    }
    const tables = tablesRes.rows.map((r) => r.table_name as string);
    console.log(`  [${label}] tables=${tables.length}, columns=${colsRes.rowCount}`);
    return { tables, columns, constraints };
  } finally {
    await client.end();
  }
}

// ============================================================
// 3. 推測欄位型別字串 + 模組分組
// ============================================================
function formatType(c: ColumnInfo): string {
  if (c.dataType === 'character varying') return `varchar(${c.charLen ?? '?'})`;
  if (c.dataType === 'character') return `char(${c.charLen ?? '?'})`;
  if (c.dataType === 'numeric') return `numeric(${c.numPrecision ?? '?'},${c.numScale ?? 0})`;
  if (c.dataType === 'timestamp without time zone') return 'timestamp';
  if (c.dataType === 'timestamp with time zone') return 'timestamptz';
  if (c.dataType === 'USER-DEFINED') return c.udtName;
  if (c.dataType === 'ARRAY') return `${c.udtName.replace(/^_/, '')}[]`;
  return c.dataType;
}

const MODULE_MAP: Record<string, string> = {
  nx00: 'NX00 共用 / 平台層',
  nx01: 'NX01 主檔（核心字典 / 組織 / 商品）',
  nx02: 'NX02 採購進貨',
  nx03: 'NX03 庫存',
  nx04: 'NX04 銷貨',
  nx05: 'NX05 財務',
  nx06: 'NX06 人資',
  nx07: 'NX07 客服',
  nx08: 'NX08 報表',
  nx09: 'NX09 系統管理',
  nx10: 'NX10 遊戲化 / 加值',
  nx98: 'NX98 共用核心（單據過帳）',
  nx99: 'NX99 系統層（租戶 / 平台）',
  platform: 'Platform 層',
  _prisma: 'Prisma 內建',
};
function moduleOf(table: string): string {
  const m = table.match(/^(nx\d{2}|platform|_prisma)/);
  return m ? MODULE_MAP[m[1]] ?? `其他 (${m[1]})` : '其他';
}

// ============================================================
// 4. HTML 產生
// ============================================================
function esc(s: string | null | undefined): string {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildHtml(opts: {
  schema: Map<string, ModelDoc>;
  local: DbSnapshot;
  remote: DbSnapshot;
  generatedAt: string;
}): string {
  const { schema, local, remote, generatedAt } = opts;

  // 全表清單（聯集）
  const allTables = new Set<string>([...local.tables, ...remote.tables]);
  const tablesByModule = new Map<string, string[]>();
  for (const t of allTables) {
    if (t.startsWith('_prisma_migrations')) continue; // 過濾 prisma 自己的 migration table
    const mod = moduleOf(t);
    const arr = tablesByModule.get(mod) ?? [];
    arr.push(t);
    tablesByModule.set(mod, arr);
  }
  for (const arr of tablesByModule.values()) arr.sort();
  const sortedModules = [...tablesByModule.keys()].sort();

  let totalColumns = 0;
  let driftTables = 0;
  let driftColumns = 0;
  const moduleHtmls: string[] = [];

  for (const mod of sortedModules) {
    const tables = tablesByModule.get(mod)!;
    const tableHtmls: string[] = [];
    for (const tbl of tables) {
      const localCols = local.columns.get(tbl) ?? [];
      const remoteCols = remote.columns.get(tbl) ?? [];
      const localOnly = !remote.tables.includes(tbl) && local.tables.includes(tbl);
      const remoteOnly = !local.tables.includes(tbl) && remote.tables.includes(tbl);
      const both = local.tables.includes(tbl) && remote.tables.includes(tbl);

      const colMap = new Map<string, { local?: ColumnInfo; remote?: ColumnInfo }>();
      for (const c of localCols) colMap.set(c.column, { ...(colMap.get(c.column) ?? {}), local: c });
      for (const c of remoteCols) colMap.set(c.column, { ...(colMap.get(c.column) ?? {}), remote: c });
      totalColumns += colMap.size;

      const cons = local.constraints.get(tbl) ?? remote.constraints.get(tbl) ?? [];
      const pkSet = new Set(cons.filter((c) => c.type === 'PK').map((c) => c.column));
      const uqSet = new Set(cons.filter((c) => c.type === 'UQ').map((c) => c.column));
      const fkMap = new Map(cons.filter((c) => c.type === 'FK').map((c) => [c.column, `${c.refTable}.${c.refColumn}`]));

      const modelDoc = schema.get(tbl);
      const tableTitle = modelDoc?.modelName ?? tbl;
      const tableComment = modelDoc?.modelDoc?.trim() ? esc(modelDoc.modelDoc) : '';

      let tableHasDrift = localOnly || remoteOnly;
      const rowHtmls: string[] = [];
      // 排序：依本端 ordinal、缺則依遠端
      const sortedCols = [...colMap.entries()].sort(([, a], [, b]) => {
        return (a.local?.ordinal ?? a.remote?.ordinal ?? 999) - (b.local?.ordinal ?? b.remote?.ordinal ?? 999);
      });
      for (const [col, { local: lc, remote: rc }] of sortedCols) {
        const fieldDoc = modelDoc?.fields.get(col)?.doc ?? '';
        let diffClass = '';
        let diffMark = '';
        if (lc && !rc) {
          diffClass = 'diff-local-only';
          diffMark = '🟢 本端獨有';
          tableHasDrift = true;
          driftColumns++;
        } else if (!lc && rc) {
          diffClass = 'diff-remote-only';
          diffMark = '🟠 遠端獨有';
          tableHasDrift = true;
          driftColumns++;
        } else if (lc && rc) {
          const sameType = formatType(lc) === formatType(rc);
          const sameNull = lc.isNullable === rc.isNullable;
          const sameDefault = (lc.default ?? '') === (rc.default ?? '');
          if (!sameType || !sameNull || !sameDefault) {
            diffClass = 'diff-changed';
            diffMark = '🔴 兩端不同';
            tableHasDrift = true;
            driftColumns++;
          }
        }
        const ref = lc ?? rc!;
        const flags: string[] = [];
        if (pkSet.has(col)) flags.push('<span class="flag pk">PK</span>');
        if (uqSet.has(col)) flags.push('<span class="flag uq">UQ</span>');
        if (fkMap.has(col)) flags.push(`<span class="flag fk" title="${esc(fkMap.get(col)!)}">FK</span>`);

        const localCell = lc ? `${esc(formatType(lc))}${lc.isNullable ? '' : ' NN'}` : '<span class="absent">—</span>';
        const remoteCell = rc ? `${esc(formatType(rc))}${rc.isNullable ? '' : ' NN'}` : '<span class="absent">—</span>';
        const defaultCell = esc((lc?.default ?? rc?.default ?? '').replace(/::[\w ()]+$/, ''));

        rowHtmls.push(`
          <tr class="${diffClass}">
            <td class="col">${esc(col)}</td>
            <td>${flags.join(' ')}</td>
            <td>${localCell}</td>
            <td>${remoteCell}</td>
            <td class="default">${defaultCell}</td>
            <td class="doc">${esc(fieldDoc) || '<span class="warn">⚠️ 用途待確認</span>'}</td>
            <td class="mark">${diffMark}</td>
          </tr>`);
      }

      if (tableHasDrift) driftTables++;
      const badge = localOnly
        ? '<span class="badge badge-local">🟢 僅本端</span>'
        : remoteOnly
          ? '<span class="badge badge-remote">🟠 僅遠端</span>'
          : tableHasDrift
            ? '<span class="badge badge-drift">🔴 有差異</span>'
            : '<span class="badge badge-ok">✅ 同步</span>';

      tableHtmls.push(`
        <details class="table-block ${tableHasDrift ? 'has-drift' : ''}" ${tableHasDrift ? 'open' : ''}>
          <summary>
            <code class="tname">${esc(tbl)}</code>
            <span class="mname">${esc(tableTitle)}</span>
            ${badge}
            <span class="ccount">${colMap.size} 欄</span>
          </summary>
          ${tableComment ? `<p class="table-doc">${tableComment}</p>` : ''}
          <table class="cols">
            <thead><tr>
              <th>欄位</th><th>旗標</th><th>本端型別</th><th>遠端型別</th><th>預設值</th><th>中文用途</th><th>狀態</th>
            </tr></thead>
            <tbody>${rowHtmls.join('')}</tbody>
          </table>
        </details>`);
    }
    moduleHtmls.push(`
      <section class="module">
        <h2>${esc(mod)} <span class="mcount">(${tables.length} 表)</span></h2>
        ${tableHtmls.join('')}
      </section>`);
  }

  // 表級差異
  const localOnlyTables = local.tables.filter((t) => !remote.tables.includes(t) && t !== '_prisma_migrations');
  const remoteOnlyTables = remote.tables.filter((t) => !local.tables.includes(t) && t !== '_prisma_migrations');

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>NEXORA DB Schema 盤點（本端 vs 遠端）</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, "Segoe UI", "PingFang TC", "Microsoft JhengHei", sans-serif;
           background: #f6f7f9; color: #222; margin: 0; padding: 24px; line-height: 1.5; }
    .header { background: #1e3a5f; color: #fff; padding: 20px 28px; border-radius: 8px; margin-bottom: 24px; }
    .header h1 { margin: 0 0 6px 0; font-size: 22px; }
    .header .meta { font-size: 13px; opacity: 0.85; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .summary .card { background: #fff; padding: 14px 18px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .summary .num { font-size: 28px; font-weight: 700; color: #1e3a5f; }
    .summary .label { font-size: 12px; color: #666; margin-top: 4px; }
    .summary .drift .num { color: #c53030; }
    .legend { background: #fff; padding: 12px 18px; border-radius: 6px; margin-bottom: 24px; font-size: 13px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .legend span { display: inline-block; margin-right: 16px; }
    .toc { background: #fff; padding: 12px 18px; border-radius: 6px; margin-bottom: 24px; font-size: 13px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .toc a { display: inline-block; margin: 2px 8px 2px 0; color: #2a5db0; text-decoration: none; }
    .module { background: #fff; border-radius: 8px; padding: 18px 22px; margin-bottom: 18px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
    .module h2 { margin: 0 0 14px 0; padding-bottom: 8px; border-bottom: 2px solid #e1e8ed; color: #1e3a5f; font-size: 17px; }
    .module .mcount { color: #888; font-weight: normal; font-size: 13px; }
    .table-block { margin: 10px 0; padding: 8px 12px; background: #fafbfc; border-radius: 5px; border-left: 3px solid #cfd8dc; }
    .table-block.has-drift { border-left-color: #e53e3e; }
    .table-block summary { cursor: pointer; padding: 4px 0; font-size: 14px; }
    .tname { background: #2d3748; color: #fff; padding: 2px 8px; border-radius: 3px; font-family: Consolas, Monaco, monospace; font-size: 12px; margin-right: 8px; }
    .mname { color: #1a365d; font-weight: 600; margin-right: 10px; }
    .ccount { color: #777; font-size: 12px; margin-left: 8px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; margin-left: 6px; }
    .badge-ok { background: #d4edda; color: #155724; }
    .badge-drift { background: #f8d7da; color: #721c24; }
    .badge-local { background: #d1ecf1; color: #0c5460; }
    .badge-remote { background: #ffeaa7; color: #856404; }
    .table-doc { margin: 6px 0 8px 0; font-size: 12px; color: #555; padding-left: 4px; }
    .warn { color: #d68910; font-style: italic; }
    table.cols { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 12px; background: #fff; }
    table.cols th { background: #edf2f7; padding: 6px 8px; text-align: left; border-bottom: 1px solid #cbd5e0; font-weight: 600; }
    table.cols td { padding: 5px 8px; border-bottom: 1px solid #edf2f7; vertical-align: top; }
    table.cols td.col { font-family: Consolas, Monaco, monospace; color: #2d3748; font-weight: 600; }
    table.cols td.doc { color: #444; max-width: 380px; }
    table.cols td.default { font-family: Consolas, Monaco, monospace; font-size: 11px; color: #4a5568; max-width: 180px; word-break: break-all; }
    table.cols td.mark { font-size: 11px; white-space: nowrap; }
    table.cols tr.diff-local-only { background: #f0fff4; }
    table.cols tr.diff-remote-only { background: #fffaf0; }
    table.cols tr.diff-changed { background: #fff5f5; }
    .absent { color: #cbd5e0; }
    .flag { display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 10px; margin-right: 2px; font-weight: 700; }
    .flag.pk { background: #fbd38d; color: #744210; }
    .flag.uq { background: #c6f6d5; color: #22543d; }
    .flag.fk { background: #bee3f8; color: #2c5282; cursor: help; }
    .diff-box { background: #fff5f5; border-left: 4px solid #c53030; padding: 12px 16px; border-radius: 4px; margin: 16px 0; }
    .diff-box h3 { margin: 0 0 8px 0; font-size: 14px; color: #742a2a; }
    .diff-box ul { margin: 4px 0; padding-left: 20px; font-size: 12px; }
    .diff-box code { background: #fed7d7; padding: 1px 5px; border-radius: 2px; font-size: 11px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>NEXORA GRID — DB Schema 盤點（本端 vs 遠端）</h1>
    <div class="meta">產出時間：${generatedAt}　|　本端：localhost:5433 / nexora_core　|　遠端：Railway production</div>
    ${
      driftTables === 0 && localOnlyTables.length === 0 && remoteOnlyTables.length === 0
        ? '<div class="meta" style="margin-top:8px;background:#22543d;padding:6px 10px;border-radius:4px;display:inline-block;">✅ 兩端 schema 完全對齊（表數同、欄位同、型別 nullable default 全相同）</div>'
        : ''
    }
  </div>

  <div class="summary">
    <div class="card"><div class="num">${allTables.size}</div><div class="label">總表數（聯集）</div></div>
    <div class="card"><div class="num">${local.tables.length}</div><div class="label">本端表數</div></div>
    <div class="card"><div class="num">${remote.tables.length}</div><div class="label">遠端表數</div></div>
    <div class="card"><div class="num">${totalColumns}</div><div class="label">總欄位數</div></div>
    <div class="card drift"><div class="num">${driftTables}</div><div class="label">有差異的表</div></div>
    <div class="card drift"><div class="num">${driftColumns}</div><div class="label">有差異的欄位</div></div>
  </div>

  ${
    localOnlyTables.length || remoteOnlyTables.length
      ? `
  <div class="diff-box">
    <h3>📋 表級差異總覽</h3>
    ${
      localOnlyTables.length
        ? `<p><b>🟢 僅本端存在 (${localOnlyTables.length})</b>：${localOnlyTables.map((t) => `<code>${esc(t)}</code>`).join('、')}</p>`
        : ''
    }
    ${
      remoteOnlyTables.length
        ? `<p><b>🟠 僅遠端存在 (${remoteOnlyTables.length})</b>：${remoteOnlyTables.map((t) => `<code>${esc(t)}</code>`).join('、')}</p>`
        : ''
    }
  </div>`
      : ''
  }

  <div class="legend">
    <b>標記說明：</b>
    <span>🟢 本端獨有</span>
    <span>🟠 遠端獨有</span>
    <span>🔴 兩端不同（型別 / nullable / default）</span>
    <span>✅ 同步</span>
    <span><b>NN</b> = NOT NULL</span>
    <span><span class="flag pk">PK</span> 主鍵</span>
    <span><span class="flag uq">UQ</span> 唯一</span>
    <span><span class="flag fk">FK</span> 外鍵（hover 看指向）</span>
  </div>

  <div class="toc">
    <b>模組目錄：</b>
    ${sortedModules.map((m) => `<a href="#${esc(m)}">${esc(m)}</a>`).join('')}
  </div>

  ${moduleHtmls.map((h, idx) => h.replace('<section class="module">', `<section class="module" id="${esc(sortedModules[idx])}">`)).join('')}

  <footer style="margin-top: 40px; text-align: center; color: #888; font-size: 12px;">
    Generated by db-schema-audit.mts / Hank<br>
    中文用途說明：來源為 schema.prisma <code>///</code> 文檔註解；缺註解的欄位標 ⚠️ 用途待確認
  </footer>
</body>
</html>`;
}

// ============================================================
// 5. main
// ============================================================
async function main() {
  console.log('[1/4] 解析 schema.prisma...');
  const schemaSrc = fs.readFileSync(SCHEMA_PATH, 'utf8');
  const schema = parseSchema(schemaSrc);
  console.log(`  → ${schema.size} 個 model`);

  const localUrl = dotenv.parse(fs.readFileSync(LOCAL_ENV, 'utf8')).DATABASE_URL;
  const remoteUrl = dotenv.parse(fs.readFileSync(REMOTE_ENV, 'utf8')).DATABASE_URL;
  if (!localUrl) throw new Error('本端 .env 缺 DATABASE_URL');
  if (!remoteUrl) throw new Error('遠端 .env.railway 缺 DATABASE_URL');

  console.log('[2/4] 拉本端 metadata...');
  const local = await pullDb(localUrl, '本端');
  console.log('[3/4] 拉遠端 metadata...');
  const remote = await pullDb(remoteUrl, '遠端');

  console.log('[4/4] 產 HTML...');
  const html = buildHtml({
    schema,
    local,
    remote,
    generatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' (UTC)',
  });
  fs.mkdirSync(path.dirname(OUT_HTML), { recursive: true });
  fs.writeFileSync(OUT_HTML, html, 'utf8');
  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        local: { tables: local.tables, columnCount: [...local.columns.values()].reduce((a, b) => a + b.length, 0) },
        remote: { tables: remote.tables, columnCount: [...remote.columns.values()].reduce((a, b) => a + b.length, 0) },
      },
      null,
      2,
    ),
    'utf8',
  );

  console.log(`\n✅ 完成`);
  console.log(`   HTML: ${OUT_HTML}`);
  console.log(`   JSON: ${OUT_JSON}`);
  console.log(`   本端 ${local.tables.length} 表 / 遠端 ${remote.tables.length} 表`);
}

main().catch((e) => {
  console.error('❌ 失敗：', e.message);
  console.error(e.stack);
  process.exit(1);
});
