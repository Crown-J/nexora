// apps/nx-ui/src/features/nx04/quote/ui/transfer-inquiry-store.ts
// 調貨詢價清單（執行長 2026-07-12）：F2 報價主視窗 Alt+D 加入 → F5 全域調貨詢價視窗消化。
// 本機工作清單（localStorage、per 瀏覽器）：詢價「紀錄」本身走 DB（nx04_inquiry_record）、
// 這份只是業務待辦草稿——掛掉電話後照著打給同行。變更時發 window event 供開著的視窗刷新。

export type TransferInquiryItem = {
  partId: string;
  code: string;
  name: string;
  addedAt: string; // ISO
};

const KEY = 'nx-transfer-inquiry-list';
export const TRANSFER_LIST_EVENT = 'nx-transfer-list-changed';

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

/** 加入（同料去重）；回傳實際新增數 */
export function addTransferItems(items: Omit<TransferInquiryItem, 'addedAt'>[]): number {
  const cur = listTransferItems();
  const existing = new Set(cur.map((i) => i.partId));
  const fresh = items.filter((i) => !existing.has(i.partId));
  if (fresh.length === 0) return 0;
  const now = new Date().toISOString();
  save([...cur, ...fresh.map((i) => ({ ...i, addedAt: now }))]);
  return fresh.length;
}

export function removeTransferItem(partId: string) {
  save(listTransferItems().filter((i) => i.partId !== partId));
}

export function clearTransferItems() {
  save([]);
}
