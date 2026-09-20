import { writeSequence } from './db.js';

/**
 * Commits an onboarding plan atomically.
 * Enforces that the completion flag (settings) is written strictly last.
 * @param {object} plan - the CommitPlan from plan.js
 */
export async function commitOnboardingPlan(plan) {
  const stores = [];
  if (plan.axisConfigs) stores.push('axis_config');
  if (plan.quests) stores.push('questBoard');
  if (plan.habits) stores.push('habits');
  if (plan.routine) stores.push('routineConfig');
  if (plan.logs) stores.push('logs');
  if (plan.selfModel) stores.push('selfModel');
  if (plan.settings) stores.push('settings');
  
  if (stores.length === 0) return;

  await writeSequence(stores, (tx) => {
    if (plan.axisConfigs) {
      const store = tx.objectStore('axis_config');
      plan.axisConfigs.forEach(ac => store.put(ac));
    }

    if (plan.quests) {
      const store = tx.objectStore('questBoard');
      plan.quests.forEach(q => store.put(q));
    }

    if (plan.habits) {
      const store = tx.objectStore('habits');
      plan.habits.forEach(h => store.put(h));
    }

    if (plan.routine) {
      const store = tx.objectStore('routineConfig');
      // routineConfig only has a single "primary" record usually
      store.put({ id: 'primary', ...plan.routine });
    }

    if (plan.logs) {
      const store = tx.objectStore('logs');
      plan.logs.forEach(log => store.put(log));
    }
    
    if (plan.selfModel) {
      const store = tx.objectStore('selfModel');
      store.put({ id: 'primary', ...plan.selfModel });
    }
    
    if (plan.settings) {
      const store = tx.objectStore('settings');
      for (const [k, v] of Object.entries(plan.settings)) {
        store.put({ key: k, value: v });
      }
    }
  });
}
