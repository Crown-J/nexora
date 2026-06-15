// apps/nx-ui/src/features/base/users/CreateUserDialog.tsx
/**
 * NEXORA 新增使用者對話框（Stage 1-B.6）
 *
 * 設計：
 * - Modal dialog，避開「進入編輯模式」的 mode 切換邏輯
 * - 5 個欄位：帳號 / 姓名（必填）+ 啟用狀態 / 信箱 / 電話（選填）
 * - 密碼一律使用預設密碼建立（DEFAULT_PASSWORD），使用者首次登入再修改
 * - 前端基本驗證：trim 後不能為空（必填欄位）
 * - 鋼鐵風樣式對齊 ConfirmDialog
 * - ESC / backdrop 關閉（提交中時禁用）
 * - 提交中：禁用按鈕 + 顯示「建立中…」
 *
 * 成功流程：
 * - 呼叫 createUser API → onSuccess(dto) callback → 父層 reload list + 顯示 success toast
 * - 失敗 → 顯示錯誤訊息於 dialog 底部，不關閉
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import { UserPlus, AlertCircle, KeyRound } from 'lucide-react';
import { createUser, type UserDto } from '@data/endpoints/base/api/user';
import { FormInput, FormSelect } from '@/features/master-shell/ui/FormField';
import { cn } from '@/lib/utils';

/**
 * 預設密碼：所有新建使用者一律以此建立，首次登入時系統會強制要求修改。
 * ⚠️ 與精靈 `features/wizard/constants.ts` + 後端 `employee-defaults.ts`
 *    同名常數保持同步、Email 通知功能上線後三處一起拿掉改隨機產生。
 */
const DEFAULT_PASSWORD = 'changeme';

type FormState = {
  username: string;
  displayName: string;
  email: string;
  phone: string;
  isActive: boolean;
};

const INITIAL_FORM: FormState = {
  username: '',
  displayName: '',
  email: '',
  phone: '',
  isActive: true,
};

export function CreateUserDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (created: UserDto) => void;
}) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // 開啟時 reset form + 自動 focus
  useEffect(() => {
    if (open) {
      setForm(INITIAL_FORM);
      setError(null);
      // 等 DOM render 完
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [open]);

  // ESC 關閉（提交中禁用）
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setError(null);
    // W4 [風險① 補] 員工編號（= 登入帳號）改 optional：留空 → 後端自動產 Y+4 碼
    const username = form.username.trim();
    const displayName = form.displayName.trim();
    if (!displayName) {
      setError('請填寫姓名');
      return;
    }
    setSubmitting(true);
    try {
      const created = await createUser({
        // username 為空時不傳、後端 SeqCounterService 自動產 Y0001
        ...(username ? { username } : {}),
        password: DEFAULT_PASSWORD,
        displayName,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        isActive: form.isActive,
      });
      onSuccess(created);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '建立失敗';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-[#2A2A30] bg-[#131316] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-[#2A2A30] px-5 py-3">
          <span className="size-2 rounded-full bg-[#E8A020] shadow-[0_0_10px_#E8A020]" />
          <UserPlus className="size-4 text-[#E8A020]" />
          <h2 className="text-sm font-bold tracking-wide text-[#F0F0F3]">新增使用者</h2>
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.28em] text-[#5A5A60]">
            Create User
          </span>
        </div>

        {/* Form */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 px-5 pb-1 pt-5 sm:grid-cols-2">
          <OptionalEmployeeNoInput
            value={form.username}
            onChange={(v) => update('username', v)}
            inputRef={firstInputRef}
          />
          <RequiredInput
            label="姓名"
            value={form.displayName}
            onChange={(v) => update('displayName', v)}
            placeholder="顯示用姓名"
          />
          <FormSelect
            label="啟用狀態"
            value={form.isActive ? '啟用' : '未啟用'}
            options={['啟用', '未啟用']}
            onChange={(v) => update('isActive', v === '啟用')}
          />
          <div className="hidden sm:block" aria-hidden />
          <FormInput
            label="信箱"
            value={form.email}
            onChange={(v) => update('email', v)}
            placeholder="可留空"
          />
          <FormInput
            label="電話"
            value={form.phone}
            onChange={(v) => update('phone', v)}
            placeholder="可留空"
          />
        </div>

        {/* 預設密碼 hint */}
        <div className="mx-5 mt-4 flex items-start gap-2 rounded-md border border-[#E8A020]/30 bg-[#E8A020]/8 px-3 py-2 text-xs text-[#E8A020]">
          <KeyRound className="mt-0.5 size-3.5 shrink-0" />
          <span className="min-w-0 flex-1 leading-relaxed">
            初始密碼：
            <span className="mx-1 rounded bg-[#0A0A0C] px-1.5 py-0.5 font-mono tabular-nums">
              {DEFAULT_PASSWORD}
            </span>
            ，使用者首次登入時系統會要求修改。
          </span>
        </div>

        {/* Error */}
        {error ? (
          <div className="mx-5 mb-3 flex items-start gap-2 rounded-md border border-[#5A2A2A] bg-[#1F1212] px-3 py-2 text-xs text-[#E26060]">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            <span className="min-w-0 flex-1">{error}</span>
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex items-center justify-between border-t border-[#2A2A30] bg-[#0A0A0C]/40 px-5 py-3">
          <span className="text-[10px] text-[#5A5A60]">ESC 取消</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className={cn(
                'inline-flex h-8 items-center rounded-md border border-[#2A2A30] bg-[#1A1A1F] px-3 text-xs font-medium text-[#B8B8C0] transition-colors',
                submitting
                  ? 'cursor-not-allowed opacity-50'
                  : 'hover:border-[#3A3A42] hover:bg-[#22222A] hover:text-[#E8E8EB]',
              )}
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-md border border-[#E8A020]/40 bg-[#E8A020]/15 px-3 text-xs font-medium text-[#E8A020] transition-colors',
                submitting ? 'cursor-not-allowed opacity-70' : 'hover:bg-[#E8A020]/25',
              )}
            >
              {submitting ? '建立中…' : '建立'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RequiredInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  inputRef,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  type?: 'text' | 'password';
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B8B8C0]">
        {label}
        <span className="ml-1 text-[#E26060]">*</span>
      </span>
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-md border border-[#E8A020]/30 bg-[#0A0A0C] px-2.5 py-1.5 text-sm text-[#E8E8EB] outline-none transition-colors placeholder:text-[#5A5A60] focus:border-[#E8A020]/60 focus:bg-[#0A0A0C] focus:ring-1 focus:ring-[#E8A020]/40"
      />
    </div>
  );
}

/** W4 [風險① 補] 員工編號 input：optional + placeholder 提示自動產號 */
function OptionalEmployeeNoInput({
  value,
  onChange,
  inputRef,
}: {
  value: string;
  onChange: (next: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B8B8C0]">
        員工編號
        <span className="ml-1 text-[10px] font-normal text-[#5A5A60]">（可留空、系統自動產 Y+4 碼）</span>
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="留空自動產 Y0001（也可手動填、例 Y0042 / admin）"
        className="rounded-md border border-[#E8A020]/30 bg-[#0A0A0C] px-2.5 py-1.5 text-sm text-[#E8E8EB] outline-none transition-colors placeholder:text-[#5A5A60] focus:border-[#E8A020]/60 focus:bg-[#0A0A0C] focus:ring-1 focus:ring-[#E8A020]/40"
      />
    </div>
  );
}
