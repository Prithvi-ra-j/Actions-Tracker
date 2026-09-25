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
  'statSnapshots',
];

export async function hasUserData() {
  try {
    const selfModel = await dbGet('selfModel', 'primary');
    if (selfModel) return true;

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

    // A Jarvis default conversation means the user has entered the normal
    // workspace. The onboarding conversation alone does not count.
    const conversations = await dbGetAll('jarvisConversations');
    return conversations.some(conversation => conversation?.id !== 'jarvis_onboarding');
  } catch {
    return false;
  }
}
