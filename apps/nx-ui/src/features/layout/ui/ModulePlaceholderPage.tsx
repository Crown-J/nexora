/**
 * File: apps/nx-ui/src/features/layout/ui/ModulePlaceholderPage.tsx
 * Project: NEXORA (Monorepo)
 *
 * Purpose:
 * - 模組尚未完成業務 UI 時的輕量占位（標題、說明、開發中提示）
 */

type ModulePlaceholderPageProps = {
  title: string;
  description: string;
  /** 預設 true；NX00 等已有子頁的模組可設 false 以隱藏「開發中」提示 */
  showDevNotice?: boolean;
};

export function ModulePlaceholderPage({
  title,
  description,
  showDevNotice = true,
}: ModulePlaceholderPageProps) {
  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold tracking-wide text-white/95">{title}</h1>
      <p className="max-w-xl text-sm leading-relaxed text-white/65">{description}</p>
      {showDevNotice ? (
        <p className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-100/90">
          此模組功能開發中，後續將提供完整作業畫面。
        </p>
      ) : null}
    </div>
  );
}
