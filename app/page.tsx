'use client';

import { useState, useEffect, useCallback } from 'react';
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

export default function Home() {
  const [books, setBooks] = useState<BookFile[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [currentBook, setCurrentBook] = useState<BookFile | null>(null);
  const [settings, setSettings] = useState<Settings>(getSettings());
  const [isLoading, setIsLoading] = useState(true);

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
    setIsLoading(true);
    try {
      for (const file of Array.from(files)) {
        await saveBook(file);
      }
    } catch (err) {
      alert(`파일 처리 중 오류가 발생했습니다:\n${(err as Error).message}`);
    } finally {
      await loadBooks();
    }
  }, [loadBooks]);

  // 책 열기
  const handleOpen = useCallback(async (id: string) => {
    const book = await getBook(id);
    if (book) {
      await updateBookLastRead(id);
      setCurrentBook(book);
    }
  }, []);

  // 책 삭제
  const handleDelete = useCallback(async (id: string) => {
    await deleteBook(id);
    await loadBooks();
  }, [loadBooks]);

  // 설정 변경
  const handleSettingsChange = useCallback((newSettings: Settings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  }, []);

  // 뒤로가기
  const handleBack = useCallback(() => {
    setCurrentBook(null);
    loadBooks();
  }, [loadBooks]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (currentBook) {
    return (
      <ReaderView
        book={currentBook}
        settings={settings}
        onSettingsChange={handleSettingsChange}
        onBack={handleBack}
      />
    );
  }

  return (
    <LibraryView
      books={books}
      progressMap={progressMap}
      onOpen={handleOpen}
      onDelete={handleDelete}
      onFilesSelected={handleFilesSelected}
    />
  );
}
