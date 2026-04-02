/**
 * 汽車廠牌 API 回傳與零件廠牌（BrandDto）欄位對齊，僅別名供舊元件使用。
 */
export type {
  BrandDto as CarBrandDto,
  CreateBrandBody as CreateCarBrandBody,
  PagedResult,
  UpdateBrandBody as UpdateCarBrandBody,
} from '@/features/nx00/brand/types';
