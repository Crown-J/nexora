/**
 * File: apps/nx-ui/src/shared/ui/listform/ColumnPickerPanel.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - NX00-UI-SHARED-LISTFORM-COLPICK-001：Column picker（toggle + drag reorder + reset all）
 */

'use client';

import { useRef } from 'react';
import { arrayMove } from '@/shared/lib/arrayMove';

export type ColumnDef<K extends string> = {
    key: K;
    label: string;
    locked?: boolean; // e.g. username 必須顯示
};

type Props<K extends string> = {
    open: boolean;
    onClose?: () => void;

    title?: string;

    allKeys: K[];
    defsByKey: Record<K, ColumnDef<K>>;

    visibleKeys: K[];
    orderKeys: K[];

    onChangeVisibleKeys: (next: K[]) => void;
    onChangeOrderKeys: (next: K[]) => void;

    onResetAllSelected: () => void;
};

export function ColumnPickerPanel<K extends string>(props: Props<K>) {
    const dragKeyRef = useRef<K | null>(null);

    const onDragStart = (key: K) => {
        dragKeyRef.current = key;
    };

    const onDropTo = (toKey: K) => {
        const fromKey = dragKeyRef.current;
        dragKeyRef.current = null;
        if (!fromKey || fromKey === toKey) return;

        const fromIdx = props.orderKeys.indexOf(fromKey);
        const toIdx = props.orderKeys.indexOf(toKey);
        if (fromIdx < 0 || toIdx < 0) return;

        props.onChangeOrderKeys(arrayMove(props.orderKeys, fromIdx, toIdx));
    };

    if (!props.open) return null;

    return (
        <div className="absolute left-3 top-12 z-20 w-[360px] rounded-xl border border-white/10 bg-black/70 p-3 shadow-lg">
            <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold text-white/80">{props.title ?? '顯示欄位（可拖拉排序）'}</div>

                <div className="flex items-center gap-2">
                    {props.onClose && (
                        <button
                            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70 hover:bg-white/10"
                            onClick={props.onClose}
                        >
                            關閉
                        </button>
                    )}

                    <button
                        className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70 hover:bg-white/10"
                        onClick={props.onResetAllSelected}
                        title="重置為全選"
                    >
                        重置（全選）
                    </button>
                </div>
            </div>

            <div className="max-h-[320px] overflow-auto pr-1">
                {props.orderKeys.map((key) => {
                    const def = props.defsByKey[key];
                    const checked = props.visibleKeys.includes(key);
                    const locked = Boolean(def.locked);

                    return (
                        <div
                            key={key}
                            className="mb-2 flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-2 py-2"
                            draggable
                            onDragStart={() => onDragStart(key)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => onDropTo(key)}
                            title="拖拉以調整欄位順序"
                        >
                            <label className="flex cursor-pointer items-center gap-2 text-xs text-white/80">
                                <input
                                    type="checkbox"
                                    checked={locked ? true : checked}
                                    disabled={locked}
                                    onChange={() => {
                                        if (locked) return;

                                        props.onChangeVisibleKeys(
                                            checked ? props.visibleKeys.filter((x) => x !== key) : [...props.visibleKeys, key],
                                        );
                                    }}
                                />
                                <span>{def.label}</span>
                            </label>

                            <span className="text-xs text-white/40">⠿</span>
                        </div>
                    );
                })}
            </div>

            <div className="mt-2 text-[11px] text-white/40">設定將記憶（先本機/帳號綁定，下一步接 DB）。</div>
        </div>
    );
}