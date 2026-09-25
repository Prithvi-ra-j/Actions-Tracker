import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ToastProvider } from './components/ui/ToastContext.jsx';
import 'geist/font/sans.css';
import 'geist/font/mono.css';
import './index.css';

import { ErrorBoundary } from './components/ErrorBoundary.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);

// ── Service worker is intentionally NOT registered ────────────────────────────
// This is a Capacitor Android app. The service worker approach is a PWA pattern
// and is not appropriate for a native Android application bundled via Capacitor.
// Offline functionality is provided by the Android APK itself.
