/**
 * File: apps/nx-ui/src/features/nx00/part/ui/PartFormPanel.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-PART-FORM-001：Part Form Panel（右側 form）
 *
 * Notes:
 * - brandId：下拉顯示 code + name，實際送出仍為 id
 * - lookup 來源：features/nx00/lookup/hooks/useBrandLookup.ts
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CreatePartBody, PartDto, UpdatePartBody } from '@/features/nx00/part/types';
import { FormField } from '@/shared/ui/form/FormField';
import { ReadOnlyBox } from '@/shared/ui/form/ReadOnlyBox';
import { AuditGrid } from '@/shared/ui/audit/AuditGrid';
import { FormPanelShell } from '@/shared/ui/listform/FormPanelShell';

import { useBrandLookup } from '@/features/nx00/lookup/hooks/useBrandLookup';

type Props = {
    mode: 'empty' | 'new' | 'edit';
    detail: PartDto | null;
    loading: boolean;
    error: string | null;

    saving: boolean;
    saveError: string | null;

    canEdit: boolean;

    onClose: () => void;
    onCreate: (body: CreatePartBody) => void | Promise<void>;
    onUpdate: (id: string, body: UpdatePartBody) => void | Promise<void>;
};

type FormState = {
    code: string;
    name: string;
    brandId: string; // 存 id
    spec: string;
    uom: string;
    isActive: boolean;
};

function toFormState(d: PartDto | null): FormState {
    return {
        code: d?.code ?? '',
        name: d?.name ?? '',
        brandId: d?.brandId ?? '',
        spec: d?.spec ?? '',
        uom: d?.uom ?? 'pcs',
        isActive: d?.isActive ?? true,
    };
}

function pickAuditText(detail: PartDto, which: 'created' | 'updated'): string {
    if (which === 'created') return String(detail.createdByName ?? detail.createdBy ?? '-');
    return String(detail.updatedByName ?? detail.updatedBy ?? '-');
}

export function PartFormPanel(props: Props) {
    const { mode, detail, loading, error, saving, saveError, canEdit, onClose, onCreate, onUpdate } = props;

    const isEmpty = mode === 'empty';
    const isNew = mode === 'new';
    const isEdit = mode === 'edit';

    // ===== lookup: brands =====
    // 預設：只抓啟用的品牌（你若希望包含停用，改成 useBrandLookup(false) 或在 hook 內調整）
    const brandLookup = useBrandLookup(true);

    // 檢視/編輯切換（只在 edit mode 有意義）
    const [editing, setEditing] = useState(false);

    useEffect(() => {
        setEditing(false);
    }, [mode, detail?.id]);

    const [form, setForm] = useState<FormState>(() => toFormState(detail));

    useEffect(() => {
        if (isEdit) setForm(toFormState(detail));
        if (isNew) setForm({ code: '', name: '', brandId: '', spec: '', uom: 'pcs', isActive: true });
    }, [isEdit, isNew, detail]);

    const readOnly = useMemo(() => {
        if (isNew) return false;
        if (!isEdit) return true;
        return !editing;
    }, [isNew, isEdit, editing]);

    const headerTitle = useMemo(() => {
        if (isEmpty) return '請先從左側選擇零件，或按「新增」建立新零件。';
        if (isNew) return '新增零件';
        if (isEdit) return `零件：${detail?.code ?? '-'} ${detail?.name ?? ''}`.trim();
        return '';
    }, [isEmpty, isNew, isEdit, detail?.code, detail?.name]);

    const inputClass =
        'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20';
    const inputReadOnlyClass = readOnly ? 'cursor-text select-text' : '';

    // readOnly 下：brandId 不顯示 id，而是顯示「code + name」；找不到就顯示 '-'
    const brandText = useMemo(() => {
        if (!form.brandId) return '-';
        const hit = brandLookup.options?.find((o) => o.value === form.brandId);
        return hit?.label ?? '-';
    }, [form.brandId, brandLookup.options]);

    const submit = async () => {
        const code = form.code.trim();
        const name = form.name.trim();
        if (!code || !name) return;

        const payload = {
            code,
            name,
            brandId: form.brandId.trim() ? form.brandId.trim() : null,
            spec: form.spec.trim() ? form.spec.trim() : null,
            uom: form.uom.trim() ? form.uom.trim() : 'pcs',
            isActive: form.isActive,
        };

        if (isNew) {
            await onCreate(payload);
            return;
        }

        if (isEdit && detail) {
            await onUpdate(detail.id, payload);
            setEditing(false);
        }
    };

    return (
        <FormPanelShell
            mode={mode}
            title={headerTitle}
            emptyHint="這裡會顯示零件資料（檢視/編輯）。"
            loading={loading}
            error={error}
            saving={saving}
            saveError={saveError}
            canEdit={canEdit}
            editing={editing}
            onClose={!isEmpty ? onClose : undefined}
            onEdit={() => setEditing(true)}
            onCancel={() => {
                setForm(toFormState(detail));
                setEditing(false);
            }}
            onSave={submit}
        >
            <FormField label="料號（code）" hint={readOnly ? '（檢視模式：可複製，按「編輯」才能修改）' : undefined}>
                <input
                    className={`${inputClass} ${inputReadOnlyClass}`}
                    value={form.code}
                    readOnly={readOnly}
                    onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                />
            </FormField>

            <FormField label="品名（name）">
                <input
                    className={`${inputClass} ${inputReadOnlyClass}`}
                    value={form.name}
                    readOnly={readOnly}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
                <FormField
                    label="品牌（brandId）"
                    hint={
                        readOnly
                            ? '（顯示品牌代碼 + 名稱；實際儲存仍為 id）'
                            : brandLookup.error
                                ? `品牌清單載入失敗：${brandLookup.error}`
                                : brandLookup.loading
                                    ? '品牌清單載入中...'
                                    : '下拉顯示：代碼 + 名稱（可用代碼或名稱快速找）'
                    }
                >
                    {readOnly ? (
                        <ReadOnlyBox value={brandText} />
                    ) : (
                        <select
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/20 disabled:opacity-60"
                            value={form.brandId}
                            onChange={(e) => setForm((p) => ({ ...p, brandId: e.target.value }))}
                            disabled={brandLookup.loading}
                        >
                            <option value="">（未指定）</option>
                            {(brandLookup.options ?? []).map((opt) => (
                                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    )}
                </FormField>

                <FormField label="單位（uom）">
                    <input
                        className={`${inputClass} ${inputReadOnlyClass}`}
                        value={form.uom}
                        readOnly={readOnly}
                        onChange={(e) => setForm((p) => ({ ...p, uom: e.target.value }))}
                        placeholder={readOnly ? '' : 'pcs'}
                    />
                </FormField>
            </div>

            <FormField label="規格（spec）">
                <input
                    className={`${inputClass} ${inputReadOnlyClass}`}
                    value={form.spec}
                    readOnly={readOnly}
                    onChange={(e) => setForm((p) => ({ ...p, spec: e.target.value }))}
                />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
                <FormField label="啟用">
                    {readOnly ? (
                        <ReadOnlyBox value={form.isActive ? 'TRUE（啟用）' : 'FALSE（停用）'} />
                    ) : (
                        <select
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/20"
                            value={form.isActive ? 'true' : 'false'}
                            onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.value === 'true' }))}
                        >
                            <option value="true">TRUE（啟用）</option>
                            <option value="false">FALSE（停用）</option>
                        </select>
                    )}
                </FormField>

                <FormField label="（保留）">
                    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/40">
                        之後可放 statusCode / 備註 等欄位
                    </div>
                </FormField>
            </div>

            {isEdit && detail && (
                <AuditGrid
                    createdAt={detail.createdAt}
                    createdByText={pickAuditText(detail, 'created')}
                    updatedAt={detail.updatedAt}
                    updatedByText={pickAuditText(detail, 'updated')}
                />
            )}
        </FormPanelShell>
    );
}