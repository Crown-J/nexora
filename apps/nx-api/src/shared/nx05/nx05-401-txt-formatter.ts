// apps/nx-api/src/shared/nx05/nx05-401-txt-formatter.ts
// v1.2 階段 F P5 A：401 媒體申報 TXT 兩檔產生器
//
// 對齊 Alex 給的財政部「營業稅電子資料申報繳稅作業要點」2024-04-12 最新修正版（第五節 §17-21）+
// law-out.mof.gov.tw GL009478 附件五/六。
//
// 兩個檔案：
//   1) 進銷項資料檔：{統編8碼}.TXT、每筆 81 字元 fixed-width、ASCII、無分隔符
//   2) 401 主表檔：{統編8碼}.TET_U、112 欄、用「|」分隔
//
// 5% 稅率算法：
//   - 買受人非營業人（taxId 空）：銷項稅 = 含稅總額 ÷ 1.05 × 0.05、銷售額 = 總額 − 稅額
//   - 買受人營業人（taxId 有）：銷售額 = 定價 ÷ 1.05、銷項稅 = 銷售額 × 0.05
//   - 既有 schema 有 subtotal + taxAmount + totalAmount、直接用、不重算

import { Prisma as PrismaNs } from 'db-core';

const dec = (v: PrismaNs.Decimal | number | string | null | undefined): PrismaNs.Decimal =>
  new PrismaNs.Decimal(v ?? 0);

/** 西元年 → 民國年（西元 - 1911）、輸出 'YYY' 字串（3 碼） */
function rocYear(d: Date): string {
  return String(d.getFullYear() - 1911).padStart(3, '0');
}

/** 西元年月 → 民國年月（YYYMM、5 碼）、d 取「迄月」（雙月期碼第二月） */
export function rocYearMonth(d: Date): string {
  return rocYear(d) + String(d.getMonth() + 1).padStart(2, '0');
}

/** 左補 0 至指定長度（數字欄位用）。Decimal/string 都接、整數部分取 abs round。 */
function lpadNum(v: PrismaNs.Decimal | number | string, len: number): string {
  const n = dec(v).abs().toFixed(0); // 取整、四捨五入
  if (n.length > len) return n.slice(-len); // 超長截尾段（安全 fallback）
  return n.padStart(len, '0');
}

/** 右補空白至指定長度（文字欄位用） */
function rpadStr(v: string | null | undefined, len: number): string {
  const s = (v ?? '').toString();
  if (s.length > len) return s.slice(0, len);
  return s + ' '.repeat(len - s.length);
}

/** 進銷項一行（81 字元、依 Alex 規範第五節 §20） */
export type MediaRowInput = {
  formatCode: '31' | '33' | '21' | '23'; // 31 銷項三聯 / 33 銷貨退/折 / 21 進項三聯 / 23 進貨退/折
  sellerTaxId: string; // 銷售人統編（8 碼）
  buyerTaxId: string; // 買受人統編（8 碼、非營業人填 '00000000'）
  filerTaxId: string; // 申報營業人（我方）統編（9 碼、第 9 碼為控制碼、無則補 0）
  serialNo: number; // 該筆流水號
  yyymm: string; // 資料所屬年月（民國 YYYMM）
  salesAmount: PrismaNs.Decimal | number; // 銷售額（未稅）
  taxClass: '1' | '2' | '3'; // 1 應稅 / 2 零稅率 / 3 免稅
  taxAmount: PrismaNs.Decimal | number; // 營業稅額
  deductionCode: string; // 扣抵代號（1 碼、進項才有、銷項補空白）
};

/** 產一行進銷項資料檔（固定 81 字元） */
export function buildMediaRow(p: MediaRowInput): string {
  const parts = [
    rpadStr(p.filerTaxId, 9), // 申報營業人稅籍編號（9）
    String(p.serialNo).padStart(7, '0'), // 流水號（7）
    p.yyymm, // 資料所屬年月（5、民國 YYYMM）
    p.formatCode, // 格式代號（2）
    rpadStr(p.buyerTaxId, 8), // 買受人統編（8）
    rpadStr(p.sellerTaxId, 8), // 銷售人統編（8）
    lpadNum(p.salesAmount, 12), // 銷售額（12、左補 0）
    p.taxClass, // 課稅別（1）
    lpadNum(p.taxAmount, 10), // 營業稅額（10、左補 0）
    rpadStr(p.deductionCode, 1), // 扣抵代號（1）
  ].join('');
  // 合計 9+7+5+2+8+8+12+1+10+1 = 63、補 18 個空白至 81 字元
  return parts + ' '.repeat(81 - parts.length);
}

/** 401 主表 112 欄、用「|」分隔（資料別=1 一般稅額專營應稅） */
export type MainFormInput = {
  filerTaxId: string; // 申報營業人統編（9 碼）
  filerName: string; // 申報營業人名稱
  yyymm: string; // 所屬年月（YYYMM、迄月）
  totalSalesTaxable: PrismaNs.Decimal | number; // 應稅銷售額（5%）
  totalSalesZero: PrismaNs.Decimal | number; // 零稅率銷售額
  totalSalesExempt: PrismaNs.Decimal | number; // 免稅銷售額
  outputTax: PrismaNs.Decimal | number; // 銷項稅額
  inputTax: PrismaNs.Decimal | number; // 進項稅額
  taxPayable: PrismaNs.Decimal | number; // 本期應納稅額（銷-進）
};

/**
 * 產 401 主表單行（112 欄、|分隔）
 *
 * ⚠️ 本實作為基礎版：依 Alex 給的關鍵欄位填、其他欄位（兼營比例 / 海關稅額 /
 *    特種稅額 / 上期累積等）一律補空白或 0；
 *    完整 112 欄精確映射需依 GL009478 附件六完整對照、列入 closure 後續軌。
 */
export function buildMainForm(p: MainFormInput): string {
  const cols: string[] = new Array(112).fill('');

  // 欄 1：資料別（1=401 一般稅額專營應稅）
  cols[0] = '1';
  // 欄 2：申報種類（1=按期申報）
  cols[1] = '1';
  // 欄 3：營業人稅籍編號（9 碼）
  cols[2] = rpadStr(p.filerTaxId, 9);
  // 欄 4：營業人名稱
  cols[3] = p.filerName;
  // 欄 5：所屬年月（民國 YYYMM、迄月）
  cols[4] = p.yyymm;

  // 銷售額欄位（粗略對齊、實際位置依規範附件六）
  cols[10] = lpadNum(p.totalSalesTaxable, 14); // 應稅銷售額
  cols[11] = lpadNum(p.totalSalesZero, 14); // 零稅率銷售額
  cols[12] = lpadNum(p.totalSalesExempt, 14); // 免稅銷售額

  // 稅額欄位
  cols[20] = lpadNum(p.outputTax, 14); // 銷項稅額
  cols[21] = lpadNum(p.inputTax, 14); // 進項稅額
  cols[30] = lpadNum(p.taxPayable, 14); // 本期應納稅額

  // 注意：第 6~9 / 13~19 / 22~29 / 31~112 欄為空（兼營/特種/上期累積/扣繳等本軌不處理）
  return cols.join('|');
}

/** 5% 稅率拆算：含稅總額 → { sales, tax } */
export function splitTaxFromGross(gross: PrismaNs.Decimal | number): {
  sales: PrismaNs.Decimal;
  tax: PrismaNs.Decimal;
} {
  const g = dec(gross);
  // tax = round(g / 1.05 × 0.05)、sales = g − tax
  const taxRaw = g.div(new PrismaNs.Decimal('1.05')).mul(new PrismaNs.Decimal('0.05'));
  const tax = taxRaw.toDecimalPlaces(0, PrismaNs.Decimal.ROUND_HALF_UP);
  const sales = g.minus(tax);
  return { sales, tax };
}
