import React, { useState, useEffect } from 'react';
import { ACCENT } from '../constants.js';
import { saveTelemetryEvent, getAllTelemetry } from '../database/telemetryRepository.js';

export default function ReviewPrompt({ t, currentStats }) {
  const [show, setShow] = useState(false);
  const [rating, setRating] = useState(3);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    async function checkReviewNeeded() {
      // Very simple review trigger: Check if we haven't asked in the last 30 days
      const events = await getAllTelemetry();
      const reviews = events.filter(e => e.type === 'review_submitted');
      
      if (reviews.length === 0) {
        // If no reviews ever, maybe we wait a bit, but for testing let's show it if it's been 30 days since onboarding.
        // For simplicity here, we'll just show it if there's no review yet.
        setShow(true);
      } else {
        reviews.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const lastReview = new Date(reviews[0].timestamp);
        const daysSince = (new Date() - lastReview) / (1000 * 60 * 60 * 24);
        if (daysSince >= 30) {
          setShow(true);
        }
      }
    }
    checkReviewNeeded();
  }, []);

  if (!show) return null;

  async function handleSubmit() {
    await saveTelemetryEvent('review_submitted', new Date().toLocaleDateString('en-CA'), {
      rating,
      feedback,
      statsSnapshot: currentStats
    });
    setShow(false);
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', fontFamily: 'Georgia, serif', color: t.pageText
    }}>
      <div style={{ background: t.pageBg, padding: '2rem', border: `1px solid ${t.border}`, maxWidth: 400, width: '100%' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: ACCENT.wisdom }}>Monthly Stat Review</h2>
        <p style={{ fontSize: '0.9rem', color: t.muted, marginBottom: '1.5rem', lineHeight: '1.4' }}>
          Do your current stats (e.g. Strength {Math.round(currentStats?.strength ?? 0)}) accurately reflect your real-life progress over the last 30 days?
        </p>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          {[1, 2, 3, 4, 5].map(num => (
            <button
              key={num}
              onClick={() => setRating(num)}
              style={{
                width: '40px', height: '40px',
                borderRadius: '50%', border: `1px solid ${rating === num ? ACCENT.wisdom : t.border}`,
                background: rating === num ? ACCENT.wisdom : 'transparent',
                color: rating === num ? '#000' : t.pageText,
                cursor: 'pointer'
              }}
            >
              {num}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: t.muted, marginTop: '-1rem', marginBottom: '1.5rem' }}>
          <span>Not at all</span>
          <span>Perfectly</span>
        </div>

        <textarea
          placeholder="Any specific anomalies? (e.g. 'My strategy jumped too fast because I read a bunch of small books')"
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          style={{
            width: '100%', height: '80px', background: t.subtleBg,
            border: `1px solid ${t.border}`, color: t.pageText,
            padding: '0.75rem', fontFamily: 'inherit', marginBottom: '1.5rem',
            boxSizing: 'border-box'
          }}
        />

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <button onClick={() => setShow(false)} style={{ background: 'transparent', color: t.muted, border: 'none', cursor: 'pointer' }}>
            Skip
          </button>
          <button onClick={handleSubmit} style={{ background: ACCENT.wisdom, color: '#000', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 'bold' }}>
            Submit Review
          </button>
        </div>
      </div>
    </div>
  );
}
