// apps/nx-ui/src/features/user-zoned/index.ts
// v1.2 對齊軌 階段 E P4：user 分區編輯 barrel

export { UserFormZoned } from './UserFormZoned';
export type { UserFormZonedProps } from './UserFormZoned';
export { UserZonedPage } from './UserZonedPage';
export type { UserZonedPageProps } from './UserZonedPage';
export {
  emptyUserDraft,
  userDraftToBody,
  userRowToDraft,
  type UserDraft,
  type UserRow,
} from './helpers';
