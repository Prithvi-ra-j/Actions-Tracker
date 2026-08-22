import React, { useState, useEffect } from 'react';
import { getAllBooks, addBook, updateBookStatus, updateBookPagesRead } from '../database/booksRepository.js';
import { localDateStr } from '../helpers/dateHelpers.js';
import { ACCENT } from '../constants.js';

export default function BookTracker({ t }) {
  const [books, setBooks] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [category, setCategory] = useState('philosophy');

  const loadBooks = async () => {
    const data = await getAllBooks();
    setBooks(data);
  };

  useEffect(() => {
    loadBooks();
  }, []);

  const handleAddBook = async () => {
    if (!title || !totalPages) return;
    await addBook({
      title,
      totalPages: parseInt(totalPages, 10),
      category
    });
    setShowAdd(false);
    setTitle('');
    setTotalPages('');
    loadBooks();
  };

  return (
    <div style={{ marginTop: '2rem', padding: '1rem', border: `1px solid ${t.border}`, background: t.subtleBg }}>
      <h2 style={{ fontFamily: 'monospace', color: ACCENT, fontSize: '0.8rem', textTransform: 'uppercase' }}>Book Tracker (Minimal)</h2>
      {books.map(b => (
        <div key={b.id} style={{ marginTop: '1rem', paddingBottom: '1rem', borderBottom: `1px solid ${t.borderSoft}` }}>
          <div><strong style={{ color: t.pageText }}>{b.title}</strong> ({b.category}) - {b.status}</div>
          <div style={{ fontSize: '0.8rem', color: t.muted }}>Progress: {b.pagesRead} / {b.totalPages}</div>
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
            {b.status === 'not_started' && <button onClick={async () => { await updateBookStatus(b.id, 'in_progress', localDateStr()); loadBooks(); }} style={btnStyle(t)}>Start Reading</button>}
            {b.status === 'in_progress' && <button onClick={async () => { await updateBookPagesRead(b.id, 10, localDateStr()); loadBooks(); }} style={btnStyle(t)}>Log 10 Pages</button>}
            {b.status === 'in_progress' && <button onClick={async () => { await updateBookStatus(b.id, 'finished', localDateStr()); loadBooks(); }} style={btnStyle(t)}>Finish</button>}
          </div>
        </div>
      ))}
      {showAdd ? (
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle(t)} />
          <input type="number" placeholder="Total Pages" value={totalPages} onChange={e => setTotalPages(e.target.value)} style={inputStyle(t)} />
          <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle(t)}>
            <option value="philosophy">Philosophy</option>
            <option value="history_biography">History/Biography</option>
            <option value="strategy">Strategy</option>
            <option value="outside_goals">Outside Goals</option>
          </select>
          <button onClick={handleAddBook} style={btnStyle(t)}>Add Book</button>
        </div>
      ) : (
        <button style={{ ...btnStyle(t), marginTop: '1rem' }} onClick={() => setShowAdd(true)}>+ Add Book</button>
      )}
    </div>
  );
}

function inputStyle(t) {
  return {
    padding: '0.5rem',
    background: t.pageBg,
    color: t.pageText,
    border: `1px solid ${t.border}`,
    fontFamily: 'inherit'
  };
}

function btnStyle(t) {
  return {
    padding: '0.5rem',
    background: 'transparent',
    color: t.pageText,
    border: `1px solid ${t.border}`,
    cursor: 'pointer'
  };
}
