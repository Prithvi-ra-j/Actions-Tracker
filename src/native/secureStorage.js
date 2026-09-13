/**
 * Secure Storage Abstraction (§78).
 * 
 * Capacitor SecureStoragePlugin is used on Android.
 * In the browser, we fallback to an in-memory Map (session scoped).
 * We DO NOT use localStorage for secrets as per §78.
 */

let memoryFallback = new Map();

// Helper to check if we are in Capacitor
const isCapacitor = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNative;

export async function setSecureValue(key, value) {
  if (isCapacitor) {
    const { SecureStoragePlugin } = await import(/* @vite-ignore */ 'capacitor-secure-storage-plugin');
    await SecureStoragePlugin.set({ key, value });
  } else {
    memoryFallback.set(key, value);
  }
}

export async function getSecureValue(key) {
  if (isCapacitor) {
    try {
      const { SecureStoragePlugin } = await import(/* @vite-ignore */ 'capacitor-secure-storage-plugin');
      const res = await SecureStoragePlugin.get({ key });
      return res.value;
    } catch (e) {
      return null;
    }
  } else {
    return memoryFallback.get(key) || null;
  }
}

export async function clearSecureValue(key) {
  if (isCapacitor) {
    const { SecureStoragePlugin } = await import(/* @vite-ignore */ 'capacitor-secure-storage-plugin');
    await SecureStoragePlugin.remove({ key });
  } else {
    memoryFallback.delete(key);
  }
}

export function isBrowserFallback() {
  return !isCapacitor;
}
