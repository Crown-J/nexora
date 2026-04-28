// packages/db-core/prisma/seed/demo/lib/pricing.ts
// @FUNCTION_CODE SYS-DEMO-LIB-002-F01
// 分類隨機區間定價（Crown Q7 拍板：(a) 真實價格範圍）
//
// 三類別 × 各自隨機區間，business intuition 對齊業界真實價格。

export type PartCategory = 'consumable' | 'service' | 'structural';

interface PriceRange {
  costMin: number;
  costMax: number;
  /** 售價跟成本的比例（毛利對應）*/
  priceMultiplier: { min: number; max: number };
}

const RANGES: Record<PartCategory, PriceRange> = {
  // 耗材：機油濾芯 / 空濾 / 水箱精 / 雨刷
  consumable: {
    costMin: 50,
    costMax: 300,
    priceMultiplier: { min: 1.4, max: 1.8 }, // 40~80% 毛利
  },
  // 消耗品：煞車片 / 火星塞 / 皮帶 / 燈泡
  service: {
    costMin: 200,
    costMax: 1500,
    priceMultiplier: { min: 1.3, max: 1.6 }, // 30~60% 毛利
  },
  // 結構件：避震器 / 輪轂軸承 / 啟動馬達 / 發電機
  structural: {
    costMin: 1000,
    costMax: 10000,
    priceMultiplier: { min: 1.2, max: 1.5 }, // 20~50% 毛利
  },
};

/** Deterministic pseudo-random [0, 1) by seed */
function pseudo(seed: number): number {
  return ((seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
}

/** 依分類產生 (cost, price) 元組（同 seed 結果 deterministic）*/
export function pricingForCategory(
  category: PartCategory,
  seed: number,
): { avgCost: number; unitPrice: number } {
  const range = RANGES[category];
  const cost =
    range.costMin +
    pseudo(seed) * (range.costMax - range.costMin);
  const multiplier =
    range.priceMultiplier.min +
    pseudo(seed + 7919) * (range.priceMultiplier.max - range.priceMultiplier.min);
  return {
    avgCost: Math.round(cost),
    unitPrice: Math.round(cost * multiplier),
  };
}

/** 依 partIdx 推算 category（前 30% 耗材、中 50% 消耗品、後 20% 結構件，業界長尾）*/
export function categoryByIndex(partIdx: number, totalParts: number): PartCategory {
  const ratio = partIdx / totalParts;
  if (ratio < 0.3) return 'consumable';
  if (ratio < 0.8) return 'service';
  return 'structural';
}
