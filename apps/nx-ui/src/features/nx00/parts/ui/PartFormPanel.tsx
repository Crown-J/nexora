/**
 * File: apps/nx-ui/src/features/nx00/parts/ui/PartFormPanel.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-NX00-PARTS-FORM-UI-001：Part Form Panel（新增/編輯）
 *
 * Notes:
 * - render-only：不允許在此檔案呼叫 API
 * - 上層注入 mode/detail/handlers
 * - 先以 id 下拉值跑通；下一步再接 lookups 顯示 name（value=id）
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CreatePartInput, PartVM, UpdatePartInput } from '../hooks/usePartsSplit';

type Mode = 'new' | 'edit' | 'empty';

type Props = {
    mode: Mode;
    selectedId: string;

    detail: PartVM | null;
    loading: boolean;
    error: string | null;

    saving: boolean;
    saveError: string | null;

    onClose: () => void;
    onCreate: (input: CreatePartInput) => Promise<void> | void;
    onUpdate: (id: string, input: UpdatePartInput) => Promise<void> | void;
    onSetActive: (id: string, isActive: boolean) => Promise<void> | void;
};

export function PartFormPanel(props: Props) {
    const { mode, selectedId, detail, loading, error, saving, saveError, onClose, onCreate, onUpdate, onSetActive } =
        props;

    const readOnly = mode === 'empty' || loading;

    const [partNo, setPartNo] = useState('');
    const [oldPartNo, setOldPartNo] = useState('');
    const [displayNo, setDisplayNo] = useState('');

    const [nameZh, setNameZh] = useState('');
    const [nameEn, setNameEn] = useState('');

    const [brandId, setBrandId] = useState('');
    const [functionGroupId, setFunctionGroupId] = useState('');
    const [statusId, setStatusId] = useState('');

    const [barcode, setBarcode] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [remark, setRemark] = useState('');

    /**
     * @FUNCTION_CODE NX00-UI-NX00-PARTS-FORM-UI-001-F01
     * 說明：
     * - reset form by mode/detail
     */
    useEffect(() => {
        if (mode === 'new') {
            setPartNo('');
            setOldPartNo('');
            setDisplayNo('');
            setNameZh('');
            setNameEn('');
            setBrandId('');
            setFunctionGroupId('');
            setStatusId('');
            setBarcode('');
            setIsActive(true);
            setRemark('');
            return;
        }

        if (mode === 'edit' && detail) {
            setPartNo(detail.partNo);
            setOldPartNo(detail.oldPartNo ?? '');
            setDisplayNo(detail.displayNo ?? '');
            setNameZh(detail.nameZh);
            setNameEn(detail.nameEn ?? '');
            setBrandId(detail.brandId);
            setFunctionGroupId(detail.functionGroupId ?? '');
            setStatusId(detail.statusId);
            setBarcode(detail.barcode ?? '');
            setIsActive(Boolean(detail.isActive));
            setRemark(detail.remark ?? '');
        }
    }, [mode, detail]);

    const title = useMemo(() => {
        if (mode === 'new') return '新增';
        if (mode === 'edit') return '編輯';
        return '未選取';
    }, [mode]);

    const createdByShow = detail?.createdByName ?? detail?.createdBy ?? null;
    const updatedByShow = detail?.updatedByName ?? detail?.updatedBy ?? null;

    /**
     * @FUNCTION_CODE NX00-UI-NX00-PARTS-FORM-UI-001-F02
     * 說明：
     * - submit handler（依 mode 分流）
     */
    const onSubmit = async () => {
        if (saving || readOnly) return;

        const payload: CreatePartInput | UpdatePartInput = {
            partNo: partNo.trim(),
            oldPartNo: oldPartNo.trim() ? oldPartNo.trim() : null,
            displayNo: displayNo.trim() ? displayNo.trim() : null,
            nameZh: nameZh.trim(),
            nameEn: nameEn.trim() ? nameEn.trim() : null,
            brandId: brandId.trim(),
            functionGroupId: functionGroupId.trim() ? functionGroupId.trim() : null,
            statusId: statusId.trim(),
            barcode: barcode.trim() ? barcode.trim() : null,
            isActive,
            remark: remark.trim() ? remark.trim() : null,
        };

        if (!payload.partNo || !payload.nameZh || !payload.brandId || !payload.statusId) {
            // 你目前 UI 風格我先用最小保護，不做 toast
            return;
        }

        if (mode === 'new') await onCreate(payload as CreatePartInput);
        if (mode === 'edit') await onUpdate(selectedId, payload as UpdatePartInput);
    };

    if (mode === 'empty') {
        return (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-semibold text-white/80">零件基本資料</div>
                <div className="mt-3 text-sm text-white/60">請從左側選取一筆資料，或點「新增」。</div>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-white/80">零件基本資料（{title}）</div>

                <div className="flex items-center gap-2">
                    <button
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                        onClick={onClose}
                        type="button"
                    >
                        關閉
                    </button>

                    {mode === 'edit' ? (
                        <button
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 disabled:opacity-40"
                            onClick={() => onSetActive(selectedId, !isActive)}
                            disabled={saving || loading}
                            type="button"
                        >
                            {isActive ? '停用' : '啟用'}
                        </button>
                    ) : null}

                    <button
                        className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-40"
                        onClick={onSubmit}
                        disabled={saving || loading}
                        type="button"
                    >
                        {saving ? '儲存中…' : '儲存'}
                    </button>
                </div>
            </div>

            {error ? (
                <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                    {error}
                </div>
            ) : null}

            {saveError ? (
                <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                    {saveError}
                </div>
            ) : null}

            <div className="mt-3 grid grid-cols-2 gap-3">
                <Field label="料號" value={partNo} onChange={setPartNo} readOnly={readOnly} />
                <Field label="顯示料號" value={displayNo} onChange={setDisplayNo} readOnly={readOnly} />

                <Field label="舊料號" value={oldPartNo} onChange={setOldPartNo} readOnly={readOnly} />
                <Field label="條碼" value={barcode} onChange={setBarcode} readOnly={readOnly} />

                <Field label="中文品名" value={nameZh} onChange={setNameZh} readOnly={readOnly} />
                <Field label="英文品名" value={nameEn} onChange={setNameEn} readOnly={readOnly} />

                <Field label="brandId（先用 id）" value={brandId} onChange={setBrandId} readOnly={readOnly} />
                <Field
                    label="functionGroupId（可空，先用 id）"
                    value={functionGroupId}
                    onChange={setFunctionGroupId}
                    readOnly={readOnly}
                />

                <Field label="statusId（先用 id）" value={statusId} onChange={setStatusId} readOnly={readOnly} />
                <SelectBool label="啟用" value={isActive} onChange={setIsActive} readOnly={readOnly} />
            </div>

            <div className="mt-3">
                <TextArea label="備註" value={remark} onChange={setRemark} readOnly={readOnly} />
            </div>

            {mode === 'edit' && detail ? (
                <div className="mt-6 space-y-3">
                    <div className="text-xs font-semibold text-white/70">稽核資訊（唯讀）</div>

                    <div className="grid grid-cols-2 gap-3">
                        <ReadOnlyRow label="建立時間" value={detail.createdAt ?? '-'} />
                        <ReadOnlyRow label="建立人" value={createdByShow ?? '-'} />
                        <ReadOnlyRow label="更新時間" value={detail.updatedAt ?? '-'} />
                        <ReadOnlyRow label="更新人" value={updatedByShow ?? '-'} />
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function Field(props: { label: string; value: string; onChange: (v: string) => void; readOnly: boolean }) {
    return (
        <div>
            <div className="mb-1 text-xs text-white/60">{props.label}</div>
            <input
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                value={props.value}
                onChange={(e) => props.onChange(e.target.value)}
                readOnly={props.readOnly}
            />
        </div>
    );
}

function TextArea(props: { label: string; value: string; onChange: (v: string) => void; readOnly: boolean }) {
    return (
        <div>
            <div className="mb-1 text-xs text-white/60">{props.label}</div>
            <textarea
                className="h-28 w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                value={props.value}
                onChange={(e) => props.onChange(e.target.value)}
                readOnly={props.readOnly}
            />
        </div>
    );
}

function SelectBool(props: { label: string; value: boolean; onChange: (v: boolean) => void; readOnly: boolean }) {
    return (
        <div>
            <div className="mb-1 text-xs text-white/60">{props.label}</div>
            <select
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                value={props.value ? 'true' : 'false'}
                onChange={(e) => props.onChange(e.target.value === 'true')}
                disabled={props.readOnly}
            >
                <option value="true">TRUE（啟用）</option>
                <option value="false">FALSE（停用）</option>
            </select>
        </div>
    );
}

function ReadOnlyRow(props: { label: string; value: string }) {
    return (
        <div>
            <div className="mb-1 text-xs text-white/60">{props.label}</div>
            <div className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
                {props.value}
            </div>
        </div>
    );
}