/**
 * @FUNCTION_CODE NX04-QT-UI-001-F01
 */

import { QtDocPage } from '@/features/document-demo/QtDocPage';

export default function SaleQtPage() {
  return (
    <div className="flex min-h-[calc(100dvh-12.5rem)] w-full min-w-0 max-w-full flex-1 flex-col overflow-x-hidden px-1 pb-6 pt-1 md:px-2">
      <QtDocPage />
    </div>
  );
}
