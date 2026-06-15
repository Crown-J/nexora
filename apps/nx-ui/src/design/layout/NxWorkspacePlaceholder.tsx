'use client';

export type NxWorkspacePlaceholderProps = {
  /** @FUNCTION_CODE 對應 TASK 規格 */
  functionCode: string;
  title: string;
  desc: string;
};

/**
 * v2 模組工作台佔位頁（TASK-0420）
 */
export function NxWorkspacePlaceholder({ functionCode, title, desc }: NxWorkspacePlaceholderProps) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="text-4xl" aria-hidden>
        🚧
      </div>
      <p className="font-mono text-xs text-[#888780]">{functionCode}</p>
      <h1 className="text-xl font-medium text-[#f0ede8]">{title}</h1>
      <p className="text-sm text-[#888780]">{desc}</p>
    </div>
  );
}
