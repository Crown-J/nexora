/**
 * File: apps/nx-ui/src/app/login/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 登入畫面（NEXORA GRID 視覺稿）
 * - 串接登入 API（call api + store token + redirect）
 *
 * Notes:
 * - 公司帳號（選填）以 **tenantCode** 一併送 **POST /auth/login**，與 username 鎖定租戶內帳號
 * - 成功登入後導向 /dashboard（首頁儀表板；主檔總覽為 /dashboard/base，作業模組為 /dashboard/…）
 */

'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { callLoginApi } from '@/features/auth/api/login';
import { isNexoraDemoMode } from '@/features/auth/run-mode';
import { setToken } from '@/features/auth/token';
import { LoginForm, type LoginFormFields } from '@/components/login/login-form';
import { PlanetOrbit, ParticleField } from '@/components/login/planet-orbit';
import { getVersionParts } from '@/lib/version';
import { toNexoraClientError, type NexoraClientError } from '@/shared/errors/nexora-error';

// TASK-AUTH-ERROR-CODE：對齊規範 v1.1 §5.3 §7
// AU-301 公司空 / AU-302 使用者空 / AU-303 密碼空
// AU-999 fallback（fetch 異常 / 無回應、後續軌補精準碼）
type LoginViewState = {
  isSubmitting: boolean;
  errorMsg: NexoraClientError | null;
};

function getError(err: unknown): NexoraClientError {
  return toNexoraClientError(err, {
    errorCode: 'AU-999',
    message: '請確認公司帳號、使用者帳號及密碼。',
  });
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

function validateLoginForm(fields: LoginFormFields): NexoraClientError | null {
  // 對齊規範 v1.3 §7.3.4：訊息結尾加「。」+ 文案統一「公司帳號、使用者帳號及密碼」範式
  if (!fields.companyAccount.trim()) return { errorCode: 'AU-301', message: '請輸入公司帳號。' };
  if (!fields.userAccount.trim()) return { errorCode: 'AU-302', message: '請輸入使用者帳號。' };
  if (!fields.password) return { errorCode: 'AU-303', message: '請輸入密碼。' };
  return null;
}

/**
 * 版本號頁尾元件（規範 v1.3 §13.4 §13.5）。
 * 範式：'NEXORA GRID | v1.5.1 beta' — 三段 design token 對齊 4 主題
 *   - brand 'NEXORA GRID'：text-muted-foreground
 *   - version 'v1.5.1'：text-primary（amber 主色、4 主題自動切換）
 *   - suffix 'beta'：text-muted-foreground（偏灰、提示測試性質）
 */
function LoginVersionFooter() {
  const { brand, version, suffix } = getVersionParts();
  return (
    <p className="mt-4 text-center font-mono text-sm tracking-[0.1em] text-muted-foreground">
      <span>{brand}</span>
      <span className="mx-2 opacity-50">|</span>
      <span className="text-primary">{version}</span>
      {suffix ? <span className="ml-2 text-muted-foreground">{suffix}</span> : null}
    </p>
  );
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
        tenantCode: normalized.companyAccount,
      });

      if (!result?.token) {
        // AU-501：登入流程異常（規範 v1.1 §5.5、既有 hack [nxui_nx00_auth_login_flow_001] 清理）
        throw new Error(JSON.stringify({
          errorCode: 'AU-501',
          message: '登入流程異常，請重試或聯繫管理員。',
        }));
      }
      setToken(result.token);
      router.replace('/dashboard');
    } catch (e: unknown) {
      setView((prev) => ({ ...prev, errorMsg: getError(e) }));
    } finally {
      setView((prev) => ({ ...prev, isSubmitting: false }));
    }
  }

  return (
    <main className="login-shell h-dvh bg-background relative overflow-hidden font-sans lg:h-auto lg:min-h-screen">
      <div className="login-stars absolute inset-0 z-0">
        <ParticleField className="w-full h-full" />
      </div>

      <div className="absolute inset-0 z-0 bg-gradient-to-b from-background via-transparent to-background" />
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-background/50 via-transparent to-background/50" />

      <div className="relative z-10 h-full flex flex-col lg:min-h-screen lg:flex-row">
        <div className="lg:hidden shrink-0 flex flex-col items-center pt-4 pb-1 px-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-px w-6 bg-gradient-to-r from-transparent to-accent/50" />
            <span className="text-[10px] tracking-[0.25em] text-accent font-mono">ERP PLATFORM</span>
            <div className="h-px w-6 bg-gradient-to-l from-transparent to-accent/50" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            NEX
            <span className="relative inline-block">
              O
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
              </span>
            </span>
            RA
          </h1>
          <p className="text-base font-light tracking-[0.15em] text-foreground/80">GRID</p>
        </div>

        {/*
          TASK-LOGIN-MOBILE-PLANET-FIX：
          v1 已 revert：h-full + max-h-[360px] + max-w-full（h-full 在 flex column 內 child 行為不穩）
          v2（本版）：viewport-based width clamp + flex-1 父保留（讓 form 自適應）
            - 星球容器用 explicit width: clamp(180px, 40dvh, 280px)
              - 最小 180px（極窄螢幕保 visible）
              - 偏好 40dvh（viewport 高度 40%、不過大）
              - 最大 280px（大 mobile 上限）
            - aspect-square + explicit width → height = width（CSS 規範保證 1:1）
            - 父 flex-1 min-h-0 + items-center 保留（form 變高時 vertical center 自然調整）
            - 父加 overflow-hidden 防極端情況下星球溢出
            - mobile portrait 普遍：vp 700-900px、40dvh = 280-360px、clamp 後 = 280px 上限
        */}
        <div className="lg:hidden flex-1 min-h-0 flex items-center justify-center px-6 overflow-hidden">
          <div className="relative aspect-square w-[clamp(180px,40dvh,280px)] max-w-full">
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
        </div>

        <div className="w-full shrink-0 flex flex-col px-6 pb-2 lg:w-1/2 xl:w-2/5 lg:shrink lg:p-0 lg:pb-0">
          <div className="flex items-start justify-center lg:flex-1 lg:items-center lg:p-12">
            <div className="w-full max-w-md space-y-3 lg:space-y-6">
              <div className="space-y-1 text-center lg:space-y-2">
                <div className="hidden lg:flex items-center gap-3 justify-center">
                  <div className="h-px flex-1 max-w-16 bg-gradient-to-r from-border to-transparent" />
                  <span className="text-xs tracking-[0.2em] text-accent font-mono">WELCOME</span>
                  <div className="h-px flex-1 max-w-16 bg-gradient-to-l from-border to-transparent" />
                </div>
                <h2 className="text-base font-semibold tracking-tight text-foreground lg:text-2xl">
                  系統登入
                </h2>
                <p className="hidden lg:block text-xs lg:text-sm text-muted-foreground">
                  請輸入您的帳號資訊以存取系統
                </p>
                {isNexoraDemoMode() ? (
                  <div
                    role="status"
                    className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-left text-xs text-amber-200/90"
                  >
                    <span className="font-semibold text-amber-100">ℹ️ 展示模式</span>
                    ：跳過真實登入驗證（環境變數 NEXT_PUBLIC_NEXORA_RUN_MODE=demo）。
                  </div>
                ) : null}
              </div>

              <div className="login-card bg-card/60 backdrop-blur-md border border-border/40 rounded-2xl p-4 lg:p-8 relative overflow-hidden">
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

              {/* 規範 v1.3 §13.4 §13.5：版本號移到登入按鈕下方、品牌+版本+suffix 3 段 design token */}
              <LoginVersionFooter />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
