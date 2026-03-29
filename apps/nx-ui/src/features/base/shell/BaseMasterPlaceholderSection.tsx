/**
 * File: apps/nx-ui/src/features/base/shell/BaseMasterPlaceholderSection.tsx
 *
 * Purpose:
 * - 主檔占位內文區（glass-card，與其他主檔頁視覺一致）
 */

import { cn } from '@/lib/utils';

export function BaseMasterPlaceholderSection({
  className,
  message = '此功能畫面建置中，目前為占位頁。測試資料與表單將於後續迭代接上。',
}: {
  className?: string;
  message?: string;
}) {
  return (
    <section
      className={cn(
        'glass-card rounded-2xl border border-border/80 p-6 shadow-sm max-w-3xl',
        className,
      )}
    >
      <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
    </section>
  );
}
