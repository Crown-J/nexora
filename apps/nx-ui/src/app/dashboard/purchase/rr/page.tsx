/**
 * @FUNCTION_CODE NX02-RR-UI-001-F01
 */

import { RrDocPage } from '@/features/document-demo/RrDocPage';

export default function PurchaseRrPage() {
  return (
    <div className="flex min-h-[calc(100dvh-12.5rem)] w-full min-w-0 max-w-full flex-1 flex-col overflow-x-hidden px-1 pb-6 pt-1 md:px-2">
      <RrDocPage />
    </div>
  );
}
