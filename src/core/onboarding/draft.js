import { getSetting, setSetting } from '../../database/settingsRepository.js';

const DRAFT_KEY = 'onboardingDraft';
const SCHEMA_VERSION = 2;

export async function getDraft() {
  const raw = await getSetting(DRAFT_KEY);
  if (!raw) return createEmptyDraft();

  let draft;
  try {
    draft = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (err) {
    console.error('[Onboarding] Failed to parse draft:', err);
    return createEmptyDraft();
  }

  if (draft.schemaVersion !== SCHEMA_VERSION) {
    console.warn('[Onboarding] Draft schema version mismatch, creating fresh draft.');
    return createEmptyDraft();
  }

  return draft;
}

export async function saveDraft(draft) {
  draft.updatedAt = new Date().toISOString();
  await setSetting(DRAFT_KEY, JSON.stringify(draft));
}

export async function clearDraft() {
  await setSetting(DRAFT_KEY, null);
}

function createEmptyDraft() {
  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'first_run',
    step: 0,
    answers: {
      identity: {
        name: '',
        oneLiner: '',
        roles: [],
        values: [],
        strengths: [],
        constraints: [],
        principles: []
      },
      focusAxes: [],
      baseline: {},
      desiredSelf: {
        vision: '',
        dimensions: {}
      }
    },
    provenance: {},
    llmCache: {},
    updatedAt: new Date().toISOString()
  };
}
