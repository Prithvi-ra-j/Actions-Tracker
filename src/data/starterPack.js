export const METRIC_PRODUCERS = [
  'log_count',
  'log_weighted_sum',
  'distinct_days',
  'habit_completions',
  'fact_count',
  'fact_sum',
  'manual'
];

export const TEMPLATE_QUESTS = {
  body: [
    { title: '90 training sessions', unit: 'sessions', targetValue: 90, importance: 3, metric: { type: 'log_count', axis: 'body', logTypes: ['gym_session'] } },
    { title: 'Physical benchmark', unit: 'feats', targetValue: 1, importance: 2, metric: { type: 'log_count', axis: 'body', logTypes: ['gym_session'], filter: { metaKey: 'isBenchmarkAttempt', equals: true } } },
    { title: 'Attend a combative class', unit: 'classes', targetValue: 1, importance: 1, metric: { type: 'manual' } }
  ],
  knowledge: [
    { title: 'Read 6 books', unit: 'books', targetValue: 6, importance: 3, metric: { type: 'log_weighted_sum', axis: 'knowledge', weights: { book_finished: 1 }, metaWeightKey: 'weight' } },
    { title: '40 commonplace entries', unit: 'entries', targetValue: 40, importance: 2, metric: { type: 'log_count', axis: 'knowledge', logTypes: ['journal_entry'] } }
  ],
  creativity: [
    { title: 'Fill one sketchbook', unit: 'books', targetValue: 1, importance: 3, metric: { type: 'manual' } },
    { title: 'Study 4 masters', unit: 'masters', targetValue: 4, importance: 2, metric: { type: 'log_count', axis: 'creativity', logTypes: ['master_copy'] } },
    { title: 'Publish one piece', unit: 'pieces', targetValue: 1, importance: 3, metric: { type: 'log_count', axis: 'creativity', logTypes: ['finished_piece'] } }
  ],
  strategy: [
    { title: 'Read one biography', unit: 'biographies', targetValue: 1, importance: 2, metric: { type: 'log_weighted_sum', axis: 'strategy', weights: { book_finished: 1 }, metaWeightKey: 'weight' } },
    { title: 'Analyze one decision', unit: 'pages', targetValue: 1, importance: 2, metric: { type: 'manual' } }
  ]
};

export const TEMPLATE_HABITS = [
  {
    name: 'Morning Training',
    domain: 'body',
    frequency: { type: 'weekly', days: [1, 3, 5, 6] },
    trackingMethod: 'boolean',
    tinyVersion: 'Put on gym clothes',
    implementationIntention: { anchor: 'After coffee', timeSlot: '07:00' },
    identityVote: 'I am an athlete'
  },
  {
    name: 'Commonplace Book',
    domain: 'knowledge',
    frequency: { type: 'daily' },
    trackingMethod: 'pages',
    tinyVersion: 'Write one sentence',
    implementationIntention: { anchor: 'Before sleep', timeSlot: '22:00' },
    identityVote: 'I synthesize what I read'
  }
];

export const personalProgramPack = {
  quests: [
    ...TEMPLATE_QUESTS.body,
    ...TEMPLATE_QUESTS.knowledge,
    ...TEMPLATE_QUESTS.creativity,
    ...TEMPLATE_QUESTS.strategy
  ],
  habits: [
    ...TEMPLATE_HABITS,
    {
      name: 'Thursday Drawing',
      domain: 'creativity',
      frequency: { type: 'weekly', days: [4] },
      trackingMethod: 'boolean',
      tinyVersion: 'Draw for 5 mins',
      implementationIntention: { anchor: 'After work', timeSlot: '18:00' },
      identityVote: 'I practice my craft'
    },
    {
      name: 'Sunday Review',
      domain: 'strategy',
      frequency: { type: 'weekly', days: [0] },
      trackingMethod: 'boolean',
      tinyVersion: 'Open review doc',
      implementationIntention: { anchor: 'Sunday morning', timeSlot: '09:00' },
      identityVote: 'I steer my life'
    }
  ]
};
