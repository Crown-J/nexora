// apps/nx-ui/src/features/wizard/ui/ImportWizardOverlay.tsx
// v1.2 對齊軌 C：匯入精靈全螢幕浮層 shell
//
// 對齊 v1.2 §3.2 結構：
//   1. 歡迎 + 「全部略過」選項
//   2. 建議匯入順序 + 依賴提示
//   3~9. 7 個資料類匯入頁（員工/客戶廠商/倉庫庫位/產品/進貨/銷貨/票據）
//   10. 完成統計
//
// MVP：頁面結構齊全、各匯入頁先放「下載 Excel 範本」+「選擇檔案」按鈕、
//      實際 Excel 解析在 C3 落地。

'use client';

import { useCallback, useEffect, useState } from 'react';

import { completeImportWizard, listImportHistory } from '../api';
import type { ImportBatch } from '../types';
import { IMPORT_TYPES } from '../types';

interface Props {
  onClose: () => void;
}

type Page = 'welcome' | 'order' | 'employee' | 'partner' | 'warehouse' | 'product' | 'purchase-history' | 'sale-history' | 'voucher' | 'completion';

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
    } catch (e) {
      // 載入歷史失敗不影響流程
    }
  }, []);

  useEffect(() => {
    if (page === 'completion') void reloadHistory();
  }, [page, reloadHistory]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-background shadow-2xl">
        {/* Progress bar */}
        <div className="flex items-center gap-1 border-b px-6 py-3">
          {PAGE_ORDER.map((p, i) => (
            <div
              key={p}
              className={`h-1.5 flex-1 rounded-full ${
                PAGE_ORDER.indexOf(page) >= i ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
          <span className="ml-3 text-xs text-muted-foreground">
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
            <div className="mt-4 rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm">
              {err}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function WelcomePage({ onStart, onSkipAll, skipping }: { onStart: () => void; onSkipAll: () => void; skipping: boolean }) {
  return (
    <div className="space-y-6 text-center">
      <div className="text-6xl">🪄</div>
      <h1 className="text-3xl font-bold">歡迎使用 NEXORA！</h1>
      <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
        接下來會引導您把現有資料匯入系統。
        <br />
        所有步驟都可以略過、之後到主畫面右上「精靈引導」按鈕重開。
        <br />
        <br />
        如果您是新公司、沒有舊資料、可以全部跳過。
      </p>
      <div className="flex justify-center gap-3 pt-4">
        <button
          onClick={onStart}
          className="rounded bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground"
        >
          開始引導
        </button>
        <button
          onClick={onSkipAll}
          disabled={skipping}
          className="rounded border px-6 py-2 text-sm disabled:opacity-50"
        >
          {skipping ? '處理中…' : '全部略過、之後再說'}
        </button>
      </div>
    </div>
  );
}

function OrderPage({ onNext, onPrev }: { onNext: () => void; onPrev: () => void }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">建議匯入順序（不強制）</h1>
      <ol className="space-y-2 text-sm">
        {IMPORT_TYPES.map((t, i) => (
          <li key={t.key} className="flex gap-3 rounded border p-3">
            <span className="font-mono text-muted-foreground">{i + 1}.</span>
            <div>
              <div className="font-semibold">{t.label}</div>
              <div className="text-xs text-muted-foreground">{t.desc}</div>
            </div>
          </li>
        ))}
      </ol>
      <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <p>
          ⚠️ 跳著做也可以、但有些資料會互相依賴：
        </p>
        <ul className="ml-4 mt-2 list-disc">
          <li>沒先匯產品、進貨匯入時找不到產品</li>
          <li>沒先匯客戶、銷貨匯入時找不到客戶</li>
        </ul>
        <p className="mt-2">系統會在每一步開頭提示您依賴狀況。</p>
      </div>
      <div className="flex justify-between pt-4">
        <button onClick={onPrev} className="rounded border px-4 py-2 text-sm">← 上一步</button>
        <button onClick={onNext} className="rounded bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground">
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">匯入【{title}】</h1>
      <p className="text-sm text-muted-foreground">
        {desc}
        <br />
        ⚠️ Excel 範本下載 / 上傳預覽 / 確認匯入 屬 C3 範圍、目前 placeholder（MVP）。
      </p>
      <div className="rounded-lg border border-dashed border-primary/40 p-12 text-center">
        <div className="text-4xl">📊</div>
        <h2 className="mt-3 font-semibold">Excel 範本 + 上傳介面</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          C3 階段會在此 render：
          <br />
          1. 「下載 Excel 範本」按鈕
          <br />
          2. 「選擇檔案」或拖拉上傳
          <br />
          3. 上傳後預覽（✅ 成功 N 筆 / ⚠️ 失敗 N 筆 含原因）
          <br />
          4. 修正後重傳 / 略過錯誤、只匯成功的 / 取消
        </p>
      </div>
      {page === 'voucher' ? (
        <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          ⭐ <strong>票據雙標機制</strong>（v1.2 §3.2 + C4）：
          <br />
          匯入時必選「已上報國稅局」或「未上報」、
          已上報的票據只進系統當查詢用、不會進 NEXORA 的 401 報表計算。
        </div>
      ) : null}
      <div className="flex justify-between pt-4">
        <button onClick={onPrev} className="rounded border px-4 py-2 text-sm">← 上一步</button>
        <div className="flex gap-2">
          <button onClick={onNext} className="rounded border px-4 py-2 text-sm">
            略過此類、下一步
          </button>
          <button onClick={onNext} className="rounded bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground">
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
        <h1 className="mt-3 text-3xl font-bold">匯入完成！</h1>
      </div>
      <section>
        <h2 className="mb-3 text-sm font-semibold">匯入結果</h2>
        {history.length === 0 ? (
          <div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
            ⚠️ 您全部略過了、沒有匯入資料（屬正常、新公司沒舊資料時的情況）
          </div>
        ) : (
          <ul className="space-y-2 text-sm">
            {IMPORT_TYPES.map((t) => {
              const h = history.find((b) => b.importType === t.key && b.status === 'imported');
              return (
                <li key={t.key} className="flex items-center justify-between rounded border p-3">
                  <span>{t.label}</span>
                  {h ? (
                    <span className="font-mono text-emerald-700">✅ {h.successRows} 筆</span>
                  ) : (
                    <span className="text-muted-foreground">⚠️ 略過</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section className="rounded border bg-muted/30 p-4 text-sm">
        <h3 className="font-semibold">接下來建議：</h3>
        <ol className="mt-2 ml-4 list-decimal space-y-1">
          <li>到「設定 → 角色與權限」建立員工的職務權限</li>
          <li>到「主檔中心 → 員工」幫員工掛上職務</li>
          <li>您可以按主畫面右上「精靈引導」隨時重開這個精靈</li>
        </ol>
      </section>
      <div className="flex justify-end pt-4">
        <button
          onClick={onFinish}
          disabled={finalizing}
          className="rounded bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {finalizing ? '處理中…' : '開始使用 NEXORA →'}
        </button>
      </div>
    </div>
  );
}
