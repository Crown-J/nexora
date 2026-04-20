/**
 * @FUNCTION_CODE NX02-PROD-UI-001-F01
 * 採購產品管理（定價、安全量、關聯料）— DEMO mock
 */

import { PurchaseProductManagementView } from '@/features/purchase/product/PurchaseProductManagementView';

export default function PurchaseProductPage() {
  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col px-1 pb-6 pt-1 md:px-2">
      <PurchaseProductManagementView />
    </div>
  );
}
