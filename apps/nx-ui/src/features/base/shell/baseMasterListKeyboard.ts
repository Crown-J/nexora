/**
 * 主檔列表鍵盤區：判斷是否應略過全域快捷（輸入框／明細內）。
 */

export function isMasterListKeyboardBlocked(
  target: EventTarget | null,
  detailEl: HTMLElement | null,
  panelOpen: boolean,
): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  if (panelOpen && detailEl?.contains(target)) return true;
  return false;
}
