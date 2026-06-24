// apps/nx-ui/src/data/types/nx01/part-search.ts
// F2 料號即時搜尋：前端 types 對齊 apps/nx-api/src/nx01/part-search/part-search.service.ts
// 執行長 2026-06-17 拍板。

export type PartSearchRow = {
  id: string;
  code: string;
  name: string;
  secCode: string | null;
  spec: string | null;
  brandCode: string | null;
  brandName: string | null;
  partGroupCode: string | null;
  partGroupName: string | null;
  isActive: boolean;
  isOem: boolean;
  onHandTotal: string;
  availableTotal: string;
};

/** 通用件群組 member 節點（執行長 2026-06-24 F2 視窗 1 重做、回應內 groups[].primary/alts 用）*/
export type PartSearchCompatMember = PartSearchRow & {
  role: number; // 1=PRIMARY 主件 / 2=ALT 替代品
  isBidirectional: boolean;
  isMatch: boolean; // 該 member 本身是否為「搜尋命中」的 part
};

export type PartSearchCompatGroup = {
  groupId: string;
  groupCode: string;
  groupName: string;
  remark: string | null;
  primary?: PartSearchCompatMember;
  alts: PartSearchCompatMember[];
};

export type PartSearchResult = {
  page: number;
  pageSize: number;
  total: number;
  rawTotal: number;
  limitReached: boolean;
  rows: PartSearchRow[];
  /** 只在 query.groupByCompat=true 時出現：屬於通用件群組的命中 part 樹（含完整 group 上下文）*/
  groups?: PartSearchCompatGroup[];
  /** 只在 query.groupByCompat=true 時出現：不屬任何 group 的命中 part（一律視為主件）*/
  ungrouped?: PartSearchRow[];
};

export type PartSearchQuery = {
  brandId?: string;
  brandQuery?: string;
  partGroupId?: string;
  partGroupQuery?: string;
  keyword?: string;
  partNo?: string;
  includeInactive?: boolean;
  /** 通用件群組樹模式（F2 視窗 1 用）*/
  groupByCompat?: boolean;
  page?: number;
  pageSize?: number;
};

export type PartOemCodeRow = {
  id: string;
  oemCode: string;
  remark: string | null;
  brandCode: string | null;
  brandName: string | null;
};

export type PartDetailDto = {
  id: string;
  code: string;
  name: string;
  secCode: string | null;
  oldCode: string | null;
  spec: string | null;
  isOem: boolean;
  isActive: boolean;
  cost: string | null;
  priceA: string | null;
  priceB: string | null;
  priceC: string | null;
  priceD: string | null;
  warrantyMonths: number;
  returnPolicy: string;
  lastPurchaseAt: string | null;
  lastSaleAt: string | null;
  brand: { id: string; code: string; name: string } | null;
  partGroup: { id: string; code: string; name: string } | null;
  countryCode: string | null;
  oemCodes: PartOemCodeRow[];
};

export type PartStockWarehouseRow = {
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  onHand: string;
  available: string;
  reserved: string;
  inTransit: string;
  avgCost: string;
  lastInAt: string | null;
  lastOutAt: string | null;
  lastMoveAt: string | null;
};

export type PartStockSummaryDto = {
  company: {
    onHand: string;
    available: string;
    reserved: string;
    inTransit: string;
  };
  warehouses: PartStockWarehouseRow[];
};

export type PartPurchaseHistoryRow = {
  rrItemId: string;
  rrId: string;
  docNo: string;
  rrDate: string;
  status: string;
  supplierCode: string;
  supplierName: string;
  qty: string;
  unitCost: string;
  actualUnitCost: string;
  lineAmount: string;
  batchNo: string | null;
};

export type PartSalesHistorySoRow = {
  soItemId: string;
  soId: string;
  docNo: string;
  soDate: string;
  status: string;
  customerCode: string;
  customerName: string;
  qty: string;
  unitPrice: string;
  lineAmount: string;
};

export type PartSalesHistoryQuoteRow = {
  quoteItemId: string;
  quoteId: string;
  docNo: string;
  quoteDate: string;
  status: string;
  customerCode: string;
  customerName: string;
  qty: string;
  unitPrice: string;
  minPrice: string | null;
  isSelected: boolean;
  transferredQty: string;
};

export type PartSalesHistoryDto = {
  suggestedPrices: {
    cost: string | null;
    priceA: string | null;
    priceB: string | null;
    priceC: string | null;
    priceD: string | null;
  };
  sales: PartSalesHistorySoRow[];
  quotes: PartSalesHistoryQuoteRow[];
};

export type PartStockHistoryRow = {
  id: string;
  movementDate: string;
  movementType: string;
  qtyIn: string;
  qtyOut: string;
  unitCost: string;
  balanceQty: string;
  sourceModule: string;
  sourceDocType: string;
  sourceDocId: string;
  warehouseCode: string;
  warehouseName: string;
  locationCode: string;
};

export type PartStockSettingRow = {
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  minQty: string;
  maxQty: string;
  reorderQty: string;
  remark: string | null;
};

export type PartRelatedRow = {
  relationId: string;
  relationType: number;
  remark: string | null;
  partId: string;
  code: string;
  name: string;
  isActive: boolean;
  brandCode: string | null;
  brandName: string | null;
  onHandTotal: string;
  availableTotal: string;
};
