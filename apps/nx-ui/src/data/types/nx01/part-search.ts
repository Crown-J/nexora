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
  onHandTotal: string;
  availableTotal: string;
};

export type PartSearchResult = {
  page: number;
  pageSize: number;
  total: number;
  rawTotal: number;
  limitReached: boolean;
  rows: PartSearchRow[];
};

export type PartSearchQuery = {
  brandId?: string;
  brandQuery?: string;
  partGroupId?: string;
  partGroupQuery?: string;
  keyword?: string;
  partNo?: string;
  includeInactive?: boolean;
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
