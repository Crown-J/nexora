import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * 本專案尚無 nx99_feature_flag 表；此 API 依「有效訂閱方案＋訂閱明細＋nx99_product_module」
 * 推算租戶已啟用之產品模組（功能邊界），對應規格書中的 feature flag 查詢需求。
 */
export class ListFeatureFlagsQueryDto {
  /** 平台情境可指定租戶；一般使用者省略則用 JWT tenantId */
  @IsOptional()
  @IsString()
  @MaxLength(15)
  tenantId?: string;
}
