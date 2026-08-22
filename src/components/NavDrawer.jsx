import React, { useEffect } from 'react';
import { ACCENT } from '../constants.js';

export default function NavDrawer({ t, isOpen, onClose, tabs, currentTab, onSelectTab, onOpenSettings }) {
  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(3px)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
          zIndex: 999,
        }}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '75vw',
          maxWidth: 320,
          background: t.pageBg,
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isOpen ? '0 0 20px rgba(0,0,0,0.2)' : 'none',
        }}
      >
        <div style={{ padding: '2rem 1.5rem', borderBottom: `1px solid ${t.border}` }}>
          <div style={{ fontFamily: 'monospace', fontSize: '0.65rem', letterSpacing: '0.3em', color: ACCENT, textTransform: 'uppercase' }}>
            Year End Goals
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, marginTop: '0.5rem', color: t.pageText }}>
            Menu
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 0' }}>
          {tabs.map((tab) => {
            const active = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  onSelectTab(tab.id);
                  onClose();
                }}
                style={{
                  width: '100%',
                  padding: '1rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  background: active ? t.subtleBg : 'transparent',
                  border: 'none',
                  borderLeft: `4px solid ${active ? ACCENT : 'transparent'}`,
                  color: active ? t.pageText : t.muted,
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s, color 0.2s',
                }}
              >
                {tab.label}
              </button>
            );
          })}

          <div style={{ margin: '1rem 1.5rem', borderBottom: `1px solid ${t.border}` }} />

          <button
            onClick={() => {
              onOpenSettings();
              onClose();
            }}
            style={{
              width: '100%',
              padding: '1rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              background: 'transparent',
              border: 'none',
              borderLeft: '4px solid transparent',
              color: t.muted,
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            Settings
          </button>
        </div>
      </div>
    </>
  );
}
