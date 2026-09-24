import React, { useState } from 'react';

export default function UpdateBanner({ updateInfo }) {
  const [dismissed, setDismissed] = useState(false);

  if (!updateInfo || dismissed) return null;

  function handleUpdate() {
    window.open(updateInfo.releaseUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <div style={{ 
      display: 'flex', 
      gap: '10px', 
      alignItems: 'center', 
      padding: '12px 14px', 
      borderRadius: '12px', 
      background: 'var(--s2)', 
      font: '500 13px var(--f)', 
      marginBottom: '14px', 
      boxShadow: 'inset 3px 0 0 var(--ac)' 
    }}>
      Update {updateInfo.latestVersion} available
      <b 
        style={{ marginLeft: 'auto', font: '600 12.5px var(--f)', color: 'var(--ac)', cursor: 'pointer' }}
        onClick={handleUpdate}
      >
        Update
      </b>
      <b 
        style={{ font: '600 12.5px var(--f)', color: 'var(--mu)', cursor: 'pointer' }}
        onClick={() => setDismissed(true)}
      >
        ×
      </b>
    </div>
  );
}
