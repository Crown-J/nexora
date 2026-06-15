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
import { callLoginApi } from '@data/endpoints/auth/api/login';
import { isNexoraDemoMode } from '@data/auth/run-mode';
import { setToken } from '@data/auth/token';
import { LoginForm, type LoginFormFields } from '@/components/login/login-form';
import { ParticleField } from '@/components/login/planet-orbit';
import { NxAppBackdrop } from '@/components/shell/NxAppBackdrop';
import { PlanetSlot, usePlanet } from '@/features/shared-planet/SharedPlanetRoot';
import { getVersionParts } from '@/lib/version';
import { toNexoraClientError, type NexoraClientError } from '@data/errors/nexora-error';

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
    message: '請確認公司帳號、員工編號及密碼。',
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
  if (!fields.userAccount.trim()) return { errorCode: 'AU-302', message: '請輸入員工編號。' };
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
  const { flyToCenter, flyTo } = usePlanet();
  const [view, setView] = useState<LoginViewState>({ isSubmitting: false, errorMsg: null });
  // 轉場 leaving 旗：登入成功後表單 fade-out、星球同時飛 0.8s+0.95s → router.replace
  const [isLeaving, setIsLeaving] = useState(false);

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
        // AU-501：登入流程異常（規範 v1.1 §5.5、既有 hack [nxui_master_auth_login_flow_001] 清理）
        throw new Error(JSON.stringify({
          errorCode: 'AU-501',
          message: '登入流程異常，請重試或聯繫管理員。',
        }));
      }
      setToken(result.token);
      // 對齊 Hana A 段主轉場、修正路由順序：先 router.replace 讓 topbar slot 開始掛載、再 flyTo 等它出現
      // （原本順序：flyToCenter → flyTo('topbar') → replace、topbar slot 那刻還沒 mount、placeAt 重試 40 幀放棄、星球僵在中央 → router 完進 dashboard 才被 useLayoutEffect 瞬移）
      setIsLeaving(true);
      void (async () => {
        await flyToCenter(800);
        router.replace('/dashboard');  // dashboard mount、topbar slot 開始註冊；mode='flight' 期間 useLayoutEffect 自動歸位被 guard 擋住、不會瞬移
        await flyTo('topbar', 950);     // placeAt 內建 retry 會等 topbar slot 出現、然後平滑飛過去停泊
      })();
      return;
    } catch (e: unknown) {
      setView((prev) => ({ ...prev, errorMsg: getError(e) }));
    } finally {
      setView((prev) => ({ ...prev, isSubmitting: false }));
    }
  }

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

      {/* 原頂底/左右兩道 from-background 漸層蓋層已移除 — 它們跟 ParticleField 同 z-0、
          DOM 後渲染、會用深色 background 把 canvas 頂部的極光蓋掉。
          星空與極光已自帶頂底亮度層次、不需要這兩道蓋層做漸入。 */}

      <div className="relative z-10 h-full flex flex-col lg:min-h-screen lg:flex-row">
        {/* 對齊 Hana .lg-brand：寬字距 NEXORA + GRID 第二行 + amber kicker 線條 */}
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
        {/* Mobile：星球佔位（SharedPlanet 飛到此 slot rect、登入時放大顯示）*/}
        <div className="lg:hidden flex-1 min-h-0 flex items-center justify-center px-6 overflow-hidden">
          <div className="relative aspect-square w-[min(60vw,360px)] max-w-full">
            <PlanetSlot id="login" className="absolute inset-0" />
          </div>
        </div>

        <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative flex-col items-center justify-center">
          {/* Desktop：星球佔位 — 對齊 Hana 原版 #lg-slot：min(42vw, 440px)
              讓 planet scale 接近 1.0、飛中央只是 1.0→1.12 的輕微放大（不是 0.65→1.12 的暴脹手感差）*/}
          <div className="relative z-10 aspect-square w-[min(42vw,440px)] max-w-[440px]">
            <PlanetSlot id="login" className="absolute inset-0" />
          </div>

          {/* 對齊 Hana .lg-brand desktop：寬字距 NEXORA + GRID 第二行 + tagline */}
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

        <div className="w-full shrink-0 flex flex-col px-6 pb-2 lg:w-1/2 xl:w-2/5 lg:shrink lg:p-0 lg:pb-0">
          <div className="flex items-start justify-center lg:flex-1 lg:items-center lg:p-12">
            <div className="w-full max-w-md space-y-3 lg:space-y-6">
              <div className="space-y-1 text-center lg:space-y-2">
                {/* 對齊 Hana .lg-welcome：amber 漸層短線條 + 寬字距 WELCOME */}
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

              {/* 對齊 Hana .lg-card：18px 圓角 + 半透明漸層內襯 + 兩角金光暈、用 foreground token 自動切深淺主題 */}
              <div className="login-card relative overflow-hidden rounded-[18px] border border-foreground/[0.085] bg-gradient-to-b from-foreground/[0.045] to-foreground/[0.015] p-4 backdrop-blur-md lg:p-8">
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
