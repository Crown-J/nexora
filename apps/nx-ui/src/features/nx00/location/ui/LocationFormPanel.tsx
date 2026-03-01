/**
 * File: apps/nx-ui/src/features/nx00/location/ui/LocationFormPanel.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-LOCATION-FORM-001：Location Form Panel（右側 form）
 *
 * Notes:
 * - LITE：warehouseId 由系統固定，不顯示也不允許變更
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CreateLocationBody, LocationDto, UpdateLocationBody } from '@/features/nx00/location/types';
import { FormField } from '@/shared/ui/form/FormField';
import { ReadOnlyBox } from '@/shared/ui/form/ReadOnlyBox';
import { AuditGrid } from '@/shared/ui/audit/AuditGrid';
import { FormPanelShell } from '@/shared/ui/listform/FormPanelShell';

type Props = {
    mode: 'empty' | 'new' | 'edit';
    detail: LocationDto | null;
    loading: boolean;
    error: string | null;

    saving: boolean;
    saveError: string | null;

    canEdit: boolean;

    onClose: () => void;
    onCreate: (body: Omit<CreateLocationBody, 'warehouseId'>) => void | Promise<void>;
    onUpdate: (id: string, body: UpdateLocationBody) => void | Promise<void>;
};

type FormState = {
    code: string;
    name: string;

    zone: string;
    rack: string;
    levelNo: string; // input 用字串，submit 再轉 number|null
    binNo: string;

    remark: string;
    sortNo: string;
    isActive: boolean;
};

function toFormState(d: LocationDto | null): FormState {
    return {
        code: d?.code ?? '',
        name: d?.name ?? '',

        zone: d?.zone ?? '',
        rack: d?.rack ?? '',
        levelNo: d?.levelNo === null || d?.levelNo === undefined ? '' : String(d.levelNo),
        binNo: d?.binNo ?? '',

        remark: d?.remark ?? '',
        sortNo: d?.sortNo === null || d?.sortNo === undefined ? '0' : String(d.sortNo),
        isActive: d?.isActive ?? true,
    };
}

function pickAuditText(detail: LocationDto, which: 'created' | 'updated'): string {
    if (which === 'created') return String(detail.createdByName ?? detail.createdBy ?? '-');
    return String(detail.updatedByName ?? detail.updatedBy ?? '-');
}

function toIntOrNull(v: string) {
    const s = v.trim();
    if (!s) return null;
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    return Math.trunc(n);
}

function toIntOrDefault(v: string, dft = 0) {
    const s = v.trim();
    if (!s) return dft;
    const n = Number(s);
    return Number.isFinite(n) ? Math.trunc(n) : dft;
}

export function LocationFormPanel(props: Props) {
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
        if (isNew) setForm(toFormState(null));
    }, [isEdit, isNew, detail]);

    const readOnly = useMemo(() => {
        if (isNew) return false;
        if (!isEdit) return true;
        return !editing;
    }, [isNew, isEdit, editing]);

    const headerTitle = useMemo(() => {
        if (isEmpty) return '請先從左側選擇庫位，或按「新增」建立新庫位。';
        if (isNew) return '新增庫位';
        if (isEdit) return `庫位：${detail?.code ?? '-'} ${detail?.name ?? ''}`.trim();
        return '';
    }, [isEmpty, isNew, isEdit, detail?.code, detail?.name]);

    const inputClass =
        'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20';
    const inputReadOnlyClass = readOnly ? 'cursor-text select-text' : '';

    const submit = async () => {
        const code = form.code.trim();
        if (!code) return;

        const payload = {
            code,
            name: form.name.trim() ? form.name.trim() : null,

            zone: form.zone.trim() ? form.zone.trim() : null,
            rack: form.rack.trim() ? form.rack.trim() : null,
            levelNo: toIntOrNull(form.levelNo),
            binNo: form.binNo.trim() ? form.binNo.trim() : null,

            remark: form.remark.trim() ? form.remark.trim() : null,
            sortNo: toIntOrDefault(form.sortNo, 0),
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
            emptyHint="這裡會顯示庫位資料（檢視/編輯）。"
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
            <div className="grid grid-cols-2 gap-3">
                <FormField label="庫位代碼（code）" hint={readOnly ? '（檢視模式：可複製，按「編輯」才能修改）' : undefined}>
                    <input
                        className={`${inputClass} ${inputReadOnlyClass}`}
                        value={form.code}
                        readOnly={readOnly}
                        onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                        placeholder={readOnly ? '' : '例如：Z01-A-01-01'}
                    />
                </FormField>

                <FormField label="名稱（name）">
                    <input
                        className={`${inputClass} ${inputReadOnlyClass}`}
                        value={form.name}
                        readOnly={readOnly}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    />
                </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <FormField label="區域（zone）">
                    <input
                        className={`${inputClass} ${inputReadOnlyClass}`}
                        value={form.zone}
                        readOnly={readOnly}
                        onChange={(e) => setForm((p) => ({ ...p, zone: e.target.value }))}
                    />
                </FormField>

                <FormField label="架（rack）">
                    <input
                        className={`${inputClass} ${inputReadOnlyClass}`}
                        value={form.rack}
                        readOnly={readOnly}
                        onChange={(e) => setForm((p) => ({ ...p, rack: e.target.value }))}
                    />
                </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <FormField label="層（levelNo）">
                    <input
                        className={`${inputClass} ${inputReadOnlyClass}`}
                        value={form.levelNo}
                        readOnly={readOnly}
                        onChange={(e) => setForm((p) => ({ ...p, levelNo: e.target.value }))}
                        placeholder={readOnly ? '' : '例如：1'}
                    />
                </FormField>

                <FormField label="格（binNo）">
                    <input
                        className={`${inputClass} ${inputReadOnlyClass}`}
                        value={form.binNo}
                        readOnly={readOnly}
                        onChange={(e) => setForm((p) => ({ ...p, binNo: e.target.value }))}
                    />
                </FormField>
            </div>

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
                <FormField label="排序（sortNo）">
                    {readOnly ? (
                        <ReadOnlyBox value={form.sortNo || '0'} />
                    ) : (
                        <input
                            className={`${inputClass}`}
                            type="number"
                            value={form.sortNo}
                            onChange={(e) => setForm((p) => ({ ...p, sortNo: e.target.value }))}
                        />
                    )}
                </FormField>

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