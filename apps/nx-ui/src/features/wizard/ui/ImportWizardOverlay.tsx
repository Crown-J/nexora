// apps/nx-ui/src/features/wizard/ui/ImportWizardOverlay.tsx
// v1.2 對齊軌 C：匯入精靈全螢幕浮層 shell
//
// 對齊 v1.2 §3.2 結構：
//   1. 歡迎 + 「全部略過」選項
//   2. 建議匯入順序（純清單、無依賴提示框）
//   3~9. 7 個資料類匯入頁
//   10. 完成統計
//
// 2026-06-03 調整：
//   - downloadTemplate 改 fetch+JWT+blob、修 401
//   - overlay 換 glass-card nx-glass-raised 玻璃質感、對齊首頁/主檔中心
//   - OrderPage 拿掉黃底依賴提示框

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

import {
  completeImportWizard,
  confirmImport,
  downloadTemplate,
  listImportHistory,
  previewImport,
  type ConfirmResult,
  type PreviewResult,
} from '../api';
import type { ImportBatch } from '../types';
import { IMPORT_TYPES } from '../types';
import { ActivationStep } from './ActivationStep';

interface Props {
  onClose: () => void;
}

type Page =
  | 'welcome'
  | 'order'
  | 'employee'
  | 'partner'
  | 'warehouse'
  | 'product'
  | 'purchase-history'
  | 'sale-history'
  | 'voucher'
  | 'completion';

const PAGE_ORDER: Page[] = [
  'welcome',
  'order',
  'employee',
  'partner',
  'warehouse',
  'product',
  'purchase-history',
  'sale-history',
  'voucher',
  'completion',
];

const PRIMARY_BTN =
  'rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50';
const SECONDARY_BTN =
  'rounded-lg border border-border/80 bg-secondary/40 px-4 py-2 text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-secondary/60 disabled:opacity-50';
const GHOST_BTN =
  'rounded-lg border border-transparent px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-border/80 hover:text-foreground';

export function ImportWizardOverlay({ onClose }: Props) {
  const [page, setPage] = useState<Page>('welcome');
  const [history, setHistory] = useState<ImportBatch[]>([]);
  const [finalizing, setFinalizing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const goNext = () => {
    const idx = PAGE_ORDER.indexOf(page);
    if (idx < PAGE_ORDER.length - 1) setPage(PAGE_ORDER[idx + 1]);
  };
  const goPrev = () => {
    const idx = PAGE_ORDER.indexOf(page);
    if (idx > 0) setPage(PAGE_ORDER[idx - 1]);
  };

  const skipAll = async () => {
    setFinalizing(true);
    setErr(null);
    try {
      await completeImportWizard();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '完成失敗');
    } finally {
      setFinalizing(false);
    }
  };

  const finishWizard = async () => {
    setFinalizing(true);
    setErr(null);
    try {
      await completeImportWizard();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '完成失敗');
    } finally {
      setFinalizing(false);
    }
  };

  const reloadHistory = useCallback(async () => {
    try {
      const h = await listImportHistory();
      setHistory(h);
    } catch {
      // 載入歷史失敗不影響流程
    }
  }, []);

  useEffect(() => {
    if (page === 'completion') void reloadHistory();
  }, [page, reloadHistory]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="glass-card nx-glass-raised flex h-full max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-border/80">
        {/* Progress bar — 用 token + amber primary */}
        <div className="flex items-center gap-1 border-b border-border/70 px-6 py-3">
          {PAGE_ORDER.map((p, i) => (
            <div
              key={p}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                PAGE_ORDER.indexOf(page) >= i
                  ? 'bg-primary shadow-[0_0_6px_rgba(232,160,32,0.5)]'
                  : 'bg-secondary',
              )}
            />
          ))}
          <span className="ml-3 text-xs tabular-nums text-muted-foreground">
            {PAGE_ORDER.indexOf(page) + 1} / {PAGE_ORDER.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {page === 'welcome' ? (
            <WelcomePage onStart={goNext} onSkipAll={() => void skipAll()} skipping={finalizing} />
          ) : page === 'order' ? (
            <OrderPage onNext={goNext} onPrev={goPrev} />
          ) : page === 'completion' ? (
            <CompletionPage history={history} onFinish={() => void finishWizard()} finalizing={finalizing} />
          ) : (
            <ImporterPage page={page} onNext={goNext} onPrev={goPrev} onReloadHistory={reloadHistory} />
          )}

          {err ? (
            <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive-foreground">
              {err}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function WelcomePage({
  onStart,
  onSkipAll,
  skipping,
}: {
  onStart: () => void;
  onSkipAll: () => void;
  skipping: boolean;
}) {
  return (
    <div className="space-y-6 text-center">
      <div className="text-6xl">🪄</div>
      <h1 className="text-3xl font-bold text-foreground">歡迎使用 NEXORA！</h1>
      <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground">
        接下來會引導您把現有資料匯入系統。
        <br />
        所有步驟都可以略過、之後到主畫面右上「精靈引導」按鈕重開。
        <br />
        <br />
        如果您是新公司、沒有舊資料、可以全部跳過。
      </p>
      <div className="flex justify-center gap-3 pt-4">
        <button onClick={onStart} className={PRIMARY_BTN}>
          開始引導
        </button>
        <button onClick={onSkipAll} disabled={skipping} className={SECONDARY_BTN}>
          {skipping ? '處理中…' : '全部略過、之後再說'}
        </button>
      </div>
    </div>
  );
}

function OrderPage({ onNext, onPrev }: { onNext: () => void; onPrev: () => void }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">建議匯入順序（不強制）</h1>
      <ol className="space-y-2 text-sm">
        {IMPORT_TYPES.map((t, i) => (
          <li
            key={t.key}
            className="glass-card flex gap-3 rounded-xl border border-border/70 p-3 transition-colors hover:border-primary/35"
          >
            <span className="font-mono text-primary">{i + 1}.</span>
            <div>
              <div className="font-semibold text-foreground">{t.label}</div>
              <div className="text-xs text-muted-foreground">{t.desc}</div>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex justify-between pt-4">
        <button onClick={onPrev} className={GHOST_BTN}>
          ← 上一步
        </button>
        <button onClick={onNext} className={PRIMARY_BTN}>
          繼續 →
        </button>
      </div>
    </div>
  );
}

function ImporterPage({
  page,
  onNext,
  onPrev,
  onReloadHistory,
}: {
  page: Page;
  onNext: () => void;
  onPrev: () => void;
  onReloadHistory: () => Promise<void>;
}) {
  const typeInfo = IMPORT_TYPES.find((t) => t.key === page);
  const title = typeInfo?.label ?? page;
  const desc = typeInfo?.desc ?? '';

  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [confirmed, setConfirmed] = useState<ConfirmResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setErr(null);
    setUploading(true);
    setPreview(null);
    setConfirmed(null);
    try {
      const p = await previewImport(page, file);
      setPreview(p);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '上傳失敗');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setConfirming(true);
    setErr(null);
    try {
      const c = await confirmImport(preview.batchId);
      setConfirmed(c);
      await onReloadHistory();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '匯入失敗');
    } finally {
      setConfirming(false);
    }
  };

  const handleDownload = async () => {
    setErr(null);
    setDownloading(true);
    try {
      await downloadTemplate(page);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '下載範本失敗');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">匯入【{title}】</h1>
      <p className="text-sm text-muted-foreground">{desc}</p>

      {page === 'voucher' ? (
        <div className="glass-card rounded-xl border border-primary/30 p-4 text-sm text-foreground">
          <p className="font-semibold text-primary">⭐ 票據雙標機制（v1.2 §3.2 + C4）</p>
          <p className="mt-2 text-muted-foreground">
            匯入時必選「已上報國稅局」或「未上報」、已上報的票據只進系統當查詢用、
            不會進 NEXORA 的 401 報表計算。
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            ⚠️ voucher 完整 importer 屬 NX05 範圍、本軌僅做欄位預埋。
          </p>
        </div>
      ) : null}

      {!preview && !confirmed ? (
        <div className="space-y-4">
          <div className="glass-card rounded-xl border-2 border-dashed border-border/60 p-8 text-center">
            <div className="text-4xl">📊</div>
            <h2 className="mt-3 font-semibold text-foreground">下載範本 + 上傳資料</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              請先下載範本、填好資料後上傳。
              <br />
              範本第 1 列是欄位名、第 2 列是說明、第 3 列是範例、第 4 列起填您的資料。
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <button
                onClick={() => void handleDownload()}
                disabled={downloading}
                className={SECONDARY_BTN}
              >
                {downloading ? '下載中…' : '⬇️ 下載 Excel 範本'}
              </button>
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className={PRIMARY_BTN}>
                {uploading ? '上傳中…' : '⬆️ 選擇檔案'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFileSelect(f);
                }}
                className="hidden"
              />
            </div>
          </div>
        </div>
      ) : null}

      {preview && !confirmed ? (
        <div className="space-y-4">
          <div className="glass-card rounded-xl border border-border/70 p-4">
            <h3 className="text-sm font-semibold text-foreground">📋 上傳預覽：{preview.fileName}</h3>
            <div className="mt-2 flex gap-4 text-sm text-foreground">
              <span>
                共 <strong>{preview.totalRows}</strong> 筆
              </span>
              <span className="text-emerald-400">✅ {preview.successRows} 筆通過驗證</span>
              {preview.failedRows > 0 ? (
                <span className="text-rose-400">⚠️ {preview.failedRows} 筆有問題</span>
              ) : null}
            </div>
          </div>
          {preview.errors.length > 0 ? (
            <details className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs">
              <summary className="cursor-pointer font-semibold text-destructive-foreground">
                ⚠️ {preview.errors.length} 筆錯誤（點看詳情）
              </summary>
              <ul className="ml-4 mt-2 list-disc text-destructive-foreground">
                {preview.errors.slice(0, 50).map((e, i) => (
                  <li key={i}>
                    第 {e.rowNo} 列：{e.reason}
                  </li>
                ))}
                {preview.errors.length > 50 ? <li>… 還有 {preview.errors.length - 50} 筆</li> : null}
              </ul>
            </details>
          ) : null}
          <div className="flex gap-2">
            <button
              onClick={() => void handleConfirm()}
              disabled={confirming || preview.successRows === 0}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500 disabled:opacity-50"
            >
              {confirming ? '匯入中…' : `✅ 確認匯入 ${preview.successRows} 筆`}
            </button>
            <button
              onClick={() => {
                setPreview(null);
                if (fileRef.current) fileRef.current.value = '';
              }}
              className={SECONDARY_BTN}
            >
              重傳檔案
            </button>
          </div>
        </div>
      ) : null}

      {confirmed ? (
        <div className="glass-card rounded-xl border border-emerald-500/40 p-4">
          <h3 className="text-lg font-semibold text-emerald-300">✅ 匯入完成</h3>
          <p className="mt-2 text-sm text-foreground">
            成功匯入 <strong>{confirmed.imported}</strong> 筆
            {confirmed.historicalCount > 0 ? (
              <>
                {' '}
                · 其中 <strong>{confirmed.historicalCount}</strong> 筆屬資料起算點之前的歷史（只進查詢、不計入報表）
              </>
            ) : null}
          </p>
          {confirmed.errors.length > 0 ? (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer text-primary">⚠️ {confirmed.errors.length} 筆有問題</summary>
              <ul className="ml-4 mt-2 list-disc text-muted-foreground">
                {confirmed.errors.slice(0, 30).map((e, i) => (
                  <li key={i}>
                    第 {e.rowNo} 列：{e.reason}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}

      {err ? <div className="text-sm text-destructive">{err}</div> : null}

      {page === 'employee' ? (
        <div className="space-y-3 border-t border-border/60 pt-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">挑啟用（受席次上限保護）</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              員工資料筆數不限、同時啟用受訂閱席次上限管制。負責人已計入「目前啟用」、不需重複勾。
            </p>
          </div>
          <ActivationStep />
        </div>
      ) : null}

      <div className="flex justify-between pt-4">
        <button onClick={onPrev} className={GHOST_BTN}>
          ← 上一步
        </button>
        <div className="flex gap-2">
          <button onClick={onNext} className={GHOST_BTN}>
            略過此類、下一步
          </button>
          <button onClick={onNext} className={PRIMARY_BTN}>
            下一步 →
          </button>
        </div>
      </div>
    </div>
  );
}

function CompletionPage({
  history,
  onFinish,
  finalizing,
}: {
  history: ImportBatch[];
  onFinish: () => void;
  finalizing: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-6xl">🎉</div>
        <h1 className="mt-3 text-3xl font-bold text-foreground">匯入完成！</h1>
      </div>
      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">匯入結果</h2>
        {history.length === 0 ? (
          <div className="glass-card rounded-xl border-2 border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            ⚠️ 您全部略過了、沒有匯入資料（屬正常、新公司沒舊資料時的情況）
          </div>
        ) : (
          <ul className="space-y-2 text-sm">
            {IMPORT_TYPES.map((t) => {
              const h = history.find((b) => b.importType === t.key && b.status === 'imported');
              return (
                <li
                  key={t.key}
                  className="glass-card flex items-center justify-between rounded-xl border border-border/70 p-3"
                >
                  <span className="text-foreground">{t.label}</span>
                  {h ? (
                    <span className="font-mono text-emerald-300">✅ {h.successRows} 筆</span>
                  ) : (
                    <span className="text-muted-foreground">⚠️ 略過</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section className="glass-card rounded-xl border border-border/70 p-4 text-sm">
        <h3 className="font-semibold text-foreground">接下來建議：</h3>
        <ol className="ml-4 mt-2 list-decimal space-y-1 text-muted-foreground">
          <li>到「設定 → 角色與權限」建立員工的職務權限</li>
          <li>到「主檔中心 → 員工」幫員工掛上職務</li>
          <li>您可以按主畫面右上「精靈引導」隨時重開這個精靈</li>
        </ol>
      </section>
      <div className="flex justify-end pt-4">
        <button onClick={onFinish} disabled={finalizing} className={PRIMARY_BTN}>
          {finalizing ? '處理中…' : '開始使用 NEXORA →'}
        </button>
      </div>
    </div>
  );
}
