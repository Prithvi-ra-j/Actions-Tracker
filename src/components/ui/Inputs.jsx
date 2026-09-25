import React from 'react';
import { Check } from '@phosphor-icons/react';

export function Checkbox({ checked, onChange, size = 24, disabled = false }) {
  return (
    <div role="checkbox" aria-checked={checked} aria-disabled={disabled} tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && onChange?.(!checked)}
      onKeyDown={(event) => {
        if (!disabled && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onChange?.(!checked); }
      }}
      style={{ width:size,height:size,borderRadius:'var(--radius-check)',border:checked?'none':'2px solid var(--color-text-muted)',backgroundColor:checked?'var(--color-accent)':'transparent',display:'flex',alignItems:'center',justifyContent:'center',cursor:disabled?'not-allowed':'pointer',opacity:disabled?.5:1,transition:'var(--motion-fast)'}}
    >
      {checked && <span aria-hidden="true" style={{ color:'var(--color-on-accent)',fontWeight:800,fontSize:size*.7,lineHeight:1 }}>✓</span>}
    </div>
  );
}
