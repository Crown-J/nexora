/**
 * File: apps/nx-ui/src/features/nx00/warehouse/ui/WarehouseFormPanel.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-WAREHOUSE-FORM-001：Warehouse Form Panel（LITE：單筆設定）
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CreateWarehouseBody, UpdateWarehouseBody, WarehouseDto } from '@/features/nx00/warehouse/types';
import { FormField } from '@/shared/ui/form/FormField';
import { ReadOnlyBox } from '@/shared/ui/form/ReadOnlyBox';
import { AuditGrid } from '@/shared/ui/audit/AuditGrid';
import { FormPanelShell } from '@/shared/ui/listform/FormPanelShell';

type Props = {
    mode: 'empty' | 'new' | 'edit';
    detail: WarehouseDto | null;
    loading: boolean;
    error: string | null;

    saving: boolean;
    saveError: string | null;

    canEdit: boolean;

    onCreate: (body: CreateWarehouseBody) => void | Promise<void>;
    onUpdate: (body: UpdateWarehouseBody) => void | Promise<void>;
};

type FormState = {
    code: string;
    name: string;
    remark: string;
    sortNo: number;
    isActive: boolean;
};

function toFormState(d: WarehouseDto | null): FormState {
    return {
        code: d?.code ?? '',
        name: d?.name ?? '',
        remark: d?.remark ?? '',
        sortNo: Number.isFinite(d?.sortNo) ? (d!.sortNo as number) : 0,
        isActive: d?.isActive ?? true,
    };
}

function pickAuditText(detail: WarehouseDto, which: 'created' | 'updated'): string {
    if (which === 'created') return String(detail.createdByName ?? detail.createdBy ?? '-');
    return String(detail.updatedByName ?? detail.updatedBy ?? '-');
}

export function WarehouseFormPanel(props: Props) {
    const { mode, detail, loading, error, saving, saveError, canEdit, onCreate, onUpdate } = props;

    const isEmpty = mode === 'empty';
    const isNew = mode === 'new';
    const isEdit = mode === 'edit';

    const [editing, setEditing] = useState(false);

    useEffect(() => {
        setEditing(false);
    }, [mode, detail?.id]);

    const [form, setForm] = useState<FormState>(() => toFormState(detail));

    useEffect(() => {
        if (isEdit) setForm(toFormState(detail));
        if (isNew) setForm({ code: '', name: '', remark: '', sortNo: 0, isActive: true });
    }, [isEdit, isNew, detail]);

    const readOnly = useMemo(() => {
        if (isNew) return false;
        if (!isEdit) return true;
        return !editing;
    }, [isNew, isEdit, editing]);

    const headerTitle = useMemo(() => {
        if (isEmpty) return '倉庫設定載入失敗或尚未準備好。';
        if (isNew) return '初始化倉庫（LITE：僅允許一個倉庫）';
        if (isEdit) return `倉庫：${detail?.code ?? '-'} ${detail?.name ?? ''}`.trim();
        return '';
    }, [isEmpty, isNew, isEdit, detail?.code, detail?.name]);

    const inputClass =
        'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20';
    const inputReadOnlyClass = readOnly ? 'cursor-text select-text' : '';

    const submit = async () => {
        const code = form.code.trim();
        const name = form.name.trim();
        if (!code || !name) return;

        const payload = {
            code,
            name,
            remark: form.remark.trim() ? form.remark.trim() : null,
            sortNo: Number.isFinite(form.sortNo) ? Number(form.sortNo) : 0,
            isActive: form.isActive,
        };

        if (isNew) {
            await onCreate(payload);
            return;
        }

        if (isEdit) {
            await onUpdate(payload);
            setEditing(false);
        }
    };

    return (
        <FormPanelShell
            mode={mode}
            title={headerTitle}
            emptyHint="倉庫設定尚未初始化，或 API 發生錯誤。"
            loading={loading}
            error={error}
            saving={saving}
            saveError={saveError}
            canEdit={canEdit}
            editing={editing}
            onClose={undefined} // 單筆頁：不需要 close
            onEdit={() => setEditing(true)}
            onCancel={() => {
                setForm(toFormState(detail));
                setEditing(false);
            }}
            onSave={submit}
        >
            <div className="grid grid-cols-2 gap-3">
                <FormField label="倉庫代碼（code）" hint={readOnly ? '（檢視模式：可複製，按「編輯」才能修改）' : undefined}>
                    <input
                        className={`${inputClass} ${inputReadOnlyClass}`}
                        value={form.code}
                        readOnly={readOnly}
                        onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                        placeholder={readOnly ? '' : '例如：Z01'}
                    />
                </FormField>

                <FormField label="排序（sortNo）">
                    {readOnly ? (
                        <ReadOnlyBox value={String(form.sortNo)} />
                    ) : (
                        <input
                            className={`${inputClass}`}
                            type="number"
                            value={String(form.sortNo)}
                            onChange={(e) => setForm((p) => ({ ...p, sortNo: Number(e.target.value || 0) }))}
                        />
                    )}
                </FormField>
            </div>

            <FormField label="倉庫名稱（name）">
                <input
                    className={`${inputClass} ${inputReadOnlyClass}`}
                    value={form.name}
                    readOnly={readOnly}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
            </FormField>

            <FormField label="備註（remark）">
                <textarea
                    className={[
                        'w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20',
                        readOnly ? 'cursor-text select-text' : '',
                    ].join(' ')}
                    rows={3}
                    value={form.remark}
                    readOnly={readOnly}
                    onChange={(e) => setForm((p) => ({ ...p, remark: e.target.value }))}
                />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
                <FormField label="啟用（isActive）">
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

                <FormField label="（LITE 說明）">
                    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/40">
                        LITE 僅允許 1 個倉庫；升級 Plus 後才提供多倉主檔清單。
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