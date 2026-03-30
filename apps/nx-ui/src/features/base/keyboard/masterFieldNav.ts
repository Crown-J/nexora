/**
 * 主檔表單鍵盤：Enter／方向鍵在欄位間移動，最後一欄觸發 onGoLast
 */

import type { KeyboardEvent } from 'react';

export function getFieldIdFromEventTarget(target: EventTarget | null): string | null {
  if (!target || !(target instanceof HTMLElement)) return null;
  const el = target.closest(
    'input,select,textarea',
  ) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
  return el?.id && el.id.length > 0 ? el.id : null;
}

export function handleMasterFieldKeyDown(
  e: KeyboardEvent,
  fieldOrder: readonly string[],
  options: {
    enabled: boolean;
    onLastField: () => void;
    /** 多行輸入：Enter 換行，需 Shift+Enter 才下一欄 */
    multilineFieldIds?: Set<string>;
  },
): void {
  if (!options.enabled) return;
  const id = getFieldIdFromEventTarget(e.target);
  if (!id) return;
  const idx = fieldOrder.indexOf(id);
  if (idx === -1) return;

  const multiline = options.multilineFieldIds?.has(id) ?? false;
  const { key } = e;

  const go = (nextIdx: number) => {
    const nextId = fieldOrder[nextIdx];
    if (!nextId) return;
    const el = document.getElementById(nextId) as HTMLElement | null;
    el?.focus();
  };

  if (key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
    if (multiline) return;
    e.preventDefault();
    if (idx < fieldOrder.length - 1) go(idx + 1);
    else options.onLastField();
    return;
  }

  if (key === 'ArrowDown' || key === 'ArrowRight') {
    e.preventDefault();
    if (idx < fieldOrder.length - 1) go(idx + 1);
    else options.onLastField();
    return;
  }

  if (key === 'ArrowUp' || key === 'ArrowLeft') {
    e.preventDefault();
    if (idx > 0) go(idx - 1);
    return;
  }
}
