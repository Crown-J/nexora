/******************************************************************************
 * File: apps/nx-ui/src/features/nx00/users/ui/UserFormPanel.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USERS-SPLIT-FORM-001：右側表單面板（view/edit/new）
 *
 * Notes:
 * - edit 模式預設為「檢視」：需按下「編輯」才可修改
 * - 檢視模式使用 readOnly（可複製、可選取），不使用 disabled（避免禁止游標）
 * - 密碼由本人在 Profile 變更；此頁不顯示密碼欄位（create 可不送 password，交由後端預設）
 ******************************************************************************/

'use client';

import { useEffect, useMemo, useState } from 'react';
import { cx } from '@/shared/lib/cx';
import { USERS_FIELD_MAP } from '@/features/nx00/users/meta/users.fields';
import { formatDatetimeZhTw } from '@/shared/format/datetime';
import type { CreateUserInput, UpdateUserInput, UserVM } from '@/features/nx00/users/hooks/useUsersSplit';

type Props = {
    mode: 'new' | 'edit' | 'empty';
    detail: UserVM | null;

    loading: boolean;
    error: string | null;

    saving: boolean;
    saveError: string | null;

    canEdit?: boolean;

    onClose: () => void;
    onCreate: (input: CreateUserInput) => void;
    onUpdate: (id: string, input: UpdateUserInput) => void;
};

function safeText(v: string | null | undefined) {
    if (v === null || v === undefined || v === '') return '-';
    return String(v);
}

/**
 * 優先顯示 displayName，沒有才 fallback id
 */
function pickAuditName(name?: string | null, id?: string | null) {
    if (name && name.trim()) return name.trim();
    if (id && id.trim()) return id.trim();
    return '-';
}

function TextField(props: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    type?: string;
    readOnly?: boolean;
}) {
    const { label, value, onChange, placeholder, type = 'text', readOnly } = props;

    return (
        <div className="space-y-1">
            <div className="text-xs text-white/70">{label}</div>
            <input
                className={cx(
                    'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20',
                    readOnly ? 'cursor-text text-white/80' : '',
                )}
                value={value}
                type={type}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                readOnly={readOnly}
            />
        </div>
    );
}

function TextArea(props: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    readOnly?: boolean;
}) {
    const { label, value, onChange, placeholder, readOnly } = props;

    return (
        <div className="space-y-1">
            <div className="text-xs text-white/70">{label}</div>
            <textarea
                className={cx(
                    'min-h-[84px] w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20',
                    readOnly ? 'cursor-text text-white/80' : '',
                )}
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                readOnly={readOnly}
            />
        </div>
    );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="space-y-1">
            <div className="text-xs text-white/60">{label}</div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70">{value}</div>
        </div>
    );
}

/**
 * @FUNCTION_CODE NX00-UI-NX00-USERS-SPLIT-FORM-001-F01
 * 說明：
 * - UserFormPanel
 */
export function UserFormPanel(props: Props) {
    const { mode, detail, loading, error, saving, saveError, canEdit = true, onClose, onCreate, onUpdate } = props;

    // ===== initial =====
    const initial = useMemo(() => {
        return {
            username: detail?.username ?? '',
            displayName: detail?.displayName ?? '',
            email: detail?.email ?? '',
            phone: detail?.phone ?? '',
            isActive: detail?.isActive ?? true,
            statusCode: detail?.statusCode ?? 'A',
            remark: (detail as any)?.remark ?? '',
        };
    }, [detail]);

    // edit：預設檢視；new：預設可編輯
    const [isEditing, setIsEditing] = useState(mode === 'new');

    // ===== local form =====
    const [username, setUsername] = useState(initial.username);
    const [displayName, setDisplayName] = useState(initial.displayName);
    const [email, setEmail] = useState(initial.email);
    const [phone, setPhone] = useState(initial.phone);
    const [isActive, setIsActive] = useState(initial.isActive);
    const [statusCode, setStatusCode] = useState(initial.statusCode);
    const [remark, setRemark] = useState(initial.remark);

    useEffect(() => {
        setUsername(initial.username);
        setDisplayName(initial.displayName);
        setEmail(initial.email);
        setPhone(initial.phone);
        setIsActive(initial.isActive);
        setStatusCode(initial.statusCode);
        setRemark(initial.remark);
        setIsEditing(mode === 'new');
    }, [initial, mode]);

    // ===== readOnly =====
    const readOnly = mode === 'edit' ? !isEditing || !canEdit : false;

    // username 通常不允許改（若要允許改，要配合後端 update）
    const usernameReadOnly = mode === 'edit' ? true : readOnly;

    const handleCancelEdit = () => {
        setUsername(initial.username);
        setDisplayName(initial.displayName);
        setEmail(initial.email);
        setPhone(initial.phone);
        setIsActive(initial.isActive);
        setStatusCode(initial.statusCode);
        setRemark(initial.remark);
        setIsEditing(false);
    };

    const handleSave = () => {
        if (mode === 'new') {
            const payload: CreateUserInput = {
                username: username.trim(),
                displayName: displayName.trim(),
                email: email.trim() ? email.trim() : null,
                phone: phone.trim() ? phone.trim() : null,
                isActive,
                statusCode: statusCode.trim() || 'A',
                remark: remark.trim() ? remark.trim() : null,
            } as any;

            onCreate(payload);
            return;
        }

        if (mode === 'edit' && detail?.id) {
            // Update 不送 username（你後端 UpdateUserBody 沒處理 username）
            const payload: UpdateUserInput = {
                displayName: displayName.trim(),
                email: email.trim() ? email.trim() : null,
                phone: phone.trim() ? phone.trim() : null,
                isActive,
                statusCode: statusCode.trim() || 'A',
                remark: remark.trim() ? remark.trim() : null,
            } as any;

            onUpdate(detail.id, payload);
            setIsEditing(false);
        }
    };

    if (mode === 'empty') {
        return (
            <div className="h-full rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm text-white/80">請從左側選擇使用者，或按「新增」建立新使用者。</div>
            </div>
        );
    }

    // 取中文 label（沒定義就 fallback）
    const L = (k: keyof typeof USERS_FIELD_MAP, fallback: string) => USERS_FIELD_MAP[k]?.label ?? fallback;

    // ✅ 優先顯示 displayName，沒有才 fallback id（兩者都沒有顯示 -）
    const createdByShow = pickAuditName((detail as any)?.createdByName, (detail as any)?.createdBy ?? null);
    const updatedByShow = pickAuditName((detail as any)?.updatedByName, (detail as any)?.updatedBy ?? null);

    return (
        <div className="h-full overflow-auto rounded-xl border border-white/10 bg-white/5 p-4">
            {/* ===== header ===== */}
            <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-white">{mode === 'new' ? '新增使用者' : `${detail?.displayName ?? ''}`}</div>

                <div className="flex gap-2">
                    <button
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
                        onClick={onClose}
                        disabled={saving}
                    >
                        關閉
                    </button>

                    {mode === 'edit' && canEdit && !isEditing && (
                        <button
                            className="rounded-lg border border-white/10 bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/15"
                            onClick={() => setIsEditing(true)}
                            disabled={saving || loading}
                        >
                            編輯
                        </button>
                    )}

                    {mode === 'edit' && canEdit && isEditing && (
                        <button
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
                            onClick={handleCancelEdit}
                            disabled={saving || loading}
                        >
                            取消
                        </button>
                    )}

                    {(mode === 'new' || (mode === 'edit' && canEdit && isEditing)) && (
                        <button
                            className="rounded-lg border border-white/10 bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/15 disabled:opacity-50"
                            onClick={handleSave}
                            disabled={saving || loading}
                        >
                            {saving ? '儲存中...' : '儲存'}
                        </button>
                    )}
                </div>
            </div>

            {/* ===== status ===== */}
            {loading && <div className="mb-3 text-xs text-white/60">載入中...</div>}
            {error && <div className="mb-3 text-xs text-red-300">{error}</div>}
            {saveError && <div className="mb-3 text-xs text-red-300">{saveError}</div>}

            {/* ===== fields ===== */}
            <div className="space-y-3">
                <TextField label={L('username', '帳號')} value={username} onChange={setUsername} placeholder="ex: sales" readOnly={usernameReadOnly} />
                <TextField label={L('displayName', '顯示名稱')} value={displayName} onChange={setDisplayName} placeholder="ex: Crown" readOnly={readOnly} />
                <TextField label={L('email', 'Email')} value={email} onChange={setEmail} placeholder="ex: crown@example.com" readOnly={readOnly} />
                <TextField label={L('phone', '電話')} value={phone} onChange={setPhone} placeholder="ex: 0912-345-678" readOnly={readOnly} />

                <div className="grid grid-cols-2 gap-3">
                    {readOnly ? (
                        <ReadOnlyRow label={L('isActive', '啟用')} value={isActive ? 'TRUE（啟用）' : 'FALSE（停用）'} />
                    ) : (
                        <div className="space-y-1">
                            <div className="text-xs text-white/70">{L('isActive', '啟用')}</div>
                            <select
                                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                                value={isActive ? 'true' : 'false'}
                                onChange={(e) => setIsActive(e.target.value === 'true')}
                            >
                                <option value="true">TRUE（啟用）</option>
                                <option value="false">FALSE（停用）</option>
                            </select>
                        </div>
                    )}

                    <TextField label={L('statusCode', '狀態碼')} value={statusCode} onChange={setStatusCode} placeholder="A" readOnly={readOnly} />
                </div>

                <TextArea label={L('remark', '備註')} value={remark} onChange={setRemark} placeholder="備註..." readOnly={readOnly} />
            </div>

            {/* ===== audit ===== */}
            {mode === 'edit' && (
                <div className="mt-6 space-y-3">
                    <div className="text-xs font-semibold text-white/70">稽核資訊（唯讀）</div>

                    <div className="grid grid-cols-2 gap-3">
                        <ReadOnlyRow label={L('lastLoginAt', '最後登入')} value={formatDatetimeZhTw((detail as any)?.lastLoginAt)} />
                        <ReadOnlyRow label={L('createdAt', '建立時間')} value={formatDatetimeZhTw((detail as any)?.createdAt)} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <ReadOnlyRow label={L('createdBy', '建立人')} value={createdByShow} />
                        <ReadOnlyRow label={L('updatedAt', '更新時間')} value={formatDatetimeZhTw((detail as any)?.updatedAt)} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <ReadOnlyRow label={L('updatedBy', '更新人')} value={updatedByShow} />
                        <div />
                    </div>

                    {/* 如果你真的想保留 id 當除錯用：用文字顯示，不要走 USERS_FIELD_MAP */}
                    {/* <div className="text-[11px] text-white/35">updatedBy(id): {safeText((detail as any)?.updatedBy)}</div> */}
                </div>
            )}
        </div>
    );
}