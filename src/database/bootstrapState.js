import { dbGet, dbGetAll } from './db.js';

const USER_DATA_STORES = [
  'logs',
  'lifeObjects',
  'habits',
  'habitOccurrences',
  'books',
  'learnings',
  'evidence',
  'facts',
  'relations',
  'memories',
  'questBoard',
  'decisions',
  'experiments',
  'creativeWorks',
  'observations',
  'routineConfig',
];

function hasMeaningfulSelfModel(model) {
  if (!model || typeof model !== 'object') return false;

  if (model.onboardingCompletedAt) return true;

  const identity = model.identity || {};
  const desiredSelf = model.desiredSelf || {};

  const identityHasContent = [
    identity.name,
    identity.oneLiner,
    ...(Array.isArray(identity.roles) ? identity.roles : []),
    ...(Array.isArray(identity.values) ? identity.values : []),
    ...(Array.isArray(identity.strengths) ? identity.strengths : []),
    ...(Array.isArray(identity.constraints) ? identity.constraints : []),
    ...(Array.isArray(identity.principles) ? identity.principles : []),
  ].some(value => typeof value === 'string' ? value.trim().length > 0 : Boolean(value));

  const desiredSelfHasContent =
    (typeof desiredSelf.vision === 'string' && desiredSelf.vision.trim().length > 0) ||
    Object.keys(desiredSelf.dimensions || {}).length > 0;

  return identityHasContent || desiredSelfHasContent;
}

export async function hasUserData() {
  try {
    // An empty self-model record is system state, not proof that the user has
    // completed setup. Older builds could create this skeleton eagerly.
    const selfModel = await dbGet('selfModel', 'primary');
    if (hasMeaningfulSelfModel(selfModel)) return true;

    const counts = await Promise.all(
      USER_DATA_STORES.map(async store => {
        try {
          return (await dbGetAll(store)).length;
        } catch {
          return 0;
        }
      })
    );

    if (counts.some(count => count > 0)) return true;

    // Only a real Jarvis conversation counts as user data. An empty default
    // conversation can exist from older builds and must not suppress onboarding.
    // The onboarding conversation itself never counts.
    const conversations = await dbGetAll('jarvisConversations');
    return conversations.some(conversation =>
      conversation?.id !== 'jarvis_onboarding' &&
      Array.isArray(conversation?.messages) &&
      conversation.messages.length > 0
    );
  } catch {
    return false;
  }
}
