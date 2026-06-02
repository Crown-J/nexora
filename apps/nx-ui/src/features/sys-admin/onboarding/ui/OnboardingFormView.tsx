// apps/nx-ui/src/features/sys-admin/onboarding/ui/OnboardingFormView.tsx
// v1.2 對齊軌 C：開戶後台表單 UI（伊諾瓦業務用、SYSADMIN 才能進）
//
// 對齊 v1.2 §2.1 開戶後台欄位：
// - 公司基本資料：公司名稱 / 統編 / 公司地址（必填）/ 公司電話 / 公司 LOGO 上傳（必填）
// - 負責人帳號：姓名 / Email（登入用）/ 初始密碼（系統可自動產）
// - 主倉設定：主倉名稱 / 主倉地址（預設帶公司地址）
// - 訂閱方案：版本 / 訂閱期間 / 開通日期

'use client';

import { useEffect, useRef, useState } from 'react';

import { createOnboarding, uploadOnboardingLogo, logoStorageKeyToUrl } from '../api';
import type { CreateOnboardingPayload, OnboardingResponse } from '../types';

const PLAN_OPTIONS = [
  { value: 'LITE', label: 'LITE（基礎版）', desc: '進貨 / 銷貨 / 庫存 / 財務 / 報表' },
  { value: 'PLUS', label: 'PLUS（進階版）', desc: 'LITE + 人資 / 物流 / 知識中心' },
  { value: 'PRO', label: 'PRO（完整版）', desc: 'PLUS + 員工激勵 / 高階分析' },
] as const;

export function OnboardingFormView() {
  // 公司資料
  const [companyName, setCompanyName] = useState('');
  const [companyNameEn, setCompanyNameEn] = useState('');
  const [taxId, setTaxId] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  // LOGO 上傳軌：選檔即傳、回 storage_key、predicate preview 用 ObjectURL
  const [logoStorageKey, setLogoStorageKey] = useState<string>('');
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string>(''); // blob: URL
  const [logoFilename, setLogoFilename] = useState<string>('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoErr, setLogoErr] = useState<string>('');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [planCode, setPlanCode] = useState<'LITE' | 'PLUS' | 'PRO'>('LITE');
  // Phase 6.3：tenantCode 移除（系統自動產 TW/ZT-{6digits}）、加 isTest 旗標
  const [isTest, setIsTest] = useState(false);
  // 負責人
  const [ownerName, setOwnerName] = useState('');
  // 員工編號制改造（2026-06-02）：登入帳號 = 員工編號（自由輸入、租戶內唯一）
  const [ownerEmployeeAccount, setOwnerEmployeeAccount] = useState('');
  // 聯絡信箱（寄信用、非登入帳號）
  const [ownerEmail, setOwnerEmail] = useState('');
  const [initialPassword, setInitialPassword] = useState('');
  // 主倉
  const [mainWarehouseName, setMainWarehouseName] = useState('');

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<OnboardingResponse | null>(null);

  const reset = () => {
    setCompanyName('');
    setCompanyNameEn('');
    setTaxId('');
    setAddress('');
    setPhone('');
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoStorageKey('');
    setLogoPreviewUrl('');
    setLogoFilename('');
    setLogoErr('');
    if (logoInputRef.current) logoInputRef.current.value = '';
    setPlanCode('LITE');
    setIsTest(false);
    setOwnerName('');
    setOwnerEmployeeAccount('');
    setOwnerEmail('');
    setInitialPassword('');
    setMainWarehouseName('');
    setResult(null);
    setErr(null);
  };

  // 釋放 ObjectURL（避免記憶體洩漏）
  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);

  async function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLogoErr('');
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setLogoErr('LOGO 限圖檔（PNG/JPEG/GIF/WebP）');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setLogoErr('檔案太大（上限 10 MB）');
      return;
    }
    // local preview（即時、不等上傳）
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoPreviewUrl(URL.createObjectURL(file));
    setLogoFilename(file.name);
    setLogoUploading(true);
    try {
      const resp = await uploadOnboardingLogo(file);
      setLogoStorageKey(resp.storageKey);
    } catch (e) {
      setLogoErr(e instanceof Error ? e.message : '上傳失敗');
      setLogoStorageKey('');
    } finally {
      setLogoUploading(false);
    }
  }

  function clearLogo() {
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoStorageKey('');
    setLogoPreviewUrl('');
    setLogoFilename('');
    setLogoErr('');
    if (logoInputRef.current) logoInputRef.current.value = '';
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim() || !taxId.trim() || !address.trim()) {
      setErr('公司名稱 / 統編 / 地址 必填');
      return;
    }
    if (logoUploading) {
      setErr('LOGO 仍在上傳中、請稍候');
      return;
    }
    if (!ownerName.trim() || !ownerEmployeeAccount.trim() || !ownerEmail.trim()) {
      setErr('負責人姓名 / 員工編號 / 聯絡信箱 必填');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const payload: CreateOnboardingPayload = {
        companyName: companyName.trim(),
        companyNameEn: companyNameEn.trim() || undefined,
        taxId: taxId.trim(),
        address: address.trim(),
        phone: phone.trim() || undefined,
        logoStorageKey: logoStorageKey || undefined,
        planCode,
        isTest: isTest || undefined,
        ownerName: ownerName.trim(),
        ownerEmployeeAccount: ownerEmployeeAccount.trim(),
        ownerEmail: ownerEmail.trim(),
        initialPassword: initialPassword.trim() || undefined,
        mainWarehouseName: mainWarehouseName.trim() || undefined,
      };
      const resp = await createOnboarding(payload);
      setResult(resp);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '開戶失敗');
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="w-full min-w-0 space-y-6 p-6">
        <header className="space-y-1">
          <p className="text-xs tracking-[0.35em] text-muted-foreground">SYS-ADMIN · ONBOARDING</p>
          <h1 className="text-2xl font-semibold tracking-tight text-emerald-700">✅ 開戶成功</h1>
        </header>
        <section className="rounded-lg border border-emerald-300 bg-emerald-50 p-6 space-y-3">
          <h2 className="text-lg font-semibold text-emerald-900">租戶建立完成</h2>
          <dl className="grid gap-2 md:grid-cols-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">租戶 ID</dt>
              <dd className="font-mono">{result.tenantId}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">租戶代碼</dt>
              <dd className="font-mono">{result.tenantCode}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">負責人 User ID（內碼）</dt>
              <dd className="font-mono">{result.ownerUserId}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">員工編號（登入帳號）</dt>
              <dd className="font-mono">{result.ownerEmployeeAccount}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">聯絡信箱（寄信用、非登入）</dt>
              <dd className="font-mono">{result.ownerEmail}</dd>
            </div>
            <div className="md:col-span-2">
              <dt className="text-xs text-muted-foreground">初始密碼 ⚠️ 請告知客戶</dt>
              <dd className="rounded bg-amber-100 px-3 py-2 font-mono text-amber-900">
                {result.initialPassword}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">主倉 ID</dt>
              <dd className="font-mono">{result.mainWarehouseId}</dd>
            </div>
          </dl>
          <div className="rounded border bg-background p-3 text-xs text-muted-foreground">
            {result.message}
          </div>
        </section>
        <div className="flex gap-2">
          <button onClick={reset} className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground">
            開下一個新客戶
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-6 p-6">
      <header className="space-y-1">
        <p className="text-xs tracking-[0.35em] text-muted-foreground">SYS-ADMIN · ONBOARDING</p>
        <h1 className="text-2xl font-semibold tracking-tight">開戶後台</h1>
        <p className="text-sm text-muted-foreground">
          伊諾瓦業務簽完約、在這建新客戶租戶。送出後系統自動建好租戶 / 負責人 / 主倉、
          並寄通知 Email（測試環境 console.log 記）。
        </p>
      </header>

      <form onSubmit={submit} className="space-y-6">
        <section className="rounded border p-4 space-y-3">
          <h2 className="text-sm font-semibold">📋 公司基本資料</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm md:col-span-2">
              <span className="block mb-1">🟢 公司名稱 *</span>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="例：先鋒企業有限公司"
                className="w-full rounded border bg-background px-2 py-1"
                required
              />
            </label>
            <label className="text-sm">
              <span className="block mb-1">⚪ 英文名稱（選填）</span>
              <input
                value={companyNameEn}
                onChange={(e) => setCompanyNameEn(e.target.value)}
                placeholder="例：Pioneer Enterprise Co., Ltd."
                className="w-full rounded border bg-background px-2 py-1"
              />
            </label>
            <label className="text-sm">
              <span className="block mb-1">🟢 統一編號 *</span>
              <input
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="8 碼數字"
                className="w-full rounded border bg-background px-2 py-1 font-mono"
                required
              />
            </label>
            <label className="text-sm md:col-span-2">
              <span className="block mb-1">🟢 公司地址 *（寄帳單用）</span>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="台北市信義區..."
                className="w-full rounded border bg-background px-2 py-1"
                required
              />
            </label>
            <label className="text-sm">
              <span className="block mb-1">⚪ 公司電話</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="02-2345-6789"
                className="w-full rounded border bg-background px-2 py-1"
              />
            </label>
            <label className="text-sm">
              <span className="block mb-1">⚪ 公司 LOGO（選填、之後可在設定補）</span>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                onChange={onLogoChange}
                disabled={logoUploading}
                className="w-full text-xs file:mr-2 file:rounded file:border file:border-border file:bg-background file:px-3 file:py-1 file:text-sm hover:file:bg-muted/30"
              />
              {logoUploading ? (
                <p className="mt-1 text-[10px] text-muted-foreground">⏳ 上傳中…</p>
              ) : null}
              {logoErr ? (
                <p className="mt-1 text-[10px] text-destructive">⚠ {logoErr}</p>
              ) : null}
              {logoStorageKey && !logoUploading ? (
                <div className="mt-2 flex items-start gap-3">
                  {logoPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoPreviewUrl} alt="LOGO preview" className="h-12 w-auto rounded border border-border bg-background object-contain" />
                  ) : null}
                  <div className="flex-1 text-[10px] text-muted-foreground">
                    <p>✅ 已上傳：{logoFilename}</p>
                    <button
                      type="button"
                      onClick={clearLogo}
                      className="mt-1 text-[10px] underline hover:text-foreground"
                    >
                      重選 / 移除
                    </button>
                  </div>
                </div>
              ) : null}
            </label>
            <label className="text-sm md:col-span-2 flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                checked={isTest}
                onChange={(e) => setIsTest(e.target.checked)}
                className="size-4"
              />
              <span>
                這是 <strong>測試租戶</strong>（勾選後租戶代碼用 <code className="font-mono">ZT-</code> 前綴、不勾為正式客戶 <code className="font-mono">TW-</code>）
              </span>
            </label>
            <p className="md:col-span-2 text-[10px] text-muted-foreground">
              ⚠️ 租戶代碼由系統自動產（6 位流水、純遞增）、無法手填、避免人工命名衝突
            </p>
          </div>
        </section>

        <section className="rounded border p-4 space-y-3">
          <h2 className="text-sm font-semibold">🎟️ 訂閱方案</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {PLAN_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`cursor-pointer rounded-lg border p-4 transition ${
                  planCode === opt.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'
                }`}
              >
                <input
                  type="radio"
                  name="planCode"
                  value={opt.value}
                  checked={planCode === opt.value}
                  onChange={() => setPlanCode(opt.value)}
                  className="mr-2"
                />
                <span className="font-semibold">{opt.label}</span>
                <p className="mt-1 text-xs text-muted-foreground">{opt.desc}</p>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded border p-4 space-y-3">
          <h2 className="text-sm font-semibold">👤 負責人帳號</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              <span className="block mb-1">🟢 姓名 *</span>
              <input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="例：王經理"
                className="w-full rounded border bg-background px-2 py-1"
                required
              />
            </label>
            <label className="text-sm">
              <span className="block mb-1">🟢 員工編號 *（登入帳號、租戶內唯一）</span>
              <input
                value={ownerEmployeeAccount}
                onChange={(e) => setOwnerEmployeeAccount(e.target.value)}
                placeholder="例：Y0053、001、wang（自由填、沿用舊系統習慣）"
                className="w-full rounded border bg-background px-2 py-1 font-mono"
                required
                maxLength={50}
              />
            </label>
            <label className="text-sm md:col-span-2">
              <span className="block mb-1">🟢 聯絡信箱 *（寄信用、非登入帳號）</span>
              <input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="owner@company.com"
                className="w-full rounded border bg-background px-2 py-1"
                required
              />
            </label>
            <label className="text-sm md:col-span-2">
              <span className="block mb-1">⚪ 初始密碼（留空自動產 10 字元）</span>
              <input
                value={initialPassword}
                onChange={(e) => setInitialPassword(e.target.value)}
                placeholder="留空自動產"
                className="w-full rounded border bg-background px-2 py-1 font-mono"
              />
            </label>
          </div>
          <p className="text-[10px] text-muted-foreground">
            ⚠️ 客戶首次登入會強制改密碼（must_change_password=true）
          </p>
        </section>

        <section className="rounded border p-4 space-y-3">
          <h2 className="text-sm font-semibold">🏭 主倉設定</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              <span className="block mb-1">⚪ 主倉名稱（預設「主倉」）</span>
              <input
                value={mainWarehouseName}
                onChange={(e) => setMainWarehouseName(e.target.value)}
                placeholder="主倉"
                className="w-full rounded border bg-background px-2 py-1"
              />
            </label>
          </div>
          <p className="text-[10px] text-muted-foreground">
            主倉地址自動帶公司地址。客戶可登入後再到「主檔→倉庫」改。
          </p>
        </section>

        {err ? (
          <div className="rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">{err}</div>
        ) : null}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? '開通中…' : '✅ 開通'}
          </button>
        </div>
      </form>
    </div>
  );
}
