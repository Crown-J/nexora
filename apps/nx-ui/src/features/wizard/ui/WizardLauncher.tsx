// apps/nx-ui/src/features/wizard/ui/WizardLauncher.tsx
// v1.2 對齊軌 C：匯入精靈 launcher（首次登入自動跳）
//
// 2026-06-03：移除右下浮動「精靈引導」按鈕、改由 MasterTopBar 精靈 icon 觸發。
// 透過 window CustomEvent `nexora:reopen-wizard` 觸發 reset+reopen，
// 避免跨元件共享 state 改寫 useWizardGate。

'use client';

import { useEffect } from 'react';

import { resetImportWizard } from '../api';
import { useWizardGate } from '../hooks/useWizardGate';
import { ImportWizardOverlay } from './ImportWizardOverlay';

export const NEXORA_REOPEN_WIZARD_EVENT = 'nexora:reopen-wizard';

export function WizardLauncher() {
  const { showImportWizard, close, reopen } = useWizardGate();

  useEffect(() => {
    const handler = () => {
      void (async () => {
        try {
          await resetImportWizard();
          reopen();
        } catch (e) {
          alert(e instanceof Error ? e.message : '重開失敗');
        }
      })();
    };
    window.addEventListener(NEXORA_REOPEN_WIZARD_EVENT, handler);
    return () => window.removeEventListener(NEXORA_REOPEN_WIZARD_EVENT, handler);
  }, [reopen]);

  return showImportWizard ? <ImportWizardOverlay onClose={close} /> : null;
}
