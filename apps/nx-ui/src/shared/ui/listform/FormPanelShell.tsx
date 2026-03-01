/**
 * File: apps/nx-ui/src/shared/ui/listform/FormPanelShell.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHARED-FORMPANEL-SHELL-001：Split Form Panel Shell（右側面板外框/按鈕/狀態）
 *
 * Notes:
 * - 統一 empty/new/edit 三態的 header 文案與按鈕群
 * - 統一 error/saveError/loading 顯示區
 * - children 只放「表單本體欄位」
 * - 檢視模式：由外部決定 editing/readOnly，Shell 不干涉欄位是否可編輯
 */

'use client';

import { useMemo } from 'react';

export type FormPanelMode = 'empty' | 'new' | 'edit';

export type FormPanelShellProps = {
    mode: FormPanelMode;

    /** 標題：若未提供，會使用 default header 文案 */
    title?: string;

    /** 顯示用：empty 狀態提示文字（可不傳，會用預設） */
    emptyHint?: string;

    /** 狀態 */
    loading?: boolean;
    error?: string | null;
    saving?: boolean;
    saveError?: string | null;

    /** 權限/編輯狀態 */
    canEdit?: boolean;
    editing?: boolean;

    /** 行為 */
    onClose?: () => void;
    onEdit?: () => void;
    onCancel?: () => void;
    onSave?: () => void | Promise<void>;

    /** 儲存按鈕文字（預設：儲存） */
    saveText?: string;
    savingText?: string;

    /** 表單本體 */
    children?: React.ReactNode;
};

function defaultHeader(mode: FormPanelMode) {
    if (mode === 'empty') return '請先從左側選擇資料，或按「新增」建立新資料。';
    if (mode === 'new') return '新增';
    return '編輯';
}

export function FormPanelShell(props: FormPanelShellProps) {
    const {
        mode,
        title,
        emptyHint,
        loading,
        error,
        saving,
        saveError,
        canEdit = true,
        editing = false,
        onClose,
        onEdit,
        onCancel,
        onSave,
        saveText = '儲存',
        savingText = '儲存中...',
        children,
    } = props;

    const isEmpty = mode === 'empty';
    const isNew = mode === 'new';
    const isEdit = mode === 'edit';

    const headerTitle = useMemo(() => {
        if (title) return title;
        return defaultHeader(mode);
    }, [title, mode]);

    const showClose = !isEmpty && typeof onClose === 'function';

    // Buttons show rules (match your current pattern)
    const showEditBtn = isEdit && !editing && typeof onEdit === 'function';
    const showSaveGroup = (isNew || (isEdit && editing)) && typeof onSave === 'function';

    return (
        <div className="h-full rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-white/85">{headerTitle}</div>

                <div className="flex items-center gap-2">
                    {showClose && (
                        <button
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 hover:bg-white/10 disabled:opacity-40"
                            onClick={onClose}
                            disabled={!!saving}
                        >
                            關閉
                        </button>
                    )}

                    {showEditBtn && (
                        <button
                            className="rounded-lg border border-white/10 bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/15 disabled:opacity-40"
                            onClick={onEdit}
                            disabled={!canEdit}
                            title={!canEdit ? '無編輯權限' : '進入編輯'}
                        >
                            編輯
                        </button>
                    )}

                    {showSaveGroup && (
                        <>
                            {isEdit && (
                                <button
                                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 hover:bg-white/10 disabled:opacity-40"
                                    onClick={onCancel}
                                    disabled={!!saving}
                                >
                                    取消
                                </button>
                            )}

                            <button
                                className="rounded-lg border border-white/10 bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/15 disabled:opacity-40"
                                onClick={onSave}
                                disabled={!!saving}
                            >
                                {saving ? savingText : saveText}
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
                    {emptyHint ?? '這裡會顯示資料（檢視/編輯）。'}
                </div>
            ) : (
                <div className="space-y-3">{children}</div>
            )}
        </div>
    );
}