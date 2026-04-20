/**
 * @FUNCTION_CODE NX02-PO-UI-001-F01
 * 國內採購工作台（三欄流程；需求節點 mock）
 */

import { PurchaseDomesticWorkbenchView } from '@/features/purchase/domestic/PurchaseDomesticWorkbenchView';

export default function PurchaseDomesticPage() {
  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col px-1 pb-6 pt-1 md:px-2">
      <PurchaseDomesticWorkbenchView />
    </div>
  );
}
