/** Remove UTF-8 BOM so csv-parse column names match (e.g. view_code not ﻿view_code). */
export function stripUtf8Bom(content: string): string {
  return content.replace(/^\uFEFF/, '');
}
