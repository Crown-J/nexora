// apps/nx-ui/src/design/login/LoginPageView.tsx
// 登入頁畫面層（presenter）— 試點協作：Hana 可單檔替換、邏輯層不受影響
//
// 接口契約（Hana 替換時保持不變）：
//   props 進：errorMsg / isSubmitting / isLeaving / isDemoMode / versionInfo
//   callback 出：onSubmit(e, fields) / onForgotPassword
//   fields 含：companyAccount / userAccount / password / rememberMe（UI 狀態 view 自管）
//
// ⚠️ 接口預留但目前邏輯層未實作（拆分時保持與拆前完全一致、未擴大範圍）：
//   - rememberMe：UI 有勾選框、邏輯層 noop
//   - onForgotPassword：UI 有連結、邏輯層 noop

'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Eye, EyeOff, Building2, User, Lock, ArrowRight, XCircle } from 'lucide-react';

import type { NexoraClientError } from '@data/errors/nexora-error';
import { ParticleField } from '@design/login/planet-orbit';
import { NxAppBackdrop } from '@design/layout/NxAppBackdrop';
import { PlanetSlot } from '@design/home/SharedPlanetRoot';

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
  /** API 錯誤訊息（含 errorCode），null 不顯示 */
  errorMsg: NexoraClientError | null;
  /** 送出中（按鈕轉圈、disable）*/
  isSubmitting: boolean;
  /** 登入成功後的 fade-out 動畫（main 透明度+縮放）*/
  isLeaving: boolean;
  /** 是否顯示展示模式提示條 */
  isDemoMode: boolean;
  /** 版本號頁尾資訊 */
  versionInfo: LoginVersionInfo;
  /** 表單送出（fields 包整批欄位、logic 層處理 normalize/validate/API）*/
  onSubmit: (e: FormEvent, fields: LoginFields) => void | Promise<void>;
  /** 忘記密碼點擊（⚠️ 目前邏輯層 noop、UI slot 預留）*/
  onForgotPassword?: () => void;
};

export function LoginPageView({
  errorMsg,
  isSubmitting,
  isLeaving,
  isDemoMode,
  versionInfo,
  onSubmit,
  onForgotPassword,
}: LoginPageViewProps) {
  // UI 狀態：view 自管（formData / showPassword）
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
      className={`login-shell h-dvh relative overflow-hidden font-sans lg:h-auto lg:min-h-screen transition-all duration-500 ease-out ${
        isLeaving ? 'opacity-0 scale-[0.96]' : 'opacity-100 scale-100'
      }`}
    >
      {/* 兩主題底色 backdrop（與全 app 一致、跨登入/dashboard 連續） */}
      <NxAppBackdrop />
      <div className="login-stars absolute inset-0 z-0">
        <ParticleField className="w-full h-full" />
      </div>

      <div className="relative z-10 h-full flex flex-col lg:min-h-screen lg:flex-row">
        {/* Mobile：品牌字 NEXORA + GRID + amber kicker 線條 */}
        <div className="lg:hidden shrink-0 flex flex-col items-center pt-4 pb-1 px-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-[var(--warning)]" />
            <span className="text-[10px] tracking-[0.42em] text-[var(--warning)] font-mono">
              ERP PLATFORM
            </span>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-[var(--warning)]" />
          </div>
          <h1 className="text-3xl font-bold tracking-[0.04em] leading-[0.95] text-foreground">
            NEXORA
          </h1>
          <p className="mt-2 text-sm font-normal tracking-[0.5em] text-muted-foreground/85 ml-[0.5em]">
            GRID
          </p>
        </div>

        {/* Mobile：星球佔位（SharedPlanet 飛到此 slot rect、登入時放大顯示） */}
        <div className="lg:hidden flex-1 min-h-0 flex items-center justify-center px-6 overflow-hidden">
          <div className="relative aspect-square w-[min(60vw,360px)] max-w-full">
            <PlanetSlot id="login" className="absolute inset-0" />
          </div>
        </div>

        {/* Desktop：左半星球 + NEXORA 品牌字 + tagline */}
        <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative flex-col items-center justify-center">
          <div className="relative z-10 aspect-square w-[min(42vw,440px)] max-w-[440px]">
            <PlanetSlot id="login" className="absolute inset-0" />
          </div>

          <div className="relative z-10 mt-8 text-center px-8">
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-[var(--warning)]" />
              <span className="text-[11px] tracking-[0.42em] text-[var(--warning)] font-mono font-medium">
                ENTERPRISE RESOURCE PLANNING
              </span>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-[var(--warning)]" />
            </div>
            <h1 className="text-5xl xl:text-6xl font-bold tracking-[0.04em] leading-[0.95] text-foreground">
              NEXORA
            </h1>
            <p className="mt-3 text-xl xl:text-2xl font-normal tracking-[0.5em] text-muted-foreground/85 ml-[0.5em]">
              GRID
            </p>
            <p className="mt-5 text-sm text-muted-foreground tracking-[0.08em]">
              汽車零件零售 ERP 企業管理平台
            </p>
          </div>
        </div>

        {/* 右半（desktop）/ 底部（mobile）：登入卡 + 版本號 */}
        <div className="w-full shrink-0 flex flex-col px-6 pb-2 lg:w-1/2 xl:w-2/5 lg:shrink lg:p-0 lg:pb-0">
          <div className="flex items-start justify-center lg:flex-1 lg:items-center lg:p-12">
            <div className="w-full max-w-md space-y-3 lg:space-y-6">
              <div className="space-y-1 text-center lg:space-y-2">
                <div className="hidden lg:flex items-center gap-3 justify-center">
                  <div className="h-px w-9 bg-gradient-to-r from-transparent to-[var(--warning)]" />
                  <span className="text-[11px] tracking-[0.4em] text-[var(--warning)] font-mono font-medium">
                    WELCOME
                  </span>
                  <div className="h-px w-9 bg-gradient-to-l from-transparent to-[var(--warning)]" />
                </div>
                <h2 className="text-base font-semibold tracking-tight text-foreground lg:text-2xl">
                  系統登入
                </h2>
                <p className="hidden lg:block text-xs lg:text-sm text-muted-foreground">
                  請輸入您的帳號資訊以存取系統
                </p>
                {isDemoMode ? (
                  <div
                    role="status"
                    className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-left text-xs text-amber-200/90"
                  >
                    <span className="font-semibold text-amber-100">ℹ️ 展示模式</span>
                    ：跳過真實登入驗證（環境變數 NEXT_PUBLIC_NEXORA_RUN_MODE=demo）。
                  </div>
                ) : null}
              </div>

              {/* 登入卡（18px 圓角 + 半透明漸層內襯 + 兩角金光暈） */}
              <div className="login-card relative overflow-hidden rounded-[18px] border border-foreground/[0.085] bg-gradient-to-b from-foreground/[0.045] to-foreground/[0.015] p-4 backdrop-blur-md lg:p-8">
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-accent/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-accent/5 rounded-full blur-3xl" />

                <div className="relative">
                  <form
                    onSubmit={(e) => onSubmit(e, formData)}
                    className="w-full space-y-5"
                  >
                    <div className="space-y-2">
                      <label
                        htmlFor="company"
                        className="block text-xs font-medium tracking-[0.15em] uppercase text-muted-foreground"
                      >
                        公司帳號
                      </label>
                      <div className="relative group">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-accent transition-colors" />
                        <input
                          id="company"
                          type="text"
                          value={formData.companyAccount}
                          onChange={(e) => setFormData({ ...formData, companyAccount: e.target.value })}
                          className="w-full h-12 bg-secondary/50 border border-border/50 rounded-lg pl-11 pr-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-all duration-300"
                          placeholder="Company ID"
                          autoComplete="organization"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="user"
                        className="block text-xs font-medium tracking-[0.15em] uppercase text-muted-foreground"
                      >
                        員工編號
                      </label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-accent transition-colors" />
                        <input
                          id="user"
                          type="text"
                          value={formData.userAccount}
                          onChange={(e) => setFormData({ ...formData, userAccount: e.target.value })}
                          className="w-full h-12 bg-secondary/50 border border-border/50 rounded-lg pl-11 pr-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-all duration-300"
                          placeholder="Employee ID"
                          autoComplete="username"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="password"
                        className="block text-xs font-medium tracking-[0.15em] uppercase text-muted-foreground"
                      >
                        使用者密碼
                      </label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-accent transition-colors" />
                        <input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full h-12 bg-secondary/50 border border-border/50 rounded-lg pl-11 pr-11 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-all duration-300"
                          placeholder="Password"
                          autoComplete="current-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showPassword ? '隱藏密碼' : '顯示密碼'}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {errorMsg ? (
                      <div
                        role="alert"
                        className="rounded-lg border border-warning/40 bg-warning/10 p-3.5 text-warning"
                      >
                        <div className="flex items-start gap-2">
                          <XCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
                          <div className="flex-1">
                            <p className="text-base leading-snug">{errorMsg.message}</p>
                            <p className="mt-1 text-xs opacity-70">[Error Code : {errorMsg.errorCode}]</p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* 記住我 + 忘記密碼（⚠️ 兩者邏輯層目前 noop、UI slot 預留給後續軌） */}
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={formData.rememberMe}
                          onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                          className="size-4 rounded border-border/50 bg-secondary/50 accent-accent cursor-pointer"
                        />
                        <span className="text-xs tracking-wide text-muted-foreground">
                          記住我
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => onForgotPassword?.()}
                        className="text-xs tracking-wide text-muted-foreground hover:text-accent transition-colors duration-300"
                      >
                        忘記密碼？
                      </button>
                    </div>

                    {/* amber gradient 登入按鈕（金色 + 寬字距 + 金黃光暈陰影） */}
                    <button
                      type="submit"
                      disabled={!canSubmit || isSubmitting}
                      style={{
                        background: 'linear-gradient(180deg, var(--color-primary-light), var(--warning))',
                        boxShadow: '0 6px 18px -7px rgba(232, 160, 32, 0.55)',
                        color: '#1a1a1f',
                      }}
                      className="group relative flex w-full h-[50px] items-center justify-center gap-2 overflow-hidden rounded-[10px] text-[14.5px] font-semibold tracking-[0.12em] transition-all duration-200 hover:brightness-[1.04] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSubmitting ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                      ) : (
                        <>
                          <span>登入系統</span>
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* 版本號 footer（brand | version + suffix、3 段 design token） */}
              <p className="mt-4 text-center font-mono text-sm tracking-[0.1em] text-muted-foreground">
                <span>{versionInfo.brand}</span>
                <span className="mx-2 opacity-50">|</span>
                <span className="text-primary">{versionInfo.version}</span>
                {versionInfo.suffix ? (
                  <span className="ml-2 text-muted-foreground">{versionInfo.suffix}</span>
                ) : null}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
