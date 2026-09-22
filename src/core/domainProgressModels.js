/**
 * Domain-specific progress model.
 *
 * Domains intentionally do not share one universal definition of progress.
 * Jarvis uses these profiles as design constraints when interviewing the user
 * and proposing habits, quests, evidence, and review methods.
 */

export const DOMAIN_PROGRESS_MODELS = Object.freeze({
  body: {
    label: 'Body',
    purpose: 'Physical capability, health-related behaviours, performance, and movement.',
    preferredEvidence: ['performance metrics', 'training sessions', 'benchmarks', 'recovery/mobility evidence'],
    qualitativeEvidence: ['energy', 'readiness', 'physical confidence'],
    avoid: ['arbitrary activity counts without a meaningful outcome'],
    designQuestions: [
      'What physical outcome matters most right now?',
      'Is the goal health, appearance, strength, endurance, sport performance, or a combination?',
      'What constraints or injuries affect what is realistic?',
    ],
  },
  social: {
    label: 'Social',
    purpose: 'Relationship quality, communication, connection, and social confidence.',
    preferredEvidence: ['relationship maintenance', 'meaningful interactions', 'reflection', 'specific social experiments'],
    qualitativeEvidence: ['connection', 'belonging', 'communication quality', 'confidence', 'relationship depth'],
    avoid: ['raw counts as the sole definition of social progress', 'spammy interaction quotas'],
    designQuestions: [
      'Which relationships or social capabilities do you want to improve?',
      'Is the bottleneck initiation, conversation quality, confidence, consistency, or relationship depth?',
      'What would a noticeably better social life look like?',
    ],
  },
  strategy: {
    label: 'Strategy',
    purpose: 'Decision quality, planning, judgment, prioritisation, systems thinking, and long-horizon execution.',
    preferredEvidence: ['decision reviews', 'plans', 'predictions', 'post-mortems', 'outcome checks', 'experiments'],
    qualitativeEvidence: ['clarity', 'judgment', 'trade-off awareness', 'strategic reasoning'],
    avoid: ['equating strategy with reading biographies or consuming content'],
    designQuestions: [
      'Where do you want better judgment: career, money, relationships, projects, or general life decisions?',
      'What kinds of decisions currently feel weak or repeatedly costly?',
      'How could we observe better decision quality rather than merely more activity?',
    ],
  },
  knowledge: {
    label: 'Knowledge',
    purpose: 'Understanding, retention, synthesis, and application of ideas.',
    preferredEvidence: ['concept mastery', 'notes', 'projects', 'explanations', 'books when relevant'],
    qualitativeEvidence: ['understanding', 'synthesis', 'ability to explain or apply'],
    avoid: ['book counts as the sole measure of knowledge'],
    designQuestions: [
      'What subjects actually matter to your goals?',
      'Do you need breadth, depth, retention, or application?',
      'What evidence would show that you understand rather than merely consumed?',
    ],
  },
  creativity: {
    label: 'Creativity',
    purpose: 'Creating, practising a craft, experimentation, originality, and finishing meaningful work.',
    preferredEvidence: ['practice sessions', 'iterations', 'finished pieces', 'projects', 'feedback'],
    qualitativeEvidence: ['craft quality', 'originality', 'creative confidence', 'depth'],
    avoid: ['output counts without considering iteration or meaningful completion'],
    designQuestions: [
      'What medium or craft do you want to develop?',
      'Are you trying to practise, finish work, publish, explore, or master a technique?',
      'What would meaningful creative progress look like?',
    ],
  },
  discipline: {
    label: 'Discipline',
    purpose: 'Reliability in commitments, follow-through, recovery from misses, and self-regulation.',
    preferredEvidence: ['commitment adherence', 'habit consistency', 'planned-vs-done', 'recovery after misses'],
    qualitativeEvidence: ['reliability', 'friction management', 'self-command'],
    avoid: ['treating discipline as a generic number of checkboxes'],
    designQuestions: [
      'Which commitments matter enough to become evidence of reliability?',
      'Where does follow-through break down?',
      'What should count as recovery when a commitment is missed?',
    ],
  },
});

export function getDomainProgressModel(axis) {
  return DOMAIN_PROGRESS_MODELS[axis] || null;
}

export function getDomainProgressModels(axes = Object.keys(DOMAIN_PROGRESS_MODELS)) {
  return axes.map(axis => DOMAIN_PROGRESS_MODELS[axis]).filter(Boolean);
}
