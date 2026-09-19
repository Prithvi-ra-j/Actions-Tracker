export function createInactiveUser(today, days) {
  return {
    logs: [],
    quests: [],
    axisConfigs: [
      { axis: 'discipline', expectedPerWeek: 7, hasConsistencyTerm: true },
      { axis: 'knowledge',  expectedPerWeek: 7, hasConsistencyTerm: true },
      { axis: 'creativity', expectedPerWeek: 7, hasConsistencyTerm: true },
      { axis: 'strategy',   expectedPerWeek: 7, hasConsistencyTerm: true },
      { axis: 'social',     expectedPerWeek: null, hasConsistencyTerm: false },
      { axis: 'body',   expectedPerWeek: 4, hasConsistencyTerm: true },
    ]
  };
}
