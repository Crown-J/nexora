/** 與 nx-api PagedResult 對齊 */
export type PagedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};
