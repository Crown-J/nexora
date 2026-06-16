// apps/nx-ui/src/features/sale/ui/sop-workspace/types.ts
/**
 * 國內銷貨 SOP 手機工作台型別定義
 * 全 Mock、不接 API；useReducer 驅動 9 步流程。
 * 業務視角：看得到庫存/售價/毛利；看不到 AR/付款條件/逾期（權限切割展示）。
 */

export type StepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type CustomerTier = 'A' | 'B' | 'C' | 'D';

export type CustomerSalesStats = {
  today: number;
  month: number;
  yearly: number;
  /** 退貨率（近 3 個月，百分比） */
  returnRate: number;
};

export type CustomerRemark = {
  author: string;
  timeAgo: string;
  content: string;
};

export type Customer = {
  id: string;
  /** 客戶代碼（首次登錄時的等級字母 + 4 碼流水號，升降級不變） */
  code: string;
  name: string;
  contact: string;
  phone: string;
  address: string;
  tier: CustomerTier;
  customerType: '保養廠' | '同行';
  /** 是否偏遠（影響 STEP 6 推薦物流） */
  isRemote?: boolean;
  salesStats: CustomerSalesStats;
  remarks: CustomerRemark[];
};

export type WarehouseKey = 'main' | 'hsinchu' | 'taichung';

export const WAREHOUSE_META: Record<WarehouseKey, { label: string; etaHint: string }> = {
  main: { label: '本倉', etaHint: '今天下午可出' },
  hsinchu: { label: '新竹倉', etaHint: '明早可送到本倉' },
  taichung: { label: '台中倉', etaHint: '1~2 天內可調' },
};

export type Part = {
  sku: string;
  name: string;
  brand: string;
  vehicleTypes: string[];
  /** 圖片 data URL 或檔案路徑；null 時 fallback Package icon */
  imageUrl: string | null;
  stocks: Record<WarehouseKey, number>;
  /** 四個客戶等級對應售價 */
  prices: Record<CustomerTier, number>;
  /** 歷史成交價（不分等級） */
  lastSoldPrice: number;
  /** 進貨成本（毛利率計算用） */
  unitCost: number;
};

export type QuoteItem = {
  sku: string;
  quantity: number;
  unitPrice: number;
};

export type QuoteMethod = 'verbal' | 'print';

/**
 * TASK-BUSINESS-RESTRUCTURE Phase 3：STEP 5 客戶回應從 3 選項擴充為 5 選項。
 *   accept_all    整張接受並下單
 *   partial_accept 部分接受（勾選要的品項）
 *   price_adjust  要求調整價格
 *   consider      考慮看看（記錄為 QT,之後查料時提醒）
 *   reject        全部不要（記錄拒絕原因）
 * 保留 'accept' 作為漸進遷移期間的 alias（會映射到 accept_all）。
 */
export type CustomerDecision =
  | 'accept_all'
  | 'partial_accept'
  | 'price_adjust'
  | 'consider'
  | 'reject';

export type DeliveryMethod = 'delivery' | 'pickup' | 'shipping';
export type SignMethod = 'electronic' | 'paper';

/** Phase 3：拒絕原因代碼 */
export type RejectReasonCode =
  | 'price_high'
  | 'no_matching_sku'
  | 'bought_elsewhere'
  | 'funding_issue'
  | 'future_need'
  | 'other';

export type SaleSopState = {
  selectedCustomer: Customer | null;
  quoteItems: QuoteItem[];
  quoteMethod: QuoteMethod | null;
  customerDecision: CustomerDecision | null;
  deliveryMethod: DeliveryMethod | null;
  signMethod: SignMethod | null;
  hasSigned: boolean;
  /** 訂單編號；進 STEP 7 時由 reducer 自動生成 */
  orderNumber: string | null;
};

export type SaleSopAction =
  | { type: 'SELECT_CUSTOMER'; customer: Customer }
  | { type: 'CLEAR_CUSTOMER' }
  | { type: 'ADD_QUOTE_ITEM'; item: QuoteItem }
  | { type: 'REMOVE_QUOTE_ITEM'; sku: string }
  | { type: 'UPDATE_QUOTE_ITEM'; sku: string; quantity?: number; unitPrice?: number }
  | { type: 'SET_QUOTE_METHOD'; method: QuoteMethod }
  | { type: 'SET_CUSTOMER_DECISION'; decision: CustomerDecision }
  | { type: 'RESET_CUSTOMER_DECISION' }
  | { type: 'SET_DELIVERY_METHOD'; method: DeliveryMethod }
  | { type: 'SET_SIGN_METHOD'; method: SignMethod }
  | { type: 'CLEAR_SIGN_METHOD' }
  | { type: 'COMPLETE_SIGNATURE' }
  | { type: 'SET_ORDER_NUMBER'; orderNumber: string }
  | { type: 'RESET' };

export type StepMeta = {
  id: StepNumber;
  shortLabel: string;
  title: string;
  subtitle: string;
};
