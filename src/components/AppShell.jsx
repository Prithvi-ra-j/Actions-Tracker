import React from 'react';
import {
  CalendarCheck,
  ChartPolar,
  GraduationCap,
  Target,
  ListChecks,
  Sparkle,
  GearSix,
} from '@phosphor-icons/react';
import { AppHeader } from './ui/Headers.jsx';
import { GlobalBanners } from './ui/Banners.jsx';

const TABS = [
  { id: 'daily',  label: 'Today',  icon: CalendarCheck },
  { id: 'stats',  label: 'Stats',  icon: ChartPolar    },
  { id: 'learn',  label: 'Learn',  icon: GraduationCap },
  { id: 'goals',  label: 'Goals',  icon: Target         },
  { id: 'audits', label: 'Audits', icon: ListChecks     },
];

export default function AppShell({
  currentTab,
  onTabChange,
  children,
  onOpenJarvis,
  vedConfigured = false,
  onOpenSettings,
  headerTitle = 'Actions',
  headerSubline = '',
}) {
  return (
    <div
      className="min-h-100dvh"
      style={{
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        height: currentTab === 'jarvis' ? '100dvh' : undefined,
        overflow: currentTab === 'jarvis' ? 'hidden' : undefined,
      }}
    >
      <a className="skip-link" href="#main-content">Skip to main content</a>

      {/* App header — sticky. Hidden on Ved tab (it has its own inline header) */}
      {currentTab !== 'jarvis' && (
        <AppHeader
          title={headerTitle}
          subline={headerSubline}
          rightElement={
            <button
              id="settings-btn"
              aria-label="Open Settings"
              onClick={onOpenSettings}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: 'var(--r-control)',
                border: 'none',
                background: 'transparent',
                color: 'var(--mu)',
                cursor: 'pointer',
                transition: 'transform 0.12s, color 0.15s',
              }}
              onPointerDown={e => e.currentTarget.style.transform = 'scale(0.88)'}
              onPointerUp={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.color = 'var(--mu)';
              }}
              onPointerLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.color = 'var(--mu)';
              }}
              onPointerEnter={e => e.currentTarget.style.color = 'var(--tx)'}
            >
              <GearSix size={22} />
            </button>
          }
        />
      )}

      <GlobalBanners />


      {/* Page content — padded so nothing hides under nav or pill */}
      <main id="main-content" tabIndex="-1" style={{
        flex: 1,
        position: 'relative',
        minHeight: 0,
        minWidth: 0,
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: '760px',
        margin: '0 auto',
        display: currentTab === 'jarvis' ? 'flex' : 'block',
        flexDirection: currentTab === 'jarvis' ? 'column' : undefined,
        paddingBottom: currentTab === 'jarvis'
          ? 'calc(64px + env(safe-area-inset-bottom, 0px))'
          : 'calc(64px + 58px + env(safe-area-inset-bottom, 0px))',
      }}>
        {children}
      </main>

      {/* Docked "Ask Ved" pill — accent, 44px, 14px above bar, right edge */}
      {currentTab !== 'jarvis' && vedConfigured && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(64px + 14px + env(safe-area-inset-bottom, 0px))',
          left: '50%',
          right: 'auto',
          transform: 'translateX(-50%)',
          display: 'flex',
          justifyContent: 'flex-end',
          width: '100%',
          maxWidth: '760px',
          padding: '0 14px',
          boxSizing: 'border-box',
          pointerEvents: 'none',
          zIndex: 40,
        }}>
          <button
            id="jarvis-pill-btn"
            onClick={() => onOpenJarvis(currentTab)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '44px',
              padding: '0 18px',
              borderRadius: 'var(--r-control)',
              backgroundColor: 'var(--s2)',
              color: 'var(--tx)',
              border: '1px solid var(--hairline)',
              pointerEvents: 'auto',
              fontFamily: 'inherit',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
              transition: 'transform 0.12s',
            }}
            onPointerDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
            onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onPointerLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Sparkle size={16} weight="fill" />
            Ask Ved
          </button>
        </div>
      )}

      {/* Bottom Tab Bar — 64px, 5 tabs, icon + label */}
      <nav
        aria-label="Main navigation"
        style={{
          position: 'fixed',
          bottom: 0, left: '50%', right: 'auto',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '760px',
          height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          backgroundColor: 'var(--s1)',
          borderTop: '1px solid var(--hairline)',
          borderLeft: '1px solid var(--hairline)',
          borderRight: '1px solid var(--hairline)',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'stretch',
          zIndex: 50,
        }}
      >
        {TABS.map(tab => {
          const active = currentTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              aria-current={active ? 'page' : undefined}
              aria-label={tab.label}
              onClick={() => onTabChange(tab.id)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                height: '100%',
                background: 'transparent',
                border: 'none',
                color: active ? 'var(--ac)' : 'var(--mu)',
                cursor: 'pointer',
                transition: 'color 0.2s',
                padding: '8px 4px',
              }}
              onPointerDown={e => !active && (e.currentTarget.style.transform = 'scale(0.9)')}
              onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')}
              onPointerLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <Icon size={24} weight={active ? 'fill' : 'regular'} />
              <span style={{
                fontSize: '11px',
                fontWeight: active ? 600 : 500,
                letterSpacing: active ? 0 : undefined,
              }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
