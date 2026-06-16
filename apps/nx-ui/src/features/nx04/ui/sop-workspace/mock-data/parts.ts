// apps/nx-ui/src/features/sale/ui/sop-workspace/mock-data/parts.ts
/**
 * 15 個料號 Mock — VAG 原廠 + 副廠混合，覆蓋「剎車片 / 機油濾心 / 空氣濾心 / 火星塞」等常見項目。
 * 刻意有缺貨（本倉 0）、庫存不足（< demo 常用量）、庫存充足三種狀態。
 *
 * imageUrl 一律用 SVG data URL placeholder — 讓 demo 的 Lightbox 可實際展開。
 * 正式部署時可替換為 /mock/parts/*.jpg 真實圖片。
 *
 * unitCost 設計：
 *   - VAG 原廠 ~75% of B 級售價（毛利 ~24%，略低於 B 目標 27%）
 *   - 副廠 ~64% of B 級售價（毛利 ~35%，高於 B 目標）
 * 主 demo 組合（剎車片 VW×20 + 副廠×5）合計毛利率 25%，對應春酒話術「略低於目標」。
 */

import type { Part } from '../types';

function makePlaceholder(sku: string, name: string): string {
  const svg = [
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180'>`,
    `<rect width='320' height='180' fill='#161616'/>`,
    `<rect x='16' y='16' width='288' height='148' fill='none' stroke='#2a2a2a' stroke-width='1'/>`,
    `<text x='160' y='76' fill='#E8A020' font-family='monospace' font-size='20' text-anchor='middle' font-weight='600'>${sku}</text>`,
    `<text x='160' y='104' fill='#9a9a9a' font-family='sans-serif' font-size='13' text-anchor='middle'>${name}</text>`,
    `<text x='160' y='148' fill='#4a4a4a' font-family='sans-serif' font-size='9' text-anchor='middle'>Demo Placeholder</text>`,
    `</svg>`,
  ].join('');
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const MOCK_PARTS: readonly Part[] = [
  // ── 剎車片（3 項，主要 demo 目標） ──
  {
    sku: 'SKU-001',
    name: '剎車片 VW Golf MK7',
    brand: 'VAG',
    vehicleTypes: ['VW Golf', 'VW Passat', 'Audi A3'],
    imageUrl: makePlaceholder('SKU-001', '剎車片 VW Golf MK7'),
    stocks: { main: 5, hsinchu: 15, taichung: 0 },
    prices: { A: 500, B: 550, C: 600, D: 680 },
    lastSoldPrice: 550,
    unitCost: 420,
  },
  {
    sku: 'SKU-004',
    name: '剎車片 Audi A4',
    brand: 'VAG',
    vehicleTypes: ['Audi A4', 'Audi A5'],
    imageUrl: makePlaceholder('SKU-004', '剎車片 Audi A4'),
    stocks: { main: 0, hsinchu: 8, taichung: 3 },
    prices: { A: 620, B: 680, C: 740, D: 820 },
    lastSoldPrice: 680,
    unitCost: 510,
  },
  {
    sku: 'SKU-015',
    name: '剎車片 副廠通用',
    brand: '副廠',
    vehicleTypes: ['通用'],
    imageUrl: makePlaceholder('SKU-015', '剎車片 副廠通用'),
    stocks: { main: 30, hsinchu: 45, taichung: 20 },
    prices: { A: 250, B: 280, C: 310, D: 350 },
    lastSoldPrice: 280,
    unitCost: 180,
  },
  // R7 Phase 5：春酒 demo 觸發「向同行調貨詢價」彈窗用的全公司無庫存料號。
  // 搜「剎車片」能找到，對方看到庫存全 0 會自然觸發新流程。
  {
    sku: 'SKU-016',
    name: '剎車片 Skoda Superb',
    brand: 'VAG',
    vehicleTypes: ['Skoda Superb', 'Skoda Kodiaq'],
    imageUrl: makePlaceholder('SKU-016', '剎車片 Skoda Superb'),
    stocks: { main: 0, hsinchu: 0, taichung: 0 },
    prices: { A: 580, B: 640, C: 700, D: 780 },
    lastSoldPrice: 640,
    unitCost: 490,
  },
  // ── 機油濾心 ──
  {
    sku: 'SKU-020',
    name: '機油濾心 VW Golf',
    brand: 'VAG',
    vehicleTypes: ['VW Golf', 'VW Tiguan'],
    imageUrl: makePlaceholder('SKU-020', '機油濾心 VW Golf'),
    stocks: { main: 12, hsinchu: 20, taichung: 8 },
    prices: { A: 180, B: 200, C: 220, D: 250 },
    lastSoldPrice: 200,
    unitCost: 150,
  },
  {
    sku: 'SKU-021',
    name: '機油濾心 Audi A4',
    brand: 'VAG',
    vehicleTypes: ['Audi A4', 'Audi Q5'],
    imageUrl: makePlaceholder('SKU-021', '機油濾心 Audi A4'),
    stocks: { main: 3, hsinchu: 10, taichung: 5 },
    prices: { A: 220, B: 240, C: 260, D: 290 },
    lastSoldPrice: 240,
    unitCost: 180,
  },
  {
    sku: 'SKU-022',
    name: '機油濾心 副廠通用',
    brand: '副廠',
    vehicleTypes: ['通用'],
    imageUrl: makePlaceholder('SKU-022', '機油濾心 副廠通用'),
    stocks: { main: 50, hsinchu: 40, taichung: 30 },
    prices: { A: 90, B: 100, C: 110, D: 130 },
    lastSoldPrice: 100,
    unitCost: 65,
  },
  // ── 空氣濾心 ──
  {
    sku: 'SKU-030',
    name: '空氣濾心 VW Passat',
    brand: 'VAG',
    vehicleTypes: ['VW Passat', 'VW Tiguan'],
    imageUrl: makePlaceholder('SKU-030', '空氣濾心 VW Passat'),
    stocks: { main: 8, hsinchu: 12, taichung: 6 },
    prices: { A: 280, B: 310, C: 340, D: 380 },
    lastSoldPrice: 310,
    unitCost: 235,
  },
  {
    sku: 'SKU-031',
    name: '空氣濾心 Skoda Superb',
    brand: 'VAG',
    vehicleTypes: ['Skoda Superb', 'Skoda Octavia'],
    imageUrl: makePlaceholder('SKU-031', '空氣濾心 Skoda Superb'),
    stocks: { main: 0, hsinchu: 6, taichung: 0 },
    prices: { A: 260, B: 290, C: 320, D: 360 },
    lastSoldPrice: 290,
    unitCost: 220,
  },
  // ── 火星塞 ──
  {
    sku: 'SKU-040',
    name: '火星塞組 VW Golf',
    brand: 'VAG',
    vehicleTypes: ['VW Golf', 'VW Polo'],
    imageUrl: makePlaceholder('SKU-040', '火星塞組 VW Golf'),
    stocks: { main: 15, hsinchu: 22, taichung: 10 },
    prices: { A: 1050, B: 1150, C: 1250, D: 1400 },
    lastSoldPrice: 1150,
    unitCost: 870,
  },
  {
    sku: 'SKU-041',
    name: '火星塞組 Audi A4',
    brand: 'VAG',
    vehicleTypes: ['Audi A4', 'Audi Q5'],
    imageUrl: makePlaceholder('SKU-041', '火星塞組 Audi A4'),
    stocks: { main: 6, hsinchu: 8, taichung: 4 },
    prices: { A: 1280, B: 1400, C: 1520, D: 1700 },
    lastSoldPrice: 1400,
    unitCost: 1060,
  },
  // ── 雨刷/燈泡/其他 ──
  {
    sku: 'SKU-050',
    name: '雨刷片 VW Golf 24"',
    brand: 'VAG',
    vehicleTypes: ['VW Golf', 'VW Passat'],
    imageUrl: makePlaceholder('SKU-050', '雨刷片 VW Golf 24"'),
    stocks: { main: 20, hsinchu: 15, taichung: 12 },
    prices: { A: 380, B: 420, C: 460, D: 520 },
    lastSoldPrice: 420,
    unitCost: 320,
  },
  {
    sku: 'SKU-051',
    name: '雨刷片 副廠通用 22"',
    brand: '副廠',
    vehicleTypes: ['通用'],
    imageUrl: makePlaceholder('SKU-051', '雨刷片 副廠通用 22"'),
    stocks: { main: 40, hsinchu: 30, taichung: 25 },
    prices: { A: 150, B: 170, C: 190, D: 220 },
    lastSoldPrice: 170,
    unitCost: 110,
  },
  {
    sku: 'SKU-060',
    name: 'LED 大燈組 Audi A4',
    brand: 'VAG',
    vehicleTypes: ['Audi A4'],
    imageUrl: makePlaceholder('SKU-060', 'LED 大燈組 Audi A4'),
    stocks: { main: 2, hsinchu: 3, taichung: 1 },
    prices: { A: 8800, B: 9500, C: 10200, D: 11500 },
    lastSoldPrice: 9500,
    unitCost: 7200,
  },
  {
    sku: 'SKU-061',
    name: '引擎蓋密封條 Skoda Octavia',
    brand: 'VAG',
    vehicleTypes: ['Skoda Octavia'],
    imageUrl: makePlaceholder('SKU-061', '引擎蓋密封條 Skoda Octavia'),
    stocks: { main: 4, hsinchu: 6, taichung: 3 },
    prices: { A: 1180, B: 1280, C: 1380, D: 1550 },
    lastSoldPrice: 1280,
    unitCost: 970,
  },
  {
    sku: 'SKU-070',
    name: '輪胎 Porsche Cayenne 21"',
    brand: 'VAG',
    vehicleTypes: ['Porsche Cayenne'],
    imageUrl: makePlaceholder('SKU-070', '輪胎 Porsche Cayenne 21"'),
    stocks: { main: 0, hsinchu: 4, taichung: 0 },
    prices: { A: 22500, B: 24800, C: 27000, D: 30500 },
    lastSoldPrice: 24800,
    unitCost: 18800,
  },
];

/** 依關鍵字搜尋料號（name / vehicleTypes / brand / sku），不分大小寫 */
export function searchParts(keyword: string): Part[] {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return [];
  return MOCK_PARTS.filter((p) => {
    const hay = [p.name, p.brand, p.sku, ...p.vehicleTypes].join(' ').toLowerCase();
    return hay.includes(kw);
  });
}

export function totalStock(part: Part): number {
  return part.stocks.main + part.stocks.hsinchu + part.stocks.taichung;
}

/** O(1) sku 查詢（STEP 3 報價清單顯示名稱/成本用） */
export const PART_BY_SKU: Record<string, Part> = MOCK_PARTS.reduce<Record<string, Part>>(
  (acc, p) => {
    acc[p.sku] = p;
    return acc;
  },
  {},
);
