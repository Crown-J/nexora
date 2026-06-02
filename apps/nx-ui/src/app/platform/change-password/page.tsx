// apps/nx-ui/src/app/platform/change-password/page.tsx
// 平台層 vs 租戶層分離軌 Phase 6.1：平台後台改密頁
//
// 兩個入口、同一頁：
// 1. 首次登入 mustChangePassword=true → layout 強制 redirect 到此頁
//    - oldPassword 欄隱藏（API 端接受空字串）
// 2. 平日從頂部 nav「Change password」進來
//    - oldPassword 欄必填
//
// 改密成功 → router.replace('/platform') 觸發 layout 重 fetch me、橘色 banner 自動消失。

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

import { PlatformApiError } from '@/features/platform/api/client';
import { getPlatformMe, platformChangePassword } from '@/features/platform/auth/api';

type PageState = {
  mustChange: boolean | null; // null = 載入中
  isSubmitting: boolean;
  errorMsg: string | null;
  successMsg: string | null;
};

function extractApiErrorMessage(err: unknown): string {
  if (err instanceof PlatformApiError) {
    const body = err.body as { message?: string } | null;
    if (body?.message) return body.message;
    if (err.status === 401) return '舊密碼錯誤。';
    return `改密失敗（HTTP ${err.status}）。`;
  }
  if (err instanceof Error) return err.message;
  return '改密失敗、請重試。';
}

export default function PlatformChangePasswordPage() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [view, setView] = useState<PageState>({
    mustChange: null,
    isSubmitting: false,
    errorMsg: null,
    successMsg: null,
  });

  // 載入時拉 me 判斷 mustChange（決定是否顯示 oldPassword 欄）
  useEffect(() => {
    let cancelled = false;
    getPlatformMe()
      .then((me) => {
        if (cancelled) return;
        setView((prev) => ({ ...prev, mustChange: me.must_change_password }));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof PlatformApiError && err.status === 401) {
          router.replace('/platform/login');
        } else {
          setView((prev) => ({ ...prev, errorMsg: extractApiErrorMessage(err) }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setView((prev) => ({ ...prev, errorMsg: null, successMsg: null }));

    const newPwd = newPassword;
    const confirmPwd = confirmPassword;
    if (!newPwd) {
      setView((prev) => ({ ...prev, errorMsg: '請輸入新密碼。' }));
      return;
    }
    if (newPwd.length < 6) {
      setView((prev) => ({ ...prev, errorMsg: '新密碼至少 6 字元。' }));
      return;
    }
    if (newPwd !== confirmPwd) {
      setView((prev) => ({ ...prev, errorMsg: '兩次新密碼輸入不一致。' }));
      return;
    }
    // 平日改密（mustChange=false）必須提供舊密碼
    if (view.mustChange === false && !oldPassword) {
      setView((prev) => ({ ...prev, errorMsg: '請輸入舊密碼。' }));
      return;
    }

    setView((prev) => ({ ...prev, isSubmitting: true }));
    try {
      await platformChangePassword(oldPassword, newPwd);
      setView((prev) => ({
        ...prev,
        isSubmitting: false,
        successMsg: '密碼已更新、3 秒後回 Hub...',
      }));
      // 觸發 layout 重新 fetch me（pathname 變化 → useEffect re-fire）
      setTimeout(() => router.replace('/platform'), 1500);
    } catch (err: unknown) {
      setView({
        mustChange: view.mustChange,
        isSubmitting: false,
        errorMsg: extractApiErrorMessage(err),
        successMsg: null,
      });
    }
  }

  if (view.mustChange === null) {
    return <div className="text-zinc-600 text-xs">loading...</div>;
  }

  const showOldPassword = view.mustChange === false;

  return (
    <div className="max-w-md mx-auto space-y-6">
      <header className="space-y-1">
        <p className="text-[10px] tracking-[0.3em] uppercase text-zinc-600">Platform / Change password</p>
        <h1 className="text-xl tracking-tight text-zinc-100">
          {view.mustChange ? '首次登入：請設定新密碼' : '修改密碼'}
        </h1>
        {view.mustChange ? (
          <p className="text-[11px] text-amber-400 leading-relaxed">
            ⚠ 您的帳號目前使用預設密碼、必須先設定新密碼才能繼續使用平台後台。
          </p>
        ) : (
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            為安全起見、設定新密碼前需先驗證舊密碼。
          </p>
        )}
      </header>

      <form onSubmit={onSubmit} className="space-y-4 border border-zinc-800 bg-zinc-950 p-5">
        {showOldPassword ? (
          <div className="space-y-1">
            <label htmlFor="oldPassword" className="block text-[10px] uppercase tracking-widest text-zinc-500">
              Old password
            </label>
            <input
              id="oldPassword"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full bg-black border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
            />
          </div>
        ) : null}

        <div className="space-y-1">
          <label htmlFor="newPassword" className="block text-[10px] uppercase tracking-widest text-zinc-500">
            New password
          </label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={6}
            className="w-full bg-black border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
          />
          <p className="text-[10px] text-zinc-600">至少 6 字元</p>
        </div>

        <div className="space-y-1">
          <label htmlFor="confirmPassword" className="block text-[10px] uppercase tracking-widest text-zinc-500">
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={6}
            className="w-full bg-black border border-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
          />
        </div>

        {view.errorMsg ? (
          <div role="alert" className="border border-amber-900 bg-amber-950 text-amber-200 text-xs px-3 py-2">
            {view.errorMsg}
          </div>
        ) : null}
        {view.successMsg ? (
          <div role="status" className="border border-emerald-900 bg-emerald-950 text-emerald-300 text-xs px-3 py-2">
            {view.successMsg}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={view.isSubmitting || view.successMsg !== null}
          className="w-full bg-zinc-100 text-zinc-950 hover:bg-zinc-300 disabled:opacity-60 disabled:cursor-not-allowed py-2 text-xs uppercase tracking-[0.3em]"
        >
          {view.isSubmitting ? 'updating...' : 'update password'}
        </button>
      </form>
    </div>
  );
}
