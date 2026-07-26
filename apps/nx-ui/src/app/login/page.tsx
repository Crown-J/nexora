/**
 * File: apps/nx-ui/src/app/login/page.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 登入頁邏輯+資料層（container）
 * - 拆分試點：畫面層在 @design/login/LoginPageView、Hana 可單檔替換不影響本層
 *
 * 業務規則（本層處理）：
 * - 欄位 normalize（trim companyAccount / userAccount）
 * - 表單 validate（3 欄必填、錯誤碼 AU-301/302/303）
 * - 呼叫 callLoginApi（含 demo 短路）+ setToken
 * - 成功動畫：fade-out + 星球 flyToCenter → router.replace → flyTo('topbar')
 * - 錯誤統一走 NexoraClientError（AU-999 fallback）
 *
 * ⚠️ 未實作（接口已預留 slot、邏輯本層 noop）：
 * - 記住我（rememberMe）：UI 有勾選框、本層丟棄 fields.rememberMe
 * - 忘記密碼（onForgotPassword）：UI 有連結、本層 noop
 * - 連錯 5 次鎖 5 分鐘：後端可能有、本層無對應狀態
 * - 首登強制改密：login response 無 mustChangePassword flag、本層直接 router.replace('/work')
 *   （2026-07-26 新版面封存軌：登入落地改新殼 /work、舊 /dashboard 由 middleware 軟封存）
 * - 2FA TOTP：login response 無 twoFactorRequired flag
 * - 停用攔截：後端可能有、本層僅顯示後端錯誤訊息
 */

'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { callLoginApi } from '@data/endpoints/auth/api/login';
import { isNexoraDemoMode } from '@data/auth/run-mode';
import { setToken } from '@data/auth/token';
import { LoginPageView, type LoginFields } from '@design/login/LoginPageView';
import { getVersionParts } from '@data/config/version';
import { toNexoraClientError, type NexoraClientError } from '@data/errors/nexora-error';

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

function normalizeFields(fields: LoginFields): LoginFields {
  return {
    companyAccount: fields.companyAccount.trim(),
    userAccount: fields.userAccount.trim(),
    password: fields.password,
    rememberMe: fields.rememberMe,
  };
}

function validateLoginForm(fields: LoginFields): NexoraClientError | null {
  if (!fields.companyAccount.trim()) return { errorCode: 'AU-301', message: '請輸入公司帳號。' };
  if (!fields.userAccount.trim()) return { errorCode: 'AU-302', message: '請輸入員工編號。' };
  if (!fields.password) return { errorCode: 'AU-303', message: '請輸入密碼。' };
  return null;
}

export default function LoginPage() {
  const router = useRouter();
  const [view, setView] = useState<LoginViewState>({ isSubmitting: false, errorMsg: null });
  const [isLeaving, setIsLeaving] = useState(false);

  async function handleSubmit(e: FormEvent, rawFields: LoginFields) {
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
      const result = await callLoginApi({
        account: normalized.userAccount,
        password: normalized.password,
        tenantCode: normalized.companyAccount,
      });

      if (!result?.token) {
        throw new Error(JSON.stringify({
          errorCode: 'AU-501',
          message: '登入流程異常，請重試或聯繫管理員。',
        }));
      }
      setToken(result.token);
      // 2026-06-27 大改版：移除星球飛行轉場（太空風封存）、改單純淡出 + 轉址
      setIsLeaving(true);
      router.replace('/work');
      return;
    } catch (e: unknown) {
      setView((prev) => ({ ...prev, errorMsg: getError(e) }));
    } finally {
      setView((prev) => ({ ...prev, isSubmitting: false }));
    }
  }

  function handleForgotPassword() {
    // ⚠️ 未實作、預留 slot
  }

  return (
    <LoginPageView
      errorMsg={view.errorMsg}
      isSubmitting={view.isSubmitting}
      isLeaving={isLeaving}
      isDemoMode={isNexoraDemoMode()}
      versionInfo={getVersionParts()}
      onSubmit={handleSubmit}
      onForgotPassword={handleForgotPassword}
    />
  );
}
