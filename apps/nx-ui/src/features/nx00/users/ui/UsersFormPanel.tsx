/**
 * File: apps/nx-ui/src/features/nx00/users/ui/UsersFormPanel.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-USERS-FORM-001：User Form Panel（右側 form）
 *
 * Notes:
 * - 檢視模式：可複製（readOnly），不可編輯（不使用 disabled，避免禁止游標）
 * - 編輯按鈕：按下才進入編輯模式（未來接 RBAC：canEdit）
 * - Users 額外提供：
 *   - isActive（啟用）可編輯
 *   - 密碼修改（可選功能：若有傳入 onChangePassword 才顯示）
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatDatetimeZhTw } from '@/shared/format/datetime';

import type { CreateUserBody, UpdateUserBody, UserDto } from '@/features/nx00/users/types';

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

    /**
     * 可選：啟用/停用（若未傳入，表單仍可編輯 isActive，會走 onCreate/onUpdate）
     * - 若你未來想做「即時切換啟用」不走整個 update，就可接這個。
     */
    onSetActive?: (id: string, isActive: boolean) => void | Promise<void>;

    /**
     * 可選：修改密碼（若未傳入，不顯示密碼區塊）
     */
    onChangePassword?: (id: string, password: string) => void | Promise<void>;
};

type FormState = {
    username: string;
    displayName: string;
    email: string;
    phone: string;

    isActive: boolean;
    statusCode: string;
    remark: string;
};

function toFormState(d: UserDto | null): FormState {
    return {
        username: d?.username ?? '',
        displayName: d?.displayName ?? '',
        email: d?.email ?? '',
        phone: d?.phone ?? '',
        isActive: d?.isActive ?? true,
        statusCode: d?.statusCode ?? '',
        remark: d?.remark ?? '',
    };
}

/**
 * 取得「稽核顯示名稱」：
 * - 優先吃後端若有回的 createdByName/updatedByName
 * - 再 fallback 成 id
 */
function pickAuditName(detail: UserDto, which: 'created' | 'updated'): string {
    const id = which === 'created' ? detail.createdBy : detail.updatedBy;
    const directName = which === 'created' ? detail.createdByName : detail.updatedByName;
    return String(directName ?? id ?? '-');
}

export function UsersFormPanel(props: Props) {
    const {
        mode,
        detail,
        loading,
        error,
        saving,
        saveError,
        canEdit,
        onClose,
        onCreate,
        onUpdate,
        onSetActive,
        onChangePassword,
    } = props;

    const isEmpty = mode === 'empty';
    const isNew = mode === 'new';
    const isEdit = mode === 'edit';

    // 檢視/編輯切換（只在 edit mode 有意義）
    const [editing, setEditing] = useState(false);

    useEffect(() => {
        // 切換選取 / new / empty 時重置
        setEditing(false);
    }, [mode, detail?.id]);

    const [form, setForm] = useState<FormState>(() => toFormState(detail));

    useEffect(() => {
        if (isEdit) setForm(toFormState(detail));
        if (isNew)
            setForm({
                username: '',
                displayName: '',
                email: '',
                phone: '',
                isActive: true,
                statusCode: '',
                remark: '',
            });
    }, [isEdit, isNew, detail]);

    const readOnly = useMemo(() => {
        if (isNew) return false;
        if (!isEdit) return true;
        return !editing;
    }, [isNew, isEdit, editing]);

    const headerTitle = useMemo(() => {
        if (isEmpty) return '請先從左側選擇使用者，或按「新增」建立新使用者。';
        if (isNew) return '新增使用者';
        if (isEdit) return `使用者：${detail?.username ?? '-'}`;
        return '';
    }, [isEmpty, isNew, isEdit, detail?.username]);

    const [localError, setLocalError] = useState<string | null>(null);

    const validate = (): string | null => {
        if (!form.username.trim()) return 'username 為必填';
        if (!form.displayName.trim()) return 'displayName 為必填';
        // email/phone/statusCode/remark 先不強制
        return null;
    };

    /**
     * @FUNCTION_CODE NX00-UI-NX00-USERS-FORM-001-F01
     * 說明：
     * - submit：新增 / 更新
     */
    const submit = async () => {
        setLocalError(null);

        const msg = validate();
        if (msg) {
            setLocalError(msg);
            return;
        }

        if (isNew) {
            await onCreate({
                username: form.username.trim(),
                displayName: form.displayName.trim(),
                email: form.email.trim() ? form.email.trim() : null,
                phone: form.phone.trim() ? form.phone.trim() : null,
                isActive: form.isActive,
                statusCode: form.statusCode.trim() ? form.statusCode.trim() : null,
                remark: form.remark.trim() ? form.remark.trim() : null,
            });
            return;
        }

        if (isEdit && detail) {
            await onUpdate(detail.id, {
                username: form.username.trim(),
                displayName: form.displayName.trim(),
                email: form.email.trim() ? form.email.trim() : null,
                phone: form.phone.trim() ? form.phone.trim() : null,
                isActive: form.isActive,
                statusCode: form.statusCode.trim() ? form.statusCode.trim() : null,
                remark: form.remark.trim() ? form.remark.trim() : null,
            });
            setEditing(false);
        }
    };

    // ===== 密碼區（可選）=====
    const [pwd1, setPwd1] = useState('');
    const [pwd2, setPwd2] = useState('');

    useEffect(() => {
        // 切換 user 時清空
        setPwd1('');
        setPwd2('');
    }, [detail?.id, mode]);

    const submitPassword = async () => {
        if (!isEdit || !detail) return;
        if (!onChangePassword) return;

        setLocalError(null);

        const a = pwd1.trim();
        const b = pwd2.trim();

        if (!a) {
            setLocalError('請輸入新密碼');
            return;
        }
        if (a.length < 6) {
            setLocalError('新密碼至少 6 碼');
            return;
        }
        if (a !== b) {
            setLocalError('兩次密碼輸入不一致');
            return;
        }

        await onChangePassword(detail.id, a);
        setPwd1('');
        setPwd2('');
    };

    // 統一 input 外觀：readOnly 時仍可選取/複製（cursor-text）
    const inputClass =
        'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20';
    const inputReadOnlyClass = readOnly ? 'cursor-text select-text' : '';

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
            {localError && <div className="mb-2 text-xs text-red-300">{localError}</div>}
            {loading && <div className="mb-2 text-xs text-white/60">載入中...</div>}

            {isEmpty ? (
                <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-4 text-xs text-white/60">
                    這裡會顯示使用者資料（檢視/編輯）。
                </div>
            ) : (
                <div className="space-y-3">
                    {/* username */}
                    <div>
                        <div className="mb-1 text-xs text-white/65">帳號（username）</div>
                        <input
                            className={`${inputClass} ${inputReadOnlyClass}`}
                            value={form.username}
                            readOnly={readOnly}
                            onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                        />
                        {readOnly && (
                            <div className="mt-1 text-[11px] text-white/35">（檢視模式：可複製，按「編輯」才能修改）</div>
                        )}
                    </div>

                    {/* displayName */}
                    <div>
                        <div className="mb-1 text-xs text-white/65">顯示名稱（displayName）</div>
                        <input
                            className={`${inputClass} ${inputReadOnlyClass}`}
                            value={form.displayName}
                            readOnly={readOnly}
                            onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                        />
                    </div>

                    {/* email */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <div className="mb-1 text-xs text-white/65">Email</div>
                            <input
                                className={`${inputClass} ${inputReadOnlyClass}`}
                                value={form.email}
                                readOnly={readOnly}
                                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                            />
                        </div>

                        <div>
                            <div className="mb-1 text-xs text-white/65">電話</div>
                            <input
                                className={`${inputClass} ${inputReadOnlyClass}`}
                                value={form.phone}
                                readOnly={readOnly}
                                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* status + active */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <div className="mb-1 text-xs text-white/65">狀態碼</div>
                            <input
                                className={`${inputClass} ${inputReadOnlyClass}`}
                                value={form.statusCode}
                                readOnly={readOnly}
                                onChange={(e) => setForm((p) => ({ ...p, statusCode: e.target.value }))}
                            />
                            <div className="mt-1 text-[11px] text-white/35">（可先留空；若後端有預設值會自動帶入）</div>
                        </div>

                        <div>
                            <div className="mb-1 text-xs text-white/65">啟用</div>

                            {readOnly ? (
                                <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/85">
                                    {form.isActive ? 'TRUE（啟用）' : 'FALSE（停用）'}
                                </div>
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

                            {/* 可選：即時 setActive（若你想不走整個 update） */}
                            {isEdit && detail && onSetActive && (
                                <div className="mt-2">
                                    <button
                                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 hover:bg-white/10 disabled:opacity-40"
                                        disabled={saving}
                                        onClick={() => onSetActive(detail.id, !detail.isActive)}
                                        title="即時切換啟用（不走整個 update）"
                                    >
                                        {detail.isActive ? '快速停用' : '快速啟用'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* remark */}
                    <div>
                        <div className="mb-1 text-xs text-white/65">備註</div>
                        <textarea
                            className={`w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20 ${readOnly ? 'cursor-text select-text' : ''
                                }`}
                            rows={4}
                            value={form.remark}
                            readOnly={readOnly}
                            onChange={(e) => setForm((p) => ({ ...p, remark: e.target.value }))}
                        />
                    </div>

                    {/* password (optional) */}
                    {isEdit && detail && onChangePassword && (
                        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
                            <div className="mb-2 text-xs font-semibold text-white/70">密碼設定（可選）</div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <div className="mb-1 text-[11px] text-white/55">新密碼</div>
                                    <input
                                        className={inputClass}
                                        value={pwd1}
                                        type="password"
                                        onChange={(e) => setPwd1(e.target.value)}
                                        placeholder="至少 6 碼"
                                    />
                                </div>
                                <div>
                                    <div className="mb-1 text-[11px] text-white/55">再次輸入</div>
                                    <input
                                        className={inputClass}
                                        value={pwd2}
                                        type="password"
                                        onChange={(e) => setPwd2(e.target.value)}
                                        placeholder="再次輸入"
                                    />
                                </div>
                            </div>

                            <div className="mt-3 flex items-center justify-end">
                                <button
                                    className="rounded-lg border border-white/10 bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/15 disabled:opacity-40"
                                    onClick={submitPassword}
                                    disabled={saving}
                                >
                                    {saving ? '處理中...' : '更新密碼'}
                                </button>
                            </div>

                            <div className="mt-2 text-[11px] text-white/35">
                                ※ 密碼不會回顯；更新成功後會清空輸入框。
                            </div>
                        </div>
                    )}

                    {/* audit */}
                    {isEdit && detail && (
                        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
                            <div className="mb-2 text-xs font-semibold text-white/70">稽核資訊（唯讀）</div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <div className="mb-1 text-[11px] text-white/55">建立時間</div>
                                    <input
                                        className={`${inputClass} cursor-text select-text`}
                                        value={formatDatetimeZhTw(detail.createdAt)}
                                        readOnly
                                    />
                                </div>
                                <div>
                                    <div className="mb-1 text-[11px] text-white/55">最後登入</div>
                                    <input
                                        className={`${inputClass} cursor-text select-text`}
                                        value={formatDatetimeZhTw(detail.lastLoginAt)}
                                        readOnly
                                    />
                                </div>

                                <div>
                                    <div className="mb-1 text-[11px] text-white/55">更新時間</div>
                                    <input
                                        className={`${inputClass} cursor-text select-text`}
                                        value={formatDatetimeZhTw(detail.updatedAt)}
                                        readOnly
                                    />
                                </div>
                                <div>
                                    <div className="mb-1 text-[11px] text-white/55">（保留）</div>
                                    <input className={`${inputClass} cursor-text select-text`} value="-" readOnly />
                                </div>

                                <div>
                                    <div className="mb-1 text-[11px] text-white/55">建立人</div>
                                    <input
                                        className={`${inputClass} cursor-text select-text`}
                                        value={pickAuditName(detail, 'created')}
                                        readOnly
                                    />
                                </div>
                                <div>
                                    <div className="mb-1 text-[11px] text-white/55">更新人</div>
                                    <input
                                        className={`${inputClass} cursor-text select-text`}
                                        value={pickAuditName(detail, 'updated')}
                                        readOnly
                                    />
                                </div>
                            </div>

                            <div className="mt-2 text-[11px] text-white/35">
                                ※ 若目前仍顯示 id，代表後端 detail DTO 還沒回傳對應的 displayName（之後我們再補）。
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}