// apps/nx-ui/src/design/keyboard/keymap-registry.ts
// 全域保留鍵 SSOT（執行長 2026-07-14 拍板、docs/_team/instant-workbench-keymap-plan.md §4.1/§6）
//
// 鐵律：這張表上的鍵是全系統保留鍵、任何模組不得挪用；模組內快捷鍵一律走 Alt+助憶鍵
// （單據 Alt+A/E/S/D/P、注音 Alt+Z、主檔切換 Alt+M、站 1 面板 Alt+5~0…——都是模組層、不進本表）。
// 新增全域鍵：先在這裡宣告一筆、再實作 owner；B 期引導精靈快捷鍵段落也讀這張表。
// status='planned' = 佔位保留（鍵位不准被拿走）、尚未實作。

export type GlobalKeyDef = {
  id: string;
  /** 觸發鍵（KeyboardEvent.key 值；組合鍵以 'Alt+' 前綴標示） */
  keys: string[];
  label: string;
  /**
   * 焦點守衛分類（§4.3）：
   * immune＝打不進輸入欄位的鍵（F 鍵、Alt 組合）、永遠有效；
   * yield-in-input＝會跟打字/游標撞的鍵（Home、`）、焦點在輸入欄位時讓原生。
   */
  focusGuard: 'immune' | 'yield-in-input';
  status: 'live' | 'planned';
  /** 監聽實作位置（維護指路用） */
  owner?: string;
  /** B 期防線①：RBAC 權限碼（A 期未掛、留位） */
  permissionCode?: string;
};

export const GLOBAL_KEYMAP: GlobalKeyDef[] = [
  // 2026-08-01 v3.0.0 階段 1 Step 4：F2 由即時工作檯選單改為九宮格導覽。
  // 舊條目 id='instant-workbench'（owner 為 InstantWorkbench.tsx）已退場——
  // 那套啟動器選單整個移除，五個站改由九宮格的格子進入。
  {
    id: 'nine-grid',
    keys: ['F2'],
    label: '功能選單（九宮格：角色→功能→子功能）',
    focusGuard: 'immune',
    status: 'live',
    owner: 'design/layout/v3/V3Shell.tsx（面板在 design/navigation/NineGrid.tsx）',
  },
  {
    id: 'go-home',
    keys: ['Home'],
    label: '回首頁（輸入欄位內＝原生跳行首）',
    focusGuard: 'yield-in-input',
    status: 'live',
    owner: 'design/keyboard/GlobalKeymap.tsx',
  },
  {
    id: 'modal-escape',
    keys: ['Escape'],
    label: '關閉最上層彈窗／取消（逐層回退）',
    focusGuard: 'immune',
    status: 'live',
    owner: 'design/primitives/modal-stack.ts（FocusLockedDialog）',
  },
  // ⛔ 舊佔位 id='dock-launcher'（` 鍵）已取消：v3.0.0 拍板 Dock 與 F2 合併為單一入口，
  //    導覽只留 F2 一個全域鍵——要記的東西越少越好（規格 §7.3）。
  {
    id: 'workspace-tab-switch',
    keys: ['Alt+ArrowLeft', 'Alt+ArrowRight'],
    label: '切工作區分頁（取捨：放棄瀏覽器上/下頁鍵）',
    focusGuard: 'immune',
    status: 'planned',
  },
];

/**
 * 九宮格「面板內」鍵位（執行長 2026-08-03 拍板：整個數字鍵盤複製上螢幕）。
 *
 * ⚠️ 刻意⛔ 不進 GLOBAL_KEYMAP：這些鍵只在九宮格開著的時候有效，
 *    面板一關就完全還給頁面。全系統的全域鍵仍然只有 F2 一個（規格 §7.3）。
 * 實作位置：design/navigation/NineGrid.tsx；格位定義在 design/navigation/role-registry.ts。
 * 對照表：docs/專案/介面規格/NEXORA-快捷鍵對照表-v3.0.0.xlsx
 */
export const NINE_GRID_PANEL_KEYS = [
  { keys: ['1', '2', '3', '4', '5', '6', '7', '8', '9'], label: '選角色／功能／子功能' },
  { keys: ['0'], label: '第一層＝回首頁；其餘層＝回上一層' },
  { keys: ['.'], label: '資訊（個人資訊／行事曆／佈告欄）' },
  { keys: ['+'], label: '任務／通知' },
  { keys: ['-'], label: '設定' },
  { keys: ['/'], label: '全域搜尋' },
  { keys: ['Enter'], label: '確認游標所在的格' },
  { keys: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'], label: '移動游標' },
  { keys: ['Escape'], label: '關閉九宮格' },
] as const;

/** 永久還給瀏覽器、系統絕不攔（instant-workbench-keymap-plan.md §4.1）*/
export const BROWSER_RESERVED_KEYS = ['F1', 'F5', 'F12'] as const;

/** 焦點守衛：焦點在輸入情境（input/textarea/select/contenteditable）→ yield-in-input 類讓原生 */
export function isEditableTarget(t: EventTarget | null): boolean {
  return t instanceof HTMLElement && !!t.closest('input,textarea,select,[contenteditable="true"]');
}
