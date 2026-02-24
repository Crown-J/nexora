/**
 * File: apps/nx-ui/src/features/nx00/roles/ui/RoleFormPanel.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-ROLES-FORM-001：Role Form Panel（右側 form）
 *
 * Notes:
 * - 檢視模式：可複製（readOnly），不可編輯（不使用 disabled）
 * - 編輯按鈕：按下才進入編輯模式（未來接 RBAC：canEdit）
 * - 型別一律引用 features/nx00/roles/types.ts（SSOT）
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CreateRoleBody, RoleDto, UpdateRoleBody } from '@/features/nx00/roles/types';
import { FormField } from '@/shared/ui/form/FormField';
import { ReadOnlyBox } from '@/shared/ui/form/ReadOnlyBox';
import { AuditGrid } from '@/shared/ui/audit/AuditGrid';

type Props = {
    mode: 'empty' | 'new' | 'edit';
    detail: RoleDto | null;
    loading: boolean;
    error: string | null;

    saving: boolean;
    saveError: string | null;

    canEdit: boolean;

    onClose: () => void;
    onCreate: (body: CreateRoleBody) => void | Promise<void>;
    onUpdate: (id: string, body: UpdateRoleBody) => void | Promise<void>;
};

type FormState = {
    code: string;
    name: string;
    description: string;
    isActive: boolean;
};

function toFormState(d: RoleDto | null): FormState {
    return {
        code: d?.code ?? '',
        name: d?.name ?? '',
        description: d?.description ?? '',
        isActive: d?.isActive ?? true,
    };
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-ROLES-FORM-001-F01
 * 說明：
 * - pickAuditText：取得稽核顯示名稱（優先 Name，其次 id）
 */
function pickAuditText(detail: RoleDto, which: 'created' | 'updated'): string {
    if (which === 'created') return String(detail.createdByName ?? detail.createdBy ?? '-');
    return String(detail.updatedByName ?? detail.updatedBy ?? '-');
}

export function RoleFormPanel(props: Props) {
    const { mode, detail, loading, error, saving, saveError, canEdit, onClose, onCreate, onUpdate } = props;

    const isEmpty = mode === 'empty';
    const isNew = mode === 'new';
    const isEdit = mode === 'edit';

    // 檢視/編輯切換（只在 edit mode 有意義）
    const [editing, setEditing] = useState(false);

    useEffect(() => {
        setEditing(false);
    }, [mode, detail?.id]);

    const [form, setForm] = useState<FormState>(() => toFormState(detail));

    useEffect(() => {
        if (isEdit) setForm(toFormState(detail));
        if (isNew) setForm({ code: '', name: '', description: '', isActive: true });
    }, [isEdit, isNew, detail]);

    const readOnly = useMemo(() => {
        if (isNew) return false;
        if (!isEdit) return true;
        return !editing;
    }, [isNew, isEdit, editing]);

    const headerTitle = useMemo(() => {
        if (isEmpty) return '請先從左側選擇角色，或按「新增」建立新角色。';
        if (isNew) return '新增角色';
        if (isEdit) return `角色：${detail?.name ?? '-'}`;
        return '';
    }, [isEmpty, isNew, isEdit, detail?.name]);

    const inputClass =
        'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20';
    const inputReadOnlyClass = readOnly ? 'cursor-text select-text' : '';

    /**
     * @FUNCTION_CODE NX00-UI-NX00-ROLES-FORM-001-F02
     * 說明：
     * - submit：new→onCreate / edit→onUpdate
     */
    const submit = async () => {
        const code = form.code.trim();
        const name = form.name.trim();

        // 最小檢核：避免送空值（可依你規格再擴充）
        if (!code || !name) return;

        if (isNew) {
            await onCreate({
                code,
                name,
                description: form.description?.trim() ? form.description.trim() : null,
                isActive: form.isActive,
            });
            return;
        }

        if (isEdit && detail) {
            await onUpdate(detail.id, {
                code,
                name,
                description: form.description?.trim() ? form.description.trim() : null,
                isActive: form.isActive,
            });
            setEditing(false);
        }
    };

    return (
        <div className="h-full rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-white/85">{headerTitle}</div>

                <div className="flex items-center gap-2">
                    {!isEmpty && (
                        <button
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 hover:bg-white/10 disabled:opacity-40"
                            onClick={onClose}
                            disabled={saving}
                        >
                            關閉
                        </button>
                    )}

                    {isEdit && !editing && (
                        <button
                            className="rounded-lg border border-white/10 bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/15 disabled:opacity-40"
                            onClick={() => setEditing(true)}
                            disabled={!canEdit}
                            title={!canEdit ? '無編輯權限' : '進入編輯'}
                        >
                            編輯
                        </button>
                    )}

                    {(isNew || (isEdit && editing)) && (
                        <>
                            {isEdit && (
                                <button
                                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 hover:bg-white/10 disabled:opacity-40"
                                    onClick={() => {
                                        setForm(toFormState(detail));
                                        setEditing(false);
                                    }}
                                    disabled={saving}
                                >
                                    取消
                                </button>
                            )}

                            <button
                                className="rounded-lg border border-white/10 bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/15 disabled:opacity-40"
                                onClick={submit}
                                disabled={saving}
                            >
                                {saving ? '儲存中...' : '儲存'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {error && <div className="mb-2 text-xs text-red-300">{error}</div>}
            {saveError && <div className="mb-2 text-xs text-red-300">{saveError}</div>}
            {loading && <div className="mb-2 text-xs text-white/60">載入中...</div>}

            {isEmpty ? (
                <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-4 text-xs text-white/60">
                    這裡會顯示角色資料（檢視/編輯）。
                </div>
            ) : (
                <div className="space-y-3">
                    <FormField label="角色代碼" hint={readOnly ? '（檢視模式：可複製，按「編輯」才能修改）' : undefined}>
                        <input
                            className={`${inputClass} ${inputReadOnlyClass}`}
                            value={form.code}
                            readOnly={readOnly}
                            onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                        />
                    </FormField>

                    <FormField label="角色名稱">
                        <input
                            className={`${inputClass} ${inputReadOnlyClass}`}
                            value={form.name}
                            readOnly={readOnly}
                            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        />
                    </FormField>

                    <FormField label="說明">
                        <textarea
                            className={[
                                'w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20',
                                readOnly ? 'cursor-text select-text' : '',
                            ].join(' ')}
                            rows={4}
                            value={form.description}
                            readOnly={readOnly}
                            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
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
                </div>
            )}
        </div>
    );
}