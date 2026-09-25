import React, { useState } from 'react';
import JarvisTab from '../JarvisTab.jsx';
import { Button } from '../ui/Buttons.jsx';

export default function OnboardingFlow({ t, onComplete }) {
  // 'welcome', 'resume' or 'interview'
  const [stage, setStage] = useState('welcome');

  if (stage === 'interview') {
    return (
      <div style={{
        minHeight: '100dvh',
        background: 'var(--bg)',
        color: 'var(--tx)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        <JarvisTab
          t={t}
          onboardingMode
          onOnboardingComplete={onComplete}
        />
      </div>
    );
  }

  // Common styling to match .ph but take up full screen
  const containerStyle = {
    width: '100%', 
    minHeight: '100dvh',
    position: 'relative',
    backgroundColor: 'var(--bg)',
    color: 'var(--tx)',
    fontFamily: "'Geist', sans-serif",
    display: 'flex',
    flexDirection: 'column'
  };

  const groupStyle = {
    borderRadius: 'var(--r-container)',
    overflow: 'hidden',
    boxShadow: 'inset 0 0 0 1px var(--hairline)',
    background: 'var(--s1)',
    marginTop: '22px'
  };

  const rowStyle = (isLast) => ({
    padding: '14px',
    borderBottom: isLast ? 'none' : '1px solid var(--hairline)',
  });

  if (stage === 'resume') {
    return (
      <div style={containerStyle}>
        <div style={{ display: 'flex', alignItems: 'flex-end', padding: 'calc(26px + env(safe-area-inset-top, 0px)) 18px 12px' }}>
          <div><h2 style={{ margin: 0, fontSize: '26px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1 }}>✦ Jarvis</h2></div>
          <span style={{ marginLeft: 'auto', fontFamily: "'Geist Mono', monospace", fontSize: '11.5px', color: 'var(--mu)', padding: '9px 12px', borderRadius: 'var(--r-control)', boxShadow: 'inset 0 0 0 1px var(--hairline)' }}>3 of 7</span>
        </div>
        
        <div style={{ padding: '40px 14px 0', flex: 1 }}>
          <div style={{ display: 'flex', gap: '4px', margin: '0 0 24px' }}>
            {Array(7).fill(0).map((_, i) => (
              <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', background: i < 3 ? 'var(--ac)' : 'var(--hairline)' }} />
            ))}
          </div>
          
          <h3 style={{ margin: '0 0 6px', fontSize: '26px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.15 }}>Welcome back</h3>
          <p style={{ margin: '0 0 24px', fontSize: '14px', color: 'var(--mu)', lineHeight: 1.5 }}>You were answering questions about your constraints. Pick up where you left off.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Button variant="primary" style={{ width: '100%', minHeight: '48px', fontSize: '14px' }} onClick={() => setStage('interview')}>Continue</Button>
            <Button variant="secondary" style={{ width: '100%', minHeight: '48px', fontSize: '14px' }}>Review my answers</Button>
            <Button variant="secondary" style={{ width: '100%', minHeight: '48px', fontSize: '14px', color: 'var(--danger)' }} onClick={() => setStage('welcome')}>Start over</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'flex-end', padding: 'calc(26px + env(safe-area-inset-top, 0px)) 18px 12px' }}>
        <div><h2 style={{ margin: 0, fontSize: '26px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1 }}>✦ Jarvis</h2></div>
      </div>
      
      <div style={{ padding: '60px 14px 0', flex: 1 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.15 }}>Let us build your system around how you actually live</h3>
        
        <div style={groupStyle}>
          <div style={rowStyle(false)}>
            <b style={{ display: 'block', fontSize: '14.5px', fontWeight: 600, marginBottom: '4px', color: 'var(--tx)' }}>What Jarvis can do</b>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--mu)', lineHeight: 1.5 }}>Ask questions, design plans, propose changes and review evidence.</p>
          </div>
          <div style={rowStyle(false)}>
            <b style={{ display: 'block', fontSize: '14.5px', fontWeight: 600, marginBottom: '4px', color: 'var(--tx)' }}>What it cannot do</b>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--mu)', lineHeight: 1.5 }}>Change anything without your approval, or read what you do not log.</p>
          </div>
          <div style={rowStyle(true)}>
            <b style={{ display: 'block', fontSize: '14.5px', fontWeight: 600, marginBottom: '4px', color: 'var(--tx)' }}>You stay in control</b>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--mu)', lineHeight: 1.5 }}>Every change is shown first. You can edit, decline or undo.</p>
          </div>
        </div>
      </div>
      
      <div style={{ padding: '0 14px calc(14px + env(safe-area-inset-bottom, 0px))' }}>
        <Button 
          variant="primary"
          style={{ width: '100%', minHeight: '48px', fontSize: '15px' }}
          onClick={() => setStage('interview')}
        >
          Start interview
        </Button>
      </div>
    </div>
  );
}
