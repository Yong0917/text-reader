'use client';

import { useRef } from 'react';
import { BookFile } from '@/lib/db';
import BookCard from './BookCard';

interface LibraryViewProps {
  books: BookFile[];
  progressMap: Record<string, number>;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onFilesSelected: (files: FileList) => void;
  onSettingsOpen: () => void;
}

export default function LibraryView({ books, progressMap, onSelect, onDelete, onFilesSelected, onSettingsOpen }: LibraryViewProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="min-h-screen bg-[#f8f5ef]">

      {/* 헤더 */}
      <div className="safe-top bg-[#f8f5ef]">
        <div className="px-6 pt-8 pb-6">
          <div className="flex items-start justify-between">
            <h1
              className="text-4xl text-[#1a1714] tracking-tight leading-none"
              style={{ fontFamily: 'var(--font-editorial)' }}
            >
              서재
            </h1>
            <button
              onClick={onSettingsOpen}
              className="p-2 -mr-1 rounded-xl active:scale-90 transition-transform text-[#a09388]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <div className="h-px flex-1 bg-[#e0d8cc]" />
            <p className="text-xs text-[#a09388] shrink-0">
              {books.length > 0 ? `총 ${books.length}권` : '비어 있음'}
            </p>
          </div>
        </div>
      </div>

      {/* 책 목록 */}
      <div className="px-4 pb-32 space-y-2.5 max-w-lg mx-auto">
        {books.length === 0 ? (
          /* 빈 상태 */
          <div className="animate-fade-in-up flex flex-col items-center justify-center pt-24 pb-16 text-center">
            <div className="w-16 h-16 mb-6 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="#d0c8bc" className="w-14 h-14">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <p
              className="text-xl text-[#5a5248] mb-1.5"
              style={{ fontFamily: 'var(--font-editorial)' }}
            >
              아직 읽을 책이 없어요
            </p>
            <p className="text-sm text-[#a09388]">
              아래 버튼을 눌러 파일을 추가하세요
            </p>
            <p className="text-xs text-[#c0b8b0] mt-1">
              txt · md · epub · pdf · html 지원
            </p>
          </div>
        ) : (
          books.map((book, i) => (
            <BookCard
              key={book.id}
              book={book}
              progress={progressMap[book.id] ?? 0}
              index={i}
              onOpen={onSelect}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      {/* FAB — 파일 추가 */}
      <div className="fixed bottom-8 right-5 safe-bottom z-20">
        <button
          onClick={() => inputRef.current?.click()}
          className="w-14 h-14 rounded-full flex items-center justify-center active:scale-90 transition-transform duration-150"
          style={{
            background: '#2c5f4e',
            boxShadow: '0 4px 20px rgba(44,95,78,0.35), 0 1px 4px rgba(44,95,78,0.2)',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="white" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      {/* 숨겨진 파일 인풋 */}
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.md,.text,.epub,.pdf,.html,.htm"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(e.target.files);
            e.target.value = '';
          }
        }}
      />
    </div>
  );
}
