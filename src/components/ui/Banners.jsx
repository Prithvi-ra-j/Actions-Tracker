import React, { useEffect, useState } from 'react';
import { Warning, WifiSlash, CloudCheck, HardDrives } from '@phosphor-icons/react';

export function GlobalBanners() {
  const [offline, setOffline] = useState(!navigator.onLine);
  
  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', position: 'sticky', top: '64px', zIndex: 9, width: '100%' }}>
      {offline && (
        <Banner 
          icon={<WifiSlash size={16} />}
          text="Offline. Local features are still working."
          color="var(--s2)"
          textColor="var(--tx)"
        />
      )}
      {/* We can expose props or state management for these, but they are defined globally for triggering */}
      <div id="ai-unavailable-banner" style={{ display: 'none' }}>
        <Banner 
          icon={<Warning size={16} />}
          text="AI is currently unavailable. Check Settings."
          color="rgba(229, 72, 77, 0.2)"
          textColor="var(--danger)"
        />
      </div>
      <div id="backup-restored-banner" style={{ display: 'none' }}>
        <Banner 
          icon={<CloudCheck size={16} />}
          text="Backup restored successfully."
          color="rgba(79, 138, 95, 0.2)"
          textColor="var(--strategy)"
        />
      </div>
      <div id="migration-banner" style={{ display: 'none' }}>
        <Banner 
          icon={<HardDrives size={16} />}
          text="Migration in progress... Please do not close the app."
          color="rgba(224, 118, 58, 0.2)"
          textColor="var(--ac)"
        />
      </div>
    </div>
  );
}

function Banner({ icon, text, color, textColor }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      backgroundColor: color,
      color: textColor,
      fontSize: '13px',
      fontWeight: 500,
      backdropFilter: 'blur(4px)'
    }}>
      {icon}
      <span>{text}</span>
    </div>
  );
}

// Helper to trigger banners imperatively for non-React contexts
export const showBanner = (id, duration = 4000) => {
  const el = document.getElementById(id);
  if (el) {
    el.style.display = 'block';
    if (duration) {
      setTimeout(() => {
        el.style.display = 'none';
      }, duration);
    }
  }
};
