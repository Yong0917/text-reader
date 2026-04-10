import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface BookFile {
  id: string;
  name: string;
  content: string;
  size: number;
  type: string;
  addedAt: number;
  lastReadAt: number;
}

interface ReadingProgress {
  fileId: string;
  scrollTop: number;
  scrollHeight: number;
  paraIndex?: number;      // first visible paragraph index (pixel-independent)
  avgParaHeight?: number;  // measured average paragraph height for this device/settings
  updatedAt: number;
}

export interface Bookmark {
  id: string;       // `${fileId}::${scrollTop}`
  fileId: string;
  scrollTop: number;
  label: string;    // 해당 위치의 텍스트 스니펫
  createdAt: number;
}

interface TextReaderDB extends DBSchema {
  books: {
    key: string;
    value: BookFile;
    indexes: { 'by-lastReadAt': number };
  };
  progress: {
    key: string;
    value: ReadingProgress;
  };
  bookmarks: {
    key: string;
    value: Bookmark;
    indexes: { 'by-fileId': string };
  };
}

let dbInstance: IDBPDatabase<TextReaderDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<TextReaderDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<TextReaderDB>('text-reader-db', 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const bookStore = db.createObjectStore('books', { keyPath: 'id' });
        bookStore.createIndex('by-lastReadAt', 'lastReadAt');
        db.createObjectStore('progress', { keyPath: 'fileId' });
      }
      if (oldVersion < 2) {
        const bookmarkStore = db.createObjectStore('bookmarks', { keyPath: 'id' });
        bookmarkStore.createIndex('by-fileId', 'fileId');
      }
    },
  });

  return dbInstance;
}

async function extractContent(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (ext === 'epub') {
    const { parseEpub } = await import('./parsers/epub');
    return parseEpub(file);
  }

  if (ext === 'pdf') {
    const { parsePdf } = await import('./parsers/pdf');
    return parsePdf(file);
  }

  if (ext === 'html' || ext === 'htm') {
    const html = await file.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script, style, nav, header, footer').forEach((el) => el.remove());
    return doc.body?.textContent?.replace(/\n{3,}/g, '\n\n').trim() ?? '';
  }

  return file.text();
}

export async function saveBook(file: File): Promise<BookFile> {
  const db = await getDB();
  const content = await extractContent(file);
  const id = `${file.name}-${file.size}-${file.lastModified}`;

  const book: BookFile = {
    id,
    name: file.name,
    content,
    size: file.size,
    type: file.type,
    addedAt: Date.now(),
    lastReadAt: Date.now(),
  };

  await db.put('books', book);
  return book;
}

export async function getAllBooks(): Promise<BookFile[]> {
  const db = await getDB();
  const books = await db.getAllFromIndex('books', 'by-lastReadAt');
  return books.reverse();
}

export async function getBook(id: string): Promise<BookFile | undefined> {
  const db = await getDB();
  return db.get('books', id);
}

export async function updateBookLastRead(id: string): Promise<void> {
  const db = await getDB();
  const book = await db.get('books', id);
  if (book) {
    book.lastReadAt = Date.now();
    await db.put('books', book);
  }
}

export async function deleteBook(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('books', id);
  await db.delete('progress', id);
  // 해당 책의 북마크도 삭제
  const bookmarks = await getBookmarksByFile(id);
  await Promise.all(bookmarks.map((b) => db.delete('bookmarks', b.id)));
}

export async function saveProgress(fileId: string, scrollTop: number, scrollHeight: number, paraIndex?: number, avgParaHeight?: number): Promise<void> {
  const db = await getDB();
  await db.put('progress', { fileId, scrollTop, scrollHeight, paraIndex, avgParaHeight, updatedAt: Date.now() });
}

export async function getProgress(fileId: string): Promise<ReadingProgress | undefined> {
  const db = await getDB();
  return db.get('progress', fileId);
}

// 북마크
export async function addBookmark(fileId: string, scrollTop: number, label: string): Promise<Bookmark> {
  const db = await getDB();
  const bookmark: Bookmark = {
    id: `${fileId}::${scrollTop}`,
    fileId,
    scrollTop,
    label,
    createdAt: Date.now(),
  };
  await db.put('bookmarks', bookmark);
  return bookmark;
}

export async function removeBookmark(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('bookmarks', id);
}

export async function getBookmarksByFile(fileId: string): Promise<Bookmark[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('bookmarks', 'by-fileId', fileId);
  return all.sort((a, b) => a.scrollTop - b.scrollTop);
}

export type { BookFile, ReadingProgress };
