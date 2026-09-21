import React, { useState } from 'react';
import './UpdateBanner.css';
import { APP_VERSION } from '../version.js';

/**
 * UpdateBanner
 *
 * Shown when checkForUpdate() returns a non-null UpdateInfo.
 * Tapping "Update" opens the GitHub Release page.
 * Tapping × dismisses for the current session.
 *
 * Props:
 *   updateInfo  { latestVersion: string, releaseUrl: string, releaseNotes: string }
 */
export default function UpdateBanner({ updateInfo }) {
  const [dismissed, setDismissed] = useState(false);

  if (!updateInfo || dismissed) return null;

  function handleUpdate() {
    // Open the GitHub Release page so the user can download the APK.
    // On Android (Capacitor) this opens in the system browser.
    window.open(updateInfo.releaseUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="update-banner" role="alert" aria-live="polite">
      <span className="update-banner__icon" aria-hidden="true">⬆</span>

      <div className="update-banner__text">
        <div className="update-banner__title">
          Update {updateInfo.latestVersion} available
        </div>
        <div className="update-banner__subtitle">
          You have {APP_VERSION} — tap to get the new build
        </div>
      </div>

      <button
        id="update-banner-download-btn"
        className="update-banner__btn"
        onClick={handleUpdate}
        aria-label={`Download version ${updateInfo.latestVersion}`}
      >
        Update
      </button>

      <button
        id="update-banner-dismiss-btn"
        className="update-banner__dismiss"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss update notification"
      >
        ×
      </button>
    </div>
  );
}
