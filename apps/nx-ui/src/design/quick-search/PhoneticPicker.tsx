// apps/nx-ui/src/design/quick-search/PhoneticPicker.tsx
// 品名欄特殊輸入元件:支援注音鍵盤碼 + F4 觸發候選詞下拉（執行長 2026-06-17 拍板）
//
// 使用情境：
//   - 業務員不會打中文 → 用注音鍵盤打 CVN → 按 F4 → 下拉「火星塞」候選 → Enter 確認
//   - 或直接打中文「火星塞」→ Enter 跳下一欄（不出聯想）
//
// 範式：F4 trigger 之前一律純文字輸入、不自動 fetch、不閃跳。
'use client';

import { useCallback, useRef, useState } from 'react';

import { quickSearchParts } from '@data/endpoints/nx01/part-search/api/part-search';
import { cn } from '@design/utils/cn';

/**
 * 台灣標準注音鍵盤映射表（key→注音字符）。
 * 例：CVN → ㄏㄒㄙ（火星塞的聲母）
 */
const KEYBOARD_TO_BOPOMOFO: Record<string, string> = {
  '1': 'ㄅ', '2': 'ㄉ', '3': 'ˇ', '4': 'ˋ', '5': 'ㄓ',
  '6': 'ˊ', '7': '˙', '8': 'ㄚ', '9': 'ㄞ', '0': 'ㄢ', '-': 'ㄦ',
  q: 'ㄆ', w: 'ㄊ', e: 'ㄍ', r: 'ㄐ', t: 'ㄔ',
  y: 'ㄗ', u: 'ㄧ', i: 'ㄛ', o: 'ㄟ', p: 'ㄣ',
  a: 'ㄇ', s: 'ㄋ', d: 'ㄎ', f: 'ㄑ', g: 'ㄕ',
  h: 'ㄘ', j: 'ㄨ', k: 'ㄜ', l: 'ㄠ', ';': 'ㄤ',
  z: 'ㄈ', x: 'ㄌ', c: 'ㄏ', v: 'ㄒ', b: 'ㄖ',
  n: 'ㄙ', m: 'ㄩ', ',': 'ㄝ', '.': 'ㄡ', '/': 'ㄥ',
};

/** 鍵盤輸入轉注音字符串、非注音鍵字保留原樣 */
function keyboardToBopomofo(input: string): string {
  return input
    .toLowerCase()
    .split('')
    .map((c) => KEYBOARD_TO_BOPOMOFO[c] ?? c)
    .join('');
}

type Props = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  /** 選定一個候選詞 → 填入 input + 跳下一欄 */
  onSelectName: (name: string) => void;
  /** Enter 沒選候選時：跳下一欄 / 觸發搜尋 */
  onSubmit: () => void;
};

export function PhoneticPicker({
  label,
  value,
  onChange,
  placeholder,
  inputRef,
  onSelectName,
  onSubmit,
}: Props) {
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const reqIdRef = useRef(0);

  /** F4 觸發：把當前 input 視為注音鍵盤碼、轉注音字符、call API 找對應 part name 候選 */
  const triggerPhoneticLookup = useCallback(async () => {
    const raw = value.trim();
    if (!raw) return;
    const myReqId = ++reqIdRef.current;
    setLoading(true);
    setOpen(true);
    setSearched(false);
    try {
      // 先轉注音字符
      const phoneticCode = keyboardToBopomofo(raw);
      // backend syncPhoneticIndex 用 phoneticCode contains 比對、keyword 欄會走 OR (name | phoneticCode)
      const res = await quickSearchParts({
        keyword: phoneticCode,
        includeInactive: true,
        page: 1,
        pageSize: 30,
      });
      if (reqIdRef.current !== myReqId) return;
      // 從料號 name 抽 distinct 候選詞（取前 8 個）
      const seen = new Set<string>();
      const distinct: string[] = [];
      for (const row of res.rows) {
        // 抓 name 第一個語意詞（簡化：取「品名空白前」或全部）
        const trimmed = row.name.trim();
        if (!trimmed || seen.has(trimmed)) continue;
        seen.add(trimmed);
        distinct.push(trimmed);
        if (distinct.length >= 8) break;
      }
      setCandidates(distinct);
      setFocusedIdx(distinct.length > 0 ? 0 : -1);
      setSearched(true);
    } catch {
      if (reqIdRef.current !== myReqId) return;
      setCandidates([]);
      setSearched(true);
    } finally {
      if (reqIdRef.current === myReqId) setLoading(false);
    }
  }, [value]);

  const handleSelect = useCallback(
    (name: string) => {
      setOpen(false);
      setCandidates([]);
      setFocusedIdx(-1);
      setSearched(false);
      onSelectName(name);
      onSubmit();
    },
    [onSelectName, onSubmit],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.nativeEvent.isComposing) return;

      if (e.key === 'F4') {
        e.preventDefault();
        e.stopPropagation();
        void triggerPhoneticLookup();
        return;
      }

      if (e.key === 'ArrowDown' && candidates.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(true);
        setFocusedIdx((i) => Math.min(candidates.length - 1, i + 1));
        return;
      }
      if (e.key === 'ArrowUp' && candidates.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        setFocusedIdx((i) => Math.max(0, i - 1));
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (open && focusedIdx >= 0 && candidates[focusedIdx]) {
          handleSelect(candidates[focusedIdx]);
        } else {
          setOpen(false);
          onSubmit();
        }
        return;
      }

      if (e.key === 'Escape') {
        if (open) {
          e.preventDefault();
          e.stopPropagation();
          setOpen(false);
        }
        return;
      }

      if (e.key === 'Tab') {
        setOpen(false);
      }
    },
    [open, candidates, focusedIdx, triggerPhoneticLookup, onSubmit, handleSelect],
  );

  const handleChange = useCallback(
    (next: string) => {
      onChange(next);
      // 輸入時不自動觸發 lookup、但清空時關下拉
      if (!next.trim()) {
        setOpen(false);
        setCandidates([]);
        setFocusedIdx(-1);
        setSearched(false);
      }
    },
    [onChange],
  );

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1">
      <span className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-[#5A5A60]">
        <span>{label}</span>
        <button
          type="button"
          onClick={() => void triggerPhoneticLookup()}
          className="rounded border border-[#E8A020]/40 bg-[#E8A020]/10 px-1.5 py-px font-mono text-[9px] tracking-normal text-[#E8A020] hover:bg-[#E8A020]/20"
          title="把輸入視為注音鍵盤碼（如 CVN→ㄏㄒㄙ）查料號"
        >
          F4 注音查
        </button>
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className="h-8 rounded-md border border-[#2A2A30] bg-[#0F0F12] px-2 text-xs text-[#E8E8EB] outline-none placeholder:text-[#5A5A60] focus:border-[#E8A020]/60"
      />

      {open && candidates.length > 0 ? (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-md border border-[#2A2A30] bg-[#13131A] shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          {candidates.map((name, i) => (
            <li key={name}>
              <button
                type="button"
                onMouseEnter={() => setFocusedIdx(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(name)}
                className={cn(
                  'flex w-full items-center px-3 py-1.5 text-left text-xs',
                  i === focusedIdx
                    ? 'bg-[#E8A020]/15 text-[#E8A020]'
                    : 'text-[#E8E8EB] hover:bg-[#1A1A22]',
                )}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      ) : open && searched && !loading ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-[#2A2A30] bg-[#13131A] px-3 py-2 text-[11px] text-[#5A5A60] shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          注音「{keyboardToBopomofo(value.trim())}」無對應料號（檢查 phonetic_index 是否已建）
        </div>
      ) : open && loading ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-[#2A2A30] bg-[#13131A] px-3 py-2 text-[11px] text-[#E8A020] shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          注音查詢中:「{keyboardToBopomofo(value.trim())}」…
        </div>
      ) : null}
    </div>
  );
}
