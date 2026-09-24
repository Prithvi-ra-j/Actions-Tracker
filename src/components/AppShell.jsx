import React from 'react';
import { 
  CalendarCheck, 
  ChartPolar, 
  GraduationCap, 
  Target, 
  ListChecks, 
  MagicWand, 
  Gear
} from '@phosphor-icons/react';
import { AppHeader } from './ui/Headers.jsx';
import { ContextualJarvisCTA } from './ui/Buttons.jsx';
import { GlobalBanners } from './ui/Banners.jsx';

export default function AppShell({ 
  currentTab, 
  onTabChange, 
  children, 
  onOpenJarvis, 
  onOpenSettings,
  headerTitle = "Actions",
  headerSubline = ""
}) {
  const tabs = [
    { id: 'daily', label: 'Today', icon: CalendarCheck },
    { id: 'stats', label: 'Stats', icon: ChartPolar },
    { id: 'learn', label: 'Learn', icon: GraduationCap },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'audits', label: 'Audits', icon: ListChecks },
  ];

  return (
    <div className="min-h-100dvh" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
      
      <AppHeader 
        title={headerTitle} 
        subline={headerSubline} 
        rightElement={
          <button 
            onClick={onOpenSettings}
            style={{ background: 'transparent', border: 'none', color: 'var(--tx)', cursor: 'pointer', padding: '8px' }}
          >
            <Gear size={24} />
          </button>
        }
      />
      <GlobalBanners />

      <div style={{ flex: 1, position: 'relative', paddingBottom: 'calc(64px + 60px + env(safe-area-inset-bottom, 0px))' }}>
        {/* Children (pages) are rendered here. The parent is responsible for hiding inactive ones. */}
        {children}
      </div>

      {/* Docked Jarvis Pill */}
      <div style={{
        position: 'fixed',
        bottom: 'calc(64px + 14px + env(safe-area-inset-bottom, 0px))',
        right: '16px',
        zIndex: 40
      }}>
        {currentTab !== 'jarvis' && (
          <button
            onClick={() => onOpenJarvis(currentTab)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              height: '44px',
              padding: '0 16px',
              borderRadius: '22px',
              backgroundColor: 'var(--ac)',
              color: 'var(--on-ac)',
              border: 'none',
              fontFamily: 'inherit',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              transition: 'transform 0.15s'
            }}
            onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onPointerUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onPointerLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <MagicWand size={18} weight="bold" />
            Ask Jarvis
          </button>
        )}
      </div>

      {/* Bottom Tab Bar */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        backgroundColor: 'var(--s1)',
        borderTop: '1px solid var(--hairline)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 50
      }}>
        {tabs.map(tab => {
          const active = currentTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                height: '100%',
                background: 'transparent',
                border: 'none',
                color: active ? 'var(--ac)' : 'var(--mu)',
                cursor: 'pointer',
                transition: 'color 0.2s'
              }}
            >
              <Icon size={24} weight={active ? 'fill' : 'regular'} />
              <span style={{ fontSize: '11px', fontWeight: active ? 600 : 500 }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
