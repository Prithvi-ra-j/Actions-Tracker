/**
 * Android back-button handler and status bar configuration.
 * Uses @capacitor/app and @capacitor/status-bar.
 * These calls are no-ops on web / non-native platforms — safe to call always.
 */

import { Capacitor } from '@capacitor/core';

let _backListener = null;

/**
 * Registers a handler for the Android hardware back button.
 *
 * The handler receives no arguments. Return true to indicate the back press
 * was handled (prevents app exit). Return false / undefined to allow normal
 * back navigation or app exit.
 *
 * Calling this again replaces the previous handler.
 *
 * @param {() => boolean} onBack
 */
export async function registerBackHandler(onBack) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { App } = await import('@capacitor/app');

    // Remove the previous listener if registered
    if (_backListener) {
      _backListener.remove();
      _backListener = null;
    }

    _backListener = await App.addListener('backButton', () => {
      const handled = typeof onBack === 'function' ? onBack() : false;
      if (!handled) {
        App.exitApp();
      }
    });
  } catch (err) {
    console.error('[BackButton] registerBackHandler failed:', err);
  }
}

/**
 * Configures the Android status bar to match the app's dark header style.
 * Safe to call on any platform — silently does nothing on web.
 */
export async function setupStatusBar() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#1c1916' });
  } catch (err) {
    // Not critical — app still works without status bar styling
    console.warn('[StatusBar] setup failed (non-critical):', err);
  }
}
