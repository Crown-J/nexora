// apps/nx-ui/src/app/dashboard/knowledge/search/page.tsx
import { NxWorkspacePlaceholder } from '@design/layout/NxWorkspacePlaceholder';

// @FUNCTION_CODE NX09-SEARCH-UI-001-F01
export default function Page() {
  return (
    <NxWorkspacePlaceholder
      functionCode="NX09-SEARCH-UI-001-F01"
      title="EIP 全文搜尋 ⭐（Postgres FTS）"
      desc="Crown Q3=b 拍板：純 Postgres 原生 tsvector（不裝 Elasticsearch、業界中小 ERP 罕見）。跨 3 主檔（KmArticle / Document / SystemManual）+ ts_rank 排序 + ts_headline snippet + 中文 simple 分詞。API：GET /nx09/search?q=&scope=km|doc|manual|all&limit=20"
    />
  );
}
