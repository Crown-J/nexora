/**
 * File: apps/nx-ui/src/app/login/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-001：完成登入畫面（Dashboard Dark + Neon Accent）
 * - NX00-AUTH-003：串接前後端登入流程（call api + store token + redirect）
 *
 * Notes:
 * - 風格對齊：深色玻璃卡片 / 柔陰影 / 細邊框 / 單一螢光綠強調色
 * - 成功登入後導向 /dashboard
 */

'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { callLoginApi } from '@/features/auth/api/login';
import { setToken } from '@/features/auth/token';

type LoginFormState = {
  account: string;
  password: string;
};

type LoginViewState = {
  isSubmitting: boolean;
  errorMsg: string | null;
};

/**
 * @CODE nxui_nx00_ui_login_validate_001
 * 說明：登入前置驗證（極簡規則）
 */
function validateLoginForm(form: LoginFormState): string | null {
  if (!form.account.trim()) return '請輸入帳號';
  if (!form.password) return '請輸入密碼';
  return null;
}

/**
 * @CODE nxui_nx00_ui_login_normalize_001
 * 說明：輸入正規化（避免空白造成驗證或登入問題）
 */
function normalizeLoginForm(form: LoginFormState): LoginFormState {
  return {
    account: form.account.trim(),
    password: form.password,
  };
}

export default function LoginPage() {
  const router = useRouter();

  /**
   * @CODE nxui_nx00_ui_login_state_001
   * 說明：登入表單狀態
   */
  const [form, setForm] = useState<LoginFormState>({ account: '', password: '' });

  /**
   * @CODE nxui_nx00_ui_login_viewstate_001
   * 說明：畫面狀態（loading / error）
   */
  const [view, setView] = useState<LoginViewState>({ isSubmitting: false, errorMsg: null });

  /**
   * @CODE nxui_nx00_ui_login_can_submit_001
   * 說明：避免空值與重複送出
   */
  const canSubmit = useMemo(() => {
    if (view.isSubmitting) return false;
    if (!form.account.trim()) return false;
    if (!form.password) return false;
    return true;
  }, [form.account, form.password, view.isSubmitting]);

  /**
   * @CODE nxui_nx00_ui_login_change_account_001
   * 說明：帳號輸入更新
   */
  function onChangeAccount(v: string) {
    setForm((prev) => ({ ...prev, account: v }));
  }

  /**
   * @CODE nxui_nx00_ui_login_change_password_001
   * 說明：密碼輸入更新
   */
  function onChangePassword(v: string) {
    setForm((prev) => ({ ...prev, password: v }));
  }

  /**
   * @CODE nxui_nx00_auth_login_flow_001
   * 說明：驗證 → call api → 存 token → redirect
   */
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // 動作 001：清除舊錯誤
    setView((prev) => ({ ...prev, errorMsg: null }));

    // 動作 002：正規化
    const normalized = normalizeLoginForm(form);

    // 動作 003：驗證
    const err = validateLoginForm(normalized);
    if (err) {
      setView((prev) => ({ ...prev, errorMsg: err }));
      return;
    }

    // 動作 004：進入 submitting（鎖按鈕）
    setView((prev) => ({ ...prev, isSubmitting: true }));

    try {
      // 動作 005：呼叫登入 API
      const result = await callLoginApi({
        account: normalized.account,
        password: normalized.password,
      });

      // 動作 006：儲存 token
      if (!result?.token) {
        throw new Error('[nxui_nx00_auth_login_flow_001] token missing in response');
      }
      setToken(result.token);

      // 動作 007：導向登入後頁
      router.replace('/dashboard');
    } catch {
      // 動作 008：錯誤顯示
      setView((prev) => ({ ...prev, errorMsg: '帳號或密碼錯誤 / 或 API 無回應' }));
    } finally {
      // 動作 009：解除 submitting
      setView((prev) => ({ ...prev, isSubmitting: false }));
    }
  }

  return (
    /**
     * @CODE nxui_nx00_ui_login_layout_003
     * 說明：
     * - 深色儀表板背景：用漸層 + 光暈點綴營造「高級暗色 UI」
     * - 不引入任何圖片素材，純 Tailwind 即可達成質感
     */
    <div className="min-h-screen bg-[#07090d] text-white relative overflow-hidden">
      {/* @CODE nxui_nx00_ui_login_bg_glow_001 */}
      <div className="pointer-events-none absolute inset-0">
        {/* 左上光暈 */}
        <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-[#39ff14]/10 blur-[80px]" />
        {/* 右上冷光 */}
        <div className="absolute -top-52 -right-40 h-[520px] w-[520px] rounded-full bg-white/5 blur-[90px]" />
        {/* 中間微漸層 */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-black/60" />
      </div>

      <div className="relative min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          {/* @CODE nxui_nx00_ui_login_brand_003 */}
          <div className="mb-7 flex items-center justify-center">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.55)] flex items-center justify-center">
                <span className="text-xs font-semibold tracking-[0.25em] text-white/90">NX</span>
              </div>
              <div>
                <div className="text-sm tracking-[0.35em] font-semibold text-white/90">
                  NEXORA
                </div>
                <div className="text-xs text-white/40">ERP Console — NX00</div>
              </div>
            </div>
          </div>

          {/* @CODE nxui_nx00_ui_login_card_003 */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl shadow-[0_25px_90px_rgba(0,0,0,0.6)]">
            {/* header */}
            <div className="px-8 pt-8">
              {/* @CODE nxui_nx00_ui_login_header_003 */}
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-semibold tracking-wide text-white/95">
                    Sign in
                  </h1>
                  <p className="mt-1 text-sm text-white/45">
                    Use your Nexora account to continue.
                  </p>
                </div>

                {/* @CODE nxui_nx00_ui_login_accent_pill_001 */}
                <div className="rounded-full border border-[#39ff14]/30 bg-[#39ff14]/10 px-3 py-1 text-xs text-[#39ff14]">
                  NX00
                </div>
              </div>

              <div className="mt-6 h-px w-full bg-white/10" />
            </div>

            {/* form */}
            <form onSubmit={onSubmit} className="px-8 pb-8 pt-6 space-y-5">
              {/* @CODE nxui_nx00_ui_login_input_account_003 */}
              <div>
                <label className="block text-xs tracking-wider text-white/55 mb-2">
                  ACCOUNT
                </label>
                <input
                  type="text"
                  value={form.account}
                  onChange={(e) => onChangeAccount(e.target.value)}
                  autoComplete="username"
                  placeholder="Enter account"
                  className={[
                    'w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3',
                    'text-sm text-white placeholder:text-white/30',
                    'outline-none transition',
                    'focus:border-[#39ff14]/40 focus:ring-4 focus:ring-[#39ff14]/10',
                  ].join(' ')}
                />
              </div>

              {/* @CODE nxui_nx00_ui_login_input_password_003 */}
              <div>
                <label className="block text-xs tracking-wider text-white/55 mb-2">
                  PASSWORD
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => onChangePassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter password"
                  className={[
                    'w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3',
                    'text-sm text-white placeholder:text-white/30',
                    'outline-none transition',
                    'focus:border-[#39ff14]/40 focus:ring-4 focus:ring-[#39ff14]/10',
                  ].join(' ')}
                />
              </div>

              {/* @CODE nxui_nx00_ui_login_error_003 */}
              {view.errorMsg ? (
                <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                  <p className="text-sm text-white/80">※ {view.errorMsg}</p>
                </div>
              ) : null}

              {/* @CODE nxui_nx00_ui_login_btn_003 */}
              <button
                type="submit"
                disabled={!canSubmit}
                className={[
                  'w-full rounded-xl border px-4 py-3 text-sm font-medium tracking-wide',
                  'transition active:scale-[0.99]',
                  canSubmit
                    ? [
                        'border-[#39ff14]/40',
                        'bg-[#39ff14] text-black',
                        'hover:bg-[#39ff14]/90',
                        'shadow-[0_14px_40px_rgba(57,255,20,0.12)]',
                      ].join(' ')
                    : 'border-white/10 bg-white/5 text-white/35 cursor-not-allowed',
                ].join(' ')}
              >
                {view.isSubmitting ? 'Signing in…' : 'Sign in'}
              </button>

              {/* @CODE nxui_nx00_ui_login_footer_003 */}
              <div className="pt-2 flex items-center justify-between text-xs text-white/35">
                <span>© {new Date().getFullYear()} Nexora</span>
                <span className="text-white/25">Secure Access</span>
              </div>
            </form>
          </div>

          {/* @CODE nxui_nx00_ui_login_bottom_hint_002 */}
          <div className="mt-6 text-center text-xs text-white/25">
            Tip: Press Enter to submit
          </div>
        </div>
      </div>
    </div>
  );
}
