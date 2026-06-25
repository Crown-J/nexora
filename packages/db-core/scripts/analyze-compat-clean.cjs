// 過濾 Excel 科學記數法污染後的真互換群分析
const fs = require('fs');
const path = require('path');

function normalize(s) {
  return s.replace(/[\s#\-*.]/g, '').toLowerCase();
}
function isExcelSciNotation(s) {
  // 排除像 941992e+11 / 711307e+11 / 291e+12 的 Excel 科學記數法污染
  return /e\+\d+/i.test(s);
}

const file = path.join(__dirname, '../../../docs/專案/測試資料/20260606_零件對應表.csv');
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

const queryToOfficials = new Map();
const officialOriginal = new Map();
let dirty = 0;
let valid = 0;

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  const cols = line.split(',');
  if (cols.length < 5) continue;
  const query = (cols[0] || '').trim();
  const official = (cols[1] || '').trim();
  if (!query || !official) continue;
  if (isExcelSciNotation(query)) {
    dirty++;
    continue;
  }
  const qn = normalize(query);
  const on = normalize(official);
  if (qn === on) continue;
  valid++;
  if (!queryToOfficials.has(qn)) queryToOfficials.set(qn, new Set());
  queryToOfficials.get(qn).add(on);
  if (!officialOriginal.has(on)) officialOriginal.set(on, official);
}

console.log(`過濾掉 Excel 科學記數法污染：${dirty} 筆`);
console.log(`有效真不同寫法：${valid} 筆`);
console.log(`unique 查詢料號：${queryToOfficials.size}`);

// union-find 聚類
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
compatClusters.sort((a, b) => b.length - a.length);

console.log(`\n==== 過濾後互換群統計 ====`);
console.log(`總群數 (size ≥ 2)：${compatClusters.length}`);
const sizeDist = {};
let totalParts = 0;
compatClusters.forEach((c) => {
  totalParts += c.length;
  const k =
    c.length >= 50 ? '50+ ⚠' : c.length >= 20 ? '20-49' : c.length >= 10 ? '10-19' : String(c.length);
  sizeDist[k] = (sizeDist[k] || 0) + 1;
});
console.log(`涉及 part 總數：${totalParts}`);
console.log('\nsize 分布：');
const order = ['2', '3', '4', '5', '6', '7', '8', '9', '10-19', '20-49', '50+ ⚠'];
order.forEach((k) => {
  if (sizeDist[k]) console.log(`  size ${k}：${sizeDist[k]} 群`);
});

console.log(`\n==== Top 10 大群（過濾後）====`);
compatClusters.slice(0, 10).forEach((c, idx) => {
  console.log(`\n  群 ${idx + 1}（${c.length} 顆料）：`);
  c.slice(0, 6).forEach((o) => console.log(`    · ${officialOriginal.get(o)}`));
  if (c.length > 6) console.log(`    ... 共 ${c.length} 顆`);
});

console.log(`\n==== 推薦自動匯入範圍（size 2~9、最可信）====`);
const safe = compatClusters.filter((c) => c.length >= 2 && c.length <= 9);
console.log(`  群數：${safe.length}`);
console.log(`  涉及 part 總數：${safe.reduce((s, c) => s + c.length, 0)}`);
