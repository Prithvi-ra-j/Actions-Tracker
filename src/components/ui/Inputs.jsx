import React from 'react';
import { Check } from '@phosphor-icons/react';

export function Checkbox({ checked, onChange, size = 24, disabled = false }) {
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && onChange && onChange(!checked)}
      onKeyDown={(event) => {
        if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onChange?.(!checked);
        }
      }}
      style={{
        width: size,
        height: size,
        borderRadius: 'var(--r-check)',
        border: checked ? 'none' : '2px solid var(--mu)',
        backgroundColor: checked ? 'var(--ac)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s flex-shrink-0'
      }}
    >
      {checked && <Check weight="bold" color="var(--on-ac)" size={size * 0.7} />}
    </div>
  );
}
