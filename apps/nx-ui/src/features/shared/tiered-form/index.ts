// apps/nx-ui/src/features/shared/tiered-form/index.ts
// LITE 階段 1 M5：三層欄位框架 barrel export

export { TieredFormProvider, useTieredForm, useTieredFormSafe } from './TieredFormProvider';
export type { TieredFormContextValue, TieredFormProviderProps } from './TieredFormProvider';
export { TieredField } from './TieredField';
export type { TieredFieldProps } from './TieredField';
export { TieredFormToolbar } from './TieredFormToolbar';
export type { TieredFormToolbarProps } from './TieredFormToolbar';
export {
  TIER_ICON,
  TIER_LABEL_ZH,
  MODE_LABEL_ZH,
  type FieldTier,
  type TieredDisplayMode,
} from '@data/types/shared/tiered-form';
