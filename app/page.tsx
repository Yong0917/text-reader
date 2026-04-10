'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getAllBooks,
  saveBook,
  deleteBook,
  getProgress,
  updateBookLastRead,
  BookFile,
} from '@/lib/db';
import { getSettings, saveSettings, Settings } from '@/lib/settings';
import LibraryView from '@/components/LibraryView';
import DetailView from '@/components/DetailView';
import ReaderView from '@/components/ReaderView';
import SettingsPanel from '@/components/SettingsPanel';
import LoadingOverlay from '@/components/LoadingOverlay';

type View = 'library' | 'detail' | 'reader';

export default function Home() {
  const [books, setBooks] = useState<BookFile[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [settings, setSettings] = useState<Settings>(getSettings());
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('');

  const [view, setView] = useState<View>('library');
  const [selectedBook, setSelectedBook] = useState<BookFile | null>(null);
  const [initialScrollRatio, setInitialScrollRatio] = useState(0);
  const [initialAvgParaHeight, setInitialAvgParaHeight] = useState(80);
  const [showLibrarySettings, setShowLibrarySettings] = useState(false);

  const loadBooks = useCallback(async () => {
    const all = await getAllBooks();
    setBooks(all);

    const map: Record<string, number> = {};
    await Promise.all(
      all.map(async (book) => {
        const prog = await getProgress(book.id);
        if (prog?.scrollRatio !== undefined) {
          map[book.id] = Math.min(100, Math.max(0, prog.scrollRatio * 100));
        } else if (prog && prog.scrollHeight > 0) {
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
    setIsBusy(true);
    setBusyLabel('파일을 추가하는 중');
    try {
      for (const file of Array.from(files)) {
        await saveBook(file);
      }
    } catch (err) {
      alert(`파일 처리 중 오류가 발생했습니다:\n${(err as Error).message}`);
    } finally {
      await loadBooks();
      setIsBusy(false);
    }
  }, [loadBooks]);

  // 책 카드 탭 → 상세 페이지
  const handleSelectBook = useCallback((id: string) => {
    const book = books.find((b) => b.id === id);
    if (!book) return;
    setSelectedBook(book);
    setView('detail');
  }, [books]);

  // 상세 → 리더
  const handleOpenReader = useCallback(async () => {
    if (!selectedBook) return;
    const [prog] = await Promise.all([
      getProgress(selectedBook.id),
      updateBookLastRead(selectedBook.id),
    ]);
    setInitialScrollRatio(prog?.scrollRatio ?? 0);
    setInitialAvgParaHeight(prog?.avgParaHeight ?? 80);
    setView('reader');
  }, [selectedBook]);

  // 뒤로가기 (리더/상세 → 라이브러리)
  const handleBack = useCallback(() => {
    setView('library');
    setSelectedBook(null);
    loadBooks();
  }, [loadBooks]);

  // 상세 → 라이브러리
  const handleDetailBack = useCallback(() => {
    setView('library');
    setSelectedBook(null);
  }, []);

  // 책 삭제 (라이브러리 카드에서)
  const handleDeleteFromLibrary = useCallback(async (id: string) => {
    await deleteBook(id);
    await loadBooks();
  }, [loadBooks]);

  // 책 삭제 (상세 페이지에서)
  const handleDeleteFromDetail = useCallback(async () => {
    if (!selectedBook) return;
    await deleteBook(selectedBook.id);
    setView('library');
    setSelectedBook(null);
    await loadBooks();
  }, [selectedBook, loadBooks]);

  // 설정 변경
  const handleSettingsChange = useCallback((newSettings: Settings) => {
    saveSettings(newSettings);
    setSettings(newSettings);
  }, []);

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

  if (view === 'reader' && selectedBook) {
    return (
      <ReaderView
        book={selectedBook}
        settings={settings}
        initialScrollRatio={initialScrollRatio}
        avgParaHeight={initialAvgParaHeight}
        onBack={handleBack}
      />
    );
  }

  if (view === 'detail' && selectedBook) {
    return (
      <DetailView
        book={selectedBook}
        onOpen={handleOpenReader}
        onDelete={handleDeleteFromDetail}
        onBack={handleDetailBack}
      />
    );
  }

  return (
    <>
      <LibraryView
        books={books}
        progressMap={progressMap}
        onSelect={handleSelectBook}
        onDelete={handleDeleteFromLibrary}
        onFilesSelected={handleFilesSelected}
        onSettingsOpen={() => setShowLibrarySettings(true)}
      />
      {isBusy && (
        <LoadingOverlay
          label={busyLabel}
          detail="대용량 텍스트를 분석하고 서재에 저장하고 있습니다."
        />
      )}
      {showLibrarySettings && (
        <SettingsPanel
          settings={settings}
          isApplying={false}
          onSettingsChange={handleSettingsChange}
          onClose={() => setShowLibrarySettings(false)}
        />
      )}
    </>
  );
}
