'use client';

import { useMemo, useState } from 'react';
import { Eye, EyeOff, Building2, User, Lock, ArrowRight, XCircle } from 'lucide-react';

import type { NexoraClientError } from '@/shared/errors/nexora-error';

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
          使用者帳號
        </label>
        <div className="relative group">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-accent transition-colors" />
          <input
            id="user"
            type="text"
            value={formData.userAccount}
            onChange={(e) => setFormData({ ...formData, userAccount: e.target.value })}
            className="w-full h-12 bg-secondary/50 border border-border/50 rounded-lg pl-11 pr-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-all duration-300"
            placeholder="Username"
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
        // 對齊規範 v1.2 §7.3：訊息 16px / 代碼 13px / ❌ 圖示 / padding 14px
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-3.5 text-destructive"
        >
          <div className="flex items-start gap-2">
            <XCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
            <p className="text-base leading-snug">{errorMsg.message}</p>
          </div>
          <p className="mt-2 pl-7 text-[13px] text-destructive/70">
            [錯誤代碼：{errorMsg.errorCode}]
          </p>
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

      <button
        type="submit"
        disabled={!canSubmit || isSubmitting}
        className="w-full h-12 bg-foreground text-background rounded-lg text-sm font-medium tracking-wider uppercase hover:bg-foreground/90 transition-all duration-300 relative overflow-hidden group flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <div className="h-5 w-5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
        ) : (
          <>
            <span>登入系統</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </button>
    </form>
  );
}
