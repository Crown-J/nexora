// apps/nx-ui/src/app/platform/login/page.tsx
// 平台層 vs 租戶層分離軌 Phase 5：獨立平台登入頁
//
// 客戶看不到、不可從 /login 連結到、不暴露其存在（L2 入口隔離）
// 設計：
// - 全黑底 + monospace、跟客戶 /login 視覺一眼分辨
// - 無公司帳號欄、無「忘記密碼」、無任何指向 /login 的連結
// - 標題就是 NEXORA · Platform Console、刻意不放 NEXORA GRID 品牌
// - 登入成功 → setToken + router.replace('/platform')

'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { setToken } from '@/features/auth/token';
import { PlatformApiError } from '@/features/platform/api/client';
import { platformLogin } from '@/features/platform/auth/api';

type LoginViewState = {
  isSubmitting: boolean;
  errorMsg: string | null;
};

function extractApiErrorMessage(err: unknown): string {
  if (err instanceof PlatformApiError) {
    const body = err.body as { message?: string } | null;
    if (body?.message) return body.message;
    if (err.status === 401) return '請確認帳號及密碼。';
    return `登入失敗（HTTP ${err.status}）。`;
  }
  if (err instanceof Error) return err.message;
  return '登入失敗、請重試。';
}

export default function PlatformLoginPage() {
  const router = useRouter();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [view, setView] = useState<LoginViewState>({ isSubmitting: false, errorMsg: null });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setView({ isSubmitting: true, errorMsg: null });
    const acc = account.trim();
    const pwd = password;
    if (!acc) {
      setView({ isSubmitting: false, errorMsg: '請輸入帳號。' });
      return;
    }
    if (!pwd) {
      setView({ isSubmitting: false, errorMsg: '請輸入密碼。' });
      return;
    }
    try {
      const { token } = await platformLogin(acc, pwd);
      setToken(token);
      router.replace('/platform');
    } catch (err: unknown) {
      setView({ isSubmitting: false, errorMsg: extractApiErrorMessage(err) });
    }
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-mono flex flex-col">
      <header className="border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center">
          <div className="text-sm tracking-[0.3em] uppercase text-zinc-200">
            NEXORA · Platform Console
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1">
            <p className="text-[10px] tracking-[0.3em] uppercase text-zinc-600">/ sign in</p>
            <h1 className="text-xl tracking-tight text-zinc-100">Operator access</h1>
            <p className="text-[11px] text-zinc-600 leading-relaxed">
              限平台超管。使用客戶帳號請至客戶端登入入口。
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="account" className="block text-[10px] uppercase tracking-widest text-zinc-500">
                Account
              </label>
              <input
                id="account"
                type="text"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                autoComplete="username"
                autoFocus
                required
                className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="block text-[10px] uppercase tracking-widest text-zinc-500">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
              />
            </div>

            {view.errorMsg ? (
              <div
                role="alert"
                className="border border-amber-900 bg-amber-950 text-amber-200 text-xs px-3 py-2"
              >
                {view.errorMsg}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={view.isSubmitting}
              className="w-full bg-zinc-100 text-zinc-950 hover:bg-zinc-300 disabled:opacity-60 disabled:cursor-not-allowed py-2 text-xs uppercase tracking-[0.3em]"
            >
              {view.isSubmitting ? 'signing in...' : 'sign in'}
            </button>
          </form>
        </div>
      </main>

      <footer className="border-t border-zinc-900 px-6 py-4 text-[10px] uppercase tracking-widest text-zinc-700 text-center">
        Platform Console · operated by Innova IT
      </footer>
    </div>
  );
}
