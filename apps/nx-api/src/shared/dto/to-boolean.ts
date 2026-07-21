// apps/nx-api/src/shared/dto/to-boolean.ts
// query string 布林轉換：'false'→false、'true'→true、其餘原樣交給 @IsBoolean 驗證。
// 背景（2026-07-21）：舊寫法 Type 轉 Boolean 會把字串 'false' 轉成 true
//（JS Boolean('false')===true），垃圾桶「只看停用」isActive=false 因此失效——全庫 DTO 一次換掉。
import type { TransformFnParams } from 'class-transformer';

/** 語意對齊 2026-06-03 Nx01ListQueryDto.toOptionalBool：boolean 直送 / 'true'|'1' / 'false'|'0' / 空→undefined；垃圾值原樣回傳交給 @IsBoolean 擋。 */
export const toBoolean = ({ value }: TransformFnParams): unknown => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  const s = String(value).trim().toLowerCase();
  if (s === '') return undefined;
  if (s === 'true' || s === '1') return true;
  if (s === 'false' || s === '0') return false;
  return value;
};
