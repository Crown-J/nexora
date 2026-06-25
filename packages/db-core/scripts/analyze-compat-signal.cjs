// 找 csv 裡的「互換訊號」：
//  1. 同一查詢料號 → 多個不同正式料號（最強訊號、表示用戶搜這個會跳出多顆料）
//  2. 正式料號 X 的某個查詢料號 = 正式料號 Y（X 和 Y 互為「同一個別名」）
//  3. 主對應旗標 Y/N 的真實分布（Y 可能是「主對應」、互換群的代表）
const fs = require('fs');
const path = require('path');

function normalize(s) {
  return s.replace(/[\s#\-*.]/g, '').toLowerCase();
}

const file = path.join(__dirname, '../../../docs/專案/測試資料/20260606_零件對應表.csv');
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

// query(normalize) → Set<official(normalize)>
const queryToOfficials = new Map();
// official(normalize) → Set<official(normalize)> 透過共享 query 推導互換
const officialAliases = new Map(); // 原始 official 大寫保存
const officialOriginal = new Map(); // norm → 原始字串

let rows = 0;
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  const cols = line.split(',');
  if (cols.length < 5) continue;
  const query = (cols[0] || '').trim();
  const official = (cols[1] || '').trim();
  const type = (cols[3] || '').trim();
  if (!query || !official) continue;
  const qn = normalize(query);
  const on = normalize(official);
  if (qn === on) continue; // 跳純去空格
  if (!queryToOfficials.has(qn)) queryToOfficials.set(qn, new Set());
  queryToOfficials.get(qn).add(on);
  if (!officialOriginal.has(on)) officialOriginal.set(on, official);
  rows++;
}

console.log(`有效 row（排除純去空格）: ${rows}`);
console.log(`unique 查詢料號 (normalize): ${queryToOfficials.size}`);

// 訊號 1：同一查詢對應多個正式 = 互換群
let oneTarget = 0;
let twoTargets = 0;
let multi = 0;
const compatGroups = []; // [{ query, officials: [...] }]
for (const [qn, officials] of queryToOfficials) {
  if (officials.size === 1) oneTarget++;
  else if (officials.size === 2) {
    twoTargets++;
    compatGroups.push({ query: qn, officials: Array.from(officials) });
  } else {
    multi++;
    compatGroups.push({ query: qn, officials: Array.from(officials) });
  }
}

console.log(`\n--- 「查詢料號 → 對應正式料號數量」 ---`);
console.log(`  1 個正式 (純別名)：${oneTarget}`);
console.log(`  2 個正式 (★互換訊號)：${twoTargets}`);
console.log(`  ≥ 3 個正式 (★強互換訊號)：${multi}`);

console.log(`\n=== 互換群 sample（前 10 組）===`);
compatGroups
  .sort((a, b) => b.officials.length - a.officials.length)
  .slice(0, 10)
  .forEach((g, idx) => {
    console.log(`\n  群 ${idx + 1}：搜 "${g.query}" 會找到 ${g.officials.length} 顆料：`);
    g.officials.forEach((o) => console.log(`    · ${officialOriginal.get(o)}`));
  });

console.log(`\n=== 訊號 2：嘗試聚類所有正式料號（共享別名 → 互換）===`);
// union-find
const parent = new Map();
function find(x) {
  if (!parent.has(x)) parent.set(x, x);
  if (parent.get(x) === x) return x;
  const r = find(parent.get(x));
  parent.set(x, r);
  return r;
}
function union(a, b) {
  const ra = find(a);
  const rb = find(b);
  if (ra !== rb) parent.set(ra, rb);
}
for (const officials of queryToOfficials.values()) {
  if (officials.size < 2) continue;
  const arr = Array.from(officials);
  for (let i = 1; i < arr.length; i++) union(arr[0], arr[i]);
}
const clusters = new Map();
for (const off of officialOriginal.keys()) {
  const r = find(off);
  if (!clusters.has(r)) clusters.set(r, []);
  clusters.get(r).push(off);
}
const compatClusters = Array.from(clusters.values()).filter((c) => c.length >= 2);
console.log(`\n互換群總數 (cluster size ≥ 2)：${compatClusters.length}`);
const sizeDist = {};
compatClusters.forEach((c) => {
  const k = c.length >= 10 ? '10+' : String(c.length);
  sizeDist[k] = (sizeDist[k] || 0) + 1;
});
console.log('cluster size 分布：');
Object.entries(sizeDist)
  .sort(([a], [b]) => (a === '10+' ? 1 : b === '10+' ? -1 : Number(a) - Number(b)))
  .forEach(([k, v]) => console.log(`  size ${k}: ${v} 群`));

console.log(`\n=== 大互換群 sample（size ≥ 5 的前 5 組）===`);
compatClusters
  .filter((c) => c.length >= 5)
  .sort((a, b) => b.length - a.length)
  .slice(0, 5)
  .forEach((c, idx) => {
    console.log(`\n  互換群 ${idx + 1}（${c.length} 顆料）：`);
    c.slice(0, 8).forEach((o) => console.log(`    · ${officialOriginal.get(o)}`));
    if (c.length > 8) console.log(`    ... 共 ${c.length} 顆`);
  });
