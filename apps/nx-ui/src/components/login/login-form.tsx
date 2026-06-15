'use client';

import { useMemo, useState } from 'react';
import { Eye, EyeOff, Building2, User, Lock, ArrowRight, XCircle } from 'lucide-react';

import type { NexoraClientError } from '@data/errors/nexora-error';

export type LoginFormFields = {
  companyAccount: string;
  userAccount: string;
  password: string;
};

type LoginFormProps = {
  onSubmit: (e: React.FormEvent, fields: LoginFormFields) => void | Promise<void>;
  /** TASK-AUTH-ERROR-CODE：errorMsg 結構化為 { errorCode, message }，對齊規範 v1.2 §7.3。*/
  errorMsg: NexoraClientError | null;
  isSubmitting: boolean;
};

export function LoginForm({ onSubmit, errorMsg, isSubmitting }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<LoginFormFields>({
    companyAccount: '',
    userAccount: '',
    password: '',
  });

  const canSubmit = useMemo(() => {
    if (isSubmitting) return false;
    if (!formData.companyAccount.trim()) return false;
    if (!formData.userAccount.trim()) return false;
    if (!formData.password) return false;
    return true;
  }, [formData.companyAccount, formData.userAccount, formData.password, isSubmitting]);

  return (
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
        // 對齊規範 v1.3 §7.3：warning 橘（4 主題 design token、避免 destructive 紅過度警告）
        // 字級保留 v1.2 校正：text-base 16px / text-xs 13px / p-3.5 14px / lucide XCircle 20px
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

      <div className="flex justify-end">
        <button
          type="button"
          className="text-xs tracking-wide text-muted-foreground hover:text-accent transition-colors duration-300"
        >
          忘記密碼？
        </button>
      </div>

      {/* 對齊 Hana .lg-submit：amber gradient 金色按鈕 + 寬字距 + 金黃光暈陰影
          inline style 走 var(--nx-amber-*) 確保 Tailwind v4 gradient stop 解析、不會落空變透明 */}
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
  );
}
