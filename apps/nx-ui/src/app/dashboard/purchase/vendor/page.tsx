/**
 * @FUNCTION_CODE NX02-VEND-UI-001-F01
 * 採購供應商管理（廠商主檔、採購記錄、評鑑／談判 PRO）— DEMO mock
 */

import { PurchaseVendorManagementView } from '@/features/purchase/vendor/PurchaseVendorManagementView';

export default function PurchaseVendorPage() {
  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col px-1 pb-6 pt-1 md:px-2">
      <PurchaseVendorManagementView />
    </div>
  );
}
