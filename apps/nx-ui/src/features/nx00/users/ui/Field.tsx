/**
 * File: apps/nx-ui/src/features/nx00/users/ui/Field.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-USERS-UI-001：Users 共用欄位容器（Create/Edit 可共用）
 *
 * Notes:
 * - 純 UI 元件（無業務邏輯）
 * - 統一 label 樣式 + 間距
 */

'use client';

import type { ReactNode } from 'react';

type Props = {
  label: string;
  children: ReactNode;
  required?: boolean;
  hint?: string;
};

/**
 * @COMPONENT_CODE nxui_nx00_users_field_001
 * 說明：
 * - Field：統一 label 樣式 + 間距
 * - 支援：
 *   - required 標示
 *   - hint 次要說明文字
 * - 避免 Create/Edit 各自維護一份 Field
 */
export function Field({ label, children, required = false, hint }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs tracking-wider text-white/55">
          {label.toUpperCase()}
          {required ? <span className="ml-1 text-[#39ff14]">*</span> : null}
        </div>

        {hint ? <div className="text-[10px] text-white/35">{hint}</div> : null}
      </div>

      {children}
    </div>
  );
}