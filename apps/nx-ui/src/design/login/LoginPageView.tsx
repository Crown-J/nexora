// apps/nx-ui/src/design/login/LoginPageView.tsx
// 登入頁畫面層（presenter）。2026-06-27：太空風封存後的乾淨版偏陽春 → 加質感改版。
// 左：品牌價值區（漸層 + logo 標記 + 產品亮點 + 點狀紋理）；右：表單卡片。
// 仍走 pro 專業配色、無星球無金色。接口契約（props/callback）與邏輯層 page.tsx 維持不變。
//
// ⚠️ 接口預留但邏輯層未實作（rememberMe / onForgotPassword）— 與改版前一致。

'use client';

import { useMemo, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Boxes,
  Building2,
  Check,
  Eye,
  EyeOff,
  LineChart,
  Lock,
  ShieldCheck,
  User,
  Warehouse,
  XCircle,
} from 'lucide-react';

import type { NexoraClientError } from '@data/errors/nexora-error';
import { BrandLogo } from '@design/brand/BrandLogo';

export type LoginFields = {
  companyAccount: string;
  userAccount: string;
  password: string;
  rememberMe: boolean;
};

export type LoginVersionInfo = {
  brand: string;
  version: string;
  suffix: string;
};

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
  'w-full h-11 rounded-md border border-border bg-background pl-10 pr-4 text-[14px] text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25';

const FEATURES: { icon: typeof Boxes; text: string }[] = [
  { icon: Boxes, text: '進・銷・存・財 一體化作業' },
  { icon: Warehouse, text: '多倉即時庫存掌握' },
  { icon: LineChart, text: '營運報表即時分析' },
  { icon: ShieldCheck, text: '雲端隨處・權限分級安全存取' },
];

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
      {/* 左：品牌價值區（漸層 + 點狀紋理 + logo + 產品亮點） */}
      <section
        className="relative flex shrink-0 flex-col justify-between overflow-hidden px-8 py-8 lg:w-1/2 lg:px-14 lg:py-12 xl:w-[55%]"
        style={{
          // 石墨深底（執行長 2026-06-28 選定方案 B）：深炭底 + 鋼藍點綴
          background: 'linear-gradient(160deg, #243140 0%, #141b22 100%)',
          color: '#eef2f6',
        }}
      >
        {/* 點狀紋理 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              'radial-gradient(circle at center, rgba(255,255,255,0.9) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        />
        {/* 右上鋼藍柔光 */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, rgba(90,147,196,0.45), transparent 70%)' }}
        />

        {/* 上：logo + 品牌 */}
        <div className="relative">
          <div className="flex items-center gap-3">
            <BrandLogo size={44} className="rounded-xl ring-1 ring-white/10" />
            <div>
              <div className="text-xl font-bold leading-none tracking-wide">
                NEXORA <span style={{ color: '#7fb0db' }}>GRID</span>
              </div>
              <div className="mt-1 text-[10px] tracking-[0.32em] opacity-70">
                ENTERPRISE RESOURCE PLANNING
              </div>
            </div>
          </div>
        </div>

        {/* 中：標語 + 產品亮點（desktop） */}
        <div className="relative mt-8 lg:mt-0">
          <h1 className="text-2xl font-semibold leading-snug lg:text-[28px]">
            汽車零件零售
            <br className="hidden lg:block" />
            ERP 企業管理平台
          </h1>
          <ul className="mt-6 hidden space-y-3 lg:block">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex items-center gap-3 text-[14px] opacity-95">
                <span
                  className="grid h-6 w-6 place-items-center rounded-full text-white"
                  style={{ background: '#5a93c4' }}
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        {/* 下：版權（desktop） */}
        <div className="relative mt-8 hidden text-[11px] opacity-70 lg:block">
          © {new Date().getFullYear()} Innova IT — NEXORA GRID
        </div>
      </section>

      {/* 右：登入表單卡片 */}
      <section className="flex flex-1 items-center justify-center px-6 py-8">
        <div className="w-full max-w-[400px]">
          <div className="rounded-xl border border-border bg-card p-7 shadow-lg lg:p-8">
            <div className="mb-6">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Lock className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">歡迎登入</h2>
                  <p className="text-[12px] text-muted-foreground">請使用公司核發的帳號登入系統</p>
                </div>
              </div>
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
                className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-[14px] font-semibold text-primary-foreground shadow-sm transition hover:brightness-105 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
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

            <p className="mt-5 border-t border-border pt-4 text-center text-[12px] text-muted-foreground">
              需要協助？請聯絡貴公司系統管理員
            </p>
          </div>

          <p className="mt-4 text-center font-mono text-[12px] tracking-wide text-muted-foreground">
            <span>{versionInfo.brand}</span>
            <span className="mx-2 opacity-50">|</span>
            <span className="text-primary">{versionInfo.version}</span>
            {versionInfo.suffix ? (
              <span className="ml-2 text-muted-foreground">{versionInfo.suffix}</span>
            ) : null}
          </p>
        </div>
      </section>
    </main>
  );
}
