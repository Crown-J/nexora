/**
 * File: apps/nx-ui/src/features/auth/hooks/useSessionMe.ts
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-AUTH-003：驗證 token 是否可用（/auth/me）
 * - NX00-UI-AUTH-001：前端共用 Session Hook（避免每頁重寫 guard）
 *
 * Notes:
 * - 避免 hydration mismatch：不要在 render 期間讀 localStorage
 * - 若沒有 token：導回 /login
 * - 若 token 無效(401)：清 token → 導回 /login
 * - Demo 模式且 token 為展示用固定值：不呼叫 /auth/me，使用假 me
 * - ✅ 改用 shared/api/client（自動帶 token / baseUrl）
 * - ✅ 錯誤處理用 assertOk（但 401 先特判）
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { apiFetch } from '@/shared/api/client';
import { assertOk } from '@/shared/api/http';

import { NEXORA_DEMO_ACCESS_TOKEN } from '@/features/auth/constants';
import { buildDemoMeFromStorage, clearDemoSessionUsername } from '@/features/auth/demo-session';
import { isNexoraDemoMode } from '@/features/auth/run-mode';
import type { MeDto } from '@/features/auth/types';
import { clearToken, getToken } from '@/features/auth/token';

export type { MeDto } from '@/features/auth/types';

/**
 * 合併 plan_code／planCode，避免 JWT 或閘道只回 camelCase 時前端誤判為非 PLUS。
 */
function normalizeMeDto(raw: MeDto): MeDto {
  const camel = raw.planCode;
  const snake = raw.plan_code;
  const fromSnake = snake != null && String(snake).trim() !== '' ? String(snake).trim() : null;
  const fromCamel = camel != null && String(camel).trim() !== '' ? String(camel).trim() : null;
  const plan = fromSnake ?? fromCamel ?? null;
  return {
    ...raw,
    plan_code: plan,
    planCode: plan,
  };
}

export type ViewState = {
  loading: boolean;
  errorMsg: string | null;
  checkedAt: string | null;
};

export type UseSessionMeResult = {
  me: MeDto | null;
  view: ViewState;
  hasToken: boolean | null;

  // 這些是「已統一命名」後的衍生欄位，頁面可以直接用
  displayName: string;
  statusCode: string;
  lastLoginAt: string | null;
  isActive: boolean | null;
  /** 租戶中文名；無則空字串 */
  tenantNameZh: string;
  /** 租戶英文名；無則空字串 */
  tenantNameEn: string;
  /** 訂閱方案（LITE / PLUS / PRO）；已合併 JWT／API 的 planCode 與 plan_code */
  planCode: string | null;

  logout: () => void;
};

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Unknown error';
}

/**
 * @FUNCTION_CODE NX00-UI-AUTH-001-F01
 * 說明：
 * - 封裝 Dashboard/各模組頁面共用的「登入狀態檢查」流程
 *
 * 行為：
 * 1) client mount 後讀 token（避免 hydration mismatch）
 * 2) 無 token → router.replace('/login')
 * 3) 有 token → 呼叫 /auth/me
 * 4) 401 → clearToken → router.replace('/login')
 * 5) ok → 回傳 me + view + 衍生欄位
 */
export function useSessionMe(): UseSessionMeResult {
  const router = useRouter();

  const [me, setMe] = useState<MeDto | null>(null);
  const [view, setView] = useState<ViewState>({
    loading: true,
    errorMsg: null,
    checkedAt: null,
  });

  /**
   * @FUNCTION_CODE NX00-UI-AUTH-001-F02
   * 說明：
   * - hasToken 用於 UI 顯示（System Health）等場景
   * - 初始值 null：表示尚未完成 client mount 後的 token 檢查
   */
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  /**
   * @FUNCTION_CODE NX00-UI-AUTH-001-F03
   * 說明：
   * - 僅在 client mount 後讀一次 token 狀態
   * - 避免 SSR/CSR 首屏不一致（hydration mismatch）
   */
  useEffect(() => {
    setHasToken(!!getToken());
  }, []);

  /**
   * @FUNCTION_CODE NX00-UI-AUTH-001-F04
   * 說明：
   * - 進入頁面後執行 session boot：
   *   - token 存在性檢查
   *   - /auth/me 驗證
   */
  useEffect(() => {
    let alive = true;

    async function boot() {
      const token = getToken();
      if (!token) {
        // 沒 token：直接去登入
        setMe(null);
        setView({ loading: false, errorMsg: null, checkedAt: new Date().toISOString() });
        router.replace('/login');
        return;
      }

      if (isNexoraDemoMode() && token === NEXORA_DEMO_ACCESS_TOKEN) {
        if (!alive) return;
        setMe(normalizeMeDto(buildDemoMeFromStorage()));
        setView({ loading: false, errorMsg: null, checkedAt: new Date().toISOString() });
        return;
      }

      setView({ loading: true, errorMsg: null, checkedAt: null });

      try {
        const res = await apiFetch('/auth/me', { method: 'GET' });

        // ✅ 401 先特判：清 token → 轉登入
        if (res.status === 401) {
          clearToken();
          if (!alive) return;
          setMe(null);
          setView({ loading: false, errorMsg: null, checkedAt: new Date().toISOString() });
          router.replace('/login');
          return;
        }

        // 其他狀況統一用 assertOk
        await assertOk(res, 'nxui_auth_session_me_001');

        const data = normalizeMeDto((await res.json()) as MeDto);

        if (!alive) return;
        setMe(data);
        setView({ loading: false, errorMsg: null, checkedAt: new Date().toISOString() });
      } catch (e: unknown) {
        if (!alive) return;

        // 這裡不直接 redirect，讓頁面顯示錯誤（你也可以改成強制 logout）
        setMe(null);
        setView({
          loading: false,
          errorMsg: getErrorMessage(e) || '讀取使用者資訊失敗（API 無回應 / 設定錯誤）',
          checkedAt: new Date().toISOString(),
        });
      }
    }

    void boot();

    return () => {
      alive = false;
    };
  }, [router]);

  /**
   * @FUNCTION_CODE NX00-UI-AUTH-001-F05
   * 說明：
   * - 登出行為統一：清 token → 回登入頁
   * - 後續若要加「呼叫 /auth/logout」也只需改這裡
   */
  function logout() {
    clearToken();
    clearDemoSessionUsername();
    router.replace('/login');
  }

  /**
   * @FUNCTION_CODE NX00-UI-AUTH-001-F06
   * 說明：
   * - 將 snake_case / camelCase 兼容欄位統一成前端好用的格式
   * - 避免頁面到處寫 me.xxx ?? me.yyy
   */
  const normalizedDisplayName = useMemo(
    () => (me ? me.display_name ?? me.displayName ?? me.username : ''),
    [me]
  );

  const normalizedStatusCode = useMemo(
    () => (me ? me.uu_sta ?? me.statusCode ?? '' : ''),
    [me]
  );

  const normalizedLastLoginAt = useMemo(
    () => (me ? me.last_login_at ?? me.lastLoginAt ?? null : null),
    [me]
  );

  const normalizedIsActive = useMemo(() => {
    if (!me) return null;
    const v = me.is_active ?? me.isActive;
    return typeof v === 'boolean' ? v : null;
  }, [me]);

  const normalizedTenantNameZh = useMemo(
    () => (me?.tenant_name != null && String(me.tenant_name).trim() !== '' ? String(me.tenant_name).trim() : ''),
    [me],
  );

  const normalizedTenantNameEn = useMemo(
    () => (me?.tenant_name_en != null && String(me.tenant_name_en).trim() !== '' ? String(me.tenant_name_en).trim() : ''),
    [me],
  );

  /** 與 me.plan_code 同步；供頁面只依 hook 判斷方案時使用 */
  const normalizedPlanCode = useMemo(
    () => (me ? me.plan_code ?? me.planCode ?? null : null),
    [me],
  );

  return {
    me,
    view,
    hasToken,

    displayName: normalizedDisplayName,
    statusCode: normalizedStatusCode,
    lastLoginAt: normalizedLastLoginAt,
    isActive: normalizedIsActive,
    tenantNameZh: normalizedTenantNameZh,
    tenantNameEn: normalizedTenantNameEn,
    /** LITE / PLUS / PRO；已合併 planCode／plan_code */
    planCode: normalizedPlanCode,

    logout,
  };
}