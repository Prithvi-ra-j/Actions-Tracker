import { dbGet, dbPut, dbGetAll } from './db.js';
import { updateAxisConfig } from './axisConfigRepository.js';
import { addLog } from './logsRepository.js';

// Maps a book category to the stat axis it feeds and the volume weight (spec §4.2)
function categoryToAxisAndWeight(category) {
  switch (category) {
    case 'philosophy':        return { axis: 'knowledge', weight: 1.0 };
    case 'history_biography': return { axis: 'strategy',  weight: 1.0 };
    case 'strategy':          return { axis: 'strategy',  weight: 1.0 };
    case 'outside_goals':     return { axis: 'knowledge', weight: 0.5 };
    default:                  return { axis: 'knowledge', weight: 1.0 };
  }
}

export async function addBook(book) {
  // book: { title, totalPages, category }
  const id = crypto.randomUUID();
  const newBook = {
    id,
    ...book,
    pagesRead: 0,
    status: 'not_started',
    dateStarted: null,
    dateFinished: null
  };
  await dbPut('books', newBook);
  return id;
}

export async function getBook(id) {
  return await dbGet('books', id);
}

export async function getAllBooks() {
  return await dbGetAll('books');
}

export async function updateBookStatus(id, status, dateStr) {
  const book = await getBook(id);
  if (!book) return;

  book.status = status;
  if (status === 'in_progress' && !book.dateStarted) {
    book.dateStarted = dateStr;
  } else if (status === 'finished') {
    book.dateFinished = dateStr;
    const previouslyRead = book.pagesRead;
    book.pagesRead = book.totalPages;

    // Write a book_finished log entry — this is what Phase 2 Volume reads for quest completion
    const { axis, weight } = categoryToAxisAndWeight(book.category);
    const remainingPages = book.totalPages - previouslyRead;
    if (remainingPages > 0) {
      // Log any un-logged pages that were completed on finishing
      await addLog({
        axis,
        type: 'book_pages',
        value: remainingPages,
        date: dateStr,
        meta: { bookId: id, title: book.title, category: book.category, weight }
      });
    }
    await addLog({
      axis,
      type: 'book_finished',
      value: 1,
      date: dateStr,
      meta: { bookId: id, title: book.title, category: book.category, totalPages: book.totalPages, weight }
    });
  }

  await dbPut('books', book);
  await checkAndUpdateStrategyPause();
}

export async function updateBookPagesRead(id, pagesAdded, dateStr) {
  const book = await getBook(id);
  if (!book) return;

  const actualPagesAdded = Math.min(pagesAdded, book.totalPages - book.pagesRead);
  if (actualPagesAdded <= 0) return;

  book.pagesRead += actualPagesAdded;

  // Write a book_pages log — this is what Consistency and Volume read from
  const { axis, weight } = categoryToAxisAndWeight(book.category);
  await addLog({
    axis,
    type: 'book_pages',
    value: actualPagesAdded,
    date: dateStr,
    meta: { bookId: id, title: book.title, category: book.category, weight }
  });

  await dbPut('books', book);
}

// Side-effect wiring for Strategy axis
async function checkAndUpdateStrategyPause() {
  const allBooks = await getAllBooks();
  const isStrategyActive = allBooks.some(b =>
    (b.category === 'history_biography' || b.category === 'strategy') &&
    b.status === 'in_progress'
  );

  await updateAxisConfig('strategy', { paused: !isStrategyActive });
}
