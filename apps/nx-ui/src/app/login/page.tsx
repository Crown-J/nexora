/**
 * File: apps/nx-ui/src/app/login/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 登入畫面（NEXORA GRID 視覺稿）
 * - 串接登入 API（call api + store token + redirect）
 *
 * Notes:
 * - 後端目前僅接受單一 username；公司帳號先作為 UI 欄位保留，不參與登入 payload
 * - 成功登入後導向 /dashboard
 */

'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { callLoginApi } from '@/features/auth/api/login';
import { setToken } from '@/features/auth/token';
import { LoginForm, type LoginFormFields } from '@/components/login/login-form';
import { PlanetOrbit, ParticleField } from '@/components/login/planet-orbit';

type LoginViewState = {
  isSubmitting: boolean;
  errorMsg: string | null;
};

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return '帳號或密碼錯誤 / 或 API 無回應';
}

function normalizeFields(fields: LoginFormFields): LoginFormFields {
  return {
    companyAccount: fields.companyAccount.trim(),
    userAccount: fields.userAccount.trim(),
    password: fields.password,
  };
}

function buildUsernameForApi(fields: LoginFormFields): string {
  const u = fields.userAccount.trim();
  return u;
}

function validateLoginForm(fields: LoginFormFields): string | null {
  if (!fields.userAccount.trim()) return '請輸入使用者帳號';
  if (!fields.password) return '請輸入密碼';
  return null;
}

export default function LoginPage() {
  const router = useRouter();
  const [view, setView] = useState<LoginViewState>({ isSubmitting: false, errorMsg: null });

  async function onSubmit(e: FormEvent, rawFields: LoginFormFields) {
    e.preventDefault();
    setView((prev) => ({ ...prev, errorMsg: null }));

    const normalized = normalizeFields(rawFields);
    const err = validateLoginForm(normalized);
    if (err) {
      setView((prev) => ({ ...prev, errorMsg: err }));
      return;
    }

    setView((prev) => ({ ...prev, isSubmitting: true }));

    try {
      const account = buildUsernameForApi(normalized);
      const result = await callLoginApi({
        account,
        password: normalized.password,
      });

      if (!result?.token) {
        throw new Error('[nxui_nx00_auth_login_flow_001] token missing in response');
      }
      setToken(result.token);
      router.replace('/dashboard');
    } catch (e: unknown) {
      setView((prev) => ({ ...prev, errorMsg: getErrorMessage(e) }));
    } finally {
      setView((prev) => ({ ...prev, isSubmitting: false }));
    }
  }

  return (
    <main className="login-shell min-h-screen min-h-dvh bg-background relative overflow-hidden font-sans">
      <div className="login-stars absolute inset-0 z-0">
        <ParticleField className="w-full h-full" />
      </div>

      <div className="absolute inset-0 z-0 bg-gradient-to-b from-background via-transparent to-background" />
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-background/50 via-transparent to-background/50" />

      <div className="relative z-10 min-h-screen min-h-dvh flex flex-col lg:flex-row">
        <div className="lg:hidden flex flex-col items-center pt-8 pb-4 px-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-accent/50" />
            <span className="text-[10px] tracking-[0.25em] text-accent font-mono">ERP PLATFORM</span>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-accent/50" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            NEX
            <span className="relative inline-block">
              O
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
              </span>
            </span>
            RA
          </h1>
          <p className="text-lg font-light tracking-[0.15em] text-foreground/80">GRID</p>
        </div>

        <div className="lg:hidden flex-1 flex items-center justify-center px-6 py-4 max-h-[35vh]">
          <div className="w-full max-w-[280px] aspect-square">
            <PlanetOrbit className="w-full h-full" />
          </div>
        </div>

        <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative flex-col items-center justify-center">
          <div className="relative z-10 w-80 h-80 xl:w-[420px] xl:h-[420px]">
            <PlanetOrbit className="w-full h-full" />
          </div>

          <div className="relative z-10 mt-8 text-center px-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-accent/50" />
              <span className="text-xs tracking-[0.3em] text-accent font-mono">
                ENTERPRISE RESOURCE PLANNING
              </span>
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-accent/50" />
            </div>
            <h1 className="text-5xl xl:text-6xl font-bold tracking-tight text-foreground">
              NEX
              <span className="relative inline-block">
                O
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                </span>
              </span>
              RA
            </h1>
            <p className="text-2xl xl:text-3xl font-light tracking-[0.15em] text-foreground/80 mt-1">
              GRID
            </p>
            <p className="mt-4 text-sm text-muted-foreground tracking-wide">
              汽車零件零售 ERP 企業管理平台
            </p>
          </div>

          <div className="absolute bottom-8 left-8 right-8">
            <div className="flex items-center justify-between text-xs text-muted-foreground/50 font-mono">
              <span>SYS.VER 2.0.26</span>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                <span>ONLINE</span>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-1/2 xl:w-2/5 flex flex-col px-6 pb-6 lg:p-0">
          <div className="flex-1 flex items-start lg:items-center justify-center lg:p-12">
            <div className="w-full max-w-md space-y-6">
              <div className="space-y-2 text-center">
                <div className="hidden lg:flex items-center gap-3 justify-center">
                  <div className="h-px flex-1 max-w-16 bg-gradient-to-r from-border to-transparent" />
                  <span className="text-xs tracking-[0.2em] text-accent font-mono">WELCOME</span>
                  <div className="h-px flex-1 max-w-16 bg-gradient-to-l from-border to-transparent" />
                </div>
                <h2 className="text-xl lg:text-2xl font-semibold tracking-tight text-foreground">
                  系統登入
                </h2>
                <p className="text-xs lg:text-sm text-muted-foreground">
                  請輸入您的帳號資訊以存取系統
                </p>
              </div>

              <div className="login-card bg-card/60 backdrop-blur-md border border-border/40 rounded-2xl p-5 lg:p-8 relative overflow-hidden">
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-accent/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-accent/5 rounded-full blur-3xl" />

                <div className="relative">
                  <LoginForm
                    onSubmit={onSubmit}
                    errorMsg={view.errorMsg}
                    isSubmitting={view.isSubmitting}
                  />
                </div>
              </div>

              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    系統正常運作
                  </span>
                  <span className="text-border">|</span>
                  <span className="font-mono">v1.0.0</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 lg:p-6 border-t border-border/20 lg:border-t-0">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>&copy; 2024 INNOVA Tech</span>
              <div className="flex items-center gap-4">
                <button type="button" className="login-link hover:text-accent transition-colors">
                  服務條款
                </button>
                <button type="button" className="login-link hover:text-accent transition-colors">
                  隱私政策
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 px-6 py-3 bg-background/80 backdrop-blur-sm border-t border-border/20">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground/60 font-mono">
          <span>SYS.VER 2.0.26</span>
          <div className="flex items-center gap-1.5">
            <span className="w-1 h-1 bg-accent rounded-full animate-pulse" />
            <span>NEXORA ONLINE</span>
          </div>
        </div>
      </div>
    </main>
  );
}
