'use client';

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import {
  BookFile,
  Bookmark,
  saveProgress,
  getProgress,
  addBookmark,
  removeBookmark,
  getBookmarksByFile,
} from '@/lib/db';
import { Settings, THEME_STYLES } from '@/lib/settings';
import SettingsPanel from './SettingsPanel';
import SearchPanel from './SearchPanel';
import BookmarkPanel from './BookmarkPanel';

interface ReaderViewProps {
  book: BookFile;
  settings: Settings;
  onSettingsChange: (s: Settings) => void;
  onBack: () => void;
}

function HighlightedText({
  text,
  query,
  isCurrent,
}: {
  text: string;
  query: string;
  isCurrent: boolean;
}) {
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            className={`rounded-sm px-0.5 ${isCurrent ? 'bg-[#c4884a] text-white' : 'bg-[#f0d080] text-[#3a2e10]'}`}
          >
            {part}
          </mark>
        ) : part
      )}
    </>
  );
}

// 툴바 버튼
function ToolBtn({ onClick, children, className = '' }: {
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-2.5 rounded-xl active:scale-90 transition-transform duration-100 ${className}`}
    >
      {children}
    </button>
  );
}

export default function ReaderView({ book, settings, onSettingsChange, onBack }: ReaderViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const matchRefs = useRef<(HTMLElement | null)[]>([]);

  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showBar, setShowBar] = useState(true);
  const [readProgress, setReadProgress] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [currentScrollTop, setCurrentScrollTop] = useState(0);
  const [scrollHeight, setScrollHeight] = useState(0);

  const theme = THEME_STYLES[settings.theme];
  const paragraphs = useMemo(() => book.content.split(/\n+/).filter((p) => p.trim()), [book.content]);

  const matches = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return paragraphs
      .map((para, i) => para.toLowerCase().includes(q) ? { paraIndex: i } : null)
      .filter((v): v is { paraIndex: number } => v !== null);
  }, [searchQuery, paragraphs]);

  useEffect(() => { setCurrentMatchIndex(0); }, [searchQuery]);

  useEffect(() => {
    if (matches.length === 0) return;
    const el = matchRefs.current[matches[currentMatchIndex]?.paraIndex];
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentMatchIndex, matches]);

  useEffect(() => {
    getProgress(book.id).then((prog) => {
      if (prog && scrollRef.current) {
        scrollRef.current.scrollTop = prog.scrollTop;
        setScrollHeight(prog.scrollHeight);
        if (prog.scrollHeight > 0) {
          setReadProgress(Math.min(100, (prog.scrollTop / (prog.scrollHeight - window.innerHeight)) * 100));
        }
      }
    });
    loadBookmarks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id]);

  const loadBookmarks = useCallback(async () => {
    setBookmarks(await getBookmarksByFile(book.id));
  }, [book.id]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight: sh } = scrollRef.current;
    setCurrentScrollTop(scrollTop);
    setScrollHeight(sh);

    const pct = Math.min(100, Math.max(0, (scrollTop / (sh - window.innerHeight)) * 100));
    setReadProgress(pct);

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveProgress(book.id, scrollTop, sh), 500);
  }, [book.id]);

  const handleTap = useCallback(() => {
    if (showSearch || showSettings || showBookmarks) return;
    setShowBar((prev) => !prev);
    if (barTimer.current) clearTimeout(barTimer.current);
    barTimer.current = setTimeout(() => setShowBar(false), 3000);
  }, [showSearch, showSettings, showBookmarks]);

  useEffect(() => {
    barTimer.current = setTimeout(() => setShowBar(false), 3000);
    return () => {
      if (barTimer.current) clearTimeout(barTimer.current);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const openSearch = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSearch(true);
    setShowBar(false);
    if (barTimer.current) clearTimeout(barTimer.current);
  }, []);

  const handleAddBookmark = useCallback(async () => {
    if (!scrollRef.current) return;
    const scrollTop = scrollRef.current.scrollTop;
    let label = '';
    for (const ref of matchRefs.current) {
      if (!ref) continue;
      const rect = ref.getBoundingClientRect();
      if (rect.top >= 0 && rect.top < window.innerHeight) {
        label = ref.textContent?.trim().slice(0, 60) ?? '';
        break;
      }
    }
    if (!label) label = `${Math.round((scrollTop / scrollHeight) * 100)}% 위치`;
    await addBookmark(book.id, scrollTop, label);
    await loadBookmarks();
  }, [book.id, scrollHeight, loadBookmarks]);

  const handleDeleteBookmark = useCallback(async (id: string) => {
    await removeBookmark(id);
    await loadBookmarks();
  }, [loadBookmarks]);

  const handleJumpToBookmark = useCallback((scrollTop: number) => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollTop;
  }, []);

  const fontStyle = settings.fontFamily === 'serif'
    ? { fontFamily: 'var(--font-reading)' }
    : {};

  const iconColor = theme.text;

  return (
    <div className={`fixed inset-0 flex flex-col ${theme.bg}`} style={{ '--reader-bg': theme.bgVar } as React.CSSProperties}>

      {/* 세로 진행률 표시줄 (오른쪽 엣지) */}
      <div className="fixed right-0 top-0 bottom-0 z-20 w-[2px] pointer-events-none">
        <div className="w-full bg-black/5" style={{ height: '100%' }} />
        <div
          className="absolute top-0 left-0 right-0 transition-all duration-500"
          style={{
            height: `${readProgress}%`,
            background: settings.theme === 'dark' ? '#4a8f7a' : '#2c5f4e',
            opacity: 0.5,
          }}
        />
      </div>

      {/* 검색 패널 */}
      {showSearch && (
        <SearchPanel
          settings={settings}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          totalMatches={matches.length}
          currentMatch={currentMatchIndex}
          onPrev={() => setCurrentMatchIndex((i) => (i - 1 + matches.length) % matches.length)}
          onNext={() => setCurrentMatchIndex((i) => (i + 1) % matches.length)}
          onClose={() => { setShowSearch(false); setSearchQuery(''); }}
        />
      )}

      {/* 상단 바 */}
      {!showSearch && (
        <div
          className={`fixed top-0 left-0 right-0 z-30 transition-transform duration-300 safe-top ${
            showBar ? 'translate-y-0' : '-translate-y-full'
          } ${theme.panel} border-b ${theme.border}`}
        >
          <div className="flex items-center gap-1 px-3 py-2.5">
            <ToolBtn onClick={(e) => { e.stopPropagation(); onBack(); }} className={iconColor}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </ToolBtn>
            <p className={`flex-1 text-sm font-medium truncate px-1 ${theme.text}`}>
              {book.name.replace(/\.[^/.]+$/, '')}
            </p>
            {/* 진행률 텍스트 */}
            <span className={`text-xs tabular-nums mr-1 ${theme.subtext}`}>
              {Math.round(readProgress)}%
            </span>
          </div>
        </div>
      )}

      {/* 본문 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
        onClick={handleTap}
      >
        <div className="px-6 pt-20 pb-32 max-w-xl mx-auto">
          {paragraphs.map((para, i) => {
            const isMatchPara = matches.some((m) => m.paraIndex === i);
            const isCurrentPara = matches[currentMatchIndex]?.paraIndex === i;
            return (
              <p
                key={i}
                ref={(el) => { matchRefs.current[i] = el; }}
                className={`${theme.text} mb-5`}
                style={{
                  fontSize: `${settings.fontSize}px`,
                  lineHeight: settings.lineHeight,
                  ...fontStyle,
                }}
              >
                {isMatchPara ? (
                  <HighlightedText text={para} query={searchQuery} isCurrent={isCurrentPara} />
                ) : para}
              </p>
            );
          })}

          {/* 완독 표시 */}
          {readProgress >= 98 && (
            <div className={`flex flex-col items-center gap-2 py-8 ${theme.subtext}`}>
              <div className={`w-8 h-px ${settings.theme === 'dark' ? 'bg-[#3a3530]' : 'bg-[#e0d8cc]'}`} />
              <p className="text-xs">끝</p>
            </div>
          )}
        </div>
      </div>

      {/* 상단 그라디언트 페이드 (툴바와 겹치는 부분) */}
      {!showSearch && (
        <div
          className={`fixed top-0 left-0 right-0 h-24 z-10 pointer-events-none transition-opacity duration-300 ${showBar ? 'opacity-0' : 'opacity-100'}`}
          style={{
            background: `linear-gradient(to bottom, ${theme.bgVar} 0%, transparent 100%)`,
          }}
        />
      )}

      {/* 하단 그라디언트 페이드 */}
      <div
        className="fixed bottom-0 left-0 right-0 h-28 z-10 pointer-events-none"
        style={{
          background: `linear-gradient(to top, ${theme.bgVar} 0%, transparent 100%)`,
        }}
      />

      {/* 하단 툴바 */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-30 transition-transform duration-300 safe-bottom ${
          showBar && !showSearch ? 'translate-y-0' : 'translate-y-full'
        } ${theme.panel} border-t ${theme.border}`}
      >
        <div className="flex justify-end items-center px-3 py-2 gap-0.5">
          <ToolBtn onClick={openSearch} className={iconColor}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-[22px] h-[22px]">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          </ToolBtn>
          <ToolBtn onClick={(e) => { e.stopPropagation(); setShowBookmarks(true); }} className={iconColor}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-[22px] h-[22px]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
            </svg>
          </ToolBtn>
          <ToolBtn onClick={(e) => { e.stopPropagation(); setShowSettings(true); }} className={iconColor}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-[22px] h-[22px]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </ToolBtn>
        </div>
      </div>

      {showSettings && (
        <SettingsPanel settings={settings} onSettingsChange={onSettingsChange} onClose={() => setShowSettings(false)} />
      )}
      {showBookmarks && (
        <BookmarkPanel
          settings={settings}
          bookmarks={bookmarks}
          currentScrollTop={currentScrollTop}
          scrollHeight={scrollHeight}
          onJump={handleJumpToBookmark}
          onAdd={handleAddBookmark}
          onDelete={handleDeleteBookmark}
          onClose={() => setShowBookmarks(false)}
        />
      )}
    </div>
  );
}
