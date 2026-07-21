// apps/nx-api/src/shared/nx01/taiwan-tax-id.ts
// 台灣統一編號 8 碼檢核（帳戶閘門規格 v1.3 五-6、2026-07-21 執行長拍板：做檢核＋外籍後門）
// 演算法：各位數 × 權重 [1,2,1,2,1,2,4,1]、乘積十位個位相加後總和；
// 2023-04 起放寬為「總和可被 5 整除」即合法；第 7 碼為 7 時、總和+1 可被 5 整除亦合法。

const WEIGHTS = [1, 2, 1, 2, 1, 2, 4, 1] as const;

export function isValidTaiwanTaxId(raw: string): boolean {
  const s = (raw || '').trim();
  if (!/^\d{8}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    const product = Number(s[i]) * WEIGHTS[i];
    sum += Math.floor(product / 10) + (product % 10);
  }
  if (sum % 5 === 0) return true;
  return s[6] === '7' && (sum + 1) % 5 === 0;
}
