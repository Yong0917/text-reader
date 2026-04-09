'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import {
  getAllBooks,
  saveBook,
  getBook,
  deleteBook,
  getProgress,
  updateBookLastRead,
  BookFile,
} from '@/lib/db';
import { getSettings, saveSettings, Settings } from '@/lib/settings';
import LibraryView from '@/components/LibraryView';
import ReaderView from '@/components/ReaderView';
import LoadingOverlay from '@/components/LoadingOverlay';

interface BusyState {
  label: string;
  detail: string;
}

export default function Home() {
  const [books, setBooks] = useState<BookFile[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [currentBook, setCurrentBook] = useState<BookFile | null>(null);
  const [settings, setSettings] = useState<Settings>(getSettings());
  const [isLoading, setIsLoading] = useState(true);
  const [busyState, setBusyState] = useState<BusyState | null>(null);
  const [isSettingsPending, startSettingsTransition] = useTransition();

  // 책 목록 불러오기
  const loadBooks = useCallback(async () => {
    const all = await getAllBooks();
    setBooks(all);

    // 진행률 계산
    const map: Record<string, number> = {};
    await Promise.all(
      all.map(async (book) => {
        const prog = await getProgress(book.id);
        if (prog && prog.scrollHeight > 0) {
          map[book.id] = Math.min(100, (prog.scrollTop / (prog.scrollHeight - window.innerHeight)) * 100);
        } else {
          map[book.id] = 0;
        }
      })
    );
    setProgressMap(map);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  // 파일 추가
  const handleFilesSelected = useCallback(async (files: FileList) => {
    setBusyState({
      label: '파일을 추가하는 중',
      detail: '대용량 텍스트를 분석하고 서재에 저장하고 있습니다.',
    });
    try {
      for (const file of Array.from(files)) {
        await saveBook(file);
      }
    } catch (err) {
      alert(`파일 처리 중 오류가 발생했습니다:\n${(err as Error).message}`);
    } finally {
      await loadBooks();
      setBusyState(null);
    }
  }, [loadBooks]);

  // 책 열기
  const handleOpen = useCallback(async (id: string) => {
    setBusyState({
      label: '책을 여는 중',
      detail: '저장된 텍스트와 읽던 위치를 불러오고 있습니다.',
    });
    try {
      const book = await getBook(id);
      if (book) {
        await updateBookLastRead(id);
        setCurrentBook(book);
      }
    } finally {
      setBusyState(null);
    }
  }, []);

  // 책 삭제
  const handleDelete = useCallback(async (id: string) => {
    await deleteBook(id);
    await loadBooks();
  }, [loadBooks]);

  // 설정 변경
  const handleSettingsChange = useCallback((newSettings: Settings) => {
    saveSettings(newSettings);
    startSettingsTransition(() => {
      setSettings(newSettings);
    });
  }, [startSettingsTransition]);

  // 뒤로가기
  const handleBack = useCallback(() => {
    setCurrentBook(null);
    loadBooks();
  }, [loadBooks]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f5ef]">
        <LoadingOverlay
          label="서재를 불러오는 중"
          detail="저장된 파일과 읽기 진행률을 정리하고 있습니다."
        />
      </div>
    );
  }

  if (currentBook) {
    return (
      <>
        <ReaderView
          book={currentBook}
          settings={settings}
          isSettingsPending={isSettingsPending}
          onSettingsChange={handleSettingsChange}
          onBack={handleBack}
        />
        {busyState ? <LoadingOverlay label={busyState.label} detail={busyState.detail} /> : null}
      </>
    );
  }

  return (
    <>
      <LibraryView
        books={books}
        progressMap={progressMap}
        onOpen={handleOpen}
        onDelete={handleDelete}
        onFilesSelected={handleFilesSelected}
      />
      {busyState ? <LoadingOverlay label={busyState.label} detail={busyState.detail} /> : null}
    </>
  );
}
