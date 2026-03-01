/**
 * File: apps/nx-ui/src/features/nx00/user/ui/UserFormPanel.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USER-FORM-001：User Form Panel（右側 form）
 *
 * Notes:
 * - 檢視模式：可複製（readOnly），不可編輯（不使用 disabled）
 * - 編輯按鈕：按下才進入編輯模式（未來接 RBAC：canEdit）
 * - 外框/按鈕/狀態顯示抽到 shared/ui/listform/FormPanelShell
 * - 型別一律引用 features/nx00/user/types.ts（SSOT）
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CreateUserBody, UpdateUserBody, UserDto } from '@/features/nx00/user/types';
import { FormField } from '@/shared/ui/form/FormField';
import { ReadOnlyBox } from '@/shared/ui/form/ReadOnlyBox';
import { AuditGrid } from '@/shared/ui/audit/AuditGrid';
import { FormPanelShell } from '@/shared/ui/listform/FormPanelShell';
import { formatDatetimeZhTw } from '@/shared/format/datetime';

type Props = {
    mode: 'empty' | 'new' | 'edit';
    detail: UserDto | null;
    loading: boolean;
    error: string | null;

    saving: boolean;
    saveError: string | null;

    canEdit: boolean;

    onClose: () => void;
    onCreate: (body: CreateUserBody) => void | Promise<void>;
    onUpdate: (id: string, body: UpdateUserBody) => void | Promise<void>;
};

type FormState = {
    username: string;
    displayName: string;
    email: string;
    phone: string;
    isActive: boolean;
    password: string; // 建立時可用（或未來重設密碼用）
};

function toFormState(d: UserDto | null): FormState {
    return {
        username: d?.username ?? '',
        displayName: d?.displayName ?? '',
        email: d?.email ?? '',
        phone: d?.phone ?? '',
        isActive: d?.isActive ?? true,
        password: '',
    };
}

function pickAuditText(detail: UserDto, which: 'created' | 'updated'): string {
    if (which === 'created') return String(detail.createdByName ?? detail.createdBy ?? '-');
    return String(detail.updatedByName ?? detail.updatedBy ?? '-');
}

export function UserFormPanel(props: Props) {
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
        if (isNew) setForm({ username: '', displayName: '', email: '', phone: '', isActive: true, password: '' });
    }, [isEdit, isNew, detail]);

    const readOnly = useMemo(() => {
        if (isNew) return false;
        if (!isEdit) return true;
        return !editing;
    }, [isNew, isEdit, editing]);

    const headerTitle = useMemo(() => {
        if (isEmpty) return '請先從左側選擇使用者，或按「新增」建立新使用者。';
        if (isNew) return '新增使用者';
        if (isEdit) return `使用者：${detail?.displayName ?? detail?.username ?? '-'}`;
        return '';
    }, [isEmpty, isNew, isEdit, detail?.displayName, detail?.username]);

    const inputClass =
        'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20';
    const inputReadOnlyClass = readOnly ? 'cursor-text select-text' : '';

    const submit = async () => {
        const username = form.username.trim();
        const displayName = form.displayName.trim();

        if (!username || !displayName) return;

        if (isNew) {
            await onCreate({
                username,
                displayName,
                email: form.email.trim() ? form.email.trim() : null,
                phone: form.phone.trim() ? form.phone.trim() : null,
                isActive: form.isActive,
                password: form.password.trim() ? form.password.trim() : undefined,
            });
            return;
        }

        if (isEdit && detail) {
            await onUpdate(detail.id, {
                username,
                displayName,
                email: form.email.trim() ? form.email.trim() : null,
                phone: form.phone.trim() ? form.phone.trim() : null,
                isActive: form.isActive,
                // edit 模式暫不送 password（避免後端尚未支援時誤更新）
            });
            setEditing(false);
        }
    };

    return (
        <FormPanelShell
            mode={mode}
            title={headerTitle}
            emptyHint="這裡會顯示使用者資料（檢視/編輯）。"
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
            <FormField label="帳號（username）" hint={readOnly ? '（檢視模式：可複製，按「編輯」才能修改）' : undefined}>
                <input
                    className={`${inputClass} ${inputReadOnlyClass}`}
                    value={form.username}
                    readOnly={readOnly}
                    onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                />
            </FormField>

            <FormField label="顯示名稱（displayName）">
                <input
                    className={`${inputClass} ${inputReadOnlyClass}`}
                    value={form.displayName}
                    readOnly={readOnly}
                    onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
                <FormField label="Email">
                    <input
                        className={`${inputClass} ${inputReadOnlyClass}`}
                        value={form.email}
                        readOnly={readOnly}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    />
                </FormField>

                <FormField label="電話">
                    <input
                        className={`${inputClass} ${inputReadOnlyClass}`}
                        value={form.phone}
                        readOnly={readOnly}
                        onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    />
                </FormField>
            </div>

            {isNew && (
                <FormField label="初始密碼（可選）" hint="若後端允許可不填，或由後端產生初始密碼">
                    <input
                        className={inputClass}
                        value={form.password}
                        onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                        placeholder="不顯示 hash，只送 password（由後端轉 hash）"
                    />
                </FormField>
            )}

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

                <FormField label="最後登入">
                    <ReadOnlyBox value={detail?.lastLoginAt ? formatDatetimeZhTw(detail.lastLoginAt) : '-'} />
                </FormField>
            </div>

            {isEdit && (
                <FormField label="（保留）密碼重設">
                    <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/40">
                        後續可加入「重設密碼」功能（需後端提供 reset API）
                    </div>
                </FormField>
            )}

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