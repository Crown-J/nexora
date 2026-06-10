// apps/nx-ui/src/app/dashboard/knowledge/document/page.tsx
import { NxWorkspacePlaceholder } from '@/features/layout/ui/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX09-DOCUMENT-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX09-DOCUMENT-UI-001-F01"
      title="制度文件庫（規格 / 規章 / 廠商文件）"
      desc="Document 5 分類 CR/SP/JD/FM/OT + DocumentVersion append-only 版本歷史。API：/nx09/document（5 CRUD）+ /nx09/document/:id/versions"
    />
  );
}
