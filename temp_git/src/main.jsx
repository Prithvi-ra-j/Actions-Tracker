import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// ── Service worker is intentionally NOT registered ────────────────────────────
// This is a Capacitor Android app. The service worker approach is a PWA pattern
// and is not appropriate for a native Android application bundled via Capacitor.
// Offline functionality is provided by the Android APK itself.
