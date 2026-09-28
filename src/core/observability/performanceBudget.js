export const PERFORMANCE_BUDGETS_MS = Object.freeze({
  boot: 1500,
  todayRecommendations: 300,
  localSearch: 200,
  backupExport: 1500,
  syncCycle: 5000,
});

export function measurePerformance(name, operation, budgetMs = PERFORMANCE_BUDGETS_MS[name]) {
  const started = Date.now();
  return Promise.resolve()
    .then(operation)
    .then(result => ({
      result,
      metric: {
        name,
        durationMs: Date.now() - started,
        budgetMs: budgetMs ?? null,
        withinBudget: budgetMs == null ? true : Date.now() - started <= budgetMs,
      },
    }));
}
