/**
 * @FUNCTION_CODE NX02-PO-UI-002-F01
 */

import { PoDocPage } from '@/features/document-demo/PoDocPage';

export default function PurchasePoPage() {
  return (
    <div className="flex min-h-[calc(100dvh-12.5rem)] w-full min-w-0 max-w-full flex-1 flex-col overflow-x-hidden px-1 pb-6 pt-1 md:px-2">
      <PoDocPage />
    </div>
  );
}
