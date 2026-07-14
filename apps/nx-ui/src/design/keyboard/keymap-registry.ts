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
  {
    id: 'instant-workbench',
    keys: ['F2'],
    label: '即時工作檯選單（開/關）',
    focusGuard: 'immune',
    status: 'live',
    owner: 'features/shared/instant-workbench/InstantWorkbench.tsx',
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
  // ── B 期佔位（執行長 2026-07-14 方向同意、細節開工前再對）──
  {
    id: 'dock-launcher',
    keys: ['`'],
    label: 'Dock 啟動器（開後按模組助憶鍵直達頁面）',
    focusGuard: 'yield-in-input',
    status: 'planned',
  },
  {
    id: 'workspace-tab-switch',
    keys: ['Alt+ArrowLeft', 'Alt+ArrowRight'],
    label: '切工作區分頁（取捨：放棄瀏覽器上/下頁鍵）',
    focusGuard: 'immune',
    status: 'planned',
  },
];

/** 永久還給瀏覽器、系統絕不攔（instant-workbench-keymap-plan.md §4.1）*/
export const BROWSER_RESERVED_KEYS = ['F1', 'F5', 'F12'] as const;

/** 焦點守衛：焦點在輸入情境（input/textarea/select/contenteditable）→ yield-in-input 類讓原生 */
export function isEditableTarget(t: EventTarget | null): boolean {
  return t instanceof HTMLElement && !!t.closest('input,textarea,select,[contenteditable="true"]');
}
