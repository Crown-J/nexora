/**
 * File: apps/nx-ui/src/shared/ui/form/FormField.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHARED-FORM-001：Form Field Wrapper（label + control）
 *
 * Notes:
 * - 提供基本資料頁面右側表單共用外觀
 * - children 自行放 input/textarea/select
 */

'use client';

import type { ReactNode } from 'react';

type Props = {
    label: string;
    hint?: string;
    children: ReactNode;
};

export function FormField(props: Props) {
    const { label, hint, children } = props;

    return (
        <div>
            <div className="mb-1 text-xs text-white/65">{label}</div>
            {children}
            {hint ? <div className="mt-1 text-[11px] text-white/35">{hint}</div> : null}
        </div>
    );
}