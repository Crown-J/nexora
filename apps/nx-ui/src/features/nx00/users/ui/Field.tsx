/**
 * File: apps/nx-ui/src/features/nx00/users/ui/Field.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USERS-UI-001：Users 共用欄位容器（Create/Edit 可共用）
 */

'use client';

import React from 'react';

type Props = { label: string; children: React.ReactNode };

/**
 * @FUNCTION_CODE NX00-UI-NX00-USERS-UI-001-F01
 * 說明：
 * - Field：統一 label 樣式 + 間距
 * - 避免 Create/Edit 各自維護一份 Field
 */
export function Field({ label, children }: Props) {
  return (
    <div>
      <div className="mb-2 text-xs tracking-wider text-white/55">{label.toUpperCase()}</div>
      {children}
    </div>
  );
}