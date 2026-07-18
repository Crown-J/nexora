// apps/nx-ui/src/features/shared/instant-workbench/station-registry.ts
// 即時工作檯・站註冊表 SSOT（執行長 2026-07-14 拍板、docs/_team/instant-workbench-keymap-plan.md §6）
//
// 範式對齊 master-registry.ts（主檔導覽 SSOT）：加站只改這裡一筆、殼不用動。
// 消費者：InstantWorkbench（分頁列渲染 + 裸數字切站）；B 期加引導精靈快捷鍵段落。
// status='planned' 的站不渲染分頁、數字鍵無效（執行長拍板：不顯示「開發中」灰分頁）。
// permissionCode：B 期防線①（無權限 → 分頁不渲染、數字鍵無效）；A 期全站未掛權限、先留位。

export type InstantStationNo = 1 | 2 | 3 | 4 | 5;

export type InstantStationDef = {
  /** 檯內裸數字鍵（焦點守衛下切站） */
  no: InstantStationNo;
  id: string;
  label: string;
  /** 站的錨（執行長拍板：各站各有各的錨、不照偉盟純料號錨） */
  anchor: 'part' | 'customer' | 'transfer-target' | 'basket';
  /** 選單副標；同錨兩站（站 2 報價 / 站 4 銷售）用此區別，未給則 fallback ANCHOR_HINT[anchor] */
  hint?: string;
  /** B 期防線①：RBAC 權限碼（A 期未掛、留位） */
  permissionCode?: string;
  status: 'live' | 'planned';
};

export const INSTANT_STATIONS: InstantStationDef[] = [
  // 站 1：快速找料初版（原 F1、07-14 收殼遷入）；B 期升級庫存視角（異動/庫位/權限切欄）
  { no: 1, id: 'stock-query', label: '庫存查詢', anchor: 'part', status: 'live' },
  // 站 2：即時報價（原 F2、客戶為錨 session 常駐）
  { no: 2, id: 'instant-quote', label: '即時報價', anchor: 'customer', status: 'live' },
  // 站 3：調貨詢價（原 F5、調貨對象為錨、清單存 localStorage）
  { no: 3, id: 'transfer-inquiry', label: '調貨詢價', anchor: 'transfer-target', status: 'live' },
  // 站 4：即時銷售（成交快速建單、客戶為錨；5 步 客戶→明細→交易→出貨→訊息 → 建單+確認送撿貨清單）
  { no: 4, id: 'instant-sales', label: '即時銷售', anchor: 'customer', hint: '先定客戶・成交開單', status: 'live' },
  // 站 5：即時補貨（補貨籃；批次產單型別待執行長用實例拍板、順延未做）
  { no: 5, id: 'replenish-basket', label: '即時補貨', anchor: 'basket', status: 'planned' },
];

export const LIVE_STATIONS = INSTANT_STATIONS.filter((s) => s.status === 'live');
