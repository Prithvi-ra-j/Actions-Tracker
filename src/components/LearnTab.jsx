/**
 * LearnTab — Knowledge domain UI (§53 Learn Tab).
 *
 * Sections:
 *   1. Continue Reading   — books in progress
 *   2. Add Learning       — capture a new learning from a source
 *   3. Recent Learnings   — last 10 learnings, with mastery + application signal
 *
 * Architecture note:
 *   Books are sources. Learnings are the intellectual assets.
 *   Application (personal use of a learning) is stronger evidence than capture.
 *   This distinction is surfaced visually — applied learnings show a badge.
 *
 * Props:
 *   t                  — theme object
 *   books              — array of book records from booksRepository
 *   learnings          — array of Learning records from learningRepository
 *   onUpdatePages      — (bookId, pagesAdded, today) => Promise<void>
 *   onFinishBook       — (bookId, today) => Promise<void>
 *   onAddLearning      — (fields) => Promise<void>
 *   onUpdateMastery    — (learningId, masteryFields) => Promise<void>
 */

import React, { useState, useMemo } from 'react';
import { ACCENT } from '../constants.js';
import { localDateStr } from '../helpers/dateHelpers.js';
import { queryLLM } from '../core/ai/llmClient.js';

// ─── Constants ─────────────────────────────────────────────────────────────────

const SOURCE_TYPES = [
  { value: 'book',         label: 'Book'         },
  { value: 'video',        label: 'Video'        },
  { value: 'article',      label: 'Article'      },
  { value: 'podcast',      label: 'Podcast'      },
  { value: 'conversation', label: 'Conversation' },
  { value: 'experience',   label: 'Experience'   },
  { value: 'other',        label: 'Other'        },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ t, children }) {
  return (
    <div style={{
      fontFamily:    'monospace',
      fontSize:      '0.6rem',
      letterSpacing: '0.2em',
      color:         t.muted,
      textTransform: 'uppercase',
      marginBottom:  '0.75rem',
      marginTop:     '1.5rem',
    }}>
      {children}
    </div>
  );
}

function BookCard({ t, book, onUpdatePages, onFinishBook }) {
  const [adding, setAdding]   = useState(false);
  const [pages, setPages]     = useState('');
  const today = localDateStr();
  const pct   = book.totalPages > 0
    ? Math.round((book.pagesRead / book.totalPages) * 100)
    : 0;

  const handleAdd = async () => {
    const n = parseInt(pages, 10);
    if (!n || n <= 0) return;
    await onUpdatePages(book.id, n, today);
    setPages('');
    setAdding(false);
  };

  return (
    <div style={{
      borderLeft:   `3px solid ${ACCENT}`,
      borderTop:    '1px solid rgba(196,130,26,0.2)',
      borderRight:  '1px solid rgba(196,130,26,0.2)',
      borderBottom: '1px solid rgba(196,130,26,0.2)',
      padding:      '0.85rem',
      marginBottom: '0.6rem',
    }}>
      <div style={{ fontFamily: 'monospace', fontSize: '0.6rem', color: ACCENT, letterSpacing: '0.12em', marginBottom: '0.2rem' }}>
        {book.category?.toUpperCase() ?? 'READING'}
      </div>
      <div style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '0.5rem', lineHeight: 1.4 }}>
        {book.title}
      </div>

      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
        <div style={{ flex: 1, height: 3, background: 'rgba(196,130,26,0.15)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: ACCENT, transition: 'width 0.3s', borderRadius: 3 }} />
        </div>
        <span style={{ fontFamily: 'monospace', fontSize: '0.58rem', color: t.muted, whiteSpace: 'nowrap' }}>
          {book.pagesRead}/{book.totalPages} · {pct}%
        </span>
      </div>

      {/* Actions */}
      {adding ? (
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <input
            type="number"
            min="1"
            value={pages}
            onChange={e => setPages(e.target.value)}
            placeholder="pages"
            autoFocus
            style={{
              flex:        1,
              background:  'transparent',
              border:      `1px solid ${ACCENT}`,
              color:       t.pageText,
              fontFamily:  'monospace',
              fontSize:    '0.75rem',
              padding:     '0.3rem 0.5rem',
              outline:     'none',
              borderRadius: 2,
            }}
          />
          <button
            onClick={handleAdd}
            style={{ background: ACCENT, border: 'none', color: '#000', fontFamily: 'monospace', fontSize: '0.6rem', padding: '0.3rem 0.7rem', cursor: 'pointer', fontWeight: 700 }}
          >
            Log
          </button>
          <button
            onClick={() => setAdding(false)}
            style={{ background: 'transparent', border: `1px solid ${t.border}`, color: t.muted, fontFamily: 'monospace', fontSize: '0.6rem', padding: '0.3rem 0.6rem', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setAdding(true)}
            style={{ background: 'transparent', border: `1px solid ${ACCENT}`, color: ACCENT, fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.1em', padding: '0.3rem 0.75rem', cursor: 'pointer', textTransform: 'uppercase' }}
          >
            + Pages
          </button>
          {book.pagesRead < book.totalPages && (
            <button
              onClick={() => onFinishBook(book.id, today)}
              style={{ background: 'transparent', border: `1px solid ${t.border}`, color: t.muted, fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.1em', padding: '0.3rem 0.75rem', cursor: 'pointer', textTransform: 'uppercase' }}
            >
              Finish
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AddLearningForm({ t, books, onSave, onCancel }) {
  const [concept,      setConcept]      = useState('');
  const [explanation,  setExplanation]  = useState('');
  const [sourceType,   setSourceType]   = useState('book');
  const [sourceId,     setSourceId]     = useState('');
  const [application,  setApplication]  = useState('');
  const [saving,       setSaving]       = useState(false);

  const bookOptions = (books ?? []).filter(b => b.status !== 'not_started');

  const handleSave = async () => {
    if (!concept.trim() || !explanation.trim()) return;
    setSaving(true);
    try {
      await onSave({
        concept:             concept.trim(),
        explanation:         explanation.trim(),
        sourceType,
        sourceId:            sourceType === 'book' && sourceId ? sourceId : null,
        personalApplication: application.trim() || null,
      });
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle = {
    width:       '100%',
    background:  'transparent',
    border:      `1px solid ${t.border}`,
    color:       t.pageText,
    fontFamily:  'Georgia, serif',
    fontSize:    '0.88rem',
    padding:     '0.6rem 0.75rem',
    outline:     'none',
    lineHeight:  1.5,
    boxSizing:   'border-box',
    borderRadius: 2,
    marginBottom: '0.6rem',
  };

  const labelStyle = {
    fontFamily:    'monospace',
    fontSize:      '0.55rem',
    letterSpacing: '0.15em',
    color:         t.muted,
    textTransform: 'uppercase',
    display:       'block',
    marginBottom:  '0.25rem',
  };

  return (
    <div style={{ border: `1px solid ${ACCENT}`, padding: '1rem', marginBottom: '1rem' }}>
      <div style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.15em', color: ACCENT, textTransform: 'uppercase', marginBottom: '0.85rem' }}>
        Capture Learning
      </div>

      <label style={labelStyle}>Concept</label>
      <input
        type="text"
        value={concept}
        onChange={e => setConcept(e.target.value)}
        placeholder="What is the idea?"
        style={{ ...fieldStyle, fontFamily: 'monospace', fontSize: '0.8rem' }}
      />

      <label style={labelStyle}>Explanation — in your own words</label>
      <textarea
        value={explanation}
        onChange={e => setExplanation(e.target.value)}
        placeholder="Explain it as if teaching someone else…"
        rows={3}
        style={{ ...fieldStyle, resize: 'vertical' }}
      />

      <label style={labelStyle}>Source type</label>
      <select
        value={sourceType}
        onChange={e => setSourceType(e.target.value)}
        style={{ ...fieldStyle, fontFamily: 'monospace', fontSize: '0.75rem' }}
      >
        {SOURCE_TYPES.map(s => (
          <option key={s.value} value={s.value} style={{ background: t.pageBg, color: t.pageText }}>{s.label}</option>
        ))}
      </select>

      {sourceType === 'book' && bookOptions.length > 0 && (
        <>
          <label style={labelStyle}>Book</label>
          <select
            value={sourceId}
            onChange={e => setSourceId(e.target.value)}
            style={{ ...fieldStyle, fontFamily: 'monospace', fontSize: '0.75rem' }}
          >
            <option value="" style={{ background: t.pageBg, color: t.pageText }}>— select book —</option>
            {bookOptions.map(b => (
              <option key={b.id} value={b.id} style={{ background: t.pageBg, color: t.pageText }}>{b.title}</option>
            ))}
          </select>
        </>
      )}

      <label style={labelStyle}>
        Personal application <span style={{ color: ACCENT }}>↑ stronger evidence</span>
      </label>
      <textarea
        value={application}
        onChange={e => setApplication(e.target.value)}
        placeholder="How will you (or did you) use this?"
        rows={2}
        style={{ ...fieldStyle, resize: 'vertical', borderColor: application.trim() ? ACCENT : t.border }}
      />

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
        <button
          onClick={handleSave}
          disabled={!concept.trim() || !explanation.trim() || saving}
          style={{
            background:    (!concept.trim() || !explanation.trim()) ? t.subtleBg : ACCENT,
            border:        'none',
            color:         (!concept.trim() || !explanation.trim()) ? t.muted : '#000',
            fontFamily:    'monospace',
            fontSize:      '0.6rem',
            letterSpacing: '0.15em',
            padding:       '0.5rem 1rem',
            cursor:        (!concept.trim() || !explanation.trim()) ? 'default' : 'pointer',
            fontWeight:    700,
            textTransform: 'uppercase',
          }}
        >
          {saving ? 'Saving…' : 'Save Learning'}
        </button>
        <button
          onClick={onCancel}
          style={{ background: 'transparent', border: `1px solid ${t.border}`, color: t.muted, fontFamily: 'monospace', fontSize: '0.6rem', padding: '0.5rem 0.75rem', cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function LearningCard({ t, learning }) {
  const hasApplication = !!(learning.personalApplication?.trim());
  const hasRetention   = (learning.mastery?.retention ?? 0) > 0;
  const state = hasApplication ? 'Applied' : hasRetention ? 'Understood' : 'Captured';
  const stateColor = hasApplication ? ACCENT : hasRetention ? '#4a7ba6' : t.muted;

  return (
    <div style={{
      borderLeft:   `3px solid ${hasApplication ? ACCENT : t.borderSoft}`,
      border:       `1px solid ${t.borderSoft}`,
      padding:      '0.75rem',
      marginBottom: '0.5rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '0.88rem', fontWeight: 700, lineHeight: 1.4, flex: 1 }}>
          {learning.concept}
        </div>
        <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
          <span style={{ fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.1em', background: `${stateColor}18`, color: stateColor, padding: '0.15rem 0.4rem', textTransform: 'uppercase' }}>{state}</span>
        </div>
      </div>

      <div style={{ fontSize: '0.8rem', color: t.muted, lineHeight: 1.5, marginTop: '0.35rem' }}>
        {learning.explanation}
      </div>

      {hasApplication && (
        <div style={{ marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: `1px solid ${t.borderSoft}`, fontSize: '0.75rem', color: t.muted, fontStyle: 'italic', lineHeight: 1.5 }}>
          ↳ {learning.personalApplication}
        </div>
      )}

      <div style={{ fontFamily: 'monospace', fontSize: '0.55rem', color: t.muted, marginTop: '0.5rem', letterSpacing: '0.08em' }}>
        {learning.sourceType?.toUpperCase() ?? 'SOURCE'} · {learning.createdAt?.slice(0, 10) ?? ''}
      </div>
    </div>
  );
}

function VoiceLearningCapture({ t, books, onSave }) {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [draft, setDraft] = useState(null);
  const [status, setStatus] = useState('');
  const [sourceType, setSourceType] = useState('conversation');
  const [sourceId, setSourceId] = useState('');
  const [application, setApplication] = useState('');

  const extractLearning = async text => {
    try {
      setStatus('Turning your note into a learning...');
      const raw = await queryLLM([
        { role: 'system', content: 'Convert spoken learning notes into JSON only. Infer sourceType only from explicit keywords such as book, video, article, podcast, conversation, experience, or other. Never invent a source title.' },
        { role: 'user', content: `Spoken note: ${text}\nReturn {"concept":"","explanation":"","sourceType":"book|video|article|podcast|conversation|experience|other","personalApplication":""}. Leave personalApplication empty when no application was stated.` },
      ], { jsonMode: true, temperature: 0.1, intent: 'learning_capture' });
      const parsed = JSON.parse(raw.replace(/```json/g, '').replace(/```/g, '').trim());
      setDraft(parsed);
      setSourceType(parsed.sourceType || 'conversation');
      setStatus('Review the capture, then save it to your learning library.');
    } catch (error) {
      setStatus(`Capture needs a retry: ${error.message}`);
    }
  };

  const listen = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus('Voice capture is unavailable here. Type the note below instead.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.onstart = () => { setRecording(true); setStatus('Listening...'); };
    recognition.onresult = event => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      extractLearning(text);
    };
    recognition.onerror = () => setStatus('I could not hear that. Try again or type it below.');
    recognition.onend = () => setRecording(false);
    recognition.start();
  };

  const save = async () => {
    if (!draft?.concept || !draft?.explanation) return;
    await onSave({
      concept: draft.concept,
      explanation: draft.explanation,
      sourceType,
      sourceId: sourceType === 'book' ? sourceId || null : null,
      personalApplication: application.trim() || draft.personalApplication || null,
    });
    setTranscript('');
    setDraft(null);
    setApplication('');
    setStatus('Saved to your library.');
  };

  return (
    <div style={{ border: `1px solid ${ACCENT}`, background: t.subtleBg, padding: '1rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: ACCENT, fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Speak a learning</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: '0.35rem' }}>Tell me what stayed with you.</div>
          <div style={{ color: t.muted, fontSize: '0.75rem', lineHeight: 1.5, marginTop: '0.35rem' }}>Mention book, video, conversation, or experience and I will sort the source.</div>
        </div>
        <button onClick={listen} disabled={recording} aria-label="Start voice capture" style={{ width: 52, height: 52, borderRadius: '50%', background: recording ? '#c1442c' : ACCENT, border: 'none', color: '#fff', fontSize: '1.2rem', cursor: recording ? 'default' : 'pointer', flexShrink: 0 }}>{recording ? '■' : '●'}</button>
      </div>
      <textarea value={transcript} onChange={e => { setTranscript(e.target.value); setDraft(null); }} placeholder="Or type the note, then press Enter to process..." rows={3} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && transcript.trim()) { e.preventDefault(); extractLearning(transcript.trim()); } }} style={{ width: '100%', boxSizing: 'border-box', marginTop: '1rem', padding: '0.7rem', background: t.pageBg, color: t.pageText, border: `1px solid ${t.border}`, resize: 'vertical', fontFamily: 'inherit' }} />
      {status && <div style={{ color: t.muted, fontSize: '0.7rem', marginTop: '0.5rem' }}>{status}</div>}
      {draft && (
        <div style={{ marginTop: '1rem', borderTop: `1px solid ${t.border}`, paddingTop: '1rem' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '0.55rem', color: ACCENT, letterSpacing: '0.12em' }}>AI CAPTURE REVIEW</div>
          <input value={draft.concept} onChange={e => setDraft({ ...draft, concept: e.target.value })} style={captureInput(t)} />
          <textarea value={draft.explanation} onChange={e => setDraft({ ...draft, explanation: e.target.value })} rows={3} style={{ ...captureInput(t), resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
            {SOURCE_TYPES.map(source => <button key={source.value} onClick={() => setSourceType(source.value)} style={{ ...captureChip(t), color: sourceType === source.value ? ACCENT : t.muted, borderColor: sourceType === source.value ? ACCENT : t.border }}>{source.label}</button>)}
          </div>
          {sourceType === 'book' && <select value={sourceId} onChange={e => setSourceId(e.target.value)} style={captureInput(t)}><option value="">Link a book (optional)</option>{(books || []).map(book => <option key={book.id} value={book.id}>{book.title}</option>)}</select>}
          <textarea value={application} onChange={e => setApplication(e.target.value)} placeholder="Personal application, or leave empty: Not applied yet" rows={2} style={{ ...captureInput(t), resize: 'vertical' }} />
          <button onClick={save} style={{ background: ACCENT, color: '#fff', border: 'none', padding: '0.6rem 1rem', fontFamily: 'monospace', fontSize: '0.65rem', cursor: 'pointer', textTransform: 'uppercase' }}>Save learning</button>
        </div>
      )}
    </div>
  );
}

function captureInput(t) { return { width: '100%', boxSizing: 'border-box', marginTop: '0.6rem', padding: '0.6rem', background: t.pageBg, color: t.pageText, border: `1px solid ${t.border}`, fontFamily: 'inherit' }; }
function captureChip(t) { return { background: 'transparent', border: `1px solid ${t.border}`, padding: '0.3rem 0.5rem', fontFamily: 'monospace', fontSize: '0.55rem', cursor: 'pointer' }; }

// ─── Main component ────────────────────────────────────────────────────────────

// Valid categories for AI auto-fill mapping
const VALID_CATEGORIES = ['philosophy', 'history_biography', 'strategy', 'outside_goals'];

function mapToValidCategory(aiCategory) {
  if (!aiCategory) return 'philosophy';
  const lower = aiCategory.toLowerCase().replace(/[\s/]+/g, '_');
  if (VALID_CATEGORIES.includes(lower)) return lower;
  // Fuzzy match common AI responses
  if (/histor|biograph|memoir/i.test(aiCategory)) return 'history_biography';
  if (/strateg|business|leadership|management|economics|finance/i.test(aiCategory)) return 'strategy';
  if (/philos|stoic|ethic|metaphys|logic/i.test(aiCategory)) return 'philosophy';
  return 'outside_goals';
}

export default function LearnTab({
  t,
  books,
  learnings,
  onUpdatePages,
  onFinishBook,
  onAddLearning,
  onUpdateMastery,
  onAddBook,
  onStartBook,
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBookForm, setShowBookForm] = useState(false);
  const [bookDraft, setBookDraft] = useState({ title: '', totalPages: '', category: 'philosophy' });
  const [autoFillStatus, setAutoFillStatus] = useState('');  // '', 'loading', 'done', 'error'
  const [autoFillError, setAutoFillError] = useState('');

  const handleAutoFill = async () => {
    if (!bookDraft.title || bookDraft.title.trim().length < 3) return;
    setAutoFillStatus('loading');
    setAutoFillError('');
    try {
      const raw = await queryLLM([
        { role: 'system', content: 'You are a librarian assistant. Given a book title, return JSON with the book details. Only return the JSON object, no other text.' },
        { role: 'user', content: `Book title: "${bookDraft.title.trim()}"

Return a JSON object with these fields:
- "author": string (author name)
- "totalPages": number (approximate page count of the most common edition)
- "category": one of "philosophy", "history_biography", "strategy", or "outside_goals"
- "description": string (1-2 sentence summary)

Return ONLY the JSON object.` },
      ], { jsonMode: true, temperature: 0.1, intent: 'book_autofill' });
      const parsed = JSON.parse(raw.replace(/```json/g, '').replace(/```/g, '').trim());
      setBookDraft(prev => ({
        ...prev,
        totalPages: parsed.totalPages ? String(parsed.totalPages) : prev.totalPages,
        category: mapToValidCategory(parsed.category),
      }));
      setAutoFillStatus('done');
    } catch (err) {
      console.error('[LearnTab] AI auto-fill failed:', err);
      setAutoFillStatus('error');
      setAutoFillError(err.message || 'Auto-fill failed');
    }
  };

  const booksInProgress = useMemo(
    () => (books ?? []).filter(b => b.status === 'in_progress'),
    [books]
  );

  const recentLearnings = useMemo(
    () => [...(learnings ?? [])].sort((a, b) => b.createdAt?.localeCompare(a.createdAt ?? '') ?? 0).slice(0, 10),
    [learnings]
  );

  const appliedCount  = (learnings ?? []).filter(l => l.personalApplication?.trim()).length;
  const totalCount    = (learnings ?? []).length;

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.25em', color: ACCENT, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
          Knowledge
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: 900, lineHeight: 1.3 }}>
          Learning
        </div>
        {totalCount > 0 && (
          <div style={{ fontFamily: 'monospace', fontSize: '0.6rem', color: t.muted, marginTop: '0.35rem', letterSpacing: '0.08em' }}>
            {totalCount} learnings · {appliedCount} applied
            {appliedCount > 0 && (
              <span style={{ color: ACCENT }}> ↑</span>
            )}
          </div>
        )}
      </div>

      {/* ── Your Library ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
        <SectionLabel t={t}>Your Library</SectionLabel>
        <button onClick={() => { setShowBookForm(!showBookForm); setAutoFillStatus(''); setAutoFillError(''); }} style={{ ...captureChip(t), color: ACCENT, borderColor: ACCENT }}>+ Add book</button>
      </div>
      {showBookForm && (
        <div style={{ display: 'grid', gap: '0.5rem', padding: '0.8rem', border: `1px solid ${t.border}`, background: t.subtleBg, marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <input placeholder="Book title" value={bookDraft.title} onChange={e => { setBookDraft({ ...bookDraft, title: e.target.value }); if (autoFillStatus === 'done') setAutoFillStatus(''); }} style={{ ...captureInput(t), flex: 1, marginBottom: 0 }} />
            <button
              onClick={handleAutoFill}
              disabled={autoFillStatus === 'loading' || bookDraft.title.trim().length < 3}
              style={{
                background: autoFillStatus === 'loading' ? t.subtleBg : 'transparent',
                border: `1px solid ${bookDraft.title.trim().length >= 3 ? ACCENT : t.border}`,
                color: bookDraft.title.trim().length >= 3 ? ACCENT : t.muted,
                fontFamily: 'monospace',
                fontSize: '0.55rem',
                letterSpacing: '0.1em',
                padding: '0.45rem 0.65rem',
                cursor: autoFillStatus === 'loading' || bookDraft.title.trim().length < 3 ? 'default' : 'pointer',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}
            >
              {autoFillStatus === 'loading' ? 'Filling…' : 'Auto-fill'}
            </button>
          </div>
          {autoFillStatus === 'done' && (
            <div style={{ fontFamily: 'monospace', fontSize: '0.55rem', color: ACCENT, letterSpacing: '0.08em' }}>Auto-filled — review and adjust if needed</div>
          )}
          {autoFillStatus === 'error' && (
            <div style={{ fontFamily: 'monospace', fontSize: '0.55rem', color: '#c1442c', letterSpacing: '0.08em' }}>{autoFillError || 'Auto-fill failed. Fill manually.'}</div>
          )}
          <input type="number" placeholder="Total pages" value={bookDraft.totalPages} onChange={e => setBookDraft({ ...bookDraft, totalPages: e.target.value })} style={captureInput(t)} />
          <select value={bookDraft.category} onChange={e => setBookDraft({ ...bookDraft, category: e.target.value })} style={captureInput(t)}>
            {['philosophy', 'history_biography', 'strategy', 'outside_goals'].map(category => <option key={category} value={category}>{category.replace('_', ' ')}</option>)}
          </select>
          <button onClick={async () => { if (bookDraft.title && bookDraft.totalPages) { await onAddBook({ ...bookDraft, totalPages: Number(bookDraft.totalPages) }); setBookDraft({ title: '', totalPages: '', category: 'philosophy' }); setShowBookForm(false); setAutoFillStatus(''); } }} style={{ background: ACCENT, border: 'none', color: '#fff', padding: '0.55rem', fontFamily: 'monospace', fontSize: '0.6rem', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Add to library</button>
        </div>
      )}

      {/* ── Library Book List (all statuses) ──────────────────────────────── */}
      {(books ?? []).length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          {(books ?? []).map(book => {
            const statusLabel = book.status === 'in_progress' ? 'READING' : book.status === 'finished' ? 'FINISHED' : 'NOT STARTED';
            const statusColor = book.status === 'in_progress' ? ACCENT : book.status === 'finished' ? '#4a7ba6' : t.muted;
            const pct = book.totalPages > 0 ? Math.round((book.pagesRead / book.totalPages) * 100) : 0;
            return (
              <div key={book.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.6rem 0.5rem',
                borderBottom: `1px solid ${t.borderSoft}`,
              }}>
                {/* Book info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {book.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.1em', color: t.muted, textTransform: 'uppercase' }}>
                      {book.category?.replace('_', ' ') ?? 'reading'}
                    </span>
                    <span style={{ color: t.borderSoft }}>·</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.5rem', letterSpacing: '0.1em', background: `${statusColor}18`, color: statusColor, padding: '0.1rem 0.35rem', textTransform: 'uppercase' }}>
                      {statusLabel}
                    </span>
                    {book.status !== 'not_started' && (
                      <>
                        <span style={{ color: t.borderSoft }}>·</span>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.5rem', color: t.muted }}>
                          {book.pagesRead}/{book.totalPages} ({pct}%)
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {/* Action */}
                {book.status === 'not_started' && onStartBook && (
                  <button
                    onClick={() => onStartBook(book.id, localDateStr())}
                    style={{
                      background: 'transparent',
                      border: `1px solid ${ACCENT}`,
                      color: ACCENT,
                      fontFamily: 'monospace',
                      fontSize: '0.5rem',
                      letterSpacing: '0.1em',
                      padding: '0.3rem 0.6rem',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Start
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {(books ?? []).length === 0 && !showBookForm && (
        <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: t.muted, padding: '0.75rem 0', letterSpacing: '0.08em' }}>
          No books yet. Add your first book above.
        </div>
      )}

      {/* ── Continue Reading ─────────────────────────────────────────────── */}
      {booksInProgress.length > 0 && (
        <>
          <SectionLabel t={t}>Continue Reading</SectionLabel>
          {booksInProgress.map(book => (
            <BookCard
              key={book.id}
              t={t}
              book={book}
              onUpdatePages={onUpdatePages}
              onFinishBook={onFinishBook}
            />
          ))}
        </>
      )}

      {/* ── Add Learning ─────────────────────────────────────────────────────── */}
      <SectionLabel t={t}>Capture Learning</SectionLabel>

      <VoiceLearningCapture t={t} books={books} onSave={onAddLearning} />

      {showAddForm ? (
        <AddLearningForm
          t={t}
          books={books}
          onSave={async (fields) => {
            await onAddLearning(fields);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      ) : (
        <button
          id="btn-add-learning"
          onClick={() => setShowAddForm(true)}
          style={{
            width:         '100%',
            padding:       '0.75rem',
            background:    'transparent',
            border:        `1px dashed ${ACCENT}`,
            color:         ACCENT,
            fontFamily:    'monospace',
            fontSize:      '0.6rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            cursor:        'pointer',
            marginBottom:  '0.25rem',
          }}
        >
          + Capture Learning
        </button>
      )}

      {/* ── Recent Learnings ──────────────────────────────────────────────────── */}
      <SectionLabel t={t}>Recent Learnings</SectionLabel>

      {recentLearnings.length === 0 ? (
        <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: t.muted, padding: '0.75rem 0', letterSpacing: '0.08em' }}>
          No learnings yet. Capture what you're learning — not just what you're reading.
        </div>
      ) : (
        recentLearnings.map(learning => (
          <LearningCard
            key={learning.id}
            t={t}
            learning={learning}
          />
        ))
      )}
    </>
  );
}
