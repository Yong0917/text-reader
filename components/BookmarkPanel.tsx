'use client';

import { Bookmark } from '@/lib/db';
import { Settings, THEME_STYLES } from '@/lib/settings';

interface BookmarkPanelProps {
  settings: Settings;
  bookmarks: Bookmark[];
  currentScrollTop: number;
  scrollHeight: number;
  onJump: (scrollTop: number) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function BookmarkPanel({
  settings,
  bookmarks,
  currentScrollTop,
  scrollHeight,
  onJump,
  onAdd,
  onDelete,
  onClose,
}: BookmarkPanelProps) {
  const theme = THEME_STYLES[settings.theme];
  const isAlreadyBookmarked = bookmarks.some(
    (b) => Math.abs(b.scrollTop - currentScrollTop) < 50
  );

  return (
    <>
      <div className="fixed inset-0 z-40 animate-fade-in" onClick={onClose} />

      <div className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-[28px] max-w-lg mx-auto animate-slide-up-sheet ${theme.panelSolid}`}>
        {/* 핸들 */}
        <div className="flex justify-center pt-3.5 pb-1">
          <div className={`w-9 h-[3px] rounded-full ${theme.handle}`} />
        </div>

        <div className="px-6 pb-12 pt-3">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-5">
            <h2 className={`text-lg font-semibold tracking-tight ${theme.text}`}>북마크</h2>
            <button
              onClick={isAlreadyBookmarked ? undefined : onAdd}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 ${
                isAlreadyBookmarked
                  ? `${theme.inputBg} ${theme.subtext} cursor-default`
                  : 'bg-[#2c5f4e] text-white'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill={isAlreadyBookmarked ? 'currentColor' : 'none'}
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
              </svg>
              {isAlreadyBookmarked ? '저장됨' : '현재 위치 저장'}
            </button>
          </div>

          {/* 목록 */}
          {bookmarks.length === 0 ? (
            <div className={`text-center py-12 ${theme.subtext}`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-10 h-10 mx-auto mb-3 opacity-30">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
              </svg>
              <p className="text-sm">저장된 북마크가 없어요</p>
              <p className="text-xs mt-1 opacity-60">현재 위치 저장으로 책갈피를 추가하세요</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {bookmarks.map((bm) => {
                const pct = scrollHeight > 0 ? Math.round((bm.scrollTop / scrollHeight) * 100) : 0;
                return (
                  <div
                    key={bm.id}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border active:scale-[0.985] transition-transform cursor-pointer ${theme.border}`}
                    onClick={() => { onJump(bm.scrollTop); onClose(); }}
                  >
                    {/* 진행률 표시 */}
                    <div className="shrink-0 w-8 text-center">
                      <span className={`text-xs font-bold tabular-nums ${theme.accentText}`}>{pct}%</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug line-clamp-2 ${theme.text}`}>{bm.label}</p>
                      <p className={`text-xs mt-0.5 ${theme.subtext}`}>{formatTime(bm.createdAt)}</p>
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(bm.id); }}
                      className={`shrink-0 p-1.5 rounded-lg transition-colors ${theme.subtext} hover:text-[#e07070]`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
