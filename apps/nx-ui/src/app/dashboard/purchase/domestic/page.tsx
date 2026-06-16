/**
 * @FUNCTION_CODE NX02-PO-UI-001-F01
 * 國內採購工作台（三欄流程；需求節點 mock）
 */

import { PurchaseDomesticWorkbenchView } from '@/features/nx02/domestic/PurchaseDomesticWorkbenchView';

export default function PurchaseDomesticPage() {
  return (
    <div className="flex min-h-[calc(100dvh-12.5rem)] w-full min-w-0 max-w-full flex-1 flex-col overflow-x-hidden px-1 pb-6 pt-1 md:px-2">
      <PurchaseDomesticWorkbenchView />
    </div>
  );
}
