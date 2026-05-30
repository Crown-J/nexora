// apps/nx-ui/src/app/change-password/page.tsx
// v1.2 對齊軌 C-FU FU-onboarding-05：首次登入強制改密碼頁
//
// 觸發：useSessionMe 偵測到 me.must_change_password === true → 自動 redirect 過來

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { apiJson } from '@/shared/api/client';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      setErr('新密碼至少 6 字元');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErr('兩次新密碼不一致');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await apiJson('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      router.replace('/dashboard');
    } catch (e) {
      setErr(e instanceof Error ? e.message : '改密失敗');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-lg">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">⚠️ 首次登入、請改密碼</h1>
          <p className="text-sm text-muted-foreground">
            為了帳號安全、首次登入必須變更密碼才能進入系統。
          </p>
        </header>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block">⚪ 舊密碼（初始密碼可空、首次登入會略過驗證）</span>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full rounded border bg-background px-3 py-2"
              placeholder="（初始密碼可不填、首次登入會略過驗證）"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block">🟢 新密碼 *（至少 6 字元）</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded border bg-background px-3 py-2"
              required
              minLength={6}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block">🟢 確認新密碼 *</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded border bg-background px-3 py-2"
              required
              minLength={6}
            />
          </label>
          {err ? <div className="text-sm text-destructive">{err}</div> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? '處理中…' : '改密 + 進入系統'}
          </button>
        </form>
      </div>
    </div>
  );
}
