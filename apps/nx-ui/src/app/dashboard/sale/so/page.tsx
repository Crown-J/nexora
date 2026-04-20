/**
 * @FUNCTION_CODE NX04-SO-UI-001-F01
 */

import { SoDocPage } from '@/features/document-demo/SoDocPage';

export default function SaleSoPage() {
  return (
    <div className="flex min-h-[calc(100dvh-12.5rem)] w-full min-w-0 max-w-full flex-1 flex-col overflow-x-hidden px-1 pb-6 pt-1 md:px-2">
      <SoDocPage />
    </div>
  );
}
