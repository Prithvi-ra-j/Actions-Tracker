import React from 'react';
import { LIFE_DIMENSIONS } from '../constants.js';

const style = {
  minHeight: '44px', padding: '0 12px', borderRadius: 'var(--r-control)',
  background: 'var(--s2)', color: 'var(--tx)', border: '1px solid var(--hairline)', font: 'inherit',
};

export default function AttributionFields({ primary, secondary, share, onPrimary, onSecondary, onShare }) {
  return <div style={{ display: 'grid', gap: '10px' }}>
    <label>Primary attribute <select style={{ ...style, width: '100%' }} value={primary}
      onChange={event => {
        onPrimary(event.target.value);
        if (event.target.value === secondary) onSecondary('');
      }}>
      {!LIFE_DIMENSIONS.some(axis => axis.key === primary) && <option value={primary}>Choose an attribute</option>}
      {LIFE_DIMENSIONS.map(axis => <option key={axis.key} value={axis.key}>{axis.label}</option>)}
    </select></label>
    <label>Second attribute (optional) <select style={{ ...style, width: '100%' }} value={secondary}
      onChange={event => onSecondary(event.target.value)}>
      <option value="">None</option>
      {LIFE_DIMENSIONS.filter(axis => axis.key !== primary).map(axis =>
        <option key={axis.key} value={axis.key}>{axis.label}</option>)}
    </select></label>
    {secondary && <label>Primary share: {share}% · second share: {100 - share}%
      <input type="range" min="10" max="90" step="10" value={share}
        onChange={event => onShare(Number(event.target.value))} style={{ width: '100%' }} />
    </label>}
  </div>;
}
