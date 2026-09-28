export function evaluateGoalOutcome({ expectedTrajectory = [], actualTrajectory = [], deadline = null } = {}) {
  const expected = expectedTrajectory.at(-1)?.value;
  const actual = actualTrajectory.at(-1)?.value;
  const deadlineMs = deadline ? Date.parse(deadline) : null;
  const daysToDeadline = Number.isFinite(deadlineMs) ? (deadlineMs - Date.now()) / 86400000 : null;
  const delta = Number.isFinite(Number(expected)) && Number.isFinite(Number(actual))
    ? Number(actual) - Number(expected) : null;
  return {
    status: delta === null ? 'insufficient_evidence' : delta >= 0 ? 'on_track' : daysToDeadline !== null && daysToDeadline < 7 ? 'at_risk' : 'behind',
    delta,
    daysToDeadline,
    confidence: expected !== undefined && actual !== undefined ? 0.8 : 0.2,
  };
}
