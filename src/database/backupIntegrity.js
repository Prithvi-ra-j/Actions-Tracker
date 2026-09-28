const textEncoder = typeof TextEncoder !== 'undefined'
  ? new TextEncoder()
  : null;

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export async function sha256Hex(value) {
  const input = textEncoder
    ? textEncoder.encode(typeof value === 'string' ? value : canonicalJson(value))
    : new Uint8Array(Array.from(unescape(encodeURIComponent(typeof value === 'string' ? value : canonicalJson(value)))).map(char => char.charCodeAt(0)));
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto SHA-256 is unavailable.');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', input);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function addBackupIntegrity(parsed) {
  const source = JSON.parse(JSON.stringify(parsed));
  delete source._meta?.integrity;
  const checksum = await sha256Hex(source);
  source._meta = { ...(source._meta || {}), integrity: { algorithm: 'SHA-256', checksum } };
  return source;
}

export async function verifyBackupIntegrity(parsed) {
  const integrity = parsed?._meta?.integrity;
  if (!integrity) return { verified: false, legacy: true, reason: 'missing_integrity' };
  if (integrity.algorithm !== 'SHA-256' || typeof integrity.checksum !== 'string') {
    return { verified: false, legacy: false, reason: 'unsupported_integrity_metadata' };
  }
  const source = JSON.parse(JSON.stringify(parsed));
  delete source._meta?.integrity;
  const actual = await sha256Hex(source);
  return actual === integrity.checksum
    ? { verified: true, legacy: false, checksum: actual }
    : { verified: false, legacy: false, reason: 'checksum_mismatch', checksum: actual };
}
