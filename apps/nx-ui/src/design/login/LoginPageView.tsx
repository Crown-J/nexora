// apps/nx-ui/src/design/login/LoginPageView.tsx
// 登入頁畫面層（presenter）。2026-06-27 大改版：太空風（星球/金色漸層/金光暈/玻璃卡）封存，
// 改傳統 ERP 乾淨登入——左品牌色塊 + 右表單、純色主鈕、無動畫無星球。
//
// 接口契約（與邏輯層 page.tsx 維持不變）：
//   props 進：errorMsg / isSubmitting / isLeaving / isDemoMode / versionInfo
//   callback 出：onSubmit(e, fields) / onForgotPassword
//   fields 含：companyAccount / userAccount / password / rememberMe（UI 狀態 view 自管）
//
// ⚠️ 接口預留但邏輯層未實作（rememberMe / onForgotPassword）— 與改版前一致。

'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { ArrowRight, Building2, Eye, EyeOff, Lock, User, XCircle } from 'lucide-react';

import type { NexoraClientError } from '@data/errors/nexora-error';

/** 表單欄位（含 rememberMe UI slot、邏輯層目前 noop） */
export type LoginFields = {
  companyAccount: string;
  userAccount: string;
  password: string;
  rememberMe: boolean;
};

/** 版本資訊（由邏輯層注入、view 純呈現） */
export type LoginVersionInfo = {
  brand: string;
  version: string;
  suffix: string;
};

/** LoginPageView 對外接口契約 */
export type LoginPageViewProps = {
  errorMsg: NexoraClientError | null;
  isSubmitting: boolean;
  isLeaving: boolean;
  isDemoMode: boolean;
  versionInfo: LoginVersionInfo;
  onSubmit: (e: FormEvent, fields: LoginFields) => void | Promise<void>;
  onForgotPassword?: () => void;
};

const FIELD_CLS =
  'w-full h-11 rounded-md border border-border bg-background pl-10 pr-4 text-[14px] text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40';

export function LoginPageView({
  errorMsg,
  isSubmitting,
  isLeaving,
  isDemoMode,
  versionInfo,
  onSubmit,
  onForgotPassword,
}: LoginPageViewProps) {
  const [formData, setFormData] = useState<LoginFields>({
    companyAccount: '',
    userAccount: '',
    password: '',
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);

  const canSubmit = useMemo(() => {
    if (isSubmitting) return false;
    if (!formData.companyAccount.trim()) return false;
    if (!formData.userAccount.trim()) return false;
    if (!formData.password) return false;
    return true;
  }, [formData.companyAccount, formData.userAccount, formData.password, isSubmitting]);

  return (
    <main
      className={`relative z-10 flex h-dvh flex-col bg-background font-sans text-foreground transition-opacity duration-300 lg:flex-row ${
        isLeaving ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* 左：品牌色塊（desktop）/ 頂部品牌條（mobile） */}
      <div className="flex shrink-0 flex-col justify-center bg-primary px-8 py-8 text-primary-foreground lg:w-2/5 lg:px-12 lg:py-0">
        <div className="mx-auto w-full max-w-sm lg:mx-0">
          <div className="text-[11px] font-medium tracking-[0.4em] opacity-80">
            ENTERPRISE RESOURCE PLANNING
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-wide lg:text-5xl">
            NEXORA <span className="opacity-90">GRID</span>
          </h1>
          <p className="mt-3 text-[13px] opacity-85 lg:mt-5 lg:text-[15px]">
            汽車零件零售 ERP 企業管理平台
          </p>
        </div>
      </div>

      {/* 右：登入表單 */}
      <div className="flex flex-1 items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">系統登入</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">請輸入您的帳號資訊以存取系統</p>
          </div>

          {isDemoMode ? (
            <div className="mb-4 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-[12px] text-foreground">
              <span className="font-semibold">展示模式</span>
              ：跳過真實登入驗證（NEXT_PUBLIC_NEXORA_RUN_MODE=demo）。
            </div>
          ) : null}

          <form onSubmit={(e) => onSubmit(e, formData)} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="company" className="block text-[12.5px] font-medium text-foreground">
                公司帳號
              </label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="company"
                  type="text"
                  value={formData.companyAccount}
                  onChange={(e) => setFormData({ ...formData, companyAccount: e.target.value })}
                  className={FIELD_CLS}
                  placeholder="公司代碼"
                  autoComplete="organization"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="user" className="block text-[12.5px] font-medium text-foreground">
                員工編號
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="user"
                  type="text"
                  value={formData.userAccount}
                  onChange={(e) => setFormData({ ...formData, userAccount: e.target.value })}
                  className={FIELD_CLS}
                  placeholder="員工編號"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-[12.5px] font-medium text-foreground">
                使用者密碼
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`${FIELD_CLS} pr-10`}
                  placeholder="密碼"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {errorMsg ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive"
              >
                <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <div className="flex-1">
                  <p className="text-[13px] leading-snug">{errorMsg.message}</p>
                  <p className="mt-0.5 text-[11px] opacity-70">[{errorMsg.errorCode}]</p>
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer select-none items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                  className="size-4 rounded border-border accent-primary"
                />
                <span className="text-[12.5px] text-muted-foreground">記住我</span>
              </label>
              <button
                type="button"
                onClick={() => onForgotPassword?.()}
                className="text-[12.5px] text-primary hover:underline"
              >
                忘記密碼？
              </button>
            </div>

            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-[14px] font-semibold text-primary-foreground transition hover:brightness-105 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
              ) : (
                <>
                  <span>登入系統</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center font-mono text-[12px] tracking-wide text-muted-foreground">
            <span>{versionInfo.brand}</span>
            <span className="mx-2 opacity-50">|</span>
            <span className="text-primary">{versionInfo.version}</span>
            {versionInfo.suffix ? (
              <span className="ml-2 text-muted-foreground">{versionInfo.suffix}</span>
            ) : null}
          </p>
        </div>
      </div>
    </main>
  );
}
