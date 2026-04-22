// apps/nx-ui/src/features/sale/ui/sop-workspace/types.ts
/**
 * 國內銷貨 SOP 手機工作台型別定義
 * 全 Mock、不接 API；useReducer 驅動 9 步流程。
 * 業務視角：看得到庫存/售價/毛利；看不到 AR/付款條件/逾期（權限切割展示）。
 */

export type StepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type CustomerTier = 'A' | 'B' | 'C' | 'D';

export type Customer = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  address: string;
  tier: CustomerTier;
  /** 當月毛利率（%） */
  monthlyGrossMargin: number;
  /** 主要車型，例：'VAG' / 'Toyota' / '多品牌' */
  mainVehicle: string;
  /** 業務側看到的偏好提示 */
  preferredBrand: string;
  lastVisit: string;
  /** 保養廠 / 同行 */
  customerType: '保養廠' | '同行';
  /** 是否偏遠（影響 STEP 6 推薦物流） */
  isRemote?: boolean;
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
  /** 'VAG' / '副廠' 等 */
  brand: string;
  vehicleTypes: string[];
  /** 圖片路徑（demo 可先用 emoji 或佔位符） */
  imageEmoji: string;
  stocks: Record<WarehouseKey, number>;
  /** 四個客戶等級對應售價 */
  prices: Record<CustomerTier, number>;
  /** 歷史成交價（不分等級，單純上次賣出價） */
  lastSoldPrice: number;
};

export type QuoteItem = {
  sku: string;
  quantity: number;
  unitPrice: number;
};

export type QuoteMethod = 'verbal' | 'print';
export type CustomerDecision = 'accept' | 'negotiate' | 'decline';
export type DeliveryMethod = 'delivery' | 'pickup' | 'shipping';
export type SignMethod = 'electronic' | 'paper';

export type SaleSopState = {
  /** STEP 1：選中的客戶 */
  selectedCustomer: Customer | null;
  /** STEP 3：報價清單 */
  quoteItems: QuoteItem[];
  /** STEP 4：報價方式 */
  quoteMethod: QuoteMethod | null;
  /** STEP 5：客戶決定 */
  customerDecision: CustomerDecision | null;
  /** STEP 6：配送方式 */
  deliveryMethod: DeliveryMethod | null;
  /** STEP 7：簽單方式 */
  signMethod: SignMethod | null;
  /** STEP 7：是否完成簽名動作 */
  hasSigned: boolean;
  /** STEP 8 自動生成的訂單編號（固定 mock，避免重繪跳動） */
  orderNumber: string;
};

export type SaleSopAction =
  | { type: 'SELECT_CUSTOMER'; customer: Customer }
  | { type: 'CLEAR_CUSTOMER' }
  | { type: 'ADD_QUOTE_ITEM'; item: QuoteItem }
  | { type: 'REMOVE_QUOTE_ITEM'; sku: string }
  | { type: 'UPDATE_QUANTITY'; sku: string; quantity: number }
  | { type: 'SET_QUOTE_METHOD'; method: QuoteMethod }
  | { type: 'SET_CUSTOMER_DECISION'; decision: CustomerDecision }
  | { type: 'SET_DELIVERY_METHOD'; method: DeliveryMethod }
  | { type: 'SET_SIGN_METHOD'; method: SignMethod }
  | { type: 'COMPLETE_SIGNATURE' }
  | { type: 'RESET' };

export type StepMeta = {
  id: StepNumber;
  shortLabel: string;
  title: string;
  subtitle: string;
};
