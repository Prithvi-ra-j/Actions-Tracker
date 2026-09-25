import React, { useState } from 'react';
import JarvisTab from '../JarvisTab.jsx';

export default function OnboardingFlow({ t, onComplete }) {
  // 'welcome', 'resume' or 'interview'
  const [stage, setStage] = useState('interview');

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
    fontFamily: 'var(--f)',
    display: 'flex',
    flexDirection: 'column'
  };

  if (stage === 'resume') {
    return (
      <div style={containerStyle}>
        <div className="hd" style={{ display: 'flex', alignItems: 'flex-end', padding: '26px 18px 12px' }}>
          <div><h2 style={{ font: '600 26px/1.1 var(--f)' }}>Jarvis</h2></div>
          <span className="pill" style={{ marginLeft: 'auto', font: '500 11.5px "Geist Mono", monospace', color: 'var(--mu)', padding: '9px 12px', borderRadius: '12px', boxShadow: 'inset 0 0 0 1px var(--ln)' }}>3 of 7</span>
        </div>
        <div className="bd" style={{ padding: '60px 14px 0', flex: 1 }}>
          <div style={{ display: 'flex', gap: '3px', margin: '0 0 20px' }}>
            <i style={{ flex: 1, height: '8px', background: 'var(--ac)' }}></i>
            <i style={{ flex: 1, height: '8px', background: 'var(--ac)' }}></i>
            <i style={{ flex: 1, height: '8px', background: 'var(--ac)' }}></i>
            <i style={{ flex: 1, height: '8px', background: 'var(--ln)' }}></i>
            <i style={{ flex: 1, height: '8px', background: 'var(--ln)' }}></i>
            <i style={{ flex: 1, height: '8px', background: 'var(--ln)' }}></i>
            <i style={{ flex: 1, height: '8px', background: 'var(--ln)' }}></i>
          </div>
          <h3 style={{ font: '600 26px/1.15 var(--f)', letterSpacing: '-.02em', margin: '4px 0 2px' }}>Welcome back</h3>
          <p style={{ fontSize: '14px', color: 'var(--mu)', margin: '6px 0 18px' }}>You were answering questions about your constraints. Pick up where you left off.</p>
          <button style={{ width: '100%', minHeight: '48px', borderRadius: '12px', background: 'var(--ac)', color: 'var(--on)', font: '600 14px var(--f)', border: 'none', cursor: 'pointer' }} onClick={() => setStage('interview')}>Continue</button>
          <button style={{ width: '100%', minHeight: '48px', borderRadius: '12px', background: 'var(--s2)', color: 'var(--tx)', font: '600 14px var(--f)', border: 'none', cursor: 'pointer', marginTop: '8px' }}>Review my answers</button>
          <button style={{ width: '100%', minHeight: '48px', borderRadius: '12px', background: 'var(--s2)', color: '#e5484d', font: '600 14px var(--f)', border: 'none', cursor: 'pointer', marginTop: '8px' }} onClick={() => setStage('welcome')}>Start over</button>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div className="hd" style={{ display: 'flex', alignItems: 'flex-end', padding: '26px 18px 12px' }}>
        <div><h2 style={{ font: '600 26px/1.1 var(--f)' }}>Jarvis</h2></div>
      </div>
      <div className="bd" style={{ padding: '60px 14px 0', flex: 1 }}>
        <h3 style={{ font: '600 28px/1.15 var(--f)', letterSpacing: '-.02em', margin: '4px 0 2px' }}>Let us build your system around how you actually live</h3>
        <div className="grp" style={{ borderRadius: '16px', overflow: 'hidden', boxShadow: 'inset 0 0 0 1px var(--ln)', background: 'var(--s1)', marginTop: '22px' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--ln)' }}>
            <b style={{ display: 'block', font: '500 14.5px var(--f)' }}>What Jarvis can do</b>
            <p style={{ fontSize: '12.5px', color: 'var(--mu)', whiteSpace: 'normal' }}>Ask questions, design plans, propose changes and review evidence.</p>
          </div>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--ln)' }}>
            <b style={{ display: 'block', font: '500 14.5px var(--f)' }}>What it cannot do</b>
            <p style={{ fontSize: '12.5px', color: 'var(--mu)', whiteSpace: 'normal' }}>Change anything without your approval, or read what you do not log.</p>
          </div>
          <div style={{ padding: '12px 14px' }}>
            <b style={{ display: 'block', font: '500 14.5px var(--f)' }}>You stay in control</b>
            <p style={{ fontSize: '12.5px', color: 'var(--mu)', whiteSpace: 'normal' }}>Every change is shown first. You can edit, decline or undo.</p>
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: '12px', right: '12px', bottom: '14px', height: '60px', padding: '0', display: 'flex' }}>
        <button 
          style={{ width: '100%', minHeight: '48px', borderRadius: '12px', background: 'var(--ac)', color: 'var(--on)', font: '600 14px var(--f)', border: 'none', cursor: 'pointer' }}
          onClick={() => setStage('interview')}
        >
          Start interview
        </button>
      </div>
    </div>
  );
}
