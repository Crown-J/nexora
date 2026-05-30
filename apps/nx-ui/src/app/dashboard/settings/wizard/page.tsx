// apps/nx-ui/src/app/dashboard/settings/wizard/page.tsx
// v1.2 對齊軌 D D4：設定→引導精靈頁（v1.2 §12.5）

'use client';

import { useState } from 'react';

import { usePageGuideContext } from '@/features/page-guide';
import { resetImportWizard } from '@/features/wizard/api';

export default function WizardSettingsPage() {
  const { resetAll: resetMySetupWizard } = usePageGuideContext();
  const [busy, setBusy] = useState<'import' | 'setup' | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const handleReopenImportWizard = async () => {
    setBusy('import');
    setMsg(null);
    try {
      await resetImportWizard();
      setMsg({ kind: 'ok', text: '匯入精靈已重新開啟、回到主畫面就會跳出' });
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : '重開失敗' });
    } finally {
      setBusy(null);
    }
  };

  const handleResetSetupWizard = async () => {
    if (!window.confirm('確認重置「我的」設定精靈？所有頁面下次進去都會再跳引導。\n\n（此操作只影響「我」、不影響其他員工）')) {
      return;
    }
    setBusy('setup');
    setMsg(null);
    try {
      await resetMySetupWizard();
      setMsg({ kind: 'ok', text: '設定精靈已重置、之後進每個頁面都會再次跳引導' });
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : '重置失敗' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-6 p-6">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">SETTINGS · WIZARD</p>
        <h1 className="text-2xl font-semibold tracking-tight">引導精靈</h1>
        <p className="text-sm text-muted-foreground">
          v1.2 §12.5：重新開啟匯入精靈、或重置我的設定精靈。
        </p>
      </header>

      {msg ? (
        <div
          className={`rounded border px-4 py-2 text-sm ${
            msg.kind === 'ok'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
              : 'border-destructive/40 bg-destructive/10'
          }`}
        >
          {msg.text}
        </div>
      ) : null}

      <section className="rounded border p-4 space-y-3">
        <h2 className="text-sm font-semibold">📥 匯入精靈</h2>
        <p className="text-xs text-muted-foreground">
          可隨時重新開啟匯入精靈、補匯入舊資料（員工 / 客戶 / 產品 / 進銷貨歷史 / 票據）。
        </p>
        <button
          onClick={() => void handleReopenImportWizard()}
          disabled={busy === 'import'}
          className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          {busy === 'import' ? '處理中…' : '🪄 重新開啟匯入精靈'}
        </button>
      </section>

      <section className="rounded border p-4 space-y-3">
        <h2 className="text-sm font-semibold">📚 設定精靈</h2>
        <p className="text-xs text-muted-foreground">
          重置後、所有頁面下次進去都會再次跳引導（22 個 LITE 工作台）。
          <br />
          ⚠️ 重置只影響「我」、不影響其他員工。
        </p>
        <button
          onClick={() => void handleResetSetupWizard()}
          disabled={busy === 'setup'}
          className="rounded border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
        >
          {busy === 'setup' ? '處理中…' : '🔄 重置我的設定精靈'}
        </button>
      </section>

      <section className="rounded border bg-muted/30 p-4 text-xs text-muted-foreground">
        <strong>提示：</strong>
        <br />
        各工作台右下「?」按鈕也可以隨時重看單頁引導（不重置全部）。
      </section>
    </div>
  );
}
