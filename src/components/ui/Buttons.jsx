import React from 'react';
import { CircleNotch } from '@phosphor-icons/react';

export function Button({ 
  children, 
  variant = 'primary', 
  disabled = false, 
  loading = false, 
  onClick, 
  className = '', 
  style = {} 
}) {
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '48px',
    padding: '0 24px',
    borderRadius: 'var(--r-control)',
    border: 'none',
    fontFamily: 'inherit',
    fontSize: '15px',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'transform 0.15s, opacity 0.15s, background-color 0.2s',
    ...style
  };

  const variants = {
    primary: {
      backgroundColor: 'var(--ac)',
      color: 'var(--on-ac)'
    },
    secondary: {
      backgroundColor: 'var(--s2)',
      color: 'var(--tx)'
    },
    destructive: {
      backgroundColor: 'var(--danger)',
      color: '#fff'
    }
  };

  const handlePointerDown = (e) => {
    if (!disabled && !loading) e.currentTarget.style.transform = 'scale(0.98)';
  };
  const handlePointerUp = (e) => {
    e.currentTarget.style.transform = 'scale(1)';
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{ ...baseStyle, ...variants[variant] }}
      className={className}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {loading ? <CircleNotch size={18} className="spin" aria-label="Loading" /> : children}
    </button>
  );
}

export function IconButton({ 
  icon, 
  onClick, 
  disabled = false, 
  label, 
  className = '', 
  style = {} 
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '48px',
        height: '48px',
        borderRadius: 'var(--r-control)',
        border: 'none',
        backgroundColor: 'transparent',
        color: 'inherit',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'transform 0.15s, background-color 0.2s',
        ...style
      }}
      onPointerDown={(e) => !disabled && (e.currentTarget.style.transform = 'scale(0.98)')}
      onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      onPointerLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {icon}
    </button>
  );
}

export function ContextualJarvisCTA({ label = 'Ask Jarvis', onClick, contextIcon }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        height: '44px',
        padding: '0 16px',
        borderRadius: '22px',
        backgroundColor: 'var(--s2)',
        border: '1px solid var(--hairline)',
        color: 'var(--tx)',
        fontFamily: 'inherit',
        fontSize: '14px',
        fontWeight: 500,
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
      }}
      onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
      onPointerUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
      onPointerLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      {contextIcon}
      <span>{label}</span>
    </button>
  );
}
