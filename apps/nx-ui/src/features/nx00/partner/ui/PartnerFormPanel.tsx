/**
 * File: apps/nx-ui/src/features/nx00/partner/ui/PartnerFormPanel.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-PARTNER-FORM-001：Partner Form Panel（右側 form）
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CreatePartnerBody, PartnerDto, PartnerType, UpdatePartnerBody } from '@/features/nx00/partner/types';
import { FormField } from '@/shared/ui/form/FormField';
import { ReadOnlyBox } from '@/shared/ui/form/ReadOnlyBox';
import { AuditGrid } from '@/shared/ui/audit/AuditGrid';
import { FormPanelShell } from '@/shared/ui/listform/FormPanelShell';

type Props = {
    mode: 'empty' | 'new' | 'edit';
    detail: PartnerDto | null;
    loading: boolean;
    error: string | null;

    saving: boolean;
    saveError: string | null;

    canEdit: boolean;

    onClose: () => void;
    onCreate: (body: CreatePartnerBody) => void | Promise<void>;
    onUpdate: (id: string, body: UpdatePartnerBody) => void | Promise<void>;
};

type FormState = {
    code: string;
    name: string;
    partnerType: PartnerType;

    contactName: string;
    phone: string;
    mobile: string;
    email: string;
    address: string;
    remark: string;

    isActive: boolean;
};

function toFormState(d: PartnerDto | null): FormState {
    return {
        code: d?.code ?? '',
        name: d?.name ?? '',
        partnerType: (d?.partnerType as PartnerType) ?? 'BOTH',

        contactName: d?.contactName ?? '',
        phone: d?.phone ?? '',
        mobile: d?.mobile ?? '',
        email: d?.email ?? '',
        address: d?.address ?? '',
        remark: d?.remark ?? '',

        isActive: d?.isActive ?? true,
    };
}

function pickAuditText(detail: PartnerDto, which: 'created' | 'updated'): string {
    if (which === 'created') return String(detail.createdByName ?? detail.createdBy ?? '-');
    return String(detail.updatedByName ?? detail.updatedBy ?? '-');
}

function typeLabel(t: PartnerType) {
    if (t === 'CUST') return 'CUST（客戶）';
    if (t === 'SUPP') return 'SUPP（供應商）';
    return 'BOTH（兼具）';
}

export function PartnerFormPanel(props: Props) {
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
        if (isNew) {
            setForm({
                code: '',
                name: '',
                partnerType: 'BOTH',
                contactName: '',
                phone: '',
                mobile: '',
                email: '',
                address: '',
                remark: '',
                isActive: true,
            });
        }
    }, [isEdit, isNew, detail]);

    const readOnly = useMemo(() => {
        if (isNew) return false;
        if (!isEdit) return true;
        return !editing;
    }, [isNew, isEdit, editing]);

    const headerTitle = useMemo(() => {
        if (isEmpty) return '請先從左側選擇交易夥伴，或按「新增」建立。';
        if (isNew) return '新增交易夥伴';
        if (isEdit) return `夥伴：${detail?.code ?? '-'} ${detail?.name ?? ''}`.trim();
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
            partnerType: form.partnerType,

            contactName: form.contactName.trim() ? form.contactName.trim() : null,
            phone: form.phone.trim() ? form.phone.trim() : null,
            mobile: form.mobile.trim() ? form.mobile.trim() : null,
            email: form.email.trim() ? form.email.trim() : null,
            address: form.address.trim() ? form.address.trim() : null,
            remark: form.remark.trim() ? form.remark.trim() : null,

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
            emptyHint="這裡會顯示交易夥伴資料（檢視/編輯）。"
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
                <FormField label="代碼（code）" hint={readOnly ? '（檢視模式：可複製，按「編輯」才能修改）' : undefined}>
                    <input
                        className={`${inputClass} ${inputReadOnlyClass}`}
                        value={form.code}
                        readOnly={readOnly}
                        onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                    />
                </FormField>

                <FormField label="類型（partnerType）">
                    {readOnly ? (
                        <ReadOnlyBox value={typeLabel(form.partnerType)} />
                    ) : (
                        <select
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none focus:border-white/20"
                            value={form.partnerType}
                            onChange={(e) => setForm((p) => ({ ...p, partnerType: e.target.value as PartnerType }))}
                        >
                            <option value="BOTH">{typeLabel('BOTH')}</option>
                            <option value="CUST">{typeLabel('CUST')}</option>
                            <option value="SUPP">{typeLabel('SUPP')}</option>
                        </select>
                    )}
                </FormField>
            </div>

            <FormField label="名稱（name）">
                <input
                    className={`${inputClass} ${inputReadOnlyClass}`}
                    value={form.name}
                    readOnly={readOnly}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
                <FormField label="聯絡人（contactName）">
                    <input
                        className={`${inputClass} ${inputReadOnlyClass}`}
                        value={form.contactName}
                        readOnly={readOnly}
                        onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))}
                    />
                </FormField>

                <FormField label="電話（phone）">
                    <input
                        className={`${inputClass} ${inputReadOnlyClass}`}
                        value={form.phone}
                        readOnly={readOnly}
                        onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    />
                </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <FormField label="手機（mobile）">
                    <input
                        className={`${inputClass} ${inputReadOnlyClass}`}
                        value={form.mobile}
                        readOnly={readOnly}
                        onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value }))}
                    />
                </FormField>

                <FormField label="Email（email）">
                    <input
                        className={`${inputClass} ${inputReadOnlyClass}`}
                        value={form.email}
                        readOnly={readOnly}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    />
                </FormField>
            </div>

            <FormField label="地址（address）">
                <input
                    className={`${inputClass} ${inputReadOnlyClass}`}
                    value={form.address}
                    readOnly={readOnly}
                    onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
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