'use client';

import { useEffect, useRef } from 'react';
import { Settings, THEME_STYLES } from '@/lib/settings';

interface SearchPanelProps {
  settings: Settings;
  query: string;
  onQueryChange: (q: string) => void;
  totalMatches: number;
  currentMatch: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

export default function SearchPanel({
  settings,
  query,
  onQueryChange,
  totalMatches,
  currentMatch,
  onPrev,
  onNext,
  onClose,
}: SearchPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const theme = THEME_STYLES[settings.theme];

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const hasResults = query.length > 0 && totalMatches > 0;
  const noResults = query.length > 0 && totalMatches === 0;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 safe-top animate-fade-in-up ${theme.panelSolid} border-b ${theme.border}`}
      style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-center gap-2 px-4 py-3">
        {/* 검색 필드 */}
        <div className={`flex-1 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 ${theme.inputBg}`}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
            className="w-4 h-4 shrink-0 text-[#a09388]">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="검색어 입력..."
            className={`flex-1 bg-transparent outline-none text-sm ${theme.text} placeholder:text-[#a09388]`}
          />
          {query && (
            <button onClick={() => onQueryChange('')} className="text-[#a09388]">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* 결과 카운트 + 이동 */}
        {query.length > 0 && (
          <div className="flex items-center gap-0.5 shrink-0">
            {noResults ? (
              <span className="text-xs text-[#e07070] px-2">없음</span>
            ) : (
              <span className={`text-xs tabular-nums px-2 ${theme.subtext}`}>
                {currentMatch + 1}<span className="opacity-40 mx-0.5">/</span>{totalMatches}
              </span>
            )}
            <button
              onClick={onPrev}
              disabled={!hasResults}
              className={`p-2 rounded-lg disabled:opacity-30 active:scale-90 transition-transform ${theme.text}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
              </svg>
            </button>
            <button
              onClick={onNext}
              disabled={!hasResults}
              className={`p-2 rounded-lg disabled:opacity-30 active:scale-90 transition-transform ${theme.text}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          </div>
        )}

        {/* 닫기 */}
        <button
          onClick={onClose}
          className={`p-2 rounded-xl active:scale-90 transition-transform ${theme.subtext}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
