/**
 * File: apps/nx-ui/src/shared/ui/form/ReadOnlyBox.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHARED-FORM-002：ReadOnly Box（可選取/可複製）
 *
 * Notes:
 * - 不使用 disabled，避免禁止游標與複製
 */

'use client';

type Props = {
    value: string;
    className?: string;
};

export function ReadOnlyBox(props: Props) {
    const { value, className } = props;

    return (
        <div
            className={[
                'rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/85 cursor-text select-text',
                className ?? '',
            ].join(' ')}
        >
            {value}
        </div>
    );
}