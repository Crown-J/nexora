// apps/nx-ui/src/features/sale/ui/sop-workspace/mock-data/parts.ts
/**
 * 15 個料號 Mock — VAG 原廠 + 副廠混合，覆蓋「剎車片 / 機油濾心 / 空氣濾心 / 火星塞」等常見項目。
 * 刻意有缺貨（本倉 0）、庫存不足（< demo 常用量）、庫存充足三種狀態，讓 STEP 2 救援戲碼有素材。
 */

import type { Part } from '../types';

export const MOCK_PARTS: readonly Part[] = [
  // ── 剎車片系列（3 項，主要 demo 目標） ──
  {
    sku: 'SKU-001',
    name: '剎車片 VW Golf MK7',
    brand: 'VAG',
    vehicleTypes: ['VW Golf', 'VW Passat', 'Audi A3'],
    imageEmoji: '🛞',
    stocks: { main: 5, hsinchu: 15, taichung: 0 },
    prices: { A: 500, B: 550, C: 600, D: 680 },
    lastSoldPrice: 550,
  },
  {
    sku: 'SKU-004',
    name: '剎車片 Audi A4',
    brand: 'VAG',
    vehicleTypes: ['Audi A4', 'Audi A5'],
    imageEmoji: '🛞',
    stocks: { main: 0, hsinchu: 8, taichung: 3 },
    prices: { A: 620, B: 680, C: 740, D: 820 },
    lastSoldPrice: 680,
  },
  {
    sku: 'SKU-015',
    name: '剎車片 副廠通用',
    brand: '副廠',
    vehicleTypes: ['通用'],
    imageEmoji: '🛞',
    stocks: { main: 30, hsinchu: 45, taichung: 20 },
    prices: { A: 250, B: 280, C: 310, D: 350 },
    lastSoldPrice: 280,
  },
  // ── 機油濾心系列 ──
  {
    sku: 'SKU-020',
    name: '機油濾心 VW Golf',
    brand: 'VAG',
    vehicleTypes: ['VW Golf', 'VW Tiguan'],
    imageEmoji: '🔩',
    stocks: { main: 12, hsinchu: 20, taichung: 8 },
    prices: { A: 180, B: 200, C: 220, D: 250 },
    lastSoldPrice: 200,
  },
  {
    sku: 'SKU-021',
    name: '機油濾心 Audi A4',
    brand: 'VAG',
    vehicleTypes: ['Audi A4', 'Audi Q5'],
    imageEmoji: '🔩',
    stocks: { main: 3, hsinchu: 10, taichung: 5 },
    prices: { A: 220, B: 240, C: 260, D: 290 },
    lastSoldPrice: 240,
  },
  {
    sku: 'SKU-022',
    name: '機油濾心 副廠通用',
    brand: '副廠',
    vehicleTypes: ['通用'],
    imageEmoji: '🔩',
    stocks: { main: 50, hsinchu: 40, taichung: 30 },
    prices: { A: 90, B: 100, C: 110, D: 130 },
    lastSoldPrice: 100,
  },
  // ── 空氣濾心系列 ──
  {
    sku: 'SKU-030',
    name: '空氣濾心 VW Passat',
    brand: 'VAG',
    vehicleTypes: ['VW Passat', 'VW Tiguan'],
    imageEmoji: '💨',
    stocks: { main: 8, hsinchu: 12, taichung: 6 },
    prices: { A: 280, B: 310, C: 340, D: 380 },
    lastSoldPrice: 310,
  },
  {
    sku: 'SKU-031',
    name: '空氣濾心 Skoda Superb',
    brand: 'VAG',
    vehicleTypes: ['Skoda Superb', 'Skoda Octavia'],
    imageEmoji: '💨',
    stocks: { main: 0, hsinchu: 6, taichung: 0 },
    prices: { A: 260, B: 290, C: 320, D: 360 },
    lastSoldPrice: 290,
  },
  // ── 火星塞系列 ──
  {
    sku: 'SKU-040',
    name: '火星塞組 VW Golf',
    brand: 'VAG',
    vehicleTypes: ['VW Golf', 'VW Polo'],
    imageEmoji: '⚡',
    stocks: { main: 15, hsinchu: 22, taichung: 10 },
    prices: { A: 1050, B: 1150, C: 1250, D: 1400 },
    lastSoldPrice: 1150,
  },
  {
    sku: 'SKU-041',
    name: '火星塞組 Audi A4',
    brand: 'VAG',
    vehicleTypes: ['Audi A4', 'Audi Q5'],
    imageEmoji: '⚡',
    stocks: { main: 6, hsinchu: 8, taichung: 4 },
    prices: { A: 1280, B: 1400, C: 1520, D: 1700 },
    lastSoldPrice: 1400,
  },
  // ── 雨刷/膠條/燈泡等雜項 ──
  {
    sku: 'SKU-050',
    name: '雨刷片 VW Golf 24"',
    brand: 'VAG',
    vehicleTypes: ['VW Golf', 'VW Passat'],
    imageEmoji: '🌧️',
    stocks: { main: 20, hsinchu: 15, taichung: 12 },
    prices: { A: 380, B: 420, C: 460, D: 520 },
    lastSoldPrice: 420,
  },
  {
    sku: 'SKU-051',
    name: '雨刷片 副廠通用 22"',
    brand: '副廠',
    vehicleTypes: ['通用'],
    imageEmoji: '🌧️',
    stocks: { main: 40, hsinchu: 30, taichung: 25 },
    prices: { A: 150, B: 170, C: 190, D: 220 },
    lastSoldPrice: 170,
  },
  {
    sku: 'SKU-060',
    name: 'LED 大燈組 Audi A4',
    brand: 'VAG',
    vehicleTypes: ['Audi A4'],
    imageEmoji: '💡',
    stocks: { main: 2, hsinchu: 3, taichung: 1 },
    prices: { A: 8800, B: 9500, C: 10200, D: 11500 },
    lastSoldPrice: 9500,
  },
  {
    sku: 'SKU-061',
    name: '引擎蓋密封條 Skoda Octavia',
    brand: 'VAG',
    vehicleTypes: ['Skoda Octavia'],
    imageEmoji: '🧷',
    stocks: { main: 4, hsinchu: 6, taichung: 3 },
    prices: { A: 1180, B: 1280, C: 1380, D: 1550 },
    lastSoldPrice: 1280,
  },
  {
    sku: 'SKU-070',
    name: '輪胎 Porsche Cayenne 21"',
    brand: 'VAG',
    vehicleTypes: ['Porsche Cayenne'],
    imageEmoji: '🛞',
    stocks: { main: 0, hsinchu: 4, taichung: 0 },
    prices: { A: 22500, B: 24800, C: 27000, D: 30500 },
    lastSoldPrice: 24800,
  },
];

/** 依關鍵字搜尋料號（name / vehicleTypes / brand），不分大小寫 */
export function searchParts(keyword: string): Part[] {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return [];
  return MOCK_PARTS.filter((p) => {
    const hay = [p.name, p.brand, p.sku, ...p.vehicleTypes].join(' ').toLowerCase();
    return hay.includes(kw);
  });
}

/** 計算一個料號所有倉的總庫存 */
export function totalStock(part: Part): number {
  return part.stocks.main + part.stocks.hsinchu + part.stocks.taichung;
}
