/**
 * updateChecker.js
 *
 * Checks GitHub Releases for a newer version of the app.
 * - One network request per session (cached in sessionStorage).
 * - Never throws — returns null on any failure so the caller is not affected.
 * - Uses the public GitHub API (unauthenticated, 60 req/hour — plenty for personal use).
 */

import { APP_VERSION } from '../version.js';

const REPO            = 'Prithvi-ra-j/Actions-Tracker';
const API_URL         = `https://api.github.com/repos/${REPO}/releases/latest`;
// Cache is version-scoped. Android updates can preserve WebView session storage;
// a cache from the previous APK must never keep an old "update available" state.
const SESSION_KEY     = `at_update_check_${APP_VERSION}`;
const RECHECK_MS      = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Compare four-part release versions (Level.Phase.Patch.Hotfix).
 * Returns true if `remote` is strictly greater than `local`.
 * @param {string} local   e.g. "1.5.1.1"
 * @param {string} remote  e.g. "1.6.0.0"
 */
function isNewer(local, remote) {
  const parse = (v) => v.replace(/^v/, '').split('.').map(Number).concat([0, 0, 0, 0]).slice(0, 4);
  const l = parse(local);
  const r = parse(remote);
  for (let i = 0; i < 4; i += 1) {
    if (r[i] !== l[i]) return r[i] > l[i];
  }
  return false;
}

/**
 * @typedef {Object} UpdateInfo
 * @property {string} latestVersion  - e.g. "1.6.0"
 * @property {string} releaseUrl     - HTML URL of the GitHub Release page
 * @property {string} releaseNotes   - Markdown body of the release (may be empty)
 */

/**
 * Check GitHub for a newer release.
 *
 * @returns {Promise<UpdateInfo|null>}
 *   UpdateInfo if a newer version exists, null if up-to-date or on any error.
 */
export async function checkForUpdate() {
  try {
    // ── Session cache ─────────────────────────────────────────────────────────
    const cached = sessionStorage.getItem(SESSION_KEY);
    if (cached) {
      const { ts, result } = JSON.parse(cached);
      if (Date.now() - ts < RECHECK_MS) {
        return result; // null = up-to-date, UpdateInfo = update available
      }
    }

    // ── Fetch latest release ──────────────────────────────────────────────────
    const res = await fetch(API_URL, {
      headers: { Accept: 'application/vnd.github+json' },
      // Short timeout so a slow network doesn't block the app boot
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      // 404 = no releases yet (repo is new), anything else = transient error
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ts: Date.now(), result: null }));
      return null;
    }

    const data = await res.json();
    const tag  = data.tag_name ?? '';                 // e.g. "v1.6.0"
    const remoteVersion = tag.replace(/^v/, '');      // e.g. "1.6.0"

    const result = isNewer(APP_VERSION, remoteVersion)
      ? {
          latestVersion : remoteVersion,
          releaseUrl    : data.html_url ?? `https://github.com/${REPO}/releases`,
          releaseNotes  : (data.body ?? '').trim(),
        }
      : null;

    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ts: Date.now(), result }));
    return result;

  } catch {
    // Network error, abort, JSON parse error — silently return null
    return null;
  }
}
