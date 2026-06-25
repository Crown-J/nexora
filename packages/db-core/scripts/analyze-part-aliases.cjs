// 分析 docs/專案/測試資料/20260606_零件對應表.csv
// 規則（執行長 2026-06-25）：
//   T = 正廠料號、N = 新料號、O = 舊料號、B = 基準料號、P = 廠牌料號
//   normalize(s) = s 去 [空格 # - * .] 後 lowercase（系統 part-search 內建邏輯）
//   若 normalize(query) === normalize(official) → 純去空格差異、不匯入（系統自動 match）
//   否則才是真正「不同寫法」、要匯入
const fs = require('fs');
const path = require('path');

function normalize(s) {
  return s.replace(/[\s#\-*.]/g, '').toLowerCase();
}

const file = path.join(__dirname, '../../../docs/專案/測試資料/20260606_零件對應表.csv');
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
const header = lines[0];
console.log('Header:', header);

const stats = {
  total: 0,
  byType: { O: 0, B: 0, P: 0, T: 0, N: 0, OTHER: 0 },
  spaceOnly: { O: 0, B: 0, P: 0, T: 0, N: 0 }, // 純去空格差異、不用匯入
  realDiff: { O: 0, B: 0, P: 0, T: 0, N: 0 }, // 真正不同、要匯入
  uniqueOfficialReal: new Set(), // 真要匯入的正式料號（去 dup）
  uniqueAliasReal: new Set(), // 真要匯入的查詢料號（去 dup）
};

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  // 簡單 split 後合適、但有些欄含空白逗號（罕見）。先簡單 split。
  const cols = line.split(',');
  if (cols.length < 5) continue;
  const query = (cols[0] || '').trim();
  const official = (cols[1] || '').trim();
  const type = (cols[3] || '').trim();
  if (!query || !official) continue;
  stats.total++;
  if (stats.byType[type] !== undefined) stats.byType[type]++;
  else stats.byType.OTHER++;

  const isSpaceOnly = normalize(query) === normalize(official);
  if (type in stats.spaceOnly) {
    if (isSpaceOnly) stats.spaceOnly[type]++;
    else {
      stats.realDiff[type]++;
      stats.uniqueOfficialReal.add(normalize(official));
      stats.uniqueAliasReal.add(normalize(query));
    }
  }
}

console.log('\n=== 總計 ===');
console.log(`筆數 total=${stats.total}`);
console.log('\n=== 對應類型分布 ===');
for (const [t, c] of Object.entries(stats.byType)) {
  console.log(`  ${t}: ${c}`);
}
console.log('\n=== 純去空格差異（系統自動 match、不用匯入）===');
let spaceOnlyTotal = 0;
for (const [t, c] of Object.entries(stats.spaceOnly)) {
  spaceOnlyTotal += c;
  console.log(`  ${t}: ${c}`);
}
console.log(`  小計: ${spaceOnlyTotal}`);
console.log('\n=== 真正不同寫法（要匯入）===');
let realTotal = 0;
for (const [t, c] of Object.entries(stats.realDiff)) {
  realTotal += c;
  console.log(`  ${t}: ${c}`);
}
console.log(`  小計: ${realTotal}`);
console.log('\n=== 去重後 ===');
console.log(`  正式料號 unique（要匯入的）: ${stats.uniqueOfficialReal.size}`);
console.log(`  查詢料號 unique（alias）: ${stats.uniqueAliasReal.size}`);
console.log(`\n壓縮比：原 ${stats.total} 筆 → 純差異 ${realTotal} 筆 (${((realTotal / stats.total) * 100).toFixed(1)}%)`);
