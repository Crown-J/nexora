// apps/nx-ui/src/features/nx04/quote/ui/transfer-inquiry-store.ts
// 調貨詢價清單（執行長 2026-07-12）：F2 報價主視窗 Alt+D 加入 → F5 全域調貨詢價視窗消化。
// 本機工作清單（localStorage、per 瀏覽器）：詢價「紀錄」本身走 DB（nx04_inquiry_record）、
// 這份只是業務待辦草稿——掛掉電話後照著打給同行。變更時發 window event 供開著的視窗刷新。

// 缺貨待辦（2026-07-13 重設計，執行長拍板）：每筆＝(客戶 + 零件 + 數量)。
//   同料不同客戶＝兩筆（A 客戶要 K、B 客戶要 K → 清單兩筆 K）；去重鍵＝客戶+料號。
//   客戶可為 null（F1 通用查詢 Alt+D 加入時無客戶情境）。詢價/報價紀錄仍走 DB（共享）。
export type TransferInquiryItem = {
  customerId: string | null;
  customerCode: string | null;
  customerName: string | null;
  partId: string;
  code: string;
  name: string;
  qty: number; // 客戶要的數量（F1 無客戶時預設 1）
  addedAt: string; // ISO
};

const KEY = 'nx-transfer-inquiry-list';
export const TRANSFER_LIST_EVENT = 'nx-transfer-list-changed';

/** 去重／移除鍵：客戶 + 料號（客戶 null 視為空字串） */
export function transferItemKey(customerId: string | null, partId: string): string {
  return `${customerId ?? ''}::${partId}`;
}

export function listTransferItems(): TransferInquiryItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as TransferInquiryItem[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function save(items: TransferInquiryItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* 存不了不擋 */
  }
  window.dispatchEvent(new CustomEvent(TRANSFER_LIST_EVENT));
}

/** 加入（同客戶+同料去重）；回傳實際新增數 */
export function addTransferItems(items: Omit<TransferInquiryItem, 'addedAt'>[]): number {
  const cur = listTransferItems();
  const existing = new Set(cur.map((i) => transferItemKey(i.customerId, i.partId)));
  const fresh = items.filter((i) => !existing.has(transferItemKey(i.customerId, i.partId)));
  if (fresh.length === 0) return 0;
  const now = new Date().toISOString();
  save([...cur, ...fresh.map((i) => ({ ...i, addedAt: now }))]);
  return fresh.length;
}

export function removeTransferItem(customerId: string | null, partId: string) {
  const target = transferItemKey(customerId, partId);
  save(listTransferItems().filter((i) => transferItemKey(i.customerId, i.partId) !== target));
}

export function clearTransferItems() {
  save([]);
}
