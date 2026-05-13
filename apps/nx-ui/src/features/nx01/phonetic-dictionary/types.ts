// apps/nx-ui/src/features/nx01/phonetic-dictionary/types.ts
// 對應規格：docs/nx01/spec/intent/nx01-10-phonetic-search.md v1.0 §4.1
export type PhoneticDictionaryDto = {
  id: string;
  character: string;
  primaryPhonetic: string;
  altPhonetics: string[];
  primaryInitial: string;
  usageFreq: number;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

export type PagedPhoneticDictionary = {
  page: number;
  pageSize: number;
  total: number;
  rows: PhoneticDictionaryDto[];
};

export type ListPhoneticDictionaryParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  primaryInitial?: string;
  isActive?: boolean;
};

export type CreatePhoneticDictionaryBody = {
  character: string;
  primaryPhonetic: string;
  altPhonetics?: string[];
  primaryInitial: string;
  usageFreq?: number;
  isActive?: boolean;
};

export type UpdatePhoneticDictionaryBody = {
  primaryPhonetic?: string;
  altPhonetics?: string[];
  primaryInitial?: string;
  usageFreq?: number;
  isActive?: boolean;
};
