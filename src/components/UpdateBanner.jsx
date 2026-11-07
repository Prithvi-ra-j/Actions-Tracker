import React, { useState } from 'react';

export default function UpdateBanner({ updateInfo }) {
  const [dismissed, setDismissed] = useState(false);

  if (!updateInfo || dismissed) return null;

  function handleUpdate() {
    window.open(updateInfo.releaseUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
      display: 'flex',
      gap: '10px',
      alignItems: 'center',
      padding: '12px 14px',
      borderRadius: '12px',
      background: 'var(--s2)',
      font: '500 13px var(--f)',
      marginBottom: '14px',
      boxShadow: 'inset 3px 0 0 var(--ac)',
    }}>
      Update {updateInfo.latestVersion} available
      <button
        type="button"
        style={{ marginLeft: 'auto', font: '600 12.5px var(--f)', color: 'var(--ac)', cursor: 'pointer', border: 0, background: 'transparent' }}
        onClick={handleUpdate}
      >
        View release
      </button>
      <button
        type="button"
        aria-label="Dismiss update notification"
        style={{ font: '600 12.5px var(--f)', color: 'var(--mu)', cursor: 'pointer', border: 0, background: 'transparent' }}
        onClick={() => setDismissed(true)}
      >
        Dismiss
      </button>
    </div>
  );
}
