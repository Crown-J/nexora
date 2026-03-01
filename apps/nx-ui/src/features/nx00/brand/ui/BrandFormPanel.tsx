/**
 * File: apps/nx-ui/src/features/nx00/brand/ui/BrandFormPanel.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-BRAND-FORM-001：Brand Form Panel（右側 form）
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import type { BrandDto, CreateBrandBody, UpdateBrandBody } from '@/features/nx00/brand/types';
import { FormField } from '@/shared/ui/form/FormField';
import { ReadOnlyBox } from '@/shared/ui/form/ReadOnlyBox';
import { AuditGrid } from '@/shared/ui/audit/AuditGrid';
import { FormPanelShell } from '@/shared/ui/listform/FormPanelShell';

type Props = {
    mode: 'empty' | 'new' | 'edit';
    detail: BrandDto | null;
    loading: boolean;
    error: string | null;

    saving: boolean;
    saveError: string | null;

    canEdit: boolean;

    onClose: () => void;
    onCreate: (body: CreateBrandBody) => void | Promise<void>;
    onUpdate: (id: string, body: UpdateBrandBody) => void | Promise<void>;
};

type FormState = {
    code: string;
    name: string;
    originCountry: string;
    remark: string;
    sortNo: number;
    isActive: boolean;
};

function toFormState(d: BrandDto | null): FormState {
    return {
        code: d?.code ?? '',
        name: d?.name ?? '',
        originCountry: d?.originCountry ?? '',
        remark: d?.remark ?? '',
        sortNo: typeof d?.sortNo === 'number' ? d.sortNo : 0,
        isActive: d?.isActive ?? true,
    };
}

function pickAuditText(detail: BrandDto, which: 'created' | 'updated'): string {
    if (which === 'created') return String(detail.createdByName ?? detail.createdBy ?? '-');
    return String(detail.updatedByName ?? detail.updatedBy ?? '-');
}

export function BrandFormPanel(props: Props) {
    const { mode, detail, loading, error, saving, saveError, canEdit, onClose, onCreate, onUpdate } = props;

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
        if (isNew) setForm({ code: '', name: '', originCountry: '', remark: '', sortNo: 0, isActive: true });
    }, [isEdit, isNew, detail]);

    const readOnly = useMemo(() => {
        if (isNew) return false;
        if (!isEdit) return true;
        return !editing;
    }, [isNew, isEdit, editing]);

    const headerTitle = useMemo(() => {
        if (isEmpty) return '請先從左側選擇品牌，或按「新增」建立新品牌。';
        if (isNew) return '新增品牌';
        if (isEdit) return `品牌：${detail?.code ?? '-'} ${detail?.name ?? ''}`.trim();
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
            originCountry: form.originCountry.trim() ? form.originCountry.trim() : null,
            remark: form.remark.trim() ? form.remark.trim() : null,
            sortNo: Number.isFinite(Number(form.sortNo)) ? Number(form.sortNo) : 0,
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
            emptyHint="這裡會顯示品牌資料（檢視/編輯）。"
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
            <FormField label="品牌代碼（code）" hint={readOnly ? '（檢視模式：可複製，按「編輯」才能修改）' : undefined}>
                <input
                    className={`${inputClass} ${inputReadOnlyClass}`}
                    value={form.code}
                    readOnly={readOnly}
                    onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                />
            </FormField>

            <FormField label="品牌名稱（name）">
                <input
                    className={`${inputClass} ${inputReadOnlyClass}`}
                    value={form.name}
                    readOnly={readOnly}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
                <FormField label="產地/國家（originCountry）">
                    <input
                        className={`${inputClass} ${inputReadOnlyClass}`}
                        value={form.originCountry}
                        readOnly={readOnly}
                        onChange={(e) => setForm((p) => ({ ...p, originCountry: e.target.value }))}
                    />
                </FormField>

                <FormField label="排序（sortNo）">
                    {readOnly ? (
                        <ReadOnlyBox value={String(form.sortNo)} />
                    ) : (
                        <input
                            className={inputClass}
                            type="number"
                            value={String(form.sortNo)}
                            onChange={(e) => setForm((p) => ({ ...p, sortNo: Number(e.target.value) }))}
                        />
                    )}
                </FormField>
            </div>

            <FormField label="備註（remark）">
                <textarea
                    className={[
                        'w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20',
                        readOnly ? 'cursor-text select-text' : '',
                    ].join(' ')}
                    rows={4}
                    value={form.remark}
                    readOnly={readOnly}
                    onChange={(e) => setForm((p) => ({ ...p, remark: e.target.value }))}
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
                        之後可放 statusCode / 其他擴充欄位
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