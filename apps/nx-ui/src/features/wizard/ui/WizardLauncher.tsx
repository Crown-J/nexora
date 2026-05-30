// apps/nx-ui/src/features/wizard/ui/WizardLauncher.tsx
// v1.2 對齊軌 C：匯入精靈 launcher + 主畫面右上「精靈引導」按鈕
//
// 用法：放在 DashboardShell、首次登入自動跳、之後按鈕重開

'use client';

import { Wand2 } from 'lucide-react';

import { resetImportWizard } from '../api';
import { useWizardGate } from '../hooks/useWizardGate';
import { ImportWizardOverlay } from './ImportWizardOverlay';

export function WizardLauncher() {
  const { showImportWizard, close, reopen } = useWizardGate();

  const handleReopen = async () => {
    try {
      await resetImportWizard();
      reopen();
    } catch (e) {
      alert(e instanceof Error ? e.message : '重開失敗');
    }
  };

  return (
    <>
      <button
        onClick={() => void handleReopen()}
        title="重開匯入精靈"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-xs shadow-lg hover:bg-muted"
      >
        <Wand2 className="h-4 w-4" />
        精靈引導
      </button>
      {showImportWizard ? <ImportWizardOverlay onClose={close} /> : null}
    </>
  );
}
